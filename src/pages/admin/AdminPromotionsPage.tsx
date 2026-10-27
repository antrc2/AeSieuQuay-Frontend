import { useCallback, useEffect, useRef, useState } from 'react'

import { useSeo } from '@/hooks/useSeo'
import {
  createPromotion,
  deactivatePromotion,
  listPromotions,
  updatePromotion,
  type AdminPromotion,
  type PagedAdmin,
  type PromotionChannel,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, TableWrap, Td, Th } from '@/components/admin/blocks'
import Pagination from '@/components/admin/Pagination'
import Modal from '@/components/admin/Modal'
import { Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import usePagedQuery from '@/hooks/usePagedQuery'
import { fmtIsoVN, isoToMs } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * FRONTEND-4 §4 — /admin/promotions (backend-4 §4.5).
 * Admin tạo/sửa event KM nạp (card|bank|all), soft-off "Tắt" — KHÔNG có nút xóa hard
 * (API không expose delete khi đã có claim). Trùng giờ cùng kênh → 409, message backend
 * đã nêu event xung đột (toast thẳng).
 */

const CHANNEL_LABEL: Record<PromotionChannel, string> = { card: 'Thẻ cào', bank: 'Bank', all: 'Mọi kênh' }
const CHANNEL_VARIANT: Record<PromotionChannel, 'brand' | 'success' | 'default'> = { card: 'brand', bank: 'success', all: 'default' }

type PromoState = { label: string; variant: 'brand' | 'success' | 'default'; pulse?: boolean }

const promoState = (p: AdminPromotion, nowMs: number): PromoState => {
  if (!p.is_active) return { label: 'Đã tắt', variant: 'default' }
  const s = isoToMs(p.starts_at)
  const e = isoToMs(p.ends_at)
  if (s && nowMs < s) return { label: 'Sắp diễn ra', variant: 'brand' }
  if (e && nowMs > e) return { label: 'Đã kết thúc', variant: 'default' }
  return { label: 'Đang chạy', variant: 'success', pulse: true }
}

/* ================= Form modal ================= */

interface Draft {
  name: string
  applies_to: PromotionChannel
  bonus_percent: string
  starts_at: string // datetime-local
  ends_at: string
  max_users: string
  max_per_user: string
  is_active: boolean
}

const EMPTY_DRAFT: Draft = {
  name: '',
  applies_to: 'all',
  bonus_percent: '20',
  starts_at: '',
  ends_at: '',
  max_users: '10',
  max_per_user: '1',
  is_active: true,
}

const toDraft = (p: AdminPromotion): Draft => ({
  name: p.name,
  applies_to: p.applies_to,
  bonus_percent: String(p.bonus_percent),
  starts_at: String(p.starts_at).slice(0, 16).replace(' ', 'T'),
  ends_at: String(p.ends_at).slice(0, 16).replace(' ', 'T'),
  max_users: String(p.max_users),
  max_per_user: String(p.max_per_user),
  is_active: p.is_active,
})

const PromotionFormModal = ({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: AdminPromotion | 'new' | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [busy, setBusy] = useState(false)

  // đồng bộ draft khi mở modal (new = trắng, edit = copy row)
  useEffect(() => {
    if (!open) return
    setDraft(editing && editing !== 'new' ? toDraft(editing) : EMPTY_DRAFT)
    setErrors({})
  }, [open, editing])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const validate = (): boolean => {
    const e: Partial<Record<keyof Draft, string>> = {}
    if (!draft.name.trim()) e.name = 'Bắt buộc'
    const bonus = Number(draft.bonus_percent)
    if (!Number.isFinite(bonus) || bonus <= 0 || bonus > 500) e.bonus_percent = 'Phải trong (0, 500]'
    if (!draft.starts_at || !draft.ends_at) e.ends_at = 'Bắt buộc chọn khoảng thời gian'
    // client-check TRƯỚC: starts_at >= ends_at là sai (backend-4 §4.2)
    else if (draft.starts_at >= draft.ends_at) e.starts_at = 'Bắt đầu phải trước khi kết thúc'
    const mu = Number(draft.max_users)
    if (!Number.isInteger(mu) || mu < 1) e.max_users = '≥ 1 (số người chơi DUy NHẤT nhận bonus)'
    const mpu = Number(draft.max_per_user || '1')
    if (!Number.isInteger(mpu) || mpu < 1) e.max_per_user = '≥ 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate() || busy) return
    setBusy(true)
    try {
      const body = {
        name: draft.name.trim(),
        applies_to: draft.applies_to,
        bonus_percent: Number(draft.bonus_percent),
        starts_at: draft.starts_at,
        ends_at: draft.ends_at,
        max_users: Number(draft.max_users),
        max_per_user: Number(draft.max_per_user || '1'),
        is_active: draft.is_active,
      }
      if (editing && editing !== 'new') await updatePromotion(editing.id, body)
      else await createPromotion(body)
      await showSuccess(editing && editing !== 'new' ? 'Đã cập nhật event' : 'Đã tạo event', 'Banner /nap-the cập nhật trong ≤90s (cache).')
      onSaved()
      onClose()
    } catch (err) {
      // 409 "Trùng thời gian với event '#id name'" — toast thẳng message backend (§4).
      await showApiError(err, 'Không lưu được event')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing && editing !== 'new' ? `Sửa event #${editing.id}` : 'Event khuyến mãi mới'}
      description="Một kênh chỉ 1 event active tại 1 thời điểm — chồng giờ sẽ bị 409."
      className="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu event'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên event" error={errors.name} className="sm:col-span-2">
          <input className={ctlCls} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="VD: Mừng ra mắt — +20% Xu" />
        </Field>
        <Field label="Kênh áp dụng">
          <select className={ctlCls} value={draft.applies_to} onChange={(e) => set({ applies_to: e.target.value as PromotionChannel })}>
            <option value="all">Mọi kênh (card + bank)</option>
            <option value="card">Chỉ thẻ cào</option>
            <option value="bank">Chỉ chuyển khoản</option>
          </select>
        </Field>
        <Field label="Bonus (%)" error={errors.bonus_percent} hint="0 < x ≤ 500">
          <input className={cn(ctlCls, 'tabular-nums')} type="number" min={0.5} max={500} step={0.5} value={draft.bonus_percent} onChange={(e) => set({ bonus_percent: e.target.value })} />
        </Field>
        <Field label="Bắt đầu" error={errors.starts_at}>
          <input className={ctlCls} type="datetime-local" value={draft.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
        </Field>
        <Field label="Kết thúc" error={errors.ends_at}>
          <input className={ctlCls} type="datetime-local" value={draft.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
        </Field>
        <Field label="Suất tối đa (max_users)" error={errors.max_users} hint="Đếm user DISTINCT nhận bonus">
          <input className={cn(ctlCls, 'tabular-nums')} type="number" min={1} value={draft.max_users} onChange={(e) => set({ max_users: e.target.value })} />
        </Field>
        <Field label="GD tối đa / user" error={errors.max_per_user}>
          <input className={cn(ctlCls, 'tabular-nums')} type="number" min={1} value={draft.max_per_user} onChange={(e) => set({ max_per_user: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
          Bật event (is_active)
        </label>
      </div>
    </Modal>
  )
}

/* ================= Trang ================= */

export const AdminPromotionsPage = () => {
  useSeo({ title: 'Quản trị — Khuyến mãi nạp — SV AeSieuQuay', noindex: true })

  const q = usePagedQuery({}, 20)
  const [data, setData] = useState<PagedAdmin<AdminPromotion> | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminPromotion | 'new' | null>(null)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listPromotions(q.query)
      if (aliveRef.current) setData(res)
    } catch (err) {
      if (aliveRef.current) {
        await showApiError(err, 'Không tải được danh sách event')
        setData((d) => d ?? { total: 0, page: 1, limit: 20, items: [] })
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

  const nowMs = Date.now()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khuyến mãi nạp"
        description="Event +Xu cho thẻ cào / chuyển khoản. Mỗi kênh chỉ 1 event chạy tại 1 thời điểm; claim nguyên tử lúc credit, tối đa max_users người chơi duy nhất."
        actions={
          <Button onClick={() => setEditing('new')}>+ Tạo event</Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6">
              <Skeleton className="h-52" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có event khuyến mãi nào.</p>
          ) : (
            <>
              <div className="px-6 pt-6">
                <TableWrap className="min-w-[960px]">
                  <thead>
                    <tr>
                      <Th>Tên event</Th>
                      <Th>Kênh</Th>
                      <Th>Bonus</Th>
                      <Th>Thời gian</Th>
                      <Th>Trạng thái</Th>
                      <Th>Tiến độ nhận</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((p) => {
                      const st = promoState(p, nowMs)
                      const pct = p.max_users > 0 ? Math.min(100, Math.round(((p.claimed_users ?? 0) / p.max_users) * 100)) : 0
                      return (
                        <tr key={p.id} className="hover:bg-surface-2/60">
                          <Td>
                            <p className="font-semibold text-fg">#{p.id} {p.name}</p>
                            <p className="text-xs text-muted">≤{p.max_per_user} GD/user</p>
                          </Td>
                          <Td>
                            <Badge variant={CHANNEL_VARIANT[p.applies_to]}>{CHANNEL_LABEL[p.applies_to]}</Badge>
                          </Td>
                          <Td className="tabular-nums font-semibold text-emerald-500">+{p.bonus_percent}%</Td>
                          <Td className="whitespace-nowrap text-xs tabular-nums text-muted">
                            {fmtIsoVN(p.starts_at)}
                            <br />→ {fmtIsoVN(p.ends_at)}
                          </Td>
                          <Td>
                            <Badge variant={st.variant} className={st.pulse ? 'animate-pulse' : undefined}>
                              {st.label}
                            </Badge>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                                <span
                                  className={cn('block h-full rounded-full', pct >= 100 ? 'bg-amber-500' : 'bg-primary')}
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                              <span className="text-xs tabular-nums text-muted">
                                {p.claimed_users ?? 0}/{p.max_users}
                              </span>
                            </div>
                          </Td>
                          <Td className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                                Sửa
                              </Button>
                              {p.is_active ? (
                                <InlineConfirm
                                  tone="danger"
                                  size="sm"
                                  label="Tắt"
                                  confirmLabel="Tắt event?"
                                  warning="Không xoá được khi đã có claim — chỉ soft-off."
                                  onConfirm={async () => {
                                    try {
                                      await deactivatePromotion(p.id)
                                      setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === p.id ? { ...x, is_active: false } : x)) } : d))
                                    } catch (err) {
                                      await showApiError(err, 'Không tắt được event')
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </div>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
              </div>
              <Pagination page={data.page} total={data.total} limit={q.limit} onChange={q.setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <PromotionFormModal open={editing !== null} editing={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  )
}

export default AdminPromotionsPage
