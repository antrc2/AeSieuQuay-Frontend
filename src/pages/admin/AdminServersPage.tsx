import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  createServer,
  deleteServer,
  listServerCategories,
  listServers,
  updateServer,
  type AdminServer,
  type AdminServerCategory,
  type ServerRole,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, TableWrap, Td, Th } from '@/components/admin/blocks'
import { ActiveBadge, KeyBadge, RoleBadge } from '@/components/admin/badges'
import { Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'

const KEY_RE = /^[A-Za-z0-9._-]+$/

/** Trang quản lý MÁY CHỦ HỢP NHẤT (hạ tầng + trang public /may-chu). Không còn cụm. */
export const AdminServersPage = () => {
  useSeo({ title: 'Quản trị — Server — SV AeSieuQuay', noindex: true })

  const [servers, setServers] = useState<AdminServer[] | null>(null)
  const [categories, setCategories] = useState<AdminServerCategory[]>([])
  const [publicPage, setPublicPage] = useState('')
  const [role, setRole] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState<AdminServer | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, cats] = await Promise.all([
        listServers({
          role: role || undefined,
          include_inactive: includeInactive,
          public_page: publicPage === '' ? undefined : publicPage === '1',
        }),
        listServerCategories({ include_inactive: true }).catch(() => []),
      ])
      setServers(s)
      setCategories(cats)
    } catch (err) {
      await showApiError(err, 'Không tải được danh sách server')
      setServers([])
    } finally {
      setLoading(false)
    }
  }, [publicPage, role, includeInactive])

  useEffect(() => {
    load()
  }, [load])

  const categoryName = (id: number | null) =>
    id == null ? '—' : categories.find((c) => c.id === id)?.name ?? `#${id}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Máy chủ"
        description="Hạ tầng (proxy / lobby / game) + trang public /may-chu cùng một chỗ. Bật 'Trang public' là người chơi thấy ngay, cùng slug."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              Làm mới
            </Button>
            <Button onClick={() => setCreating(true)}>+ Thêm server</Button>
          </>
        }
      />

      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Trang public" className="w-44">
          <select className={ctlCls} value={publicPage} onChange={(e) => setPublicPage(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="1">Có trang /may-chu</option>
            <option value="0">Chỉ hạ tầng</option>
          </select>
        </Field>
        <Field label="Role" className="w-36">
          <select className={ctlCls} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Mọi role</option>
            <option value="proxy">proxy</option>
            <option value="lobby">lobby</option>
            <option value="game">game</option>
          </select>
        </Field>
        <Field label="Hiện & tắt">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            include_inactive
          </label>
        </Field>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading && !servers ? (
            <Skeleton className="h-52" />
          ) : !servers || servers.length === 0 ? (
            <p className="text-sm text-muted">Không có server nào khớp bộ lọc.</p>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Server</Th>
                  <Th>Trang public</Th>
                  <Th>Thể loại</Th>
                  <Th>Role</Th>
                  <Th>Trạng thái</Th>
                  <Th>Flags</Th>
                  <Th>API key</Th>
                  <Th className="text-right">Thao tác</Th>
                </tr>
              </thead>
              <tbody>
                {servers.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/60">
                    <Td className="max-w-[240px]">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate font-mono text-xs text-muted">
                        {s.slug}
                        {s.host ? ` · ${s.host}${s.port ? `:${s.port}` : ''}` : ''}
                      </p>
                    </Td>
                    <Td className="font-mono text-xs text-muted">
                      {s.public_page ? <span className="text-emerald-500">/may-chu/{s.slug}</span> : <span>—</span>}
                    </Td>
                    <Td className="text-sm text-muted">
                      {categoryName(s.category_id)}
                    </Td>
                    <Td>
                      <RoleBadge role={s.role} />
                    </Td>
                    <Td className="space-y-1">
                      <ActiveBadge active={s.is_active} />
                      {s.auto_created && <p className="text-xs text-muted">tự sinh từ telemetry</p>}
                    </Td>
                    <Td className="space-y-1 text-xs">
                      <p className={s.monitoring_enabled ? 'text-emerald-500' : 'text-muted'}>
                        Monitor: {s.monitoring_enabled ? 'bật' : 'tắt'}
                      </p>
                      <p className={s.points_enabled ? 'text-emerald-500' : 'text-muted'}>
                        Points: {s.role === 'proxy' ? '—' : s.points_enabled ? 'bật' : 'tắt'}
                      </p>
                      {/* doc v2 §5 — 2 flag widget home / chuyển xu */}
                      {s.display_public && (
                        <div>
                          <Badge variant="brand" title="Server nguồn widget Trạng thái máy chủ trang home (toàn hệ thống tối đa 1)">
                            🏠 Public
                          </Badge>
                        </div>
                      )}
                      {s.lobby_display && (
                        <div>
                          <Badge variant="success" title="Lobby dùng cho trang /chuyen-xu (toàn hệ thống 1)">
                            💱 Lobby chuyển xu
                          </Badge>
                        </div>
                      )}
                      {s.credit_destination && (
                        <div>
                          <Badge variant="brand" title="Server nhận Xu khi player nạp bank/thẻ (toàn hệ thống 1) — và là sảnh nguồn trang /chuyen-xu">
                            🪙 Nhận Xu nạp
                          </Badge>
                        </div>
                      )}
                      {s.maintenance_mode && <Badge variant="warning">maintenance</Badge>}
                    </Td>
                    <Td className="space-y-1">
                      <div>
                        <KeyBadge kind="monitor" configured={s.monitor_key_configured} />
                      </div>
                      {s.role !== 'proxy' && (
                        <div className="pt-1">
                          <KeyBadge kind="points" configured={s.points_key_configured} />
                        </div>
                      )}
                    </Td>
                    <Td className="space-y-1 whitespace-nowrap text-right">
                      <div>
                        <Link
                          to={`/admin/keys?server=${encodeURIComponent(s.slug)}`}
                          className="inline-flex h-8 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
                        >
                          Quản lý key
                        </Link>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        {s.public_page && (
                          <Link
                            to={`/admin/game-modes/${s.id}/content`}
                            className="inline-flex h-8 items-center rounded-xl border border-border-c px-3 text-xs font-semibold text-fg transition-colors hover:bg-surface-2"
                          >
                            Nội dung
                          </Link>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                          Sửa
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      {creating && <ServerFormModal categories={categories} onClose={() => setCreating(false)} onDone={load} />}
      {editing && <ServerFormModal server={editing} categories={categories} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  )
}

/* ================= Modal thêm / sửa server ================= */

type ServerForm = {
  name: string
  role: ServerRole
  category_id: string
  monitoring_enabled: boolean
  points_enabled: boolean
  is_active: boolean
  sort_order: string
  // trang public /may-chu/<slug> + widget home
  public_page: boolean
  tagline: string
  short_desc: string
  status: 'hot' | 'new' | 'normal'
  // flag widget (null = server chưa từng được chọn, backend coi như false)
  display_public: boolean
  lobby_display: boolean
  credit_destination: boolean
}

export const ServerFormModal = ({
  server,
  categories,
  onClose,
  onDone,
}: {
  server?: AdminServer
  categories: AdminServerCategory[]
  onClose: () => void
  onDone: () => void
}) => {
  const isEdit = !!server
  const [form, setForm] = useState<ServerForm>(() => ({
    name: server?.name ?? '',
    role: server?.role ?? 'game',
    category_id: server?.category_id == null ? '' : String(server.category_id),
    monitoring_enabled: server ? server.monitoring_enabled : true,
    points_enabled: server ? server.points_enabled : true,
    is_active: server ? server.is_active : true,
    sort_order: server ? String(server.sort_order) : '0',
    public_page: server?.public_page ?? false,
    tagline: server?.tagline ?? '',
    short_desc: server?.short_desc ?? '',
    status: server?.status ?? 'normal',
    display_public: server?.display_public ?? false,
    lobby_display: server?.lobby_display ?? false,
    credit_destination: server?.credit_destination ?? false,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof ServerForm>(k: K, v: ServerForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên'
    if (form.role === 'proxy' && form.points_enabled) e.points_enabled = 'Proxy không được bật points'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true)
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      role: form.role,
      category_id: form.category_id === '' ? null : Number(form.category_id),
      monitoring_enabled: form.monitoring_enabled,
      points_enabled: form.role === 'proxy' ? false : form.points_enabled,
      sort_order: Number(form.sort_order || 0),
      // Trang public /may-chu/<slug> + widget home
      public_page: form.public_page,
      tagline: form.tagline.trim() || null,
      short_desc: form.short_desc.trim() || null,
      status: form.status,
      // Luôn gửi các flag (null/false = bỏ chọn; backend tự gỡ server cũ khi bật server mới)
      display_public: form.display_public,
      lobby_display: form.lobby_display,
      credit_destination: form.credit_destination,
    }
    if (isEdit) body.is_active = form.is_active
    try {
      if (isEdit) {
        await updateServer(server!.id, body)
        await showSuccess('Đã cập nhật server', '')
      } else {
        await createServer(body as unknown as Parameters<typeof createServer>[0])
        await showSuccess('Đã thêm server', '')
      }
      onClose()
      onDone()
    } catch (err) {
      await showApiError(err, isEdit ? 'Không cập nhật được server' : 'Không thêm được server')
    } finally {
      setBusy(false)
    }
  }

  const softDelete = async () => {
    setBusy(true)
    try {
      await deleteServer(server!.id)
      await showSuccess('Đã tắt server', 'Soft delete — dữ liệu lịch sử giữ nguyên.')
      onClose()
      onDone()
    } catch (err) {
      await showApiError(err, 'Không tắt được server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Sửa server — ${server!.slug}` : 'Thêm server'}
      className="max-w-2xl"
      footer={
        <>
          {isEdit && (
            <span className="mr-auto">
              <InlineConfirm label="Tắt server (soft delete)" confirmLabel="Tắt server này?" warning="agent sẽ bị middleware từ chối" disabled={busy} onConfirm={softDelete} />
            </span>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Đang lưu…' : isEdit ? 'Lưu' : 'Tạo server'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên *" error={errors.name} hint="Slug /may-chu/<slug> sinh tự động từ tên này.">
          <input className={ctlCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="SkyBlock" />
        </Field>
        <Field label="Role">
          <select
            className={ctlCls}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as ServerRole, points_enabled: e.target.value === 'proxy' ? false : f.points_enabled }))}
          >
            <option value="proxy">proxy</option>
            <option value="lobby">lobby</option>
            <option value="game">game</option>
          </select>
        </Field>
        <Field label="Thể loại" hint="Danh mục như sản phẩm — quản lý ở trang Thể loại máy chủ.">
          <select className={ctlCls} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">— chưa phân loại —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sort order">
          <input className={ctlCls} inputMode="numeric" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
        </Field>
        <Field label="Points" error={errors.points_enabled}>
          <label className={`flex h-9 items-center gap-2 text-sm ${form.role === 'proxy' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <input type="checkbox" disabled={form.role === 'proxy'} checked={form.role === 'proxy' ? false : form.points_enabled} onChange={(e) => set('points_enabled', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            points_enabled
          </label>
        </Field>
        <Field label="Monitor">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.monitoring_enabled} onChange={(e) => set('monitoring_enabled', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            monitoring_enabled
          </label>
        </Field>
        <Field label="Khác">
          <div className="flex h-9 items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              is_active
            </label>
          </div>
        </Field>
        {/* Trang public /may-chu/<slug> + widget home — cùng 1 dòng server */}
        <Field label="Trang public" hint="Bật → có trang /may-chu/<slug> + hiện widget 'Máy chủ game' trang chủ. Tắt = chỉ là hạ tầng.">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.public_page} onChange={(e) => set('public_page', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            public_page 📄
          </label>
        </Field>
        <Field label="Tagline" hint="Dòng phụ trên card (tối đa 100 ký tự).">
          <input className={ctlCls} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Sinh tồn, kinh tế, PvP" />
        </Field>
        <Field label="Mô tả ngắn" hint="Hiện trên card /may-chu (tối đa 255 ký tự).">
          <input className={ctlCls} value={form.short_desc} onChange={(e) => set('short_desc', e.target.value)} placeholder="Khám phá thế giới sinh tồn cùng bạn bè" />
        </Field>
        <Field label="Nhãn trạng thái">
          <select className={ctlCls} value={form.status} onChange={(e) => set('status', e.target.value as ServerForm['status'])}>
            <option value="normal">normal</option>
            <option value="hot">hot 🔥</option>
            <option value="new">new ✨</option>
          </select>
        </Field>
        {/* doc v2 §5 — 2 flag widget; thay đổi flag tự invalidate cache home/status phía backend */}
        <Field label="Widget trang chủ" hint="Server nguồn cho block 'Trạng thái máy chủ' — toàn hệ thống tối đa 1, bật server mới sẽ tự gỡ server cũ.">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.display_public} onChange={(e) => set('display_public', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            display_public 🏠
          </label>
        </Field>
        <Field label="Lobby chuyển xu" hint="Lobby hiển thị trên /chuyen-xu — toàn hệ thống 1.">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.lobby_display} onChange={(e) => set('lobby_display', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            lobby_display 💱
          </label>
        </Field>
        <Field label="Nhận Xu nạp" hint="Player nạp bank/thẻ → Xu về server NÀY (toàn hệ thống 1; bật server mới tự gỡ server cũ — vd đang chọn skyblock, sau này tick sang lobby). Server phải bật points_enabled + agent.">
          <label className={`flex h-9 items-center gap-2 text-sm ${form.role === 'proxy' || !form.points_enabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <input type="checkbox" disabled={form.role === 'proxy' || !form.points_enabled} checked={form.credit_destination} onChange={(e) => set('credit_destination', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            credit_destination 🪙
          </label>
        </Field>
      </div>
    </Modal>
  )
}

export default AdminServersPage
