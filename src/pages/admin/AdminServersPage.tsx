import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  createServer,
  deleteServer,
  listClusters,
  listServers,
  updateServer,
  type AdminCluster,
  type AdminServer,
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

/** Trang registry server — chỉ thông tin hạ tầng. API key tách sang /admin/keys. */
export const AdminServersPage = () => {
  useSeo({ title: 'Quản trị — Server — SV AeSieuQuay', noindex: true })

  const location = useLocation()
  const initialClusterId = new URLSearchParams(location.search).get('cluster_id') ?? ''

  const [servers, setServers] = useState<AdminServer[] | null>(null)
  const [clusters, setClusters] = useState<AdminCluster[]>([])
  const [clusterId, setClusterId] = useState<string>(initialClusterId)
  const [role, setRole] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState<AdminServer | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([
        listServers({
          cluster_id: clusterId === '' ? undefined : Number(clusterId),
          role: role || undefined,
          include_inactive: includeInactive,
        }),
        listClusters(),
      ])
      setServers(s)
      setClusters(c)
    } catch (err) {
      await showApiError(err, 'Không tải được danh sách server')
      setServers([])
    } finally {
      setLoading(false)
    }
  }, [clusterId, role, includeInactive])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Server hạ tầng"
        description="Danh sách server trong cụm (proxy / lobby / game). Quản lý API key chuyển sang trang riêng."
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
        <Field label="Cụm" className="w-44">
          <select className={ctlCls} value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
            <option value="">Tất cả cụm</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.slug})
              </option>
            ))}
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
                  <Th>Cụm</Th>
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
                        {s.server_key}
                        {s.host ? ` · ${s.host}${s.port ? `:${s.port}` : ''}` : ''}
                      </p>
                    </Td>
                    <Td className="font-mono text-xs text-muted">{s.cluster_slug ?? `#${s.cluster_id}`}</Td>
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
                          to={`/admin/keys?server=${encodeURIComponent(s.server_key)}`}
                          className="inline-flex h-8 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
                        >
                          Quản lý key
                        </Link>
                      </div>
                      <div className="pt-1">
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

      {creating && <ServerFormModal clusters={clusters} onClose={() => setCreating(false)} onDone={load} />}
      {editing && <ServerFormModal server={editing} clusters={clusters} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  )
}

/* ================= Modal thêm / sửa server ================= */

type ServerForm = {
  cluster_id: string
  server_key: string
  name: string
  role: ServerRole
  group_slug: string
  host: string
  port: string
  mc_version: string
  server_impl: string
  max_players: string
  monitoring_enabled: boolean
  points_enabled: boolean
  maintenance_mode: boolean
  is_active: boolean
  sort_order: string
}

export const ServerFormModal = ({
  server,
  clusters,
  onClose,
  onDone,
}: {
  server?: AdminServer
  clusters: AdminCluster[]
  onClose: () => void
  onDone: () => void
}) => {
  const isEdit = !!server
  const [form, setForm] = useState<ServerForm>(() => ({
    cluster_id: String(server?.cluster_id ?? clusters[0]?.id ?? ''),
    server_key: server?.server_key ?? '',
    name: server?.name ?? '',
    role: server?.role ?? 'game',
    group_slug: server?.group_slug ?? '',
    host: server?.host ?? '',
    port: server?.port ? String(server.port) : '',
    mc_version: server?.mc_version ?? '',
    server_impl: server?.server_impl ?? '',
    max_players: server?.max_players != null ? String(server.max_players) : '',
    monitoring_enabled: server ? server.monitoring_enabled : true,
    points_enabled: server ? server.points_enabled : true,
    maintenance_mode: server?.maintenance_mode ?? false,
    is_active: server ? server.is_active : true,
    sort_order: server ? String(server.sort_order) : '0',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof ServerForm>(k: K, v: ServerForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!isEdit && !form.cluster_id) e.cluster_id = 'Chọn cụm'
    if (!form.server_key.trim()) e.server_key = 'Vui lòng nhập server_key'
    else if (!KEY_RE.test(form.server_key.trim())) e.server_key = 'Chỉ gồm a-z A-Z 0-9 . _ -'
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên'
    if (form.port && (!Number.isInteger(Number(form.port)) || Number(form.port) < 1 || Number(form.port) > 65535)) e.port = 'Port 1–65535'
    if (form.max_players && !Number.isInteger(Number(form.max_players))) e.max_players = 'Phải là số nguyên'
    if (form.role === 'proxy' && form.points_enabled) e.points_enabled = 'Proxy không được bật points'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true)
    const body: Record<string, unknown> = {
      server_key: form.server_key.trim(),
      name: form.name.trim(),
      role: form.role,
      group_slug: form.group_slug.trim() || null,
      host: form.host.trim() || null,
      port: form.port ? Number(form.port) : null,
      mc_version: form.mc_version.trim() || null,
      server_impl: form.server_impl.trim() || null,
      max_players: form.max_players ? Number(form.max_players) : null,
      monitoring_enabled: form.monitoring_enabled,
      points_enabled: form.role === 'proxy' ? false : form.points_enabled,
      maintenance_mode: form.maintenance_mode,
      sort_order: Number(form.sort_order || 0),
    }
    if (isEdit) body.is_active = form.is_active
    try {
      if (isEdit) {
        await updateServer(server!.id, body)
        await showSuccess('Đã cập nhật server', '')
      } else {
        await createServer({ ...body, cluster_id: Number(form.cluster_id) } as Parameters<typeof createServer>[0])
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
      title={isEdit ? `Sửa server — ${server!.server_key}` : 'Thêm server'}
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
        {!isEdit && (
          <Field label="Cụm *" error={errors.cluster_id}>
            <select className={ctlCls} value={form.cluster_id} onChange={(e) => set('cluster_id', e.target.value)}>
              <option value="">— chọn cụm —</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="server_key *" error={errors.server_key} hint="trùng monitor_servers.server_name của plugin">
          <input className={ctlCls} value={form.server_key} onChange={(e) => set('server_key', e.target.value)} placeholder="survival-1" />
        </Field>
        <Field label="Tên *" error={errors.name}>
          <input className={ctlCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
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
        <Field label="group_slug">
          <input className={ctlCls} value={form.group_slug} onChange={(e) => set('group_slug', e.target.value)} placeholder="survival" />
        </Field>
        <Field label="Host">
          <input className={ctlCls} value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="survival.aesieuquay.com" />
        </Field>
        <Field label="Port" error={errors.port}>
          <input className={ctlCls} inputMode="numeric" value={form.port} onChange={(e) => set('port', e.target.value)} placeholder="25567" />
        </Field>
        <Field label="MC version">
          <input className={ctlCls} value={form.mc_version} onChange={(e) => set('mc_version', e.target.value)} placeholder="1.21.4" />
        </Field>
        <Field label="Server impl">
          <input className={ctlCls} value={form.server_impl} onChange={(e) => set('server_impl', e.target.value)} placeholder="Paper" />
        </Field>
        <Field label="Max players" error={errors.max_players}>
          <input className={ctlCls} inputMode="numeric" value={form.max_players} onChange={(e) => set('max_players', e.target.value)} />
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
              <input type="checkbox" checked={form.maintenance_mode} onChange={(e) => set('maintenance_mode', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              maintenance
            </label>
            {isEdit && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                is_active
              </label>
            )}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

export default AdminServersPage
