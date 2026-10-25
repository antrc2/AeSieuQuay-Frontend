import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  createGameMode,
  deleteGameMode,
  listClusters,
  listGameModes,
  updateGameMode,
  type AdminCluster,
  type AdminGameMode,
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

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

const STATUS_LABEL: Record<string, string> = { hot: '🔥 HOT', new: '✨ MỚI', normal: 'normal' }

type ModeDraft = {
  slug: string
  name: string
  tagline: string
  short_desc: string
  status: AdminGameMode['status']
  cluster_id: string
  sort_order: string
  is_active: boolean
}

const emptyDraft = (): ModeDraft => ({
  slug: '',
  name: '',
  tagline: '',
  short_desc: '',
  status: 'normal',
  cluster_id: '',
  sort_order: '0',
  is_active: true,
})

const draftFromMode = (m: AdminGameMode): ModeDraft => ({
  slug: m.slug,
  name: m.name,
  tagline: m.tagline ?? '',
  short_desc: m.short_desc ?? '',
  status: m.status,
  cluster_id: m.cluster_id == null ? '' : String(m.cluster_id),
  sort_order: String(m.sort_order),
  is_active: m.is_active,
})

/**
 * Máy chủ (game modes) — danh sách + form cơ bản.
 * Nội dung dài của từng trang /may-chu/<slug> soạn ở editor riêng
 * ("Sửa nội dung (HTML)" → /admin/game-modes/:id/content).
 */
