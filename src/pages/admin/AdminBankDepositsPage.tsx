import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import { listBankDeposits, type BankDepositAdmin } from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import BankDepositsTable from '@/components/admin/BankDepositsTable'
import Pagination from '@/components/admin/Pagination'
import { Field, ctlCls } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import usePagedQuery from '@/hooks/usePagedQuery'
import type { PagedAdmin } from '@/api/admin'

const POLL_MS = 3_000

/** Row chưa terminal → badge "Đang gửi game…" — chỉ khi còn row này mới poll. */
const hasInFlight = (rows: BankDepositAdmin[]) =>
  rows.some((r) => r.status === 'credited' && (r.credit_command_status === 'pending' || r.credit_command_status === 'claimed'))

export const AdminBankDepositsPage = () => {
  useSeo({ title: 'Quản trị — Nạp bank — SV AeSieuQuay', noindex: true })

  // Deep link: ?status=unmatched / ?q=<command_id> (chip từ trang points).
  const [searchParams] = useSearchParams()
  const q = usePagedQuery({
    status: searchParams.get('status') ?? '',
    q: searchParams.get('q') ?? '',
  }, 20)

  const [data, setData] = useState<PagedAdmin<BankDepositAdmin> | null>(null)
  const [loading, setLoading] = useState(true)
  const aliveRef = useRef(true)

  const fetchPage = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      try {
        const res = await listBankDeposits(q.query)
        if (!aliveRef.current) return
        setData(res)
      } catch (err) {
        if (!aliveRef.current) return
        if (!opts.silent) await showApiError(err, 'Không tải được lịch sử nạp')
        setData((d) => d ?? { total: 0, page: 1, limit: 20, items: [] })
      } finally {
        if (aliveRef.current) setLoading(false)
      }
    },
    [q.query],
  )

  useEffect(() => {
    aliveRef.current = true
    fetchPage()
    return () => {
      aliveRef.current = false
    }
  }, [fetchPage])

  /* Poll 3s im lặng khi còn lệnh pending/claimed — hết row non-terminal thì dừng. */
  const polling = !!data && hasInFlight(data.items)
  useEffect(() => {
    if (!polling) return
    const timer = setInterval(() => fetchPage({ silent: true }), POLL_MS)
    return () => clearInterval(timer)
  }, [polling, fetchPage])

  const onRowChanged = (row: BankDepositAdmin) => {
    setData((d) => (d ? { ...d, items: d.items.map((r) => (r.id === row.id ? { ...r, ...row } : r)) } : d))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử nạp bank"
        description={
          polling ? 'Đang có lệnh chờ agent — trang tự cập nhật mỗi 3 giây.' : 'Webhook tự động 100%; action duy nhất là "tạo lại event".'
        }
        actions={
          <Button variant="outline" onClick={() => fetchPage()} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Trạng thái" className="w-44">
          <select className={ctlCls} value={q.filters.status} onChange={(e) => q.setFilters({ status: e.target.value })}>
            <option value="">Mọi trạng thái</option>
            <option value="received">received</option>
            <option value="unmatched">unmatched</option>
            <option value="matched">matched</option>
            <option value="credited">credited</option>
            <option value="rejected">rejected</option>
            <option value="ignored">ignored</option>
          </select>
        </Field>
        <Field label="Tìm kiếm" className="w-72">
          <input
            className={ctlCls}
            value={q.filters.q}
            onChange={(e) => q.setFilters({ q: e.target.value })}
            placeholder="nội dung CK / mã GD / command id"
          />
        </Field>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <Skeleton className="h-52" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="p-6 text-sm text-muted">Không có giao dịch khớp bộ lọc.</p>
          ) : (
            <>
              <div className="px-6 pt-6">
                <BankDepositsTable rows={data.items} onChanged={onRowChanged} />
              </div>
              <Pagination page={data.page} total={data.total} limit={q.limit} onChange={q.setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminBankDepositsPage
