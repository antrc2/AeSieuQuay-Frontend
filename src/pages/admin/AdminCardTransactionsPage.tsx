import { useCallback, useEffect, useRef, useState } from 'react'

import { useSeo } from '@/hooks/useSeo'
import { listCardTransactions, requeueCardTransaction, type CardTransactionAdmin, type PagedAdmin } from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, StatCard, TableWrap, Td, Th } from '@/components/admin/blocks'
import Pagination from '@/components/admin/Pagination'
import { CopyButton, Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import usePagedQuery from '@/hooks/usePagedQuery'
import { fmtDateTimeMs, fmtIsoVN, fmtVnd, fmtXu, isoToMs, maskTail } from '@/lib/format'

const POLL_MS = 10_000
const DAY_MS = 86_400_000

/** created_at ISO naive UTC → có phải "hôm nay" theo giờ VN? */
const isTodayVN = (iso: string | null) => {
  if (!iso) return false
  const ms = new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime()
  if (!Number.isFinite(ms)) return false
  const vn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format
  return vn(new Date(ms)) === vn(new Date())
}

/** pending lâu > 10 phút → tooltip gợi ý xử lý (FRONTEND-4 §5). */
const PENDING_STALE_MS = 10 * 60_000
const isStalePending = (t: CardTransactionAdmin) =>
  t.status === 'pending' && Date.now() - isoToMs(t.created_at) > PENDING_STALE_MS

const CardStatusBadge = ({ t }: { t: CardTransactionAdmin }) => {
  if (t.status === 'pending')
    return (
      <Badge
        variant="brand"
        className="animate-pulse"
        title={isStalePending(t) ? 'Cổng chậm >10 phút — bấm Kiểm tra (check) hoặc chờ callback' : 'chờ cổng trả kết quả'}
      >
        chờ cổng
      </Badge>
    )
  if (t.status === 'success')
    return t.in_game ? (
      <Badge variant="success">đã vào game</Badge>
    ) : (
      <Badge variant="warning" title="Gạch thành công nhưng chưa cộng Xu trong game">xong · chưa cộng?</Badge>
    )
  return <Badge variant="danger" title={t.gateway_message ?? undefined}>{t.status}</Badge>
}

/** Điều kiện hiện nút requeue Xu (FRONTEND-4 §5 / backend-4 §1). */
export const canRequeueCard = (t: CardTransactionAdmin) => {
  const cmd = t.credit_command_status
  if (cmd === 'pending' || cmd === 'claimed') return false // backend 400 — ẩn luôn
  return t.status === 'success' && (!t.in_game || cmd === 'failed' || cmd === 'expired' || cmd === 'uncertain')
}

/** Ô P&L: real_amount · user_receive · admin_adjustment (âm ĐỎ, dương XANH). */
const PlCell = ({ t }: { t: CardTransactionAdmin }) => {
  if (t.real_amount == null && t.user_receive == null && t.admin_adjustment == null)
    return <span className="text-muted">—</span>
  const adj = t.admin_adjustment
  return (
    <div className="space-y-0.5 text-xs tabular-nums">
      <p title="Tiền thật về ví (cổng báo)">
        <span className="text-muted">thực thu </span>
        <b className="text-fg">{fmtVnd(t.real_amount)}</b>
      </p>
      <p title="VND user nhận = card_value − user_fee_rate">
        <span className="text-muted">user nhận </span>
        <b className="text-fg">{fmtVnd(t.user_receive ?? null)}</b>
      </p>
      <p title="chiết khấu thực − user_fee_rate (vd cổng 21% ⇒ lỗ 11k/100k). Âm = admin bù.">
        <span className="text-muted">điều chỉnh </span>
        <b className={adj == null ? 'text-muted' : adj < 0 ? 'text-red-500' : adj > 0 ? 'text-emerald-500' : 'text-fg'}>
          {adj == null ? '—' : `${adj > 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN').format(adj)}`}
        </b>
      </p>
    </div>
  )
}

export const AdminCardTransactionsPage = () => {
  useSeo({ title: 'Quản trị — Thẻ cào — SV AeSieuQuay', noindex: true })

  const q = usePagedQuery({ status: '', q: '' }, 20)
  const [data, setData] = useState<PagedAdmin<CardTransactionAdmin> | null>(null)
  const [stats, setStats] = useState<{ todaySum: number; failRate: string; pending: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const aliveRef = useRef(true)

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      try {
        const res = await listCardTransactions(q.query)
        if (aliveRef.current) setData(res)
      } catch (err) {
        if (aliveRef.current) {
          await showApiError(err, 'Không tải được lịch sử thẻ')
          setData((d) => d ?? { total: 0, page: 1, page_size: 20, items: [] })
        }
      } finally {
        if (aliveRef.current) setLoading(false)
      }
    },
    [q.query],
  )

  /* 3 StatCard: aggregate client-side từ 3 query gọn (API admin chỉ đọc, không có sum). */
  const loadStats = useCallback(async () => {
    const nowMs = Date.now()
    try {
      const [success, failed, errored, pending] = await Promise.all([
        listCardTransactions({ status: 'success', page_size: 100 }),
        listCardTransactions({ status: 'failed', page_size: 1 }),
        listCardTransactions({ status: 'error', page_size: 1 }),
        listCardTransactions({ status: 'pending', page_size: 1 }),
      ])
      const todaySum = success.items.filter((t) => isTodayVN(t.created_at)).reduce((s, t) => s + (t.real_amount ?? 0), 0)
      const failCount = failed.total + errored.total
      // 7 ngày = ước lượng trên mẫu success (không có filter ngày ở API) — hiển thị theo tỷ lệ mẫu.
      const recent = success.items.filter((t) => nowMs - new Date((t.created_at || '').replace(' ', 'T') + 'Z').getTime() <= 7 * DAY_MS).length
      const denom = failCount + recent
      if (aliveRef.current)
        setStats({
          todaySum,
          failRate: denom > 0 ? `${((failCount / denom) * 100).toFixed(1)}%` : '0%',
          pending: pending.total,
        })
    } catch {
      /* stats phụ — không báo lỗi, để nguyên giá trị cũ */
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    loadStats()
    return () => {
      aliveRef.current = false
    }
  }, [load, loadStats])

  /* Trang TỰ refresh 10s khi còn row pending (callback cổng có thể muộn). */
  const hasPending = !!data && data.items.some((t) => t.status === 'pending')
  useEffect(() => {
    if (!hasPending) return
    const timer = setInterval(() => {
      load({ silent: true })
      loadStats()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [hasPending, load, loadStats])

  const refreshAll = () => {
    load()
    loadStats()
  }

  /* §5 — "Tạo lại lệnh cộng Xu": InlineConfirm 2 bước → POST requeue → toast + merge row. */
  const onRequeue = useCallback(
    async (t: CardTransactionAdmin) => {
      try {
        const updated = await requeueCardTransaction(t.id)
        setData((d) => (d ? { ...d, items: d.items.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)) } : d))
        await showSuccess(
          'Đã tạo lại lệnh cộng Xu',
          `Lệnh CREDIT mới (${updated.requeue_count != null ? `lần ${updated.requeue_count}` : 'đầu tiên'}) đang chờ agent lobby.`,
        )
        loadStats()
      } catch (err) {
        await showApiError(err, 'Requeue thất bại')
      }
    },
    [loadStats],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử thẻ cào"
        description={hasPending ? 'Còn giao dịch chờ cổng — tự kiểm tra mỗi 10 giây.' : 'Sổ cái gạch thẻ (DB) — code thẻ chỉ lưu 4 số cuối.'}
        actions={
          <Button variant="outline" onClick={refreshAll} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon="💸" label="Thành công hôm nay" value={fmtVnd(stats?.todaySum ?? 0)} sub="Σ thực nhận về ví" tone="success" />
        <StatCard icon="⚠️" label="Tỷ lệ fail" value={stats?.failRate ?? '—'} sub="failed+error / mẫu 7 ngày" tone="warning" />
        <StatCard icon="⏳" label="Đang chờ cổng" value={stats?.pending ?? '—'} sub="cột chờ callback" tone={stats?.pending ? 'primary' : 'default'} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Trạng thái" className="w-40">
          <select className={ctlCls} value={q.filters.status} onChange={(e) => q.setFilters({ status: e.target.value })}>
            <option value="">Mọi trạng thái</option>
            <option value="pending">pending</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="error">error</option>
          </select>
        </Field>
        <Field label="Tìm kiếm" className="w-64">
          <input className={ctlCls} value={q.filters.q} onChange={(e) => q.setFilters({ q: e.target.value })} placeholder="request_id / serial / username" />
        </Field>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <Skeleton className="h-52" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có giao dịch thẻ nào khớp bộ lọc.</p>
          ) : (
            <>
              <div className="px-6 pt-6">
                <TableWrap className="min-w-[1080px]">
                  <thead>
                    <tr>
                      <Th>Thời gian</Th>
                      <Th>User</Th>
                      <Th>Nhà mạng</Th>
                      <Th>Serial</Th>
                      <Th>Code</Th>
                      <Th>Mệnh giá → thực nhận</Th>
                      <Th>P&amp;L</Th>
                      <Th>Xu</Th>
                      <Th>Trạng thái</Th>
                      <Th className="text-right">Đối soát</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-2/60">
                        <Td className="whitespace-nowrap text-muted" >
                          <span title={fmtIsoVN(t.created_at)}>{fmtDateTimeMs(new Date((t.created_at || '').replace(' ', 'T') + 'Z').getTime())}</span>
                        </Td>
                        <Td className="font-mono text-xs text-fg">{t.username}</Td>
                        <Td className="uppercase text-muted">{t.telco}</Td>
                        <Td className="font-mono text-xs text-muted">{t.serial}</Td>
                        <Td className="font-mono text-xs text-fg" >{maskTail(t.card_code_masked, 4)}</Td>
                        <Td>
                          <p className="tabular-nums text-fg">{fmtVnd(t.amount_vnd)}</p>
                          {t.real_amount != null && t.real_amount !== t.amount_vnd && (
                            <p className="text-xs font-semibold tabular-nums text-amber-500">→ {fmtVnd(t.real_amount)}</p>
                          )}
                        </Td>
                        <Td>
                          <PlCell t={t} />
                        </Td>
                        <Td className="tabular-nums text-muted">
                          {t.xu_amount != null ? fmtXu(t.xu_amount) : '—'}
                          {t.bonus_xu != null && t.bonus_xu > 0 && (
                            <span className="ml-1 rounded-full bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-500" title="Thưởng khuyến mãi nạp">
                              +{t.bonus_xu} KM
                            </span>
                          )}
                        </Td>
                        <Td>
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <CardStatusBadge t={t} />
                            {(t.requeue_count ?? 0) > 0 && (
                              <span className="rounded-full bg-surface-2 px-1.5 text-[10px] font-semibold text-muted" title={`Admin đã tạo lại lệnh cộng Xu ${t.requeue_count} lần`}>
                                requeue ×{t.requeue_count}
                              </span>
                            )}
                          </span>
                        </Td>
                        <Td className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            {canRequeueCard(t) && (
                              <InlineConfirm
                                tone="warning"
                                label="↻ Tạo lại lệnh cộng Xu"
                                confirmLabel="Tạo lại lệnh CREDIT?"
                                warning="Chỉ queue lệnh mới — không cộng tay; claim KM giữ nguyên."
                                onConfirm={() => onRequeue(t)}
                              />
                            )}
                            <CopyButton text={t.request_id} label="request" />
                            {t.trans_id != null && <CopyButton text={String(t.trans_id)} label="trans_id" />}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
              <Pagination page={data.page} total={data.total} limit={q.limit} onChange={q.setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminCardTransactionsPage
