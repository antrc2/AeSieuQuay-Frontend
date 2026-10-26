import { useCallback, useEffect, useMemo, useState } from 'react'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getTopupPageData } from '@/data'
import { BANK_QR_BASE_URL } from '@/data/site'
import { CARD_TELCO_OPTIONS, DEFAULT_TELCO, formatCardValue, getCardValues, telcoLabel } from '@/data/card-options'
import useAuth from '@/hooks/useAuth'
import { apiPost } from '@/api/client'
import { getBankInfo, getCardFees, getMyBankDeposits, getMyCardHistory, type BankDepositAdmin, type CardTransactionAdmin, type CardFeeRow } from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { fmtDateTimeMs, fmtIsoVN, fmtVnd, fmtXu, isoToMs } from '@/lib/format'

type CardFormErrors = {
  telco?: string
  amount?: string
  code?: string
  serial?: string
  form?: string
}

interface TelcoOption {
  telco: string
  values: { value: number; fees: number; penalty: number }[]
}

const FALLBACK_TELCOS: TelcoOption[] = CARD_TELCO_OPTIONS.map((o) => ({
  telco: o.telco,
  values: getCardValues(o.telco).map((value) => ({ value, fees: 0, penalty: 0 })),
}))

/* ================= Lịch sử của tôi (merge bank + card) ================= */

type HistoryRow =
  | { kind: 'bank'; at: number; row: BankDepositAdmin }
  | { kind: 'card'; at: number; row: CardTransactionAdmin }

const mergeHistory = (bank: BankDepositAdmin[], card: CardTransactionAdmin[]): HistoryRow[] =>
  [
    ...bank.map((r): HistoryRow => ({ kind: 'bank', at: r.transaction_date_ms || isoToMs(r.created_at), row: r })),
    ...card.map((r): HistoryRow => ({ kind: 'card', at: isoToMs(r.created_at), row: r })),
  ].sort((a, b) => b.at - a.at)

const MyHistoryPanel = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const [bank, setBank] = useState<BankDepositAdmin[]>([])
  const [card, setCard] = useState<CardTransactionAdmin[]>([])
  const [page, setPage] = useState(1)
  const [totals, setTotals] = useState({ bank: 0, card: 0 })
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true)
      const size = 20
      try {
        const [b, c] = await Promise.all([
          getMyBankDeposits({ limit: nextPage * size, offset: 0 }).catch(() => null),
          getMyCardHistory({ page: nextPage, page_size: size }).catch(() => null),
        ])
        setBank((prev) => (nextPage === 1 ? b?.items ?? [] : [...prev, ...(b?.items ?? [])]))
        setCard((prev) => (nextPage === 1 ? c?.items ?? [] : [...prev, ...(c?.items ?? [])]))
        setTotals({ bank: b?.total ?? 0, card: c?.total ?? 0 })
        setPage(nextPage)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (isLoggedIn) load(1)
  }, [isLoggedIn, load])

  const rows = useMemo(() => mergeHistory(bank, card), [bank, card])
  const more = bank.length < totals.bank || card.length < totals.card

  if (!isLoggedIn) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        <a href="/dang-nhap" className="font-semibold text-primary underline">
          Đăng nhập
        </a>{' '}
        để xem lịch sử nạp của bạn.
      </p>
    )
  }

  return (
    <div>
      {rows.length === 0 && !loading ? (
        <p className="py-6 text-center text-sm text-muted">Chưa có giao dịch nào.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((entry) =>
            entry.kind === 'bank' ? (
              <BankHistoryRow key={`b-${entry.row.id}`} d={entry.row} />
            ) : (
              <CardHistoryRow key={`c-${entry.row.request_id}`} t={entry.row} />
            ),
          )}
        </ul>
      )}
      {more && (
        <button
          type="button"
          onClick={() => load(page + 1)}
          disabled={loading}
          className="mt-3 w-full rounded-xl border border-border-c bg-surface-2 py-2 text-sm font-semibold text-fg transition-colors hover:bg-[var(--border)] disabled:opacity-50"
        >
          {loading ? 'Đang tải…' : 'Xem thêm'}
        </button>
      )}
    </div>
  )
}

