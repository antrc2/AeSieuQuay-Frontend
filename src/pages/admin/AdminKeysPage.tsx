import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  getServerKeys,
  listServers,
  revokeServerKey,
  rotateServerKey,
  setServerKey,
  type AdminServer,
  type KeyKind,
  type RotateKeyResult,
  type ServerKeys,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import { KeyBadge, RoleBadge } from '@/components/admin/badges'
import { CopyButton, Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'
import { fmtDateTime, timeAgo } from '@/lib/format'

/**
 * Trang quản lý API key theo server — tách khỏi registry để bảng server gọn.
 * Hỗ trợ deep link: /admin/keys?server=survival-1
 */
export const AdminKeysPage = () => {
  useSeo({ title: 'Quản trị — API key — SV AeSieuQuay', noindex: true })

  const location = useLocation()
  const wanted = new URLSearchParams(location.search).get('server')

  const [servers, setServers] = useState<AdminServer[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [keys, setKeys] = useState<ServerKeys | null>(null)
  const [generated, setGenerated] = useState<RotateKeyResult | null>(null)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [custom, setCustom] = useState<Record<KeyKind, string>>({ monitor: '', points: '' })
  const [customError, setCustomError] = useState<Record<string, string>>({})

  const selected = useMemo(() => (servers ?? []).find((s) => s.id === selectedId) ?? null, [servers, selectedId])

  const load = useCallback(async () => {
    try {
      const s = await listServers({ include_inactive: false })
      setServers(s)
      setSelectedId((prev) => {
        if (prev && s.some((x) => x.id === prev)) return prev
        const byQuery = wanted ? s.find((x) => x.server_key === wanted) : null
        return byQuery?.id ?? s[0]?.id ?? null
      })
    } catch (err) {
      await showApiError(err, 'Không tải được danh sách server')
      setServers([])
    }
  }, [wanted])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (selectedId === null) {
      setKeys(null)
      return
    }
    let alive = true
    setKeys(null)
    getServerKeys(selectedId)
      .then((k) => alive && setKeys(k))
      .catch((err) => alive && showApiError(err, 'Không đọc được trạng thái key'))
    return () => {
      alive = false
    }
  }, [selectedId])

  const visible = (servers ?? []).filter(
    (s) => !filter || s.server_key.toLowerCase().includes(filter.toLowerCase()) || s.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const rotate = async (kind: KeyKind) => {
    if (!selected) return
    setBusy(true)
    try {
      const res = await rotateServerKey(selected.id, kind)
      setGenerated(res) // raw key chỉ sống trong state modal
      setKeys(await getServerKeys(selected.id))
      load()
    } catch (err) {
      await showApiError(err, `Rotate key ${kind} thất bại`)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (kind: KeyKind) => {
    if (!selected) return
    setBusy(true)
    try {
      setKeys(await revokeServerKey(selected.id, kind))
      await showSuccess('Đã thu hồi key', `Mọi request agent của ${selected.server_key} (loại ${kind}) sẽ trả 401.`)
      load()
    } catch (err) {
      await showApiError(err, 'Thu hồi key thất bại')
    } finally {
      setBusy(false)
    }
  }

  const applyCustom = async (kind: KeyKind) => {
    if (!selected) return
    const value = custom[kind]
    if (value.length < 24) {
      setCustomError({ [kind]: 'api_key phải có ít nhất 24 ký tự' })
      return
    }
    setCustomError({})
    setBusy(true)
    try {
      setKeys(await setServerKey(selected.id, kind, value))
      setCustom((c) => ({ ...c, [kind]: '' }))
      await showSuccess('Đã đặt key', 'Backend chỉ lưu SHA-256 hash của key.')
      load()
    } catch (err) {
      await showApiError(err, 'Không đặt được key')
    } finally {
      setBusy(false)
    }
  }

  const renderKind = (kind: KeyKind) => {
    if (!selected) return null
    if (kind === 'points' && selected.role === 'proxy') {
      return (
        <Card key={kind} className="opacity-70">
          <CardContent className="p-5 text-sm">
            <span className="font-semibold text-fg">Points key</span>
            <span className="text-muted"> — proxy không được bật points (API sẽ trả 400).</span>
          </CardContent>
        </Card>
      )
    }
    const state = keys?.[kind]
    return (
      <Card key={kind}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-fg">{kind === 'monitor' ? 'AESQ-Monitor key' : 'AESQ-Points key'}</h3>
            <KeyBadge kind={kind} configured={!!state?.configured} />
            {state?.rotated_at && (
              <span className="text-xs text-muted">
                lần đổi gần nhất: {fmtDateTime(state.rotated_at)} ({timeAgo(new Date(state.rotated_at).getTime())})
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <InlineConfirm
              label={`Rotate ${kind}`}
              confirmLabel={`Rotate key ${kind}?`}
              warning="key cũ 401 ngay — agent mất kết nối đến khi cập nhật config.yml"
              tone="warning"
              size="default"
              disabled={busy}
              onConfirm={() => rotate(kind)}
            />
            {state?.configured && (
              <InlineConfirm
                label={`Thu hồi ${kind}`}
                confirmLabel={`Thu hồi key ${kind}?`}
                warning="mọi request agent của server này → 401"
                size="default"
                disabled={busy}
                onConfirm={() => revoke(kind)}
              />
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Hoặc tự đặt key" error={customError[kind]} className="min-w-56 flex-1">
              <input
                className={ctlCls}
                value={custom[kind]}
                disabled={busy}
                placeholder="tối thiểu 24 ký tự — chỉ lưu hash"
                onChange={(e) => setCustom((c) => ({ ...c, [kind]: e.target.value }))}
              />
            </Field>
            <Button variant="secondary" disabled={busy || !custom[kind]} onClick={() => applyCustom(kind)}>
              Đặt key
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="API key theo server"
        description="Mỗi server có 2 key riêng (monitor + points). Key tự định danh server — agent chỉ gửi header X-AESQ-Key."
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Danh sách server */}
        <Card className="h-fit">
          <CardContent className="p-3">
            <input className={ctlCls + ' mb-2'} placeholder="Tìm server…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            {!servers ? (
              <Skeleton className="h-64" />
            ) : visible.length === 0 ? (
              <p className="p-3 text-sm text-muted">Không có server.</p>
            ) : (
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                {visible.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        'w-full rounded-xl px-3 py-2 text-left transition-colors',
                        s.id === selectedId ? 'bg-primary-soft text-primary' : 'text-fg hover:bg-surface-2',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-sm font-semibold">{s.server_key}</span>
                        <RoleBadge role={s.role} />
                      </span>
                      <span className="mt-1 flex gap-1">
                        {!s.monitor_key_configured && <KeyBadge kind="monitor" configured={false} />}
                        {s.role !== 'proxy' && !s.points_key_configured && <KeyBadge kind="points" configured={false} />}
                        {s.monitor_key_configured && s.points_key_configured && s.role !== 'proxy' && (
                          <span className="text-xs text-emerald-500">đủ key ✓</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Panel key của server đang chọn */}
        <div className="min-w-0 space-y-4">
          {!selected ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted">Chọn một server bên trái để quản lý key.</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <h2 className="text-lg font-bold text-fg">{selected.name}</h2>
                    <p className="font-mono text-xs text-muted">
                      {selected.server_key} · cụm {selected.cluster_slug ?? `#${selected.cluster_id}`}
                    </p>
                  </div>
                  <RoleBadge role={selected.role} />
                </CardContent>
              </Card>
              {!keys ? <Skeleton className="h-48" /> : <div className="space-y-4">{(['monitor', 'points'] as KeyKind[]).map(renderKind)}</div>}
            </>
          )}
        </div>
      </div>

      {generated && <GeneratedKeyModal result={generated} onClose={() => setGenerated(null)} />}
    </div>
  )
}

/* ================= Modal hiển thị raw key MỘT LẦN ================= */

const GeneratedKeyModal = ({ result, onClose }: { result: RotateKeyResult; onClose: () => void }) => (
  <Modal
    open
    onClose={onClose}
    title={`Key ${result.kind} mới — ${result.server_key}`}
    description="Raw key chỉ được hiển thị ĐÚNG MỘT LẦN này. Backend chỉ lưu SHA-256 hash."
    footer={<Button onClick={onClose}>Đã lưu key — đóng</Button>}
  >
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-sm text-fg">{result.api_key}</code>
        <CopyButton text={result.api_key} />
      </div>
      <p className="text-sm text-muted">
        Dán vào <code className="font-mono">api-key</code> trong <code className="font-mono">config.yml</code> của plugin{' '}
        {result.kind === 'monitor' ? 'AESQ-Monitor' : 'AESQ-Points'} trên server <b>{result.server_key}</b>, rồi reload plugin.
        Key cũ không còn dùng được (401 ngay).
      </p>
    </div>
  </Modal>
)

export default AdminKeysPage
