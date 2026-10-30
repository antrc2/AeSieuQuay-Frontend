import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import {
  createFooterColumn,
  createGalleryImage,
  createHighlight,
  createHeroSlide,
  createSocial,
  deleteFooterColumn,
  deleteGalleryImage,
  deleteHighlight,
  deleteHeroSlide,
  deleteSocial,
  getContentConfig,
  listFooterColumns,
  listGallery,
  listHeroSlides,
  listHighlights,
  listSocials,
  refreshSiteCache,
  updateContentConfig,
  updateFooterColumn,
  updateGalleryImage,
  updateHighlight,
  updateHeroSlide,
  updateSocial,
  uploadContentImage,
  type AdminFooterColumn,
  type AdminGalleryImage,
  type AdminHighlight,
  type AdminHeroSlide,
  type AdminSiteConfig,
  type AdminSocial,
  type SiteConfigPatch,
  type SocialLocation,
} from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader, SectionHeader, TableWrap, Td, Th } from '@/components/admin/blocks'
import { ActiveBadge } from '@/components/admin/badges'
import { Field, InlineConfirm, ctlCls } from '@/components/admin/form'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'

/**
 * FRONTEND-5 §3 — /admin/content: "Nội dung website", 6 tab CRUD
 * (backend-5 §4 — modules/api/admin_content).
 *
 * Chính sách chủ server: MỌI nội dung DB show ra user phải quản lý được ở đây —
 * hero slides, highlight, gallery, socials, footer columns, site-config.
 * Menu Header KHÔNG nằm ở đây: FE tự sở hữu (DEFAULT_MENU — src/data/site.js).
 * Ảnh upload qua uploadContentImage (prefix `content`), gửi cả image_key + image_url.
 * Nút "Đồng bộ cache" gọi refreshSiteCache() (429 trong 15s — message backend tiếng Việt).
 */

const CONTENT_TABS = [
  ['config', 'Cấu hình chung'],
  ['hero', 'Hero'],
  ['highlight', 'Highlight'],
  ['gallery', 'Gallery'],
  ['socials', 'Mạng xã hội'],
  ['footer', 'Footer'],
] as const
type ContentTab = (typeof CONTENT_TABS)[number][0]

const EMPTY_HINT = 'Trang chủ đang hiện fallback FE — thêm mục đầu tiên để dữ liệu DB phủ lên.'

/** Link chết (sắp xếp theo sort_order như backend) — dùng cho swap ↑/↓. */
const bySort = <T extends { sort_order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sort_order - b.sort_order)

/**
 * ↑/↓ = hoán đổi sort_order của row này với row kề (2 PATCH tuần tự, refetch 1 lần).
 * FE tự tính — backend-5 §4.2 không có endpoint reorder.
 */
const makeSortSwapper =
  <T extends { id: number; sort_order: number }>(
    rows: T[],
    reload: () => Promise<void> | void,
    patch: (id: number, body: { sort_order: number }) => Promise<unknown>,
  ) =>
  async (id: number, delta: -1 | 1) => {
    const ordered = bySort(rows)
    const idx = ordered.findIndex((r) => r.id === id)
    const other = ordered[idx + delta]
    if (idx < 0 || !other) return
    const mine = ordered[idx]
    try {
      await patch(mine.id, { sort_order: other.sort_order })
      await patch(other.id, { sort_order: mine.sort_order })
      await reload()
    } catch (err) {
      await showApiError(err, 'Không đổi được thứ tự')
    }
  }

/** Load list + reload + toast lỗi — idiom AdminPromotionsPage (aliveRef chống setState sau unmount). */
function useContentList<T>(fetcher: () => Promise<T[]>, errorTitle: string) {
  const [rows, setRows] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetcher()
      if (aliveRef.current) setRows(res)
    } catch (err) {
      if (aliveRef.current) {
        await showApiError(err, errorTitle)
        setRows([])
      }
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [fetcher, errorTitle])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load])

  return { rows, loading, load, setRows }
}

/* ================= ô ảnh upload dùng chung 3.1/3.2 ================= */

const ImagePicker = ({
  imageUrl,
  onUploaded,
  label = 'Chọn ảnh',
  className,
}: {
  imageUrl: string
  onUploaded: (url: string, key: string) => void
  label?: string
  className?: string
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const pick = async (file: File) => {
    setUploading(true)
    try {
      const res = await uploadContentImage(file)
      onUploaded(res.url, res.key)
    } catch (err) {
      await showApiError(err, 'Upload ảnh thất bại')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg border border-border-c object-cover" />
      ) : (
        <span className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-surface-2 text-[10px] text-muted">chưa có</span>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Đang upload…' : label}
      </Button>
    </div>
  )
}

/** Nút ↑ / ↓ trong bảng — disable ở biên danh sách. */
const SortButtons = ({
  canUp,
  canDown,
  onMove,
}: {
  canUp: boolean
  canDown: boolean
  onMove: (delta: -1 | 1) => Promise<void>
}) => (
  <>
    <Button size="sm" variant="ghost" disabled={!canUp} onClick={() => onMove(-1)} title="Lên trước" aria-label="Lên trước">
      ↑
    </Button>
    <Button size="sm" variant="ghost" disabled={!canDown} onClick={() => onMove(1)} title="Xuống sau" aria-label="Xuống sau">
      ↓
    </Button>
  </>
)

const EmptyTab = ({ icon }: { icon: string }) => <EmptyState icon={icon} title="Chưa có mục nào" description={EMPTY_HINT} />

const LoadingTab = () => (
  <Card>
    <CardContent className="p-6">
      <Skeleton className="h-52" />
    </CardContent>
  </Card>
)

/* ================= 3.1 Tab Cấu hình chung ================= */

/** Field SiteConfigOut mà admin sửa được (backend-5 §4.2 — KHÔNG có stats runtime). */
const CONFIG_KEYS = [
  'server_ip',
  'version',
  'hero_name',
  'hero_tagline',
  'hero_description',
  'hero_cta_primary',
  'hero_cta_secondary',
  'hero_discord_url',
  'hero_bg_image_url',
  'hero_bg_image_key',
  'slideshow_interval',
  'modes_title',
  'modes_subtitle',
  'highlights_title',
  'gallery_title',
  'gallery_description',
  'community_title',
  'community_description',
  'community_cta',
  'community_discord_url',
  'members_estimate',
  'widget_id',
  'footer_copyright',
] as const
type ConfigKey = (typeof CONFIG_KEYS)[number]
type ConfigDraft = Record<ConfigKey, string>

const NUMERIC_CONFIG_KEYS = ['slideshow_interval', 'members_estimate'] as const

const cfgToDraft = (c: AdminSiteConfig): ConfigDraft =>
  Object.fromEntries(CONFIG_KEYS.map((k) => [k, c[k] == null ? '' : String(c[k])])) as ConfigDraft

const ConfigTab = () => {
  const [draft, setDraft] = useState<ConfigDraft | null>(null)
  const [errors, setErrors] = useState<Partial<Record<ConfigKey, string>>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const aliveRef = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await getContentConfig()
      if (aliveRef.current && cfg) setDraft(cfgToDraft(cfg))
    } catch (err) {
      if (aliveRef.current) await showApiError(err, 'Không tải được cấu hình site')
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
  }, [load])

  const set = (patch: Partial<ConfigDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  const submit = async () => {
    if (!draft || busy) return
    const e: Partial<Record<ConfigKey, string>> = {}
    const interval = Number(draft.slideshow_interval)
    if (draft.slideshow_interval !== '' && (!Number.isFinite(interval) || interval < 1000 || interval > 60000))
      e.slideshow_interval = 'Phải trong 1000–60000 (ms)'
    const members = Number(draft.members_estimate)
    if (draft.members_estimate !== '' && (!Number.isInteger(members) || members < 0)) e.members_estimate = 'Số nguyên ≥ 0'
    setErrors(e)
    if (Object.keys(e).length) return

    setBusy(true)
    try {
      const patch: Record<string, unknown> = {}
      for (const k of CONFIG_KEYS) {
        if (k === 'hero_bg_image_key') continue // gửi kèm khi save URL — luôn có mặt
        const v = draft[k].trim()
        if ((NUMERIC_CONFIG_KEYS as readonly string[]).includes(k)) patch[k] = v === '' ? null : Number(v)
        else patch[k] = v === '' ? null : v
      }
      // PATCH upsert singleton — backend-5 §4.2.
      patch.hero_bg_image_key = draft.hero_bg_image_key.trim() || null
      const updated = await updateContentConfig(patch as SiteConfigPatch)
      if (aliveRef.current && updated) setDraft(cfgToDraft(updated))
      await showSuccess('Đã lưu cấu hình', 'Bấm “Đồng bộ cache” trên đầu trang để trang chủ hiển thị ngay.')
    } catch (err) {
      await showApiError(err, 'Không lưu được cấu hình')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !draft) return <LoadingTab />
  if (!draft) return <EmptyTab icon="⚙️" />

  const group = 'grid gap-4 sm:grid-cols-2'
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">
        💡 IP/version đổ vào widget server-status & copy-IP toàn site. Field để trống = backend giữ null.
      </p>

      {/* Nhóm 1 — thông tin server */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionHeader title="Thông tin server" />
          <div className={group}>
            <Field label="Server IP" htmlFor="cfg-ip" hint="host hoặc host:port — dùng cho copy-IP + widget">
              <input id="cfg-ip" className={ctlCls} value={draft.server_ip} onChange={(ev) => set({ server_ip: ev.target.value })} />
            </Field>
            <Field label="Version" htmlFor="cfg-ver">
              <input id="cfg-ver" className={ctlCls} value={draft.version} onChange={(ev) => set({ version: ev.target.value })} placeholder="1.21.4" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Nhóm 2 — hero */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionHeader title="Hero (đầu trang chủ)" />
          <div className={group}>
            <Field label="Tên hero" htmlFor="cfg-hn">
              <input id="cfg-hn" className={ctlCls} value={draft.hero_name} onChange={(ev) => set({ hero_name: ev.target.value })} />
            </Field>
            <Field label="Tagline" htmlFor="cfg-ht">
              <input id="cfg-ht" className={ctlCls} value={draft.hero_tagline} onChange={(ev) => set({ hero_tagline: ev.target.value })} />
            </Field>
            <Field label="Mô tả" htmlFor="cfg-hd" className="sm:col-span-2">
              <textarea id="cfg-hd" rows={2} className={ctlCls} value={draft.hero_description} onChange={(ev) => set({ hero_description: ev.target.value })} />
            </Field>
            <Field label="CTA chính" htmlFor="cfg-hc1">
              <input id="cfg-hc1" className={ctlCls} value={draft.hero_cta_primary} onChange={(ev) => set({ hero_cta_primary: ev.target.value })} />
            </Field>
            <Field label="CTA phụ" htmlFor="cfg-hc2">
              <input id="cfg-hc2" className={ctlCls} value={draft.hero_cta_secondary} onChange={(ev) => set({ hero_cta_secondary: ev.target.value })} />
            </Field>
            <Field label="Discord URL (hero)" htmlFor="cfg-hdurl">
              <input id="cfg-hdurl" className={ctlCls} value={draft.hero_discord_url} onChange={(ev) => set({ hero_discord_url: ev.target.value })} placeholder="https://discord.gg/…" />
            </Field>
            <Field label="Slideshow interval (ms)" htmlFor="cfg-int" error={errors.slideshow_interval} hint="1000–60000">
              <input id="cfg-int" type="number" min={1000} max={60000} step={500} className={cn(ctlCls, 'tabular-nums')} value={draft.slideshow_interval} onChange={(ev) => set({ slideshow_interval: ev.target.value })} />
            </Field>
            <Field label="Ảnh nền hero" className="sm:col-span-2" hint="Upload qua /api/admin/upload (prefix content) — lưu cả image_key + image_url">
              <ImagePicker
                imageUrl={draft.hero_bg_image_url}
                label="Chọn ảnh nền"
                onUploaded={(url, key) => set({ hero_bg_image_url: url, hero_bg_image_key: key })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Nhóm 3 — cộng đồng + gallery */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionHeader title="Game modes · Highlight · Gallery · Cộng đồng" />
          <div className={group}>
            <Field label="Modes title" htmlFor="cfg-mt">
              <input id="cfg-mt" className={ctlCls} value={draft.modes_title} onChange={(ev) => set({ modes_title: ev.target.value })} />
            </Field>
            <Field label="Modes subtitle" htmlFor="cfg-ms">
              <input id="cfg-ms" className={ctlCls} value={draft.modes_subtitle} onChange={(ev) => set({ modes_subtitle: ev.target.value })} />
            </Field>
            <Field label="Highlights title" htmlFor="cfg-ht2" className="sm:col-span-2">
              <input id="cfg-ht2" className={ctlCls} value={draft.highlights_title} onChange={(ev) => set({ highlights_title: ev.target.value })} />
            </Field>
            <Field label="Gallery title" htmlFor="cfg-gt">
              <input id="cfg-gt" className={ctlCls} value={draft.gallery_title} onChange={(ev) => set({ gallery_title: ev.target.value })} />
            </Field>
            <Field label="Gallery description" htmlFor="cfg-gd">
              <input id="cfg-gd" className={ctlCls} value={draft.gallery_description} onChange={(ev) => set({ gallery_description: ev.target.value })} />
            </Field>
            <Field label="Community title" htmlFor="cfg-ct">
              <input id="cfg-ct" className={ctlCls} value={draft.community_title} onChange={(ev) => set({ community_title: ev.target.value })} />
            </Field>
            <Field label="Community CTA" htmlFor="cfg-cc">
              <input id="cfg-cc" className={ctlCls} value={draft.community_cta} onChange={(ev) => set({ community_cta: ev.target.value })} />
            </Field>
            <Field label="Community description" htmlFor="cfg-cd" className="sm:col-span-2">
              <textarea id="cfg-cd" rows={2} className={ctlCls} value={draft.community_description} onChange={(ev) => set({ community_description: ev.target.value })} />
            </Field>
            <Field label="Community Discord URL" htmlFor="cfg-cdurl">
              <input id="cfg-cdurl" className={ctlCls} value={draft.community_discord_url} onChange={(ev) => set({ community_discord_url: ev.target.value })} placeholder="https://discord.gg/…" />
            </Field>
            <Field label="Members estimate" htmlFor="cfg-me" error={errors.members_estimate} hint="Số thành viên hiển thị (làm tròn mềm)">
              <input id="cfg-me" type="number" min={0} className={cn(ctlCls, 'tabular-nums')} value={draft.members_estimate} onChange={(ev) => set({ members_estimate: ev.target.value })} />
            </Field>
            <Field label="Widget id" htmlFor="cfg-wid">
              <input id="cfg-wid" className={ctlCls} value={draft.widget_id} onChange={(ev) => set({ widget_id: ev.target.value })} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Nhóm 4 — footer copyright */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <SectionHeader title="Footer — bản quyền" />
          <Field label="Footer copyright" htmlFor="cfg-fc">
            <textarea id="cfg-fc" rows={2} className={ctlCls} value={draft.footer_copyright} onChange={(ev) => set({ footer_copyright: ev.target.value })} />
          </Field>
        </CardContent>
      </Card>

      {/* 1 nút Lưu tổng (đơn giản — spec 3.1) */}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu cấu hình'}
        </Button>
      </div>
    </div>
  )
}

/* ================= 3.2 Tab Hero ================= */

type HeroDraft = { image_url: string; image_key: string; alt: string; sort_order: string; is_active: boolean }
const EMPTY_HERO: HeroDraft = { image_url: '', image_key: '', alt: '', sort_order: '0', is_active: true }

/** Modal mount-on-demand (idiom AdminGameModesPage.ModeModal) — draft init từ props, không effect. */
const HeroFormModal = ({ editing, onClose, onSaved }: { editing: AdminHeroSlide | null; onClose: () => void; onSaved: () => void }) => {
  const [draft, setDraft] = useState<HeroDraft>(() =>
    editing
      ? { image_url: editing.image_url, image_key: editing.image_key ?? '', alt: editing.alt ?? '', sort_order: String(editing.sort_order), is_active: editing.is_active }
      : EMPTY_HERO,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = (patch: Partial<HeroDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!draft.image_url.trim()) e.image_url = 'Phải upload ảnh'
    if (draft.sort_order && !Number.isInteger(Number(draft.sort_order))) e.sort_order = 'Số nguyên'
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const body = {
        image_url: draft.image_url.trim(),
        image_key: draft.image_key.trim() || null,
        alt: draft.alt.trim() || null,
        sort_order: Number(draft.sort_order || 0),
        is_active: draft.is_active,
      }
      if (editing) await updateHeroSlide(editing.id, body)
      else await createHeroSlide(body)
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, editing ? 'Không cập nhật được slide' : 'Không tạo được slide')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Sửa slide #${editing.id}` : 'Slide hero mới'}
      description="Ảnh xoay vòng khối hero trang chủ (kèm slideshow_interval ở tab Cấu hình chung)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu slide'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Ảnh *" error={errors.image_url}>
          <ImagePicker imageUrl={draft.image_url} onUploaded={(url, key) => set({ image_url: url, image_key: key })} />
        </Field>
        <Field label="Alt (mô tả ảnh)" htmlFor="hero-alt">
          <input id="hero-alt" className={ctlCls} value={draft.alt} onChange={(ev) => set({ alt: ev.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sort order" htmlFor="hero-sort" error={errors.sort_order}>
            <input id="hero-sort" type="number" className={cn(ctlCls, 'tabular-nums')} value={draft.sort_order} onChange={(ev) => set({ sort_order: ev.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={draft.is_active} onChange={(ev) => set({ is_active: ev.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            Đang bật (is_active)
          </label>
        </div>
      </div>
    </Modal>
  )
}

const HeroTab = () => {
  const fetcher = useCallback(() => listHeroSlides(), [])
  const { rows, loading, load } = useContentList(fetcher, 'Không tải được danh sách slide')
  const [editing, setEditing] = useState<AdminHeroSlide | 'new' | null>(null)
  const swap = makeSortSwapper(rows ?? [], load, (id, body) => updateHeroSlide(id, body))
  const list = bySort(rows ?? [])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Hero slides"
        actions={<Button size="sm" onClick={() => setEditing('new')}>+ Thêm slide</Button>}
      />
      {loading && !rows ? (
        <LoadingTab />
      ) : list.length === 0 ? (
        <EmptyTab icon="🖼️" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 pt-6 pb-4">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Ảnh</Th>
                    <Th>Alt</Th>
                    <Th>Sort</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s, i) => (
                    <tr key={s.id} className="hover:bg-surface-2/60">
                      <Td>
                        <img src={s.image_url} alt={s.alt ?? ''} loading="lazy" className="h-12 w-12 rounded-lg border border-border-c object-cover" />
                      </Td>
                      <Td className="max-w-[280px] truncate text-fg">{s.alt || <span className="text-muted">—</span>}</Td>
                      <Td className="tabular-nums text-muted">{s.sort_order}</Td>
                      <Td><ActiveBadge active={s.is_active} /></Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>Sửa</Button>
                        <SortButtons canUp={i > 0} canDown={i < list.length - 1} onMove={(d) => swap(s.id, d)} />
                        <InlineConfirm
                          label="Xoá"
                          confirmLabel="Xoá slide?"
                          warning="xoá hard khỏi DB"
                          onConfirm={async () => {
                            try {
                              await deleteHeroSlide(s.id)
                              await load()
                            } catch (err) {
                              await showApiError(err, 'Không xoá được slide')
                            }
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </CardContent>
        </Card>
      )}
      {editing !== null && (
        <HeroFormModal editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}

/* ================= 3.3 Tab Highlight ================= */

type HighlightDraft = { icon: string; title: string; desc: string; sort_order: string; is_active: boolean }
const EMPTY_HIGHLIGHT: HighlightDraft = { icon: '⭐', title: '', desc: '', sort_order: '0', is_active: true }

const HighlightFormModal = ({ editing, onClose, onSaved }: { editing: AdminHighlight | null; onClose: () => void; onSaved: () => void }) => {
  const [draft, setDraft] = useState<HighlightDraft>(() =>
    editing
      ? { icon: editing.icon ?? '', title: editing.title, desc: editing.desc, sort_order: String(editing.sort_order), is_active: editing.is_active }
      : EMPTY_HIGHLIGHT,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = (patch: Partial<HighlightDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!draft.title.trim()) e.title = 'Bắt buộc'
    if (!draft.desc.trim()) e.desc = 'Bắt buộc'
    if (draft.icon.trim().length > 16) e.icon = 'Tối đa 16 ký tự'
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const body = {
        icon: draft.icon.trim() || null,
        title: draft.title.trim(),
        desc: draft.desc.trim(),
        sort_order: Number(draft.sort_order || 0),
        is_active: draft.is_active,
      }
      if (editing) await updateHighlight(editing.id, body)
      else await createHighlight(body)
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, editing ? 'Không cập nhật được highlight' : 'Không tạo được highlight')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Sửa highlight #${editing.id}` : 'Highlight mới'}
      description="Dải icon + tít + mô tả dưới hero trang chủ (không có ảnh)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu highlight'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Icon" htmlFor="hl-icon" error={errors.icon} hint="1 ký tự / emoji (≤16)">
          <input id="hl-icon" className={ctlCls} value={draft.icon} onChange={(ev) => set({ icon: ev.target.value })} placeholder="⚡" />
        </Field>
        <Field label="Title *" htmlFor="hl-title" error={errors.title}>
          <input id="hl-title" className={ctlCls} value={draft.title} onChange={(ev) => set({ title: ev.target.value })} />
        </Field>
        <Field label="Mô tả *" htmlFor="hl-desc" error={errors.desc} className="sm:col-span-2">
          <textarea id="hl-desc" rows={2} className={ctlCls} value={draft.desc} onChange={(ev) => set({ desc: ev.target.value })} />
        </Field>
        <Field label="Sort order" htmlFor="hl-sort">
          <input id="hl-sort" type="number" className={cn(ctlCls, 'tabular-nums')} value={draft.sort_order} onChange={(ev) => set({ sort_order: ev.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={draft.is_active} onChange={(ev) => set({ is_active: ev.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
          Đang bật (is_active)
        </label>
      </div>
    </Modal>
  )
}

const HighlightTab = () => {
  const fetcher = useCallback(() => listHighlights(), [])
  const { rows, loading, load } = useContentList(fetcher, 'Không tải được danh sách highlight')
  const [editing, setEditing] = useState<AdminHighlight | 'new' | null>(null)
  const swap = makeSortSwapper(rows ?? [], load, (id, body) => updateHighlight(id, body))
  const list = bySort(rows ?? [])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Highlights"
        actions={<Button size="sm" onClick={() => setEditing('new')}>+ Thêm highlight</Button>}
      />
      {loading && !rows ? (
        <LoadingTab />
      ) : list.length === 0 ? (
        <EmptyTab icon="✨" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 pt-6 pb-4">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Icon</Th>
                    <Th>Title</Th>
                    <Th>Mô tả</Th>
                    <Th>Sort</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((h, i) => (
                    <tr key={h.id} className="hover:bg-surface-2/60">
                      <Td className="text-xl leading-none">{h.icon || '—'}</Td>
                      <Td className="font-semibold">{h.title}</Td>
                      <Td className="max-w-[320px] truncate text-xs text-muted">{h.desc}</Td>
                      <Td className="tabular-nums text-muted">{h.sort_order}</Td>
                      <Td><ActiveBadge active={h.is_active} /></Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(h)}>Sửa</Button>
                        <SortButtons canUp={i > 0} canDown={i < list.length - 1} onMove={(d) => swap(h.id, d)} />
                        <InlineConfirm
                          label="Xoá"
                          confirmLabel="Xoá highlight?"
                          onConfirm={async () => {
                            try {
                              await deleteHighlight(h.id)
                              await load()
                            } catch (err) {
                              await showApiError(err, 'Không xoá được highlight')
                            }
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </CardContent>
        </Card>
      )}
      {editing !== null && (
        <HighlightFormModal editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}

/* ================= 3.2 Tab Gallery ================= */

type GalleryDraft = { image_url: string; image_key: string; title: string; alt: string; width: string; height: string; sort_order: string; is_active: boolean }
const EMPTY_GALLERY: GalleryDraft = { image_url: '', image_key: '', title: '', alt: '', width: '', height: '', sort_order: '0', is_active: true }

const GalleryFormModal = ({ editing, onClose, onSaved }: { editing: AdminGalleryImage | null; onClose: () => void; onSaved: () => void }) => {
  const [draft, setDraft] = useState<GalleryDraft>(() =>
    editing
      ? {
          image_url: editing.image_url,
          image_key: editing.image_key ?? '',
          title: editing.title ?? '',
          alt: editing.alt ?? '',
          width: editing.width == null ? '' : String(editing.width),
          height: editing.height == null ? '' : String(editing.height),
          sort_order: String(editing.sort_order),
          is_active: editing.is_active,
        }
      : EMPTY_GALLERY,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = (patch: Partial<GalleryDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!draft.image_url.trim()) e.image_url = 'Phải upload ảnh'
    for (const k of ['width', 'height'] as const) {
      if (draft[k] && (!Number.isInteger(Number(draft[k])) || Number(draft[k]) <= 0)) e[k] = 'Số nguyên > 0 (để trống = chưa biết)'
    }
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const body = {
        image_url: draft.image_url.trim(),
        image_key: draft.image_key.trim() || null,
        title: draft.title.trim() || null,
        alt: draft.alt.trim() || null,
        width: draft.width === '' ? null : Number(draft.width),
        height: draft.height === '' ? null : Number(draft.height),
        sort_order: Number(draft.sort_order || 0),
        is_active: draft.is_active,
      }
      if (editing) await updateGalleryImage(editing.id, body)
      else await createGalleryImage(body)
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, editing ? 'Không cập nhật được ảnh' : 'Không tạo được ảnh')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Sửa ảnh gallery #${editing.id}` : 'Ảnh gallery mới'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu ảnh'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Ảnh *" error={errors.image_url}>
          <ImagePicker imageUrl={draft.image_url} onUploaded={(url, key) => set({ image_url: url, image_key: key })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="gl-title">
            <input id="gl-title" className={ctlCls} value={draft.title} onChange={(ev) => set({ title: ev.target.value })} />
          </Field>
          <Field label="Alt" htmlFor="gl-alt">
            <input id="gl-alt" className={ctlCls} value={draft.alt} onChange={(ev) => set({ alt: ev.target.value })} />
          </Field>
          <Field label="Width (px)" htmlFor="gl-w" error={errors.width}>
            <input id="gl-w" type="number" min={1} className={cn(ctlCls, 'tabular-nums')} value={draft.width} onChange={(ev) => set({ width: ev.target.value })} />
          </Field>
          <Field label="Height (px)" htmlFor="gl-h" error={errors.height}>
            <input id="gl-h" type="number" min={1} className={cn(ctlCls, 'tabular-nums')} value={draft.height} onChange={(ev) => set({ height: ev.target.value })} />
          </Field>
          <Field label="Sort order" htmlFor="gl-sort">
            <input id="gl-sort" type="number" className={cn(ctlCls, 'tabular-nums')} value={draft.sort_order} onChange={(ev) => set({ sort_order: ev.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={draft.is_active} onChange={(ev) => set({ is_active: ev.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
            Đang bật (is_active)
          </label>
        </div>
      </div>
    </Modal>
  )
}

const GalleryTab = () => {
  const fetcher = useCallback(() => listGallery(), [])
  const { rows, loading, load } = useContentList(fetcher, 'Không tải được gallery')
  const [editing, setEditing] = useState<AdminGalleryImage | 'new' | null>(null)
  const swap = makeSortSwapper(rows ?? [], load, (id, body) => updateGalleryImage(id, body))
  const list = bySort(rows ?? [])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Gallery"
        actions={<Button size="sm" onClick={() => setEditing('new')}>+ Thêm ảnh</Button>}
      />
      {loading && !rows ? (
        <LoadingTab />
      ) : list.length === 0 ? (
        <EmptyTab icon="🖼️" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 pt-6 pb-4">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Ảnh</Th>
                    <Th>Title / Alt</Th>
                    <Th>Sort</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((g, i) => (
                    <tr key={g.id} className="hover:bg-surface-2/60">
                      <Td>
                        <img src={g.image_url} alt={g.alt ?? ''} loading="lazy" className="h-12 w-12 rounded-lg border border-border-c object-cover" />
                      </Td>
                      <Td>
                        <p className="font-semibold">{g.title || <span className="text-muted">(không title)</span>}</p>
                        <p className="text-xs text-muted">{g.alt || '—'}</p>
                      </Td>
                      <Td className="tabular-nums text-muted">{g.sort_order}</Td>
                      <Td><ActiveBadge active={g.is_active} /></Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(g)}>Sửa</Button>
                        <SortButtons canUp={i > 0} canDown={i < list.length - 1} onMove={(d) => swap(g.id, d)} />
                        <InlineConfirm
                          label="Xoá"
                          confirmLabel="Xoá ảnh?"
                          onConfirm={async () => {
                            try {
                              await deleteGalleryImage(g.id)
                              await load()
                            } catch (err) {
                              await showApiError(err, 'Không xoá được ảnh')
                            }
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </CardContent>
        </Card>
      )}
      {editing !== null && (
        <GalleryFormModal editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}

/* ================= 3.4 Tab Mạng xã hội ================= */

const SOCIAL_ICONS = ['discord', 'facebook', 'tiktok', 'youtube']
type SocialDraft = { location: SocialLocation; icon: string; label: string; url: string; sort_order: string; is_active: boolean }
const EMPTY_SOCIAL: SocialDraft = { location: 'community', icon: 'discord', label: '', url: '', sort_order: '0', is_active: true }

const SocialFormModal = ({ editing, onClose, onSaved }: { editing: AdminSocial | null; onClose: () => void; onSaved: () => void }) => {
  const [draft, setDraft] = useState<SocialDraft>(() =>
    editing
      ? {
          location: editing.location,
          icon: editing.icon ?? '',
          label: editing.label,
          url: editing.url,
          sort_order: String(editing.sort_order),
          is_active: editing.is_active,
        }
      : EMPTY_SOCIAL,
  )
  // icon lạ/rỗng → mode "khác…" (nhập tay); icon quen thuộc → select thẳng.
  const [customIcon, setCustomIcon] = useState(() => !!editing && !SOCIAL_ICONS.includes(editing.icon ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = (patch: Partial<SocialDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!draft.label.trim()) e.label = 'Bắt buộc'
    if (!/^https?:\/\//i.test(draft.url.trim())) e.url = 'Phải bắt đầu bằng http:// hoặc https://'
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const body = {
        location: draft.location,
        icon: draft.icon.trim() || null,
        label: draft.label.trim(),
        url: draft.url.trim(),
        sort_order: Number(draft.sort_order || 0),
        is_active: draft.is_active,
      }
      if (editing) await updateSocial(editing.id, body)
      else await createSocial(body)
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, editing ? 'Không cập nhật được liên kết' : 'Không tạo được liên kết')
    } finally {
      setBusy(false)
    }
  }

  const iconSelectValue = customIcon ? 'other' : draft.icon

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Sửa liên kết #${editing.id}` : 'Liên kết mạng xã hội mới'}
      description="location = vị trí hiển thị: community (khối cộng đồng) hoặc footer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu liên kết'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <select className={ctlCls} value={draft.location} onChange={(ev) => set({ location: ev.target.value as SocialLocation })}>
            <option value="community">community — khối cộng đồng</option>
            <option value="footer">footer</option>
          </select>
        </Field>
        <Field label="Icon">
          <select
            className={ctlCls}
            value={iconSelectValue}
            onChange={(ev) => {
              if (ev.target.value === 'other') {
                setCustomIcon(true)
                set({ icon: '' })
              } else {
                setCustomIcon(false)
                set({ icon: ev.target.value })
              }
            }}
          >
            {SOCIAL_ICONS.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
            <option value="other">khác…</option>
          </select>
        </Field>
        {customIcon && (
          <Field label="Icon (tên khác)" htmlFor="sc-icon-custom" hint="≤32 ký tự" className="sm:col-span-2">
            <input id="sc-icon-custom" className={ctlCls} value={draft.icon} onChange={(ev) => set({ icon: ev.target.value })} placeholder="instagram / threads /…" />
          </Field>
        )}
        <Field label="Label *" htmlFor="sc-label" error={errors.label}>
          <input id="sc-label" className={ctlCls} value={draft.label} onChange={(ev) => set({ label: ev.target.value })} placeholder="Discord" />
        </Field>
        <Field label="URL *" htmlFor="sc-url" error={errors.url}>
          <input id="sc-url" className={ctlCls} value={draft.url} onChange={(ev) => set({ url: ev.target.value })} placeholder="https://…" />
        </Field>
        <Field label="Sort order" htmlFor="sc-sort">
          <input id="sc-sort" type="number" className={cn(ctlCls, 'tabular-nums')} value={draft.sort_order} onChange={(ev) => set({ sort_order: ev.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={draft.is_active} onChange={(ev) => set({ is_active: ev.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
          Đang bật (is_active)
        </label>
      </div>
    </Modal>
  )
}

const SocialsTab = () => {
  const [filter, setFilter] = useState<SocialLocation | ''>('')
  const fetcher = useCallback(() => listSocials(filter), [filter])
  const { rows, loading, load } = useContentList(fetcher, 'Không tải được danh sách mạng xã hội')
  const [editing, setEditing] = useState<AdminSocial | 'new' | null>(null)
  const swap = makeSortSwapper(rows ?? [], load, (id, body) => updateSocial(id, body))
  const list = bySort(rows ?? [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Lọc theo location" className="w-56">
          <select className={ctlCls} value={filter} onChange={(ev) => setFilter(ev.target.value as SocialLocation | '')}>
            <option value="">Mọi vị trí</option>
            <option value="community">community</option>
            <option value="footer">footer</option>
          </select>
        </Field>
        <Button size="sm" onClick={() => setEditing('new')}>+ Thêm liên kết</Button>
      </div>
      {loading && !rows ? (
        <LoadingTab />
      ) : list.length === 0 ? (
        <EmptyTab icon="🌐" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 pt-6 pb-4">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Icon</Th>
                    <Th>Label</Th>
                    <Th>URL</Th>
                    <Th>Location</Th>
                    <Th>Sort</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s, i) => (
                    <tr key={s.id} className="hover:bg-surface-2/60">
                      <Td className="font-mono text-xs text-muted">{s.icon || '—'}</Td>
                      <Td className="font-semibold">{s.label}</Td>
                      <Td className="max-w-[260px] truncate">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          {s.url}
                        </a>
                      </Td>
                      <Td className="text-xs text-muted">{s.location}</Td>
                      <Td className="tabular-nums text-muted">{s.sort_order}</Td>
                      <Td><ActiveBadge active={s.is_active} /></Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>Sửa</Button>
                        <SortButtons canUp={i > 0} canDown={i < list.length - 1} onMove={(d) => swap(s.id, d)} />
                        <InlineConfirm
                          label="Xoá"
                          confirmLabel="Xoá liên kết?"
                          onConfirm={async () => {
                            try {
                              await deleteSocial(s.id)
                              await load()
                            } catch (err) {
                              await showApiError(err, 'Không xoá được liên kết')
                            }
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </CardContent>
        </Card>
      )}
      {editing !== null && (
        <SocialFormModal editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}

/* ================= 3.5 Tab Footer (columns + nested links editor) ================= */

type LinkDraft = { label: string; to_url: string }
type ColumnDraft = { title: string; sort_order: string; is_active: boolean; links: LinkDraft[] }
const EMPTY_COLUMN: ColumnDraft = { title: '', sort_order: '0', is_active: true, links: [{ label: '', to_url: '' }] }

/** link nội bộ `/...` (kể cả `/`, hoặc `#...`) hoặc http(s) — backend nhận cả hai. */
const isLinkTarget = (to = '') => to === '/' || /^\/[^/]/.test(to) || to.startsWith('#') || /^https?:\/\//i.test(to)

const FooterColumnFormModal = ({ editing, onClose, onSaved }: { editing: AdminFooterColumn | null; onClose: () => void; onSaved: () => void }) => {
  const [draft, setDraft] = useState<ColumnDraft>(() =>
    editing
      ? {
          title: editing.title,
          sort_order: String(editing.sort_order),
          is_active: editing.is_active,
          links: editing.links.length ? editing.links.map((l) => ({ label: l.label, to_url: l.to_url })) : [{ label: '', to_url: '' }],
        }
      : EMPTY_COLUMN,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const set = (patch: Partial<ColumnDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const setLink = (idx: number, patch: Partial<LinkDraft>) =>
    setDraft((d) => ({ ...d, links: d.links.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }))

  const moveLink = (idx: number, delta: -1 | 1) =>
    setDraft((d) => {
      const j = idx + delta
      if (j < 0 || j >= d.links.length) return d
      const links = [...d.links]
      ;[links[idx], links[j]] = [links[j], links[idx]]
      return { ...d, links }
    })

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!draft.title.trim()) e.title = 'Bắt buộc'
    // rows rỗng hoàn toàn bỏ qua; row có nội dung phải khớp /... hoặc http(s)
    draft.links.forEach((l, i) => {
      if (!l.label.trim() && !l.to_url.trim()) return
      if (!l.label.trim()) e[`link_${i}_label`] = 'Thiếu label'
      if (!isLinkTarget(l.to_url.trim())) e[`link_${i}_to`] = 'Route nội bộ /... hoặc http(s)'
    })
    setErrors(e)
    if (Object.keys(e).length || busy) return
    setBusy(true)
    try {
      const links = draft.links
        .map((l) => ({ label: l.label.trim(), to_url: l.to_url.trim() }))
        .filter((l) => l.label && l.to_url)
      // upsert TOÀN BỘ links của column (backend-5 §4.2 — nested trong body column)
      const body = { title: draft.title.trim(), sort_order: Number(draft.sort_order || 0), is_active: draft.is_active, links }
      if (editing) await updateFooterColumn(editing.id, body)
      else await createFooterColumn(body)
      onSaved()
      onClose()
    } catch (err) {
      await showApiError(err, editing ? 'Không cập nhật được cột' : 'Không tạo được cột')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Sửa cột #${editing.id}` : 'Cột footer mới'}
      description="Links lưu nested trong column (upsert toàn bộ khi lưu)."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Huỷ</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cột'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *" htmlFor="fc-title" error={errors.title}>
            <input id="fc-title" className={ctlCls} value={draft.title} onChange={(ev) => set({ title: ev.target.value })} placeholder="Khám phá" />
          </Field>
          <Field label="Sort order" htmlFor="fc-sort">
            <input id="fc-sort" type="number" className={cn(ctlCls, 'tabular-nums')} value={draft.sort_order} onChange={(ev) => set({ sort_order: ev.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={draft.is_active} onChange={(ev) => set({ is_active: ev.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
          Đang bật (is_active)
        </label>

        <div className="space-y-2">
          <SectionHeader
            title="Links"
            actions={
              <Button size="sm" variant="outline" onClick={() => set({ links: [...draft.links, { label: '', to_url: '' }] })}>
                + Thêm link
              </Button>
            }
          />
          {draft.links.map((l, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2 rounded-xl border border-border-c bg-surface-2/50 p-2">
              <div className="min-w-0 flex-1 space-y-1">
                <input className={ctlCls} value={l.label} placeholder="Label (vd: Máy chủ)" onChange={(ev) => setLink(i, { label: ev.target.value })} />
                {errors[`link_${i}_label`] && <p className="text-xs font-medium text-red-500">{errors[`link_${i}_label`]}</p>}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <input className={ctlCls} value={l.to_url} placeholder="/may-chu hoặc https://…" onChange={(ev) => setLink(i, { to_url: ev.target.value })} />
                {errors[`link_${i}_to`] && <p className="text-xs font-medium text-red-500">{errors[`link_${i}_to`]}</p>}
              </div>
              <div className="flex items-center gap-1 pt-1">
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => moveLink(i, -1)} aria-label="Lên">↑</Button>
                <Button size="sm" variant="ghost" disabled={i === draft.links.length - 1} onClick={() => moveLink(i, 1)} aria-label="Xuống">↓</Button>
                <Button size="sm" variant="ghost" onClick={() => set({ links: draft.links.filter((_, j) => j !== i) })} aria-label="Xoá link">✕</Button>
              </div>
            </div>
          ))}
          {draft.links.length === 0 && <p className="text-xs text-muted">Chưa có link — column rỗng sẽ không hiện trên footer.</p>}
        </div>
      </div>
    </Modal>
  )
}

const FooterTab = () => {
  const fetcher = useCallback(() => listFooterColumns(), [])
  const { rows, loading, load } = useContentList(fetcher, 'Không tải được cột footer')
  const [editing, setEditing] = useState<AdminFooterColumn | 'new' | null>(null)
  const list = bySort(rows ?? [])

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Cột footer"
        actions={<Button size="sm" onClick={() => setEditing('new')}>+ Thêm cột</Button>}
      />
      {loading && !rows ? (
        <LoadingTab />
      ) : list.length === 0 ? (
        <EmptyTab icon="🦶" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 pt-6 pb-4">
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Links</Th>
                    <Th>Sort</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/60">
                      <Td className="font-semibold">{c.title}</Td>
                      <Td className="text-xs text-muted">
                        {c.links.length} link{c.links.length ? `: ${c.links.map((l) => l.label).join(', ')}` : ''}
                      </Td>
                      <Td className="tabular-nums text-muted">{c.sort_order}</Td>
                      <Td><ActiveBadge active={c.is_active} /></Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Sửa</Button>
                        <InlineConfirm
                          label="Xoá"
                          confirmLabel="Xoá cột?"
                          warning="kèm toàn bộ links của cột"
                          onConfirm={async () => {
                            try {
                              await deleteFooterColumn(c.id)
                              await load()
                            } catch (err) {
                              await showApiError(err, 'Không xoá được cột')
                            }
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </CardContent>
        </Card>
      )}
      {editing !== null && (
        <FooterColumnFormModal editing={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}

/* ================= Trang ================= */

export const AdminContentPage = () => {
  useSeo({ title: 'Quản trị — Nội dung website — SV AeSieuQuay', noindex: true })
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: ContentTab = CONTENT_TABS.some(([id]) => id === tabParam) ? (tabParam as ContentTab) : 'config'

  const [refreshing, setRefreshing] = useState(false)

  /** POST /admin/cache/refresh — dựng lại payload home (doc v2 §6, reuse backend-5 §0). */
  const onRefreshCache = async () => {
    setRefreshing(true)
    try {
      const res = await refreshSiteCache()
      const errKeys = Object.keys(res.errors ?? {})
      await showSuccess(
        'Đã đồng bộ cache',
        errKeys.length
          ? `Dựng lại ${res.refreshed.length} khối, ${errKeys.length} khối lỗi: ${errKeys.join(', ')}`
          : `Khối đã dựng lại: ${res.refreshed.join(', ') || '(không có)'}`,
        2500,
      )
    } catch (err) {
      // 429 cooldown — message backend tiếng Việt ("Vừa refresh — chờ ~15s"), toast thẳng.
      await showApiError(err, 'Không refresh được cache')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nội dung website"
        description="Toàn bộ nội dung DB hiển thị trên trang chủ — hero, highlight, gallery, mạng xã hội, footer, cấu hình. Menu Header do frontend tự sở hữu (DEFAULT_MENU)."
        actions={
          <>
            <Button variant="outline" onClick={onRefreshCache} disabled={refreshing}>
              {refreshing ? 'Đang dựng…' : '↻ Đồng bộ cache'}
            </Button>
            {/* Trang SEO là full-reload (<a>) — khu admin không điều hướng sang nó bằng <Link>. */}
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Xem trang chủ ↗
            </a>
          </>
        }
      />

      <div className="flex overflow-x-auto rounded-xl border border-border-c bg-surface-2 p-1" role="tablist">
        {CONTENT_TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setParams({ tab: id }, { replace: true })}
            className={cn(
              'shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === id ? 'bg-primary text-white' : 'text-muted hover:text-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigTab />}
      {tab === 'hero' && <HeroTab />}
      {tab === 'highlight' && <HighlightTab />}
      {tab === 'gallery' && <GalleryTab />}
      {tab === 'socials' && <SocialsTab />}
      {tab === 'footer' && <FooterTab />}
    </div>
  )
}

export default AdminContentPage
