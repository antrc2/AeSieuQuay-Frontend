import { useCallback, useEffect, useRef, useState } from 'react'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getTransferPageData, useMockData } from '@/data'
import type { TransferPagePayload, TransferRow, TransferStatus } from '@/data/contract'
import useAuth from '@/hooks/useAuth'
import useBalanceCheck from '@/hooks/useBalanceCheck'
import { apiGet, apiPost, ApiError } from '@/api/client'
import { showApiError } from '@/utils/swal'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { fmtIsoVN, fmtXu } from '@/lib/format'

/**
 * FRONTEND-4 §3 — /chuyen-xu: một chiều Lobby → server con.
 * Đọc 100% window.DATA (targets/limits/my.transfers). Số dư lobby qua
 * useBalanceCheck() (queue+poll 1s ≤20s — backend-4 §3.1b, mock/real cùng đường code).
 * Action: POST /points/transfers (Idempotency-Key do client sinh) + poll GET 1s ≤ 60s.
 */

const TRANSFER_POLL_MS = 1_000
const TRANSFER_MAX_TRIES = 60 // 60s — nhất quán nhịp balance-check

const TERMINAL_STATUSES: TransferStatus[] = ['completed', 'failed', 'refunded', 'needs_reconcile']
const isTerminal = (s: TransferStatus) => TERMINAL_STATUSES.includes(s)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const newIdempotencyKey = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

/* ================= Bản đồ trạng thái / lỗi (§3.2) ================= */

const STEP_LABEL: Record<TransferStatus, string> = {
  pending: 'Đã gửi — chờ lobby trừ Xu',
  debited: 'Đã trừ Xu ở sảnh — đang cộng server con',
  completed: 'Đã cộng vào server con',
  refund_pending: 'Server con không nhận — đang hoàn Xu về sảnh',
  refunded: 'Không vào server con — Xu đã về sảnh',
  failed: 'Chuyển thất bại',
  needs_reconcile: 'Cần admin đối soát thủ công',
}

type StepTone = 'info' | 'amber' | 'green' | 'danger'

const stepTone = (status: TransferStatus): StepTone => {
  if (status === 'completed') return 'green'
  if (status === 'refunded' || status === 'refund_pending') return 'amber'
  if (status === 'failed' || status === 'needs_reconcile') return 'danger'
  return 'info'
}

const STEP_BADGE: Record<StepTone, 'brand' | 'success' | 'warning' | 'danger'> = {
  info: 'brand',
  green: 'success',
  amber: 'warning',
  danger: 'danger',
}

/** Error map tiếng Việt — bảng FRONTEND-4 §3.2. */
export const localizeTransferError = (error: string | null, transferId: string | null): string => {
  if (!error) return 'Không xác định — kiểm tra lịch sử sau ít phút.'
  if (error.includes('player_not_found'))
    return 'Bạn chưa có nhân vật ở máy chủ đích — vào server đó 1 lần rồi thử lại'
  if (error.includes('insufficient')) return 'Không đủ Xu trong sảnh'
  if (error.includes('expired'))
    return 'Máy chủ đích chưa kịp nhận (lobby/server offline) — Xu đã về sảnh, thử lại sau'
  return `${error} — báo admin kèm mã ${transferId ? transferId.slice(0, 8) : '—'}`
}

const TransferStatusBadge = ({ status }: { status: TransferStatus }) => (
  <Badge variant={STEP_BADGE[stepTone(status)]} className={status === 'pending' || status === 'debited' || status === 'refund_pending' ? 'animate-pulse' : undefined}>
    {STEP_LABEL[status]}
  </Badge>
)

/* ================= Lịch sử chuyển xu (window.DATA + row local) ================= */