const BankHistoryRow = ({ d }: { d: BankDepositAdmin }) => (
  <li className="flex items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-fg">
        {fmtVnd(d.amount_vnd)} <span className="font-normal text-muted">→ {fmtXu(d.xu_amount)}</span>
      </p>
      <p className="text-xs text-muted">
        Chuyển khoản bank · {d.reference_code ? `mã GD ${d.reference_code}` : d.content} · {fmtDateTimeMs(d.transaction_date_ms)}
      </p>
      {d.credit_command_error && (
        <p className="mt-0.5 text-xs text-amber-500">
          Lỗi cộng game: {d.credit_command_error} — cần hỗ trợ? đưa mã {d.reference_code ?? d.transaction_id} cho admin Discord.
        </p>
      )}
    </div>
    <BankBadge d={d} />
  </li>
)

const BankBadge = ({ d }: { d: BankDepositAdmin }) => {
  if (d.status === 'credited')
    return d.credit_command_status === 'done' ? (
      <Badge variant="success">đã cộng Xu</Badge>
    ) : d.credit_command_status === 'failed' || d.credit_command_status === 'expired' || d.credit_command_status === 'uncertain' ? (
      <Badge variant="warning" title={d.credit_command_error ?? ''}>
        lỗi game
      </Badge>
    ) : (
      <Badge variant="brand" className="animate-pulse">
        đang cộng…
      </Badge>
    )
  if (d.status === 'unmatched' || d.status === 'matched') return <Badge variant="warning">chờ xử lý</Badge>
  if (d.status === 'rejected') return <Badge variant="danger">bị từ chối</Badge>
  return <Badge variant="default">{d.status}</Badge>
}

const CardHistoryRow = ({ t }: { t: CardTransactionAdmin }) => (
  <li className="flex items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-fg">
        {fmtVnd(t.amount_vnd)} {t.real_amount != null && <span className="font-normal text-muted">→ thực nhận {fmtVnd(t.real_amount)}</span>}{' '}
        {t.xu_amount != null && <span className="font-normal text-muted">→ {fmtXu(t.xu_amount)}</span>}
      </p>
      <p className="text-xs text-muted">
        Thẻ {telcoLabel(t.telco)} · seri {t.serial.slice(-6)} · {fmtIsoVN(t.created_at)}
      </p>
      {t.status === 'pending' && <p className="mt-0.5 text-xs text-muted">Cổng đang xử lý, tối thiểu 1–3 phút.</p>}
    </div>
    {t.status === 'success' ? (
      t.in_game ? (
        <Badge variant="success">đã vào game</Badge>
      ) : (
        <Badge variant="warning">đang cộng…</Badge>
      )
    ) : t.status === 'pending' ? (
      <Badge variant="brand" className="animate-pulse">
        chờ cổng
      </Badge>
    ) : (
      <Badge variant="danger" title={t.gateway_message ?? ''}>
        {t.status}
      </Badge>
    )}
  </li>
)

/* ================= Trang ================= */

