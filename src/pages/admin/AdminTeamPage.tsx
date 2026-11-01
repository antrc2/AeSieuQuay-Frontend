import { useCallback, useEffect, useState } from 'react'

import { useSeo } from '@/hooks/useSeo'
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  updateTeamMember,
  uploadContentImage,
  type AdminTeamMember,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, TableWrap, Td, Th } from '@/components/admin/blocks'
import { ActiveBadge } from '@/components/admin/badges'
import { Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'

/**
 * Ban quản trị MÁY CHỦ MINECRAFT — form tối giản theo mẫu:
 * Họ và tên*, Chức vụ*, Thứ tự hiển thị (Index), Ảnh đại diện (optional).
 */

type Draft = { name: string; role_title: string; sort_order: string; avatar_url: string; avatar_key: string }

const emptyDraft = (): Draft => ({ name: '', role_title: '', sort_order: '0', avatar_url: '', avatar_key: '' })

const draftOf = (m: AdminTeamMember): Draft => ({
  name: m.name,
  role_title: m.role_title,
  sort_order: String(m.sort_order),
  avatar_url: m.avatar_url ?? '',
  avatar_key: m.avatar_key ?? '',
})

const MemberModal = ({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminTeamMember | 'new' | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!editing) return
    setDraft(editing === 'new' ? emptyDraft() : draftOf(editing))
    setErrors({})
  }, [editing])

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const onPickAvatar = async (file: File) => {
    setUploading(true)
    try {
      const res = await uploadContentImage(file)
      set({ avatar_url: res.url, avatar_key: res.key ?? '' })
    } catch (err) {
      await showApiError(err, 'Upload ảnh thất bại')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    const e: Partial<Record<keyof Draft, string>> = {}
    if (!draft.name.trim()) e.name = 'Bắt buộc'
    if (!draft.role_title.trim()) e.role_title = 'Bắt buộc'
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const body = {
        name: draft.name.trim(),
        role_title: draft.role_title.trim(),
        sort_order: Number(draft.sort_order || 0),
        avatar_url: draft.avatar_url.trim() || null,
        avatar_key: draft.avatar_key.trim() || null,
      }
      if (editing && editing !== 'new') await updateTeamMember(editing.id, body)
      else await createTeamMember(body)
      await showSuccess(editing && editing !== 'new' ? 'Đã cập nhật thành viên' : 'Đã thêm thành viên', '')
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, 'Không lưu được thành viên')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing && editing !== 'new' ? `Sửa thành viên #${editing.id}` : 'Thêm thành viên'}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Họ và tên *" error={errors.name}>
          <input className={ctlCls} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Chức vụ *" error={errors.role_title}>
          <input className={ctlCls} value={draft.role_title} onChange={(e) => set({ role_title: e.target.value })} placeholder="VD: Chủ nhiệm" />
        </Field>
        <Field label="Thứ tự hiển thị (Index)" hint="Số nhỏ hơn hiện trước.">
          <input className={ctlCls} inputMode="numeric" value={draft.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
        </Field>
        <Field label="Ảnh đại diện" hint="Không bắt buộc — bỏ trống sẽ hiện chữ cái đầu của tên.">
          <div className="flex items-center gap-3">
            {draft.avatar_url ? (
              <img src={draft.avatar_url} alt="" className="h-12 w-12 rounded-full border border-border-c object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-sm text-muted">—</span>
            )}
            <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-border-c px-3 text-xs font-semibold hover:bg-surface-2">
              {uploading ? 'Đang upload…' : 'Chọn ảnh'}
              <input type="file" accept="image/*" hidden disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickAvatar(f); e.target.value = '' }} />
            </label>
            {draft.avatar_url && (
              <Button size="sm" variant="ghost" onClick={() => set({ avatar_url: '', avatar_key: '' })}>Bỏ ảnh</Button>
            )}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

export const AdminTeamPage = () => {
  useSeo({ title: 'Quản trị — Ban quản trị — SV AeSieuQuay', noindex: true })

  const [rows, setRows] = useState<AdminTeamMember[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminTeamMember | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listTeamMembers({ include_inactive: true }))
    } catch (err) {
      await showApiError(err, 'Không tải được Ban quản trị')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ban quản trị"
        description="Hiển thị ở trang /ban-quan-tri — đội ngũ vận hành máy chủ Minecraft."
        actions={<Button onClick={() => setEditing('new')}>+ Thêm thành viên</Button>}
      />
      <Card>
        <CardContent className="p-0">
          {loading && !rows ? (
            <div className="p-6"><Skeleton className="h-52" /></div>
          ) : !rows || rows.length === 0 ? (
            <p className="p-6 text-sm text-muted">Chưa có thành viên nào.</p>
          ) : (
            <div className="px-6 pt-6">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Thành viên</Th>
                    <Th>Chức vụ</Th>
                    <Th>Index</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-2/60">
                      <Td>
                        <div className="flex items-center gap-2">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xs font-bold">{m.name.charAt(0)}</span>
                          )}
                          <span className="font-semibold">{m.name}</span>
                        </div>
                      </Td>
                      <Td className="text-sm">{m.role_title}</Td>
                      <Td className="tabular-nums text-sm text-muted">{m.sort_order}</Td>
                      <Td><ActiveBadge active={m.is_active} /></Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>Sửa</Button>
                          {m.is_active ? (
                            <InlineConfirm
                              tone="danger" size="sm" label="Tắt" confirmLabel="Tắt thành viên?"
                              warning="Thành viên sẽ ẩn khỏi trang /ban-quan-tri."
                              onConfirm={async () => { try { await deleteTeamMember(m.id); await load() } catch (err) { await showApiError(err, 'Không tắt được') } }}
                            />
                          ) : (
                            <Button size="sm" variant="outline" onClick={async () => {
                              try { await updateTeamMember(m.id, { is_active: true }); await load() }
                              catch (err) { await showApiError(err, 'Không bật lại được') }
                            }}>Bật lại</Button>
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
      <MemberModal editing={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  )
}

export default AdminTeamPage