const HistoryBlock = ({
  data,
  extraRows,
  nameOf,
  guest,
}: {
  data: TransferPagePayload
  extraRows: TransferRow[]
  nameOf: (key: string) => string
  guest: boolean
}) => {
  const rows = [...extraRows, ...(data.my?.transfers ?? [])]
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
      <div className={cn('p-6 sm:p-8', guest && 'pointer-events-none select-none opacity-40 blur-[6px]')} aria-hidden={guest || undefined}>
        <h2 className="text-xl font-bold">Lịch sử chuyển Xu</h2>
        <p className="mt-0.5 text-sm text-muted">10 lần chuyển gần nhất (từ server của bạn).</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {rows.map((t) => (
              <li key={t.transfer_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">
                    {fmtXu(t.amount)} <span className="font-normal text-muted">→ {nameOf(t.to_server_key)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Mã {t.transfer_id.slice(0, 8)} · {fmtIsoVN(t.created_at)}
                    {t.completed_at ? ` · xong ${fmtIsoVN(t.completed_at)}` : ''}
                  </p>
                  {t.error && (
                    <p className="mt-0.5 text-xs text-amber-500">{localizeTransferError(t.error, t.transfer_id)}</p>
                  )}
                </div>
                <span className="shrink-0 text-right">
                  <TransferStatusBadge status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {guest && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/30 p-4 text-center backdrop-blur-[2px]">
          <span className="text-3xl">🔒</span>
          <p className="text-sm font-semibold text-fg">Đăng nhập để xem lịch sử chuyển Xu</p>
          <a
            href="/dang-nhap"
            className="mt-1 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            Đăng nhập
          </a>
        </div>
      )}
    </section>
  )
}

/* ================= Trang ================= */

export const TransferPage = () => {
  const result = getTransferPageData()
  const { user, loading: authLoading } = useAuth()

  const [target, setTarget] = useState('')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [flow, setFlow] = useState<{ transferId: string; status: TransferStatus; error: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sessionLost, setSessionLost] = useState(false)
  const [extraRows, setExtraRows] = useState<TransferRow[]>([])

  const aliveRef = useRef(true)
  const idemRef = useRef<string | null>(null) // giữ nguyên tới khi terminal/timeout (chống double-click)

  const data = result.status === 'ok' ? result.data : null

  const isLoggedIn = Boolean(data?.my) || Boolean(user)
  const guest = !isLoggedIn && !authLoading

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  /* ---------- Số dư lobby: queue + poll 1s ≤ 20s qua hook (backend-4 §3.1b) ---------- */
  const onUnauthorized = useCallback(() => setSessionLost(true), [])
  const { balance, phase: balancePhase, error: balanceError, refresh: refreshBalance, adjust: adjustBalance } = useBalanceCheck(isLoggedIn, onUnauthorized)

  /* ---------- Action + poll chuyển (§3.2) ---------- */

  const finishTransfer = (t: { transfer_id: string; to_server_key: string; amount: number; status: TransferStatus; error: string | null; created_at: string | null; completed_at: string | null }) => {
    setExtraRows((prev) => [
      { transfer_id: t.transfer_id, to_server_key: t.to_server_key, amount: t.amount, status: t.status, error: t.error, created_at: t.created_at, completed_at: t.completed_at },
      ...prev.filter((r) => r.transfer_id !== t.transfer_id),
    ])
    idemRef.current = null // terminal → release key, lần chuyển sau UUID mới
  }

  const pollTransfer = async (transferId: string) => {
    let last: TransferRow | null = null
    for (let i = 0; i < TRANSFER_MAX_TRIES; i++) {
      await sleep(TRANSFER_POLL_MS)
      if (!aliveRef.current) return
      try {
        const r = await apiGet(`/points/transfers/${transferId}`)
        const t = r?.data?.transfer
        if (!t) continue
        last = {
          transfer_id: t.transfer_id ?? transferId,
          to_server_key: t.to_server_key,
          amount: t.amount,
          status: t.status,
          error: t.error ?? null,
          created_at: t.created_at ?? null,
          completed_at: t.completed_at ?? null,
        }
        setFlow({ transferId, status: t.status, error: t.error ?? null })
        if (isTerminal(t.status)) {
          finishTransfer(last)
          refreshBalance() // sau terminal: refresh balance 1 lần (state local, không re-SSR)
          return
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setSessionLost(true)
          return
        }
        // transient — giữ nhịp 1s
      }
    }
    // timeout 60s: không reset form/mất id — người dùng theo dõi tiếp ở lịch sử (§3.2)
    setFlow((f) => (f ? { ...f, error: f.error ?? 'Đang xử lý — kiểm tra Lịch sử chuyển Xu sau ít phút' } : f))
    idemRef.current = null
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!data) return

    const min = data.limits?.min_amount ?? 1
    const max = data.limits?.max_amount ?? Number.MAX_SAFE_INTEGER
    const value = Number(amount)
    if (!target || !data.targets.some((t) => t.server_key === target)) {
      setFormError('Chọn máy chủ đích hợp lệ')
      return
    }
    if (!Number.isInteger(value) || value < min || value > max) {
      setFormError(`Số Xu phải là số nguyên từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')}`)
      return
    }

    setSubmitting(true)
    setFlow(null)
    const idemKey = idemRef.current ?? (idemRef.current = newIdempotencyKey())

    try {
      let transfer: { transfer_id?: string; status?: TransferStatus; error?: string | null; created_at?: string | null } | null = null
      if (useMockData) {
        // Mock walkthrough: pending → debited → completed (minigame-1 offline → failed player_not_found).
        const failTarget = target === 'minigame-1'
        const fakeId = newIdempotencyKey()
        for (const st of ['pending', 'debited'] as TransferStatus[]) {
          setFlow({ transferId: fakeId, status: st, error: null })
          await sleep(1200)
          if (!aliveRef.current) return
        }
        transfer = failTarget
          ? { transfer_id: fakeId, status: 'failed', error: 'player_not_found', created_at: new Date().toISOString() }
          : { transfer_id: fakeId, status: 'completed', error: null, created_at: new Date().toISOString() }
      } else {
        // body theo points-user-api.md: idempotency_key là FIELD trong body (không phải header).
        const res = await apiPost('/points/transfers', {
          from_server_key: data.lobby.server_key,
          to_server_key: target,
          amount: value,
          idempotency_key: idemKey,
        })
        transfer = res?.data?.transfer ?? res?.data ?? null
      }

      const transferId = transfer?.transfer_id ?? null
      if (!transferId) throw new ApiError('Backend không trả transfer_id', 502, null)

      const initial = (transfer?.status ?? 'pending') as TransferStatus
      setFlow({ transferId, status: initial, error: transfer?.error ?? null })
      if (isTerminal(initial)) {
        finishTransfer({
          transfer_id: transferId,
          to_server_key: target,
          amount: value,
          status: initial,
          error: transfer?.error ?? null,
          created_at: transfer?.created_at ?? new Date().toISOString(),
          completed_at: initial === 'completed' ? new Date().toISOString() : null,
        })
        refreshBalance()
      } else if (useMockData) {
        const st = transfer!.status as TransferStatus
        setExtraRows((prev) => [
          { transfer_id: transferId, to_server_key: target, amount: value, status: st, error: transfer!.error ?? null, created_at: new Date().toISOString(), completed_at: null },
          ...prev,
        ])
        idemRef.current = null
        adjustBalance(-value) // mock: trừ tại chỗ qua hook (real-mode luôn refresh lại từ lobby)
      } else {
        await pollTransfer(transferId)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSessionLost(true)
      } else {
        await showApiError(err, 'Chuyển Xu thất bại')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (result.status !== 'ok' || !data) {
    return (
      <SiteLayout
        seo={{
          title: 'Chuyển xu — SV AeSieuQuay',
          description: 'Chuyển Xu từ Lobby vào các máy chủ game.',
          path: '/chuyen-xu',
          noindex: true,
        }}
      >
        <DataUnavailable title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined} />
      </SiteLayout>
    )
  }

  const nameOf = (key: string) => data.targets.find((t) => t.server_key === key)?.name ?? key
  const limits = data.limits ?? { min_amount: 1, max_amount: 1_000_000 }
  const canSubmit = !authLoading && isLoggedIn && !submitting

  return (
    <SiteLayout
      seo={{
        title: `${data.title || 'Chuyển Xu'} — SV AeSieuQuay`,
        description: 'Chuyển Xu một chiều từ Lobby vào máy chủ game (PvP, Survival, Skyblock…). Hướng dẫn và lịch sử chuyển Xu.',
        path: '/chuyen-xu',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data.title || 'Chuyển Xu',
          description: 'Chuyển Xu từ Lobby vào máy chủ game',
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/chuyen-xu`,
          inLanguage: 'vi-VN',
        },
      }}
    >
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{data.title || 'Chuyển Xu'}</h1>
          <p className="mt-2 text-muted">Xu chỉ đi một chiều: <b className="text-fg">Lobby → máy chủ game</b>. Không chuyển giữa hai máy chủ game, không rút về sảnh.</p>
        </div>

        {/* Desktop: form 45% | lịch sử 55% (chủ server review 27/10); mobile: stack */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
        {/* ================= Block form (trái) ================= */}
        <div className="min-w-0">
        <section className="relative overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
          <form onSubmit={onSubmit} className="p-6 sm:p-8" noValidate>
            {/* Sơ đồ 1 chiều static */}
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="rounded-xl bg-primary-soft px-3 py-1.5 text-primary">{data.lobby.name}</span>
              <span aria-hidden className="text-muted">──Xu──▶</span>
              <span className="rounded-xl border border-border-c px-3 py-1.5 text-muted">chọn server con</span>
              <span className="ml-2 text-xs font-normal text-muted">✗ server con → server con (không có option)</span>
            </div>

            {/* Số dư lobby — skeleton chờ queue+poll */}
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <span className="text-muted">Số dư {data.lobby.name}:</span>
              {balancePhase === 'checking' && (
                <span aria-hidden className="h-5 w-24 animate-pulse rounded-md bg-border-c" title="Đang hỏi lobby qua hàng đợi…" />
              )}
              {balancePhase === 'checking' && <span className="text-xs text-muted">đang kiểm tra… (tối đa 20s)</span>}
              {balancePhase === 'done' && <b className="tabular-nums text-fg">{fmtXu(balance)}</b>}
              {(balancePhase === 'error' || balancePhase === 'idle') && (
                <>
                  <span className={balancePhase === 'error' ? 'text-amber-500' : 'text-muted'}>
                    {balancePhase === 'error' ? balanceError ?? 'Không xác định được số dư' : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={refreshBalance}
                    className="rounded-lg border border-border-c bg-surface px-2.5 py-1 text-xs font-semibold text-fg transition-colors hover:bg-surface-2"
                  >
                    ↻ Thử lại
                  </button>
                </>
              )}
            </div>

            <fieldset disabled={!canSubmit} className={cn('mt-6 grid gap-4 border-0 p-0 sm:grid-cols-2', !canSubmit && 'opacity-60')}>
              <div>
                <label htmlFor="transfer-target" className="mb-1.5 block text-sm font-medium">
                  Máy chủ đích
                </label>
                {/* CHỈ payload.targets (role=game, points_enabled) — không có proxy/lobby làm đích. */}
                <select
                  id="transfer-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                >
                  <option value="">— chọn server con —</option>
                  {data.targets.map((t) => (
                    <option key={t.server_key} value={t.server_key}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="transfer-amount" className="mb-1.5 block text-sm font-medium">
                  Số Xu ({limits.min_amount.toLocaleString('vi-VN')} – {limits.max_amount.toLocaleString('vi-VN')})
                </label>
                <input
                  id="transfer-amount"
                  type="number"
                  inputMode="numeric"
                  min={limits.min_amount}
                  max={limits.max_amount}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="VD 500"
                  className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm tabular-nums outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                />
              </div>
            </fieldset>

            {/* phím tắt — không có "All" vì balance là async */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[100, 500, 1000].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => setAmount(String(n))}
                  className="rounded-lg border border-border-c bg-surface-2 px-3 py-1 text-xs font-semibold tabular-nums text-fg transition-colors hover:bg-[var(--border)] disabled:opacity-50"
                >
                  +{n.toLocaleString('vi-VN')}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!canSubmit || !target || !amount || Number(amount) < limits.min_amount}
              className="mt-5 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Đang chuyển…' : canSubmit ? 'Chuyển Xu' : 'Đăng nhập để chuyển Xu'}
            </button>

            {formError && (
              <p role="alert" className="mt-3 text-sm text-red-500">
                {formError}
              </p>
            )}

            {/* Stepper nối tiếp + error map (§3.2) */}
            {flow && (
              <div
                role="status"
                className={cn(
                  'mt-4 rounded-xl border px-4 py-3 text-sm',
                  stepTone(flow.status) === 'green' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
                  stepTone(flow.status) === 'amber' && 'border-amber-500/30 bg-amber-500/10 text-amber-500',
                  stepTone(flow.status) === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-500',
                  stepTone(flow.status) === 'info' && 'border-primary/30 bg-primary-soft text-primary',
                )}
              >
                <p className="font-semibold">
                  {STEP_LABEL[flow.status]}
                  {isTerminal(flow.status) ? '' : ' …'}
                </p>
                <p className="mt-0.5 text-xs opacity-80">Mã GD {flow.transferId.slice(0, 8)} · theo dõi mỗi 1s (tối đa 60s)</p>
                {flow.error && <p className="mt-1 text-xs">{localizeTransferError(flow.error, flow.transferId)}</p>}
                {flow.status === 'needs_reconcile' && (
                  <p className="mt-1 text-xs">Ghi lại mã trên và liên hệ admin qua Discord — lệnh cần người đối soát.</p>
                )}
              </div>
            )}

            {/* 401 giữa chừng: thông báo + nút login, KHÔNG tự redirect (§3.2) */}
            {sessionLost && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                Phiên đăng nhập đã hết hạn.{' '}
                <a href="/dang-nhap" className="font-semibold text-primary underline">
                  Đăng nhập lại
                </a>{' '}
                — giao dịch đang chạy vẫn được ghi trong lịch sử.
              </div>
            )}
          </form>

          {/* khách: blur + overlay login (same pattern QR bank) — không redirect */}
          {guest && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-bg/40 p-4 text-center backdrop-blur-[3px]">
              <span className="text-3xl">🔒</span>
              <p className="text-sm font-semibold text-fg">Đăng nhập để chuyển Xu</p>
              <a
                href="/dang-nhap"
                className="mt-1 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
              >
                Đăng nhập
              </a>
            </div>
          )}
        </section>

        <p className="mt-3 text-xs text-muted">
          Lệnh có hạn {data.command_ttl_seconds ?? 60}s để server con nhận — quá hạn, Xu tự hoàn về sảnh (không mất).
        </p>
        </div>

        {/* ================= Lịch sử chuyển (phải — window.DATA my.transfers) ================= */}
        <HistoryBlock data={data} extraRows={extraRows} nameOf={nameOf} guest={guest} />
        </div>
      </main>
    </SiteLayout>
  )
}

export default TransferPage
