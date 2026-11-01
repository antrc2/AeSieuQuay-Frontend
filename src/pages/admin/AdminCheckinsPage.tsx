import { useCallback, useEffect, useState } from 'react'

import { useSeo } from '@/hooks/useSeo'
import {
  getCheckinStats,
  listCheckins,
  type AdminCheckinRow,
  type AdminCheckinStats,
} from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { PageHeader, StatCard, TableWrap, Td, Th } from '@/components/admin/blocks'
import { Field, ctlCls } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  credited: 'success', pending: 'warning', failed: 'default',
}

/** Điểm danh hằng ngày: thống kê + lịch sử. */
export const AdminCheckinsPage = () => {
  useSeo({ title: 'Quản trị — Điểm danh — SV AeSieuQuay', noindex: true })

  const [stats, setStats] = useState<AdminCheckinStats | null>(null)
  const [rows, setRows] = useState<AdminCheckinRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 30
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, list] = await Promise.all([
        getCheckinStats(30).catch(() => null),
        listCheckins({ page, limit, date_from: dateFrom || undefined, date_to: dateTo || undefined, status: status || undefined }),
      ])
      setStats(s)
      setRows(list.items)
      setTotal(list.total)
    } catch (err) {
      await showApiError(err, 'Không tải được dữ liệu điểm danh')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [page, dateFrom, dateTo, status])

  useEffect(() => { load() }, [load])

  const maxCheckins = Math.max(1, ...(stats?.series ?? []).map((d) => d.checkins))
  const pages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Điểm danh hằng ngày"
        description="Thống kê 30 ngày + lịch sử điểm danh (+1 Xu/ngày, reset 00:00 giờ VN)."
        actions={<Button variant="outline" onClick={load} disabled={loading}>Làm mới</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="📅" label="Hôm nay" value={stats ? stats.today.checkins : '—'} />
        <StatCard icon="🪙" label="Xu hôm nay" value={stats ? stats.today.xu : '—'} />
        <StatCard icon="✅" label="Tổng lượt" value={stats ? stats.total.checkins : '—'} />
        <StatCard icon="👥" label="User duy nhất" value={stats ? stats.total.unique_users : '—'} />
        <StatCard icon="💰" label="Tổng Xu" value={stats ? stats.total.xu : '—'} />
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">30 ngày gần nhất</p>
          {stats ? (
            <div className="flex h-24 items-end gap-1">
              {stats.series.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.checkins} lượt, ${d.xu} Xu`}
                  className={cn('flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary', d.checkins === 0 && 'bg-surface-2')}
                  style={{ height: `${Math.max(4, Math.round((d.checkins / maxCheckins) * 100))}%` }}
                />
              ))}
            </div>
          ) : (
            <Skeleton className="h-24" />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Từ ngày" className="w-40">
          <input type="date" className={ctlCls} value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value) }} />
        </Field>
        <Field label="Đến ngày" className="w-40">
          <input type="date" className={ctlCls} value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value) }} />
        </Field>
        <Field label="Trạng thái" className="w-40">
          <select className={ctlCls} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }}>
            <option value="">Mọi trạng thái</option>
            <option value="credited">credited</option>
            <option value="pending">pending</option>
            <option value="failed">failed</option>
          </select>
        </Field>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !rows ? (
            <div className="p-6"><Skeleton className="h-52" /></div>
          ) : !rows || rows.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có lượt điểm danh nào.</p>
          ) : (
            <>
              <div className="px-6 pt-6">
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Ngày</Th>
                      <Th>Người chơi</Th>
                      <Th>Xu</Th>
                      <Th>Trạng thái</Th>
                      <Th>Command</Th>
                      <Th>Ghi chú</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-2/60">
                        <Td className="whitespace-nowrap text-sm tabular-nums">{r.checkin_date}</Td>
                        <Td className="text-sm">
                          {r.realname && <b className="text-fg">{r.realname}</b>}{' '}
                          {r.username && <span className="font-mono text-xs text-muted">({r.username})</span>}
                        </Td>
                        <Td className="tabular-nums">+{r.reward_xu}</Td>
                        <Td><Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>{r.status}</Badge></Td>
                        <Td className="font-mono text-[11px] text-muted">{r.command_id ? `${r.command_id.slice(0, 8)}…` : '—'}</Td>
                        <Td className="max-w-[240px] truncate text-xs text-muted">{r.note || '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
              <div className="flex items-center justify-between px-6 py-4 text-sm">
                <span className="text-muted">Tổng {total} lượt</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Trước</Button>
                  <span className="tabular-nums text-muted">{page}/{pages}</span>
                  <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Sau →</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminCheckinsPage