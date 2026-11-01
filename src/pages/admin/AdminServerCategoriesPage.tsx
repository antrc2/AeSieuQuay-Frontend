import { useCallback, useEffect, useState } from 'react'

import { useSeo } from '@/hooks/useSeo'
import {
  createServerCategory,
  deleteServerCategory,
  listServerCategories,
  updateServerCategory,
  type AdminServerCategory,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, TableWrap, Td, Th } from '@/components/admin/blocks'
import { ActiveBadge } from '@/components/admin/badges'
import { Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'

/**
 * Thể loại máy chủ — như DANH MỤC SẢN PHẨM (survival / skyblock / giải trí).
 * Máy chủ (trang Servers) gán vào một thể loại; trang user /may-chu lọc theo
 * thể loại qua `?the-loai=<slug>` và /may-chu/the-loai/<slug>.
 */

type Draft = { name: string; description: string; sort_order: string; is_active: boolean }

const emptyDraft = (): Draft => ({ name: '', description: '', sort_order: '0', is_active: true })

const draftOf = (c: AdminServerCategory): Draft => ({
  name: c.name,
  description: c.description ?? '',
  sort_order: String(c.sort_order),
  is_active: c.is_active,
})

const CategoryModal = ({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: AdminServerCategory | 'new' | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(editing && editing !== 'new' ? draftOf(editing) : emptyDraft())
    setErrors({})
  }, [open, editing])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const e: Partial<Record<keyof Draft, string>> = {}
    if (!draft.name.trim()) e.name = 'Bắt buộc'
    setErrors(e)
    if (Object.keys(e).length > 0 || busy) return
    setBusy(true)
    try {
      const body = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        sort_order: Number(draft.sort_order || 0),
        is_active: draft.is_active,
      }
      if (editing && editing !== 'new') await updateServerCategory(editing.id, body)
      else await createServerCategory(body)
      await showSuccess(editing && editing !== 'new' ? 'Đã cập nhật thể loại' : 'Đã thêm thể loại', '')
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, 'Không lưu được thể loại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing && editing !== 'new' ? `Sửa thể loại #${editing.id}` : 'Thể loại mới'}
      description="Như danh mục sản phẩm: survival / skyblock / giải trí…"
      className="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên *" error={errors.name} hint="Slug tự sinh từ tên (giữ ổn định khi đổi tên)." className="sm:col-span-2">
          <input className={ctlCls} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="SkyBlock" />
        </Field>
        <Field label="Mô tả" className="sm:col-span-2">
          <input className={ctlCls} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Sort order">
          <input className={cn(ctlCls, 'tabular-nums')} inputMode="numeric" value={draft.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
        </Field>
        <Field label="Trạng thái">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            is_active
          </label>
        </Field>
      </div>
    </Modal>
  )
}

export const AdminServerCategoriesPage = () => {
  useSeo({ title: 'Quản trị — Thể loại máy chủ — SV AeSieuQuay', noindex: true })

  const [rows, setRows] = useState<AdminServerCategory[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminServerCategory | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listServerCategories({ include_inactive: true }))
    } catch (err) {
      await showApiError(err, 'Không tải được thể loại')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thể loại máy chủ"
        description="Danh mục như sản phẩm: survival / skyblock / giải trí… Máy chủ gán thể loại ở trang Máy chủ; trang /may-chu lọc theo thể loại."
        actions={<Button onClick={() => setEditing('new')}>+ Thêm thể loại</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading && !rows ? (
            <div className="p-6"><Skeleton className="h-52" /></div>
          ) : !rows || rows.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có thể loại nào.</p>
          ) : (
            <div className="px-6 pt-6">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Tên</Th>
                    <Th>Slug</Th>
                    <Th>Mô tả</Th>
                    <Th>Máy chủ</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/60">
                      <Td className="font-semibold">{c.name}</Td>
                      <Td className="font-mono text-xs text-muted">{c.slug}</Td>
                      <Td className="max-w-[280px] truncate text-sm text-muted">{c.description || '—'}</Td>
                      <Td className="tabular-nums">{c.server_count ?? 0}</Td>
                      <Td><ActiveBadge active={c.is_active} /></Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Sửa</Button>
                          {c.is_active ? (
                            <InlineConfirm
                              tone="danger"
                              size="sm"
                              label="Tắt"
                              confirmLabel="Tắt thể loại?"
                              warning="Máy chủ thuộc thể loại vẫn giữ nguyên, chỉ ẩn khỏi bộ lọc."
                              onConfirm={async () => {
                                try {
                                  await deleteServerCategory(c.id)
                                  await load()
                                } catch (err) {
                                  await showApiError(err, 'Không tắt được thể loại')
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryModal open={editing !== null} editing={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  )
}

export default AdminServerCategoriesPage