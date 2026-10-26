import { useCallback, useEffect, useRef, useState } from 'react'

import { useSeo } from '@/hooks/useSeo'
import {
  getUser,
  listBankDeposits,
  listPointTransfers,
  listUsers,
  type BankDepositAdmin,
  type PointTransferAdmin,
  type AdminUser,
  type AdminUserDetail,
  type PagedAdmin,
} from '@/api/admin'
import { showApiError } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import BankDepositsTable from '@/components/admin/BankDepositsTable'
import PointTransfersTable from '@/components/admin/PointTransfersTable'
import SidePanel from '@/components/admin/SidePanel'
import Pagination from '@/components/admin/Pagination'
import { Field, ctlCls } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'
import usePagedQuery from '@/hooks/usePagedQuery'
import { fmtIsoVN, fmtVnd, fmtXu, isoToMs, timeAgo } from '@/lib/format'

type SortKey = 'id' | 'username' | 'regdate' | 'lastlogin'

const COLUMNS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'username', label: 'Username' },
  { key: null, label: 'Tên hiển thị' },
  { key: null, label: 'Email' },
  { key: null, label: 'Role' },
  { key: 'regdate', label: 'Đăng ký' },
  { key: 'lastlogin', label: 'Last login' },
]

export const AdminUsersPage = () => {
  useSeo({ title: 'Quản trị — Tài khoản — SV AeSieuQuay', noindex: true })

  const q = usePagedQuery<{ q: string; sort: string; order: string }>({ q: '', sort: 'regdate', order: 'desc' }, 20)
  const [data, setData] = useState<PagedAdmin<AdminUser> | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchDraft, setSearchDraft] = useState(q.filters.q)
  const [openUserId, setOpenUserId] = useState<number | null>(null)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listUsers(q.query)
      if (aliveRef.current) setData(res)
    } catch (err) {
      if (aliveRef.current) {
        await showApiError(err, 'Không tải được danh sách user')
        setData({ total: 0, page: 1, page_size: 20, items: [] })
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [q.query])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load])

  /* search debounce 300ms → đổi filter q (usePagedQuery tự reset page=1). */
  useEffect(() => {
    if (searchDraft === q.filters.q) return
    const t = setTimeout(() => q.setFilters({ q: searchDraft.trim() }), 300)
    return () => clearTimeout(t)
  }, [searchDraft, q])

  const sortBy = (key: SortKey) => {
    const same = q.filters.sort === key
    q.setFilters({ sort: key, order: same && q.filters.order === 'desc' ? 'asc' : 'desc' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài khoản"
        description="Chỉ đọc — đổi role / mật khẩu chưa có API (thực hiện qua SQL tới khi backend mở endpoint)."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <Field label="Tìm kiếm" className="w-80">
        <input
          className={ctlCls}
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="username / tên hiển thị / email"
        />
      </Field>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <Skeleton className="h-52" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="p-6 text-sm text-muted">Không có tài khoản nào khớp.</p>
          ) : (
            <>
              <div className="overflow-x-auto px-6 pt-6">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead>
                    <tr>
                      {COLUMNS.map((c) => (
                        <th key={c.label} className="border-b border-border-c px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          {c.key ? (
                            <button
                              type="button"
                              onClick={() => sortBy(c.key!)}
                              className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-fg"
                            >
                              {c.label}
                              <span className="tabular-nums">{q.filters.sort === c.key ? (q.filters.order === 'desc' ? '↓' : '↑') : '↕'}</span>
                            </button>
                          ) : (
                            c.label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((u) => (
                      <tr
                        key={u.id}
                        className="cursor-pointer hover:bg-surface-2/60"
                        onClick={() => setOpenUserId(u.id)}
                      >
                        <td className="border-b border-border-c px-3 py-2.5 tabular-nums text-muted">{u.id}</td>
                        <td className="border-b border-border-c px-3 py-2.5 font-mono text-xs font-semibold text-fg">{u.username}</td>
                        <td className="border-b border-border-c px-3 py-2.5 text-fg">{u.realname || '—'}</td>
                        <td className="border-b border-border-c px-3 py-2.5 text-muted">{u.email ?? '—'}</td>
                        <td className="border-b border-border-c px-3 py-2.5">
                          <Badge variant={u.role_slug === 'admin' ? 'brand' : 'default'} title="đổi role qua SQL cho tới khi có API">
                            {u.role_slug}
                          </Badge>
                        </td>
                        <td className="border-b border-border-c px-3 py-2.5 whitespace-nowrap text-muted">{fmtIsoVN(u.registered_at)}</td>
                        <td className="border-b border-border-c px-3 py-2.5 whitespace-nowrap text-muted" title={fmtIsoVN(u.last_login)}>
                          {u.last_login ? timeAgo(isoToMs(u.last_login)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} total={data.total} limit={q.limit} onChange={q.setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <UserFinanceDrawer userId={openUserId} onClose={() => setOpenUserId(null)} />
    </div>
  )
}

/* ================= Drawer hồ sơ tài chính per-user (§5.1) =================
 * money_summary + 2 tab CON reuse đúng BankDepositsTable / PointTransfersTable
 * với user_id filter (backend-3 §2.2) — không viết bảng riêng.
 */

const UserFinanceDrawer = ({ userId, onClose }: { userId: number | null; onClose: () => void }) => {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [tab, setTab] = useState<'bank' | 'transfers'>('bank')
  const [deposits, setDeposits] = useState<PagedAdmin<BankDepositAdmin> | null>(null)
  const [transfers, setTransfers] = useState<PagedAdmin<PointTransferAdmin> | null>(null)

  useEffect(() => {
    if (userId == null) {
      setDetail(null)
      setDeposits(null)
      setTransfers(null)
      return
    }
    let alive = true
    setTab('bank')
    getUser(userId)
      .then((d) => alive && setDetail(d))
      .catch(() => undefined)
    // reuse 2 API lịch sử với user_id= (backend-3 §2.2) — không endpoint riêng.
    listBankDeposits({ user_id: userId, limit: 50 })
      .then((d) => alive && setDeposits(d))
      .catch(() => undefined)
    listPointTransfers({ user_id: userId, limit: 50 })
      .then((d) => alive && setTransfers(d))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [userId])

  const s = detail?.money_summary

  return (
    <SidePanel
      open={userId != null}
      onClose={onClose}
      title={detail ? `${detail.realname || detail.username} (${detail.username})` : 'Hồ sơ'}
      description={
        detail ? (
          <span className="text-xs text-muted">
            user #{detail.id} · role {detail.role_slug} · đăng ký {fmtIsoVN(detail.registered_at)}
          </span>
        ) : undefined
      }
    >
      {!detail ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Bank" value={s ? String(s.bank_deposits.count) : '—'} sub={s ? fmtVnd(s.bank_deposits.sum_vnd_credited) : ''} />
            <MiniStat label="Thẻ" value={s ? String(s.card_tx.count) : '—'} sub={s ? fmtVnd(s.card_tx.sum_vnd_success) : ''} />
            <MiniStat label="Transfer" value={s ? String(s.point_transfers.count) : '—'} sub={s ? fmtXu(s.point_transfers.sum_amount) : ''} />
          </div>

          <div className="flex rounded-xl border border-border-c bg-surface-2 p-1">
            {(['bank', 'transfers'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  tab === id ? 'bg-primary text-white' : 'text-muted hover:text-fg',
                )}
              >
                {id === 'bank' ? 'Nạp bank' : 'Chuyển Xu'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {tab === 'bank' ? (
              deposits ? (
                <BankDepositsTable
                  rows={deposits.items}
                  onChanged={(row) =>
                    setDeposits((d) => (d ? { ...d, items: d.items.map((r) => (r.id === row.id ? { ...r, ...row } : r)) } : d))
                  }
                />
              ) : (
                <Skeleton className="h-32" />
              )
            ) : transfers ? (
              transfers.items.length ? (
                <PointTransfersTable rows={transfers.items} />
              ) : (
                <p className="text-sm text-muted">Chưa có transfer nào.</p>
              )
            ) : (
              <Skeleton className="h-32" />
            )}
          </div>
        </div>
      )}
    </SidePanel>
  )
}

const MiniStat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-border-c bg-surface-2/60 p-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    <p className="text-lg font-extrabold tabular-nums text-fg">{value}</p>
    {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
  </div>
)

export default AdminUsersPage
