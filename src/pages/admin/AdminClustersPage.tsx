import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  createCluster,
  deleteCluster,
  listClusters,
  listServers,
  updateCluster,
  type AdminCluster,
  type AdminServer,
  type ServerRole,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, TableWrap, Td, Th } from '@/components/admin/blocks'
import { ActiveBadge } from '@/components/admin/badges'
import { Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/
const KEY_RE = /^[A-Za-z0-9._-]+$/

type ServerRow = {
  server_key: string
  name: string
  role: ServerRole
  group_slug: string
  host: string
  port: string
  monitoring_enabled: boolean
  points_enabled: boolean
}

type CreateDraft = {
  slug: string
  name: string
  description: string
  is_active: boolean
  sort_order: string
  servers: ServerRow[]
}

const emptyServerRow = (): ServerRow => ({
  server_key: '',
  name: '',
  role: 'game',
  group_slug: '',
  host: '',
  port: '',
  monitoring_enabled: true,
  points_enabled: true,
})

const emptyDraft = (): CreateDraft => ({
  slug: '',
  name: '',
  description: '',
  is_active: true,
  sort_order: '0',
  servers: [emptyServerRow()],
})

export const AdminClustersPage = () => {
  useSeo({ title: 'Quản trị — Cụm máy chủ — SV AeSieuQuay', noindex: true })

  const [clusters, setClusters] = useState<AdminCluster[] | null>(null)
  const [servers, setServers] = useState<AdminServer[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCluster | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([listClusters(), listServers({ include_inactive: true })])
      setClusters(c)
      setServers(s)
    } catch (err) {
      await showApiError(err, 'Không tải được danh sách cụm')
      setClusters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const serversOf = (clusterId: number) => servers.filter((s) => s.cluster_id === clusterId)

  const handleDelete = async (cluster: AdminCluster) => {
    try {
      await deleteCluster(cluster.id)
      await showSuccess('Đã tắt cụm', `"${cluster.name}" và toàn bộ server con đã ngừng hoạt động (soft delete).`)
      load()
    } catch (err) {
      await showApiError(err, 'Không tắt được cụm')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cụm máy chủ"
        description="Quản lý cluster/network. Xoá là soft-delete: tắt cụm + toàn bộ server con, giữ lịch sử monitor/points."
        actions={
          <>
            <Button variant="outline" size="default" onClick={load} disabled={loading}>
              Làm mới
            </Button>
            <Button onClick={() => setCreateOpen(true)}>+ Tạo cụm</Button>
          </>
        }
      />

      {loading && !clusters ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            {!clusters || clusters.length === 0 ? (
              <p className="text-sm text-muted">Chưa có cụm nào. Bấm “Tạo cụm” để thêm cluster + server con.</p>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Slug</Th>
                    <Th>Tên</Th>
                    <Th>Server</Th>
                    <Th>Trạng thái</Th>
                    <Th>Sort</Th>
                    <Th>Cập nhật</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/60">
                      <Td className="font-mono text-xs">{c.slug}</Td>
                      <Td className="font-semibold">{c.name}</Td>
                      <Td className="text-muted">
                        <Link to={`/admin/servers?cluster_id=${c.id}`} className="text-primary hover:underline">
                          {serversOf(c.id).length} server
                        </Link>
                      </Td>
                      <Td>
                        <ActiveBadge active={c.is_active} />
                      </Td>
                      <Td className="tabular-nums text-muted">{c.sort_order}</Td>
                      <Td className="text-muted">{c.updated_at ? new Date(c.updated_at).toLocaleString('vi-VN', { hour12: false }) : '—'}</Td>
                      <Td className="space-x-2 text-right">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                          Sửa
                        </Button>
                        <InlineConfirm
                          label="Tắt cụm"
                          confirmLabel={`Tắt "${c.name}" + server con?`}
                          warning="soft delete — giữ lịch sử"
                          onConfirm={() => handleDelete(c)}
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

      {createOpen && <CreateClusterModal onClose={() => setCreateOpen(false)} onDone={load} />}
      {editing && <EditClusterModal cluster={editing} onClose={() => setEditing(null)} onDone={load} />}
    </div>
  )
}

/* ================= Modal tạo cụm + server con ================= */

const CreateClusterModal = ({ onClose, onDone }: { onClose: () => void; onDone: () => void }) => {
  const [draft, setDraft] = useState<CreateDraft>(emptyDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof CreateDraft>(key: K, value: CreateDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const setServer = (index: number, patch: Partial<ServerRow>) =>
    setDraft((d) => ({
      ...d,
      servers: d.servers.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.slug.trim()) e.slug = 'Vui lòng nhập slug'
    else if (!SLUG_RE.test(draft.slug.trim())) e.slug = 'Slug: chữ thường/số, bắt đầu bằng a-z0-9, có dấu -'
    if (!draft.name.trim()) e.name = 'Vui lòng nhập tên cụm'
    if (draft.sort_order && !Number.isInteger(Number(draft.sort_order))) e.sort_order = 'Sort phải là số nguyên'
    draft.servers.forEach((row, i) => {
      if (!row.server_key.trim()) e[`s${i}.key`] = 'Vui lòng nhập server_key'
      else if (!KEY_RE.test(row.server_key.trim())) e[`s${i}.key`] = 'server_key chỉ gồm a-z A-Z 0-9 . _ -'
      if (row.port && (!Number.isInteger(Number(row.port)) || Number(row.port) < 1 || Number(row.port) > 65535)) {
        e[`s${i}.port`] = 'Port 1–65535'
      }
      if (row.role === 'proxy' && row.points_enabled) e[`s${i}.points`] = 'Proxy không được bật points'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      await createCluster({
        slug: draft.slug.trim().toLowerCase(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        is_active: draft.is_active,
        sort_order: Number(draft.sort_order || 0),
        servers: draft.servers
          .filter((row) => row.server_key.trim())
          .map((row) => ({
            server_key: row.server_key.trim(),
            name: row.name.trim() || row.server_key.trim(),
            role: row.role,
            group_slug: row.group_slug.trim() || null,
            host: row.host.trim() || null,
            port: row.port ? Number(row.port) : null,
            monitoring_enabled: row.monitoring_enabled,
            points_enabled: row.role === 'proxy' ? false : row.points_enabled,
          })),
      })
      await showSuccess('Đã tạo cụm', 'Cluster + server con được tạo trong một transaction.')
      onClose()
      onDone()
    } catch (err) {
      await showApiError(err, 'Không tạo được cụm')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Tạo cụm + server con"
      description="Toàn bộ được tạo trong một transaction. server_key phải trùng monitor_servers.server_name của plugin."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo cụm'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug *" htmlFor="c-slug" error={errors.slug}>
            <input id="c-slug" className={ctlCls} value={draft.slug} onChange={(e) => set('slug', e.target.value)} placeholder="aesq" />
          </Field>
          <Field label="Tên *" htmlFor="c-name" error={errors.name}>
            <input id="c-name" className={ctlCls} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="AESQ Network" />
          </Field>
          <Field label="Sort order" htmlFor="c-sort" error={errors.sort_order}>
            <input id="c-sort" className={ctlCls} inputMode="numeric" value={draft.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
          </Field>
          <Field label="Trạng thái">
            <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              Đang bật (is_active)
            </label>
          </Field>
        </div>

        <Field label="Mô tả" htmlFor="c-desc">
          <textarea id="c-desc" rows={2} className={ctlCls} value={draft.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Server con</p>
            <Button size="sm" variant="outline" onClick={() => setDraft((d) => ({ ...d, servers: [...d.servers, emptyServerRow()] }))}>
              + Thêm server
            </Button>
          </div>
          <div className="space-y-4">
            {draft.servers.map((row, i) => (
              <div key={i} className="rounded-xl border border-border-c bg-surface-2/50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="server_key *" error={errors[`s${i}.key`]} hint="trùng server_name trong config plugin">
                    <input className={ctlCls} value={row.server_key} onChange={(e) => setServer(i, { server_key: e.target.value })} placeholder="lobby-1" />
                  </Field>
                  <Field label="Tên">
                    <input className={ctlCls} value={row.name} onChange={(e) => setServer(i, { name: e.target.value })} placeholder="Lobby 1" />
                  </Field>
                  <Field label="Role">
                    <select className={ctlCls} value={row.role} onChange={(e) => setServer(i, { role: e.target.value as ServerRole, points_enabled: e.target.value === 'proxy' ? false : row.points_enabled })}>
                      <option value="proxy">proxy</option>
                      <option value="lobby">lobby</option>
                      <option value="game">game</option>
                    </select>
                  </Field>
                  <Field label="group_slug">
                    <input className={ctlCls} value={row.group_slug} onChange={(e) => setServer(i, { group_slug: e.target.value })} placeholder="survival" />
                  </Field>
                  <Field label="Host">
                    <input className={ctlCls} value={row.host} onChange={(e) => setServer(i, { host: e.target.value })} placeholder="lobby.aesieuquay.com" />
                  </Field>
                  <Field label="Port" error={errors[`s${i}.port`]} className="items-start">
                    <div>
                      <input className={ctlCls} inputMode="numeric" value={row.port} onChange={(e) => setServer(i, { port: e.target.value })} placeholder="25565" />
                    </div>
                  </Field>
                  <Field label="Monitor">
                    <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                      <input type="checkbox" checked={row.monitoring_enabled} onChange={(e) => setServer(i, { monitoring_enabled: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                      monitoring_enabled
                    </label>
                  </Field>
                  <Field label="Points" error={errors[`s${i}.points`]}>
                    <label className={`flex h-9 items-center gap-2 text-sm ${row.role === 'proxy' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                      <input type="checkbox" disabled={row.role === 'proxy'} checked={row.role === 'proxy' ? false : row.points_enabled} onChange={(e) => setServer(i, { points_enabled: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
                      points_enabled
                    </label>
                  </Field>
                </div>
                {draft.servers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, servers: d.servers.filter((_, x) => x !== i) }))}
                    className="mt-2 text-xs font-medium text-red-500 hover:underline"
                  >
                    Bỏ server này
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ================= Modal sửa cụm (PATCH) ================= */

const EditClusterModal = ({ cluster, onClose, onDone }: { cluster: AdminCluster; onClose: () => void; onDone: () => void }) => {
  const [form, setForm] = useState({
    slug: cluster.slug,
    name: cluster.name,
    description: cluster.description ?? '',
    is_active: cluster.is_active,
    sort_order: String(cluster.sort_order),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.slug.trim()) e.slug = 'Vui lòng nhập slug'
    else if (!SLUG_RE.test(form.slug.trim())) e.slug = 'Slug: chữ thường/số, bắt đầu bằng a-z0-9'
    if (!form.name.trim()) e.name = 'Vui lòng nhập tên'
    if (form.sort_order && !Number.isInteger(Number(form.sort_order))) e.sort_order = 'Sort phải là số nguyên'
    setErrors(e)
    if (Object.keys(e).length) return

    setBusy(true)
    try {
      await updateCluster(cluster.id, {
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      })
      await showSuccess('Đã cập nhật cụm', '')
      onClose()
      onDone()
    } catch (err) {
      await showApiError(err, 'Không cập nhật được cụm')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Sửa cụm — ${cluster.slug}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" htmlFor="e-slug" error={errors.slug}>
          <input id="e-slug" className={ctlCls} value={form.slug} onChange={(ev) => setForm((f) => ({ ...f, slug: ev.target.value }))} />
        </Field>
        <Field label="Tên" htmlFor="e-name" error={errors.name}>
          <input id="e-name" className={ctlCls} value={form.name} onChange={(ev) => setForm((f) => ({ ...f, name: ev.target.value }))} />
        </Field>
        <Field label="Sort order" htmlFor="e-sort" error={errors.sort_order}>
          <input id="e-sort" className={ctlCls} inputMode="numeric" value={form.sort_order} onChange={(ev) => setForm((f) => ({ ...f, sort_order: ev.target.value }))} />
        </Field>
        <Field label="Trạng thái">
          <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(ev) => setForm((f) => ({ ...f, is_active: ev.target.checked }))} className="h-4 w-4 accent-[var(--primary)]" />
            is_active
          </label>
        </Field>
        <Field label="Mô tả" htmlFor="e-desc" className="sm:col-span-2">
          <textarea id="e-desc" rows={2} className={ctlCls} value={form.description} onChange={(ev) => setForm((f) => ({ ...f, description: ev.target.value }))} />
        </Field>
      </div>
    </Modal>
  )
}

export default AdminClustersPage
