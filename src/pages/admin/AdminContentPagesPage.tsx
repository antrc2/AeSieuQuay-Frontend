import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  createContentPage,
  deleteContentPage,
  listContentPages,
  updateContentPage,
  type AdminContentPage,
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

type Draft = { title: string; sort_order: string; show_in_footer: boolean; is_active: boolean }

const emptyDraft = (): Draft => ({ title: '', sort_order: '0', show_in_footer: true, is_active: true })

const PageModal = ({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminContentPage | 'new' | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editing) return
    setDraft(editing === 'new' ? emptyDraft() : {
      title: editing.title,
      sort_order: String(editing.sort_order),
      show_in_footer: editing.show_in_footer,
      is_active: editing.is_active,
    })
    setErrors({})
  }, [editing])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const e: Partial<Record<keyof Draft, string>> = {}
    if (!draft.title.trim()) e.title = 'Bắt buộc'
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const body = {
        title: draft.title.trim(),
        sort_order: Number(draft.sort_order || 0),
        show_in_footer: draft.show_in_footer,
        is_active: draft.is_active,
      }
      if (editing && editing !== 'new') await updateContentPage(editing.id, body)
      else await createContentPage(body)
      await showSuccess(editing && editing !== 'new' ? 'Đã cập nhật trang' : 'Đã thêm trang', 'Soạn nội dung HTML ở nút "Nội dung".')
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, 'Không lưu được trang')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing && editing !== 'new' ? `Sửa trang #${editing.id}` : 'Trang nội dung mới'}
      className="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tiêu đề *" error={errors.title} className="sm:col-span-2">
          <input className={ctlCls} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Sort order">
          <input className={cn(ctlCls, 'tabular-nums')} inputMode="numeric" value={draft.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
        </Field>
        <Field label="Tuỳ chọn">
          <div className="flex h-9 items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.show_in_footer} onChange={(e) => set({ show_in_footer: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
              footer
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
              is_active
            </label>
          </div>
        </Field>
      </div>
    </Modal>
  )
}

export const AdminContentPagesPage = () => {
  useSeo({ title: 'Quản trị — Trang nội dung — SV AeSieuQuay', noindex: true })
  const navigate = useNavigate()

  const [rows, setRows] = useState<AdminContentPage[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminContentPage | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listContentPages({ include_inactive: true }))
    } catch (err) {
      await showApiError(err, 'Không tải được danh sách trang')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trang nội dung"
        description="Luật lệ / Điều khoản dịch vụ / Chính sách bảo mật (và trang tĩnh khác) — soạn HTML như editor máy chủ."
        actions={<Button onClick={() => setEditing('new')}>+ Thêm trang</Button>}
      />
      <Card>
        <CardContent className="p-0">
          {loading && !rows ? (
            <div className="p-6"><Skeleton className="h-52" /></div>
          ) : !rows || rows.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có trang nào.</p>
          ) : (
            <div className="px-6 pt-6">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Tiêu đề</Th>
                    <Th>Slug</Th>
                    <Th>Version</Th>
                    <Th>Footer</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/60">
                      <Td className="font-semibold">{p.title}</Td>
                      <Td className="font-mono text-xs text-muted">/{p.slug}</Td>
                      <Td className="tabular-nums text-sm">{p.content_version}</Td>
                      <Td className="text-sm text-muted">{p.show_in_footer ? 'có' : '—'}</Td>
                      <Td><ActiveBadge active={p.is_active} /></Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" onClick={() => navigate(`/admin/pages/${p.id}/content`)}>Nội dung</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>Sửa</Button>
                          {p.is_active ? (
                            <InlineConfirm
                              tone="danger" size="sm" label="Tắt" confirmLabel="Tắt trang?"
                              warning="Trang sẽ trả 404 với người dùng."
                              onConfirm={async () => { try { await deleteContentPage(p.id); await load() } catch (err) { await showApiError(err, 'Không tắt được trang') } }}
                            />
                          ) : <span className="text-xs text-muted">—</span>}
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
      <PageModal editing={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  )
}

export default AdminContentPagesPage