export const AdminGameModesPage = () => {
  useSeo({ title: 'Quản trị — Máy chủ — SV AeSieuQuay', noindex: true })
  const navigate = useNavigate()

  const [modes, setModes] = useState<AdminGameMode[] | null>(null)
  const [clusters, setClusters] = useState<AdminCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminGameMode | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [m, c] = await Promise.all([listGameModes(), listClusters()])
      setModes(m)
      setClusters(c)
    } catch (err) {
      await showApiError(err, 'Không tải được danh sách máy chủ')
      setModes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const clusterName = (id: number | null) =>
    id == null ? '—' : clusters.find((c) => c.id === id)?.name ?? `#${id}`

  const handleDelete = async (mode: AdminGameMode) => {
    try {
      await deleteGameMode(mode.id)
      await showSuccess('Đã xoá máy chủ', `"${mode.name}" đã bị xoá khỏi /may-chu.`)
      load()
    } catch (err) {
      await showApiError(err, 'Không xoá được máy chủ')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Máy chủ (game modes)"
        description="Card ở trang chủ / /may-chu và nội dung HTML chi tiết cho từng slug."
        actions={
          <>
            <Button variant="outline" size="default" onClick={load} disabled={loading}>
              Làm mới
            </Button>
            <Button onClick={() => setCreateOpen(true)}>+ Tạo máy chủ</Button>
          </>
        }
      />

      {loading && !modes ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            {!modes || modes.length === 0 ? (
              <p className="text-sm text-muted">Chưa có máy chủ nào. Bấm “Tạo máy chủ” để thêm.</p>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Ảnh</Th>
                    <Th>Tên</Th>
                    <Th>Slug</Th>
                    <Th>Trạng thái</Th>
                    <Th>Cụm</Th>
                    <Th>Nội dung</Th>
                    <Th>Active</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {modes.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-2/60">
                      <Td>
                        {m.image_url ? (
                          <img
                            src={m.image_url}
                            alt=""
                            loading="lazy"
                            className="h-10 w-16 shrink-0 rounded-lg border border-border-c object-cover"
                          />
                        ) : (
                          <span className="grid h-10 w-16 place-items-center rounded-lg bg-surface-2 text-[10px] text-muted">
                            chưa có
                          </span>
                        )}
                      </Td>
                      <Td className="font-semibold">{m.name}</Td>
                      <Td className="font-mono text-xs text-muted">{m.slug}</Td>
                      <Td>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                            m.status === 'hot'
                              ? 'bg-red-500/10 text-red-500'
                              : m.status === 'new'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-surface-2 text-muted',
                          )}
                        >
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                      </Td>
                      <Td className="text-muted">{clusterName(m.cluster_id)}</Td>
                      <Td>
                        {m.content_html ? (
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Đã có HTML
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Trống</span>
                        )}
                      </Td>
                      <Td>
                        <ActiveBadge active={m.is_active} />
                      </Td>
                      <Td className="space-x-2 text-right whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>
                          Sửa
                        </Button>
                        <Button size="sm" onClick={() => navigate(`/admin/game-modes/${m.id}/content`)}>
                          Sửa nội dung (HTML)
                        </Button>
                        <InlineConfirm
                          label="Xoá"
                          confirmLabel={`Xoá "${m.name}"?`}
                          warning="xoá hẳn khỏi /may-chu"
                          onConfirm={() => handleDelete(m)}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </CardContent>
        </Card>
      )}

      {createOpen && <ModeModal onClose={() => setCreateOpen(false)} onDone={load} clusters={clusters} />}
      {editing && (
        <ModeModal mode={editing} onClose={() => setEditing(null)} onDone={load} clusters={clusters} />
      )}
    </div>
  )
}

/* ================= Modal tạo/sửa (basic fields — không hiển thị legacy) ================= */

const ModeModal = ({
  mode,
  clusters,
  onClose,
  onDone,
}: {
  mode?: AdminGameMode
  clusters: AdminCluster[]
  onClose: () => void
  onDone: () => void
}) => {
  const [draft, setDraft] = useState<ModeDraft>(() => (mode ? draftFromMode(mode) : emptyDraft()))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof ModeDraft>(key: K, value: ModeDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!draft.slug.trim()) e.slug = 'Vui lòng nhập slug'
    else if (!SLUG_RE.test(draft.slug.trim())) e.slug = 'Slug: chữ thường/số, a-z0-9-, bắt đầu bằng a-z0-9'
    if (!draft.name.trim()) e.name = 'Vui lòng nhập tên'
    if (draft.sort_order && !Number.isInteger(Number(draft.sort_order))) e.sort_order = 'Sort phải là số nguyên'
    setErrors(e)
    if (Object.keys(e).length) return

    setBusy(true)
    const body: Partial<AdminGameMode> = {
      slug: draft.slug.trim().toLowerCase(),
      name: draft.name.trim(),
      tagline: draft.tagline.trim() || null,
      short_desc: draft.short_desc.trim() || null,
      status: draft.status,
      cluster_id: draft.cluster_id === '' ? null : Number(draft.cluster_id),
      sort_order: Number(draft.sort_order || 0),
      is_active: draft.is_active,
    }
    try {
      if (mode) {
        await updateGameMode(mode.id, body)
        await showSuccess('Đã cập nhật máy chủ', '')
      } else {
        await createGameMode(body)
        await showSuccess('Đã tạo máy chủ', 'Nhớ soạn nội dung HTML cho trang chi tiết.')
      }
      onClose()
      onDone()
    } catch (err) {
      await showApiError(err, mode ? 'Không cập nhật được máy chủ' : 'Không tạo được máy chủ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={mode ? `Sửa máy chủ — ${mode.slug}` : 'Tạo máy chủ'}
      description="Nội dung dài của trang /may-chu/<slug> soạn bằng editor HTML ở danh sách (nút “Sửa nội dung (HTML)”)."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Đang lưu…' : mode ? 'Lưu' : 'Tạo'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug *" htmlFor="gm-slug" error={errors.slug} hint="dùng trong URL /may-chu/<slug>">
          <input id="gm-slug" className={ctlCls} value={draft.slug} onChange={(e) => set('slug', e.target.value)} placeholder="sinh-ton" />
        </Field>
        <Field label="Tên *" htmlFor="gm-name" error={errors.name}>
          <input id="gm-name" className={ctlCls} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Sinh tồn" />
        </Field>
        <Field label="Tagline" htmlFor="gm-tagline">
          <input id="gm-tagline" className={ctlCls} value={draft.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Classic Survival" />
        </Field>
        <Field label="Trạng thái" htmlFor="gm-status">
          <select id="gm-status" className={ctlCls} value={draft.status} onChange={(e) => set('status', e.target.value as AdminGameMode['status'])}>
            <option value="normal">normal</option>
            <option value="hot">hot (🔥)</option>
            <option value="new">new (✨)</option>
          </select>
        </Field>
        <Field label="Mô tả ngắn" htmlFor="gm-short" className="sm:col-span-2" hint="1–2 câu hiển thị trên card">
          <textarea id="gm-short" rows={2} className={ctlCls} value={draft.short_desc} onChange={(e) => set('short_desc', e.target.value)} />
        </Field>
        <Field label="Cụm (cluster)" htmlFor="gm-cluster">
          <select id="gm-cluster" className={ctlCls} value={draft.cluster_id} onChange={(e) => set('cluster_id', e.target.value)}>
            <option value="">— mặc định (cluster active đầu) —</option>
            {clusters.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sort order" htmlFor="gm-sort" error={errors.sort_order}>
          <input id="gm-sort" className={ctlCls} inputMode="numeric" value={draft.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
        </Field>
        <Field label="Trạng thái">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Đang bật (is_active)
          </label>
        </Field>
      </div>
    </Modal>
  )
}

export default AdminGameModesPage