export const NapThePage = () => {
  const result = getTopupPageData()
  const { user, loading: authLoading } = useAuth()

  const [tab, setTab] = useState<'topup' | 'history'>('topup')
  const [telcos, setTelcos] = useState<TelcoOption[]>(FALLBACK_TELCOS)
  const [feesFromApi, setFeesFromApi] = useState(false)
  const [vndPerXu, setVndPerXu] = useState<number | null>(null)

  const [cardForm, setCardForm] = useState({ telco: DEFAULT_TELCO, amount: '', card_code: '', card_serial: '' })
  const [submittingCard, setSubmittingCard] = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [errors, setErrors] = useState<CardFormErrors>({})

  const clearErrors = () => setErrors({})

  /* Biểu phí THẬT từ /api/card/fees (FRONTEND-3 §7.1) — lỗi/khác shape rơi về card-options.js. */
  useEffect(() => {
    let alive = true
    getCardFees()
      .then(({ fees }) => {
        if (!alive || !fees.length) return
        const grouped = new Map<string, { value: number; fees: number; penalty: number }[]>()
        for (const row of fees as CardFeeRow[]) {
          const telco = String(row.telco || '').toUpperCase()
          const value = Number(row.value)
          if (!telco || !Number.isFinite(value) || value <= 0) continue
          grouped.set(telco, [
            ...(grouped.get(telco) ?? []),
            { value, fees: Number(row.fees) || 0, penalty: Number(row.penalty) || 0 },
          ])
        }
        if (grouped.size === 0) return
        // giữ thứ tự nhà mạng quen thuộc, nhà mạng mớiAppend cuối
        const ordered: TelcoOption[] = [
          ...FALLBACK_TELCOS.filter((o) => grouped.has(o.telco)).map((o) => ({ telco: o.telco, values: grouped.get(o.telco)! })),
          ...[...grouped.entries()].filter(([t]) => !FALLBACK_TELCOS.some((o) => o.telco === t)).map(([telco, values]) => ({ telco, values })),
        ]
        setTelcos(ordered)
        setFeesFromApi(true)
      })
      .catch(() => {
        /* offline/backend chưa cấu hình cổng → fallback hardcoded, không toast */
      })
    getBankInfo()
      .then((info) => alive && setVndPerXu(info?.vnd_per_xu ?? null))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const currentTelco = telcos.find((o) => o.telco === cardForm.telco) ?? telcos[0]
  const amountOptions = currentTelco?.values ?? []

  /* amount khởi tạo/lại khi đổi nhà mạng — dùng effect để không làm trong render. */
  useEffect(() => {
    const values = amountOptions.map((v) => v.value)
    if (!values.length) {
      setCardForm((s) => (s.amount === '' ? s : { ...s, amount: '' }))
      return
    }
    setCardForm((s) => (values.includes(Number(s.amount)) ? s : { ...s, amount: String(values[0]) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi danh sách nhà mạng thật sự đổi
  }, [currentTelco?.telco, amountOptions.length])

  if (result.status !== 'ok') {
    return (
      <SiteLayout
        seo={{
          title: 'Nạp thẻ — SV AeSieuQuay',
          description: 'Nạp thẻ vào tài khoản AeSieuQuay.',
          path: '/nap-the',
          noindex: true,
        }}
      >
        <DataUnavailable title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined} />
      </SiteLayout>
    )
  }

  const data = result.data
  const description = data.subtitle || 'Nạp thẻ vào tài khoản AeSieuQuay nhanh chóng và an toàn.'
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const isLoggedIn = Boolean(user)
  const canTopup = !authLoading && isLoggedIn
  const realname = typeof user?.realname === 'string' ? user.realname.trim() : ''
  const selectedFee = amountOptions.find((v) => String(v.value) === cardForm.amount)

  const qrUrl = realname
    ? `${BANK_QR_BASE_URL}?addInfo=${encodeURIComponent(realname)}`
    : BANK_QR_BASE_URL

  const onTelcoChange = (telco: string) => {
    clearErrors()
    setCardForm((s) => {
      const values = telcos.find((o) => o.telco === telco)?.values ?? []
      return { ...s, telco, amount: values.length ? String(values[0].value) : '' }
    })
  }

  const onSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: CardFormErrors = {}
    if (!isLoggedIn) nextErrors.form = 'Vui lòng đăng nhập để nạp thẻ.'
    if (!telcos.some((o) => o.telco === cardForm.telco)) nextErrors.telco = 'Vui lòng chọn nhà mạng.'

    const code = cardForm.card_code.trim()
    const serial = cardForm.card_serial.trim()
    const amount = Number(cardForm.amount)
    if (!code) nextErrors.code = 'Vui lòng nhập mã thẻ.'
    if (!serial) nextErrors.serial = 'Vui lòng nhập seri thẻ.'
    if (!Number.isFinite(amount) || !amountOptions.some((v) => v.value === amount)) nextErrors.amount = 'Vui lòng chọn mệnh giá hợp lệ.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmittingCard(true)
    setCheckMsg(null)
    try {
      const res = await apiPost('/card/charge', { telco: cardForm.telco, amount, serial, code })
      setLastRequestId(res?.data?.request_id ?? null)
      const statusName = res?.data?.status_name ? ` (${res.data.status_name})` : ''
      setCheckMsg({ ok: true, text: `${res?.message || 'Đã gửi thẻ'}${statusName}` })
      setCardForm((s) => ({ ...s, card_code: '', card_serial: '' }))
    } catch (err) {
      await showApiError(err, 'Nạp thẻ thất bại')
    } finally {
      setSubmittingCard(false)
    }
  }

  /* "Kiểm tra" sau khi gửi — cổng cho tra lại ĐÚNG request_id (idempotent). */
  const onCheck = async () => {
    if (!lastRequestId) return
    setChecking(true)
    try {
      const res = await apiPost('/card/check', { request_id: lastRequestId })
      const d = res?.data
      const label = d?.finalized ? (d?.status === 1 ? 'Thẻ thành công' : `Kết quả: ${d?.status_name ?? d?.message ?? d?.status}`) : 'Vẫn đang xử lý'
      setCheckMsg({ ok: d?.status === 1 || !d?.finalized, text: `${label}${d?.user_receive ? ` · thực nhận ${fmtVnd(d.user_receive)}` : ''}` })
    } catch (err) {
      await showApiError(err, 'Kiểm tra thất bại')
    } finally {
      setChecking(false)
    }
  }

  return (
    <SiteLayout
      seo={{
        title: `${data.title || 'Nạp thẻ'} — SV AeSieuQuay`,
        description,
        path: '/nap-the',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data.title || 'Nạp thẻ',
          description,
          url: `${siteUrl}/nap-the`,
          inLanguage: 'vi-VN',
        },
      }}
    >
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{data.title || 'Nạp thẻ'}</h1>
          {data.subtitle && <p className="mt-2 text-muted">{data.subtitle}</p>}
        </div>

        {/* tab Nạp / Lịch sử của tôi (§7.3) */}
        <div className="mx-auto mb-8 flex max-w-xs rounded-xl border border-border-c bg-surface p-1">
          {(['topup', 'history'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
                tab === id ? 'bg-primary text-white' : 'text-muted hover:text-fg',
              )}
            >
              {id === 'topup' ? 'Nạp' : 'Lịch sử của tôi'}
            </button>
          ))}
        </div>

        {tab === 'history' ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border-c bg-surface p-6">
            <MyHistoryPanel isLoggedIn={isLoggedIn} />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {/* ================= Nạp bằng thẻ cào ================= */}
            <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
              <form onSubmit={onSubmitCard} className="p-6 sm:p-8" noValidate>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">💳</span>
                  <div>
                    <h2 className="text-xl font-bold">Nạp bằng thẻ cào</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {feesFromApi ? 'Nhà mạng & mệnh giá theo biểu phí thật của cổng' : 'Nhập thông tin thẻ để thực hiện nạp'}
                    </p>
                  </div>
                </div>

                {!authLoading && !isLoggedIn && (
                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted">
                    Bạn cần{' '}
                    <a href="/dang-nhap" className="font-semibold text-primary underline">
                      đăng nhập
                    </a>{' '}
                    để nạp thẻ.
                  </div>
                )}

                <fieldset
                  disabled={!canTopup}
                  className={cn('mt-6 grid gap-4 border-0 p-0 sm:grid-cols-2', !canTopup && 'opacity-60')}
                >
                  <div>
                    <label htmlFor="card-telco" className="mb-1.5 block text-sm font-medium">
                      Nhà mạng
                    </label>
                    <select
                      id="card-telco"
                      value={cardForm.telco}
                      disabled={!canTopup}
                      onChange={(e) => onTelcoChange(e.target.value)}
                      className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                    >
                      {telcos.map((o) => (
                        <option key={o.telco} value={o.telco}>
                          {telcoLabel(o.telco)}
                        </option>
                      ))}
                    </select>
                    {errors.telco && <p className="mt-1 text-xs text-red-500">{errors.telco}</p>}
                  </div>

                  <div>
                    <label htmlFor="card-amount" className="mb-1.5 block text-sm font-medium">
                      Mệnh giá
                    </label>
                    <select
                      id="card-amount"
                      value={cardForm.amount}
                      disabled={!canTopup}
                      onChange={(e) => {
                        clearErrors()
                        setCardForm((s) => ({ ...s, amount: e.target.value }))
                      }}
                      className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                    >
                      {amountOptions.map((v) => (
                        <option key={v.value} value={String(v.value)}>
                          {formatCardValue(v.value)}
                          {feesFromApi && v.fees > 0 ? ` (−${v.fees}%)` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                  </div>

                  <div>
                    <label htmlFor="card-code" className="mb-1.5 block text-sm font-medium">
                      Mã thẻ
                    </label>
                    <input
                      id="card-code"
                      type="text"
                      value={cardForm.card_code}
                      disabled={!canTopup}
                      onChange={(e) => {
                        clearErrors()
                        setCardForm((s) => ({ ...s, card_code: e.target.value }))
                      }}
                      placeholder="Nhập mã thẻ cào"
                      className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                    />
                    {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
                  </div>

                  <div>
                    <label htmlFor="card-serial" className="mb-1.5 block text-sm font-medium">
                      Seri thẻ
                    </label>
                    <input
                      id="card-serial"
                      type="text"
                      value={cardForm.card_serial}
                      disabled={!canTopup}
                      onChange={(e) => {
                        clearErrors()
                        setCardForm((s) => ({ ...s, card_serial: e.target.value }))
                      }}
                      placeholder="Nhập số seri thẻ"
                      className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                    />
                    {errors.serial && <p className="mt-1 text-xs text-red-500">{errors.serial}</p>}
                  </div>
                </fieldset>

                {/* phí thật → thực nhận → Xu ước tính (§7.1) */}
                {selectedFee && (
                  <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs tabular-nums text-muted">
                    {selectedFee.fees + selectedFee.penalty > 0 ? `− phí ${selectedFee.fees + selectedFee.penalty}%` : 'không phí'} →{' '}
                    <b className="text-fg">
                      thực nhận {fmtVnd(Math.floor(selectedFee.value * (1 - (selectedFee.fees + selectedFee.penalty) / 100)))}
                    </b>
                    {vndPerXu
                      ? ` → ≈ ${fmtXu(Math.floor((selectedFee.value * (1 - (selectedFee.fees + selectedFee.penalty) / 100)) / vndPerXu))}`
                      : ''}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={!canTopup || submittingCard}
                    className="flex-1 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingCard ? 'Đang gửi...' : canTopup ? 'Nạp thẻ' : 'Đăng nhập để nạp thẻ'}
                  </button>
                  {lastRequestId && (
                    <button
                      type="button"
                      onClick={onCheck}
                      disabled={checking}
                      className="rounded-xl border border-border-c bg-surface px-5 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
                    >
                      {checking ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái'}
                    </button>
                  )}
                </div>

                {checkMsg && (
                  <p role="status" className={cn('mt-3 text-sm', checkMsg.ok ? 'text-emerald-500' : 'text-amber-500')}>
                    {checkMsg.text}
                  </p>
                )}

                {errors.form && (
                  <p role="alert" className="mt-3 text-sm text-red-500">
                    {errors.form}
                  </p>
                )}
              </form>
            </section>

            {/* ================= Nạp bằng ATM/Bank (VietQR) ================= */}
            <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">🏦</span>
                  <div>
                    <h2 className="text-xl font-bold">Nạp bằng ATM/Bank</h2>
                    <p className="mt-0.5 text-sm text-muted">Quét mã VietQR để chuyển khoản</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col items-center">
                  <div className="relative w-full max-w-[300px]">
                    <img
                      src={qrUrl}
                      alt={realname ? `Mã QR nạp tiền cho ${realname}` : 'Mã QR nạp tiền'}
                      className={cn(
                        'w-full select-none rounded-2xl border border-border-c bg-white p-2 shadow-sm',
                        !canTopup && 'pointer-events-none scale-[1.04] blur-lg',
                      )}
                      draggable={false}
                    />

                    {!canTopup && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-bg/40 p-4 text-center backdrop-blur-[2px]">
                        <span className="text-3xl">🔒</span>
                        <p className="mt-2 text-sm font-semibold text-fg">Đăng nhập để quét mã</p>
                        <a
                          href="/dang-nhap"
                          className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
                        >
                          Đăng nhập
                        </a>
                      </div>
                    )}
                  </div>

                  {canTopup && realname && (
                    <p className="mt-4 text-center text-sm text-muted">
                      Nội dung chuyển khoản: <span className="font-semibold text-fg">{realname}</span>
                    </p>
                  )}

                  <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-muted">
                    Mở ứng dụng ngân hàng và quét mã. Nội dung chuyển khoản tự điền theo tên tài khoản của bạn.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </SiteLayout>
  )
}

export default NapThePage
