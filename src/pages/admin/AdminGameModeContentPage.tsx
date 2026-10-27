import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'

import { useSeo } from '@/hooks/useSeo'
import { getGameMode, updateGameMode, uploadAdminImage, type AdminGameMode } from '@/api/admin'
import { ApiError } from '@/api/client'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import Modal from '@/components/admin/Modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'
import { fmtIsoVN } from '@/lib/format'

/* ================= Diff theo dòng (FRONTEND-4 §6 — không cần lib) ================= */

interface DiffRow {
  l: string | null // bản của tôi
  r: string | null // bản server
  t: 'same' | 'del' | 'add'
}

const MAX_DIFF_LINES = 800

/** LCS theo dòng; tài liệu >800 dòng → so sánh thô từng dòng (đủ cho cảnh báo trùng sửa). */
export function diffLines(mine: string, server: string): DiffRow[] {
  const A = mine.split('\n')
  const B = server.split('\n')
  if (A.length > MAX_DIFF_LINES || B.length > MAX_DIFF_LINES) {
    const n = Math.max(A.length, B.length)
    return Array.from({ length: n }, (_, i) => {
      const l = i < A.length ? A[i] : null
      const r = i < B.length ? B[i] : null
      return { l, r, t: l === r ? ('same' as const) : 'del' as const }
    })
  }
  const m = A.length
  const n = B.length
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      rows.push({ l: A[i], r: B[j], t: 'same' })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ l: A[i], r: null, t: 'del' })
      i++
    } else {
      rows.push({ l: null, r: B[j], t: 'add' })
      j++
    }
  }
  while (i < m) rows.push({ l: A[i++], r: null, t: 'del' })
  while (j < n) rows.push({ l: null, r: B[j++], t: 'add' })
  return rows
}

/* ================= CodeMirror host ================= */

export interface HtmlEditorHandle {
  insertAtCursor: (text: string) => void
  setValue: (v: string) => void
}

/**
 * Bọc CodeMirror 6 thủ công (không dùng react-codemirror).
 * Mount 1 lần với doc khởi tạo; thay đổi sau đó qua `setValue`.
 */
const HtmlEditor = forwardRef<HtmlEditorHandle, { value: string; onChange: (v: string) => void }>(
  ({ value, onChange }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useEffect(() => {
      if (!hostRef.current) return
      const view = new EditorView({
        state: EditorState.create({
          doc: value,
          extensions: [
            basicSetup, // line numbers, history, bracket match...
            html(), // syntax highlight + auto close tag
            oneDark,
            EditorView.lineWrapping,
            EditorView.updateListener.of((u) => {
              if (u.docChanged) onChangeRef.current(u.state.doc.toString())
            }),
            // Ctrl/Cmd+S → không lưu trong editor, bắt ở page (onSaveRef)
            keymap.of([
              {
                key: 'Mod-s',
                preventDefault: true,
                run: () => {
                  window.dispatchEvent(new CustomEvent('aqs:save-content'))
                  return true
                },
              },
            ]),
          ],
        }),
        parent: hostRef.current,
      })
      viewRef.current = view
      return () => view.destroy()
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount 1 lần
    }, [])

    useImperativeHandle(ref, () => ({
      /** Chèn text tại selection (nút Chèn ảnh dùng). */
      insertAtCursor: (text: string) => {
        const view = viewRef.current
        if (!view) return
        const { from, to } = view.state.selection.main
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        })
        view.focus()
      },
      setValue: (v: string) => {
        const view = viewRef.current
        if (!view) return
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } })
      },
    }))

    return <div ref={hostRef} className="aqs-cm h-full min-h-0 overflow-hidden" />
  },
)
HtmlEditor.displayName = 'HtmlEditor'

/* ================= Trang editor ================= */

export const AdminGameModeContentPage = () => {
  const { id = '' } = useParams()
  const modeId = Number(id)

  useSeo({ title: 'Quản trị — Soạn nội dung máy chủ — SV AeSieuQuay', noindex: true })

  const [mode, setMode] = useState<AdminGameMode | null>(null)
  const [doc, setDoc] = useState('')
  // Bản đã lưu gần nhất (đã sanitize ở backend) — so với `doc` để phát hiện unsaved changes.
  const [savedDoc, setSavedDoc] = useState('')
  const [preview, setPreview] = useState('')
  const [previewDark, setPreviewDark] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  /* FRONTEND-4 §6 — optimistic locking: giữ version bản đang soạn, gửi khi lưu. */
  const [baseVersion, setBaseVersion] = useState<number | null>(null)
  const [conflict, setConflict] = useState<{ version: number; updatedAt: string | null; serverDoc: string | null } | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [applying, setApplying] = useState(false)

  const editorRef = useRef<HtmlEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Nạp một bản GameModeOut vào editor (load ban đầu / tải bản mới nhất / sau lưu). */
  const applyMode = useCallback((m: AdminGameMode) => {
    setMode(m)
    const html = m.content_html ?? ''
    setSavedDoc(html)
    setDoc(html)
    setPreview(html)
    setBaseVersion(typeof m.content_version === 'number' ? m.content_version : 0)
    editorRef.current?.setValue(html)
  }, [])

  useEffect(() => {
    let alive = true
    if (!Number.isInteger(modeId)) return // id lỗi → giữ skeleton, không gọi API
    getGameMode(modeId)
      .then((m) => {
        if (!alive) return
        applyMode(m)
      })
      .catch(async (err) => {
        if (!alive) return
        await showApiError(err, 'Không tải được máy chủ')
        if (alive) setMode(null)
      })
    return () => {
      alive = false
    }
  }, [modeId])

  /* Preview debounce 250ms */
  useEffect(() => {
    const t = setTimeout(() => setPreview(doc), 250)
    return () => clearTimeout(t)
  }, [doc])

  const dirty = mode !== null && doc !== savedDoc

  /* Unsaved-changes guard: đổi tab/đóng window */
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /* Unsaved-changes guard: đổi route trong SPA */
  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname, [dirty]),
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Chưa lưu nội dung — rời trang mà không lưu?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  const handleSave = useCallback(async () => {
    if (!mode || saving || uploading) return
    setSaving(true)
    try {
      // Response là GameModeOut với content_html ĐÃ sanitize (nh3) —
      // reset editor về bản canonical để admin thấy kết quả thật.
      const updated = await updateGameMode(mode.id, { content_html: doc, base_content_version: baseVersion })
      applyMode(updated ?? { ...mode, content_html: doc, content_version: (baseVersion ?? 0) + 1 })
      await showSuccess('Đã lưu nội dung', 'HTML đã được sanitize server-side (thẻ/script ngoài allowlist bị loại).')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // backend-4 §6: envelope.data = { content_version, updated_at } — mở modal 3 lựa chọn.
        const d = (err.data?.data ?? {}) as { content_version?: number; updated_at?: string | null }
        let serverDoc: string | null = null
        try {
          const latest = await getGameMode(mode.id)
          serverDoc = latest?.content_html ?? ''
          if (typeof d.content_version !== 'number' && typeof latest?.content_version === 'number') d.content_version = latest.content_version
          d.updated_at = d.updated_at ?? latest?.updated_at ?? null
        } catch {
          /* không lấy được bản server — modal vẫn dùng được (chỉ thiếu diff) */
        }
        setConflict({ version: d.content_version ?? 0, updatedAt: d.updated_at ?? null, serverDoc })
        setShowDiff(false)
      } else {
        await showApiError(err, 'Không lưu được nội dung')
      }
    } finally {
      setSaving(false)
    }
  }, [mode, doc, saving, uploading, baseVersion, applyMode])

  /* ===== 3 lựa chọn khi 409 (FRONTEND-4 §6) ===== */

  /** 1) Tải bản mới nhất — cảnh báo mất nháp nếu dirty. */
  const conflictLoadLatest = useCallback(async () => {
    if (!mode || applying) return
    if (dirty && !window.confirm('Bản nháp của bạn sẽ bị thay bằng bản mới nhất từ server — tiếp tục?')) return
    setApplying(true)
    try {
      const latest = conflict?.serverDoc != null ? null : await getGameMode(mode.id)
      applyMode(latest ?? { ...mode, content_html: conflict?.serverDoc ?? '', content_version: conflict?.version ?? 0, updated_at: conflict?.updatedAt ?? null })
      setConflict(null)
    } catch (err) {
      await showApiError(err, 'Không tải được bản mới nhất')
    } finally {
      setApplying(false)
    }
  }, [mode, conflict, dirty, applying, applyMode])

  /** 3) Ghi đè — PATCH lại với base_content_version = version vừa nhận từ 409. */
  const conflictOverwrite = useCallback(async () => {
    if (!mode || !conflict || applying) return
    setApplying(true)
    try {
      const updated = await updateGameMode(mode.id, { content_html: doc, base_content_version: conflict.version })
      applyMode(updated ?? { ...mode, content_html: doc, content_version: conflict.version + 1 })
      setConflict(null)
      await showSuccess('Đã ghi đè', 'Bạn đã ghi đè có chủ đích — version tăng tiếp.')
    } catch (err) {
      await showApiError(err, 'Ghi đè thất bại')
    } finally {
      setApplying(false)
    }
  }, [mode, conflict, doc, applying, applyMode])

  /* Ctrl/Cmd+S từ CodeMirror keymap bắn ra */
  useEffect(() => {
    const onSave = () => handleSave()
    window.addEventListener('aqs:save-content', onSave)
    return () => window.removeEventListener('aqs:save-content', onSave)
  }, [handleSave])

  const onPickImage = async (file: File) => {
    setUploading(true)
    try {
      const res = await uploadAdminImage(file)
      editorRef.current?.insertAtCursor(
        `<img src="${res.url}" alt="" loading="lazy" class="rounded-xl w-full" />`,
      )
    } catch (err) {
      await showApiError(err, 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  const previewHtml = useMemo(() => ({ __html: preview }), [preview])

  if (!mode) {
    return (
      <div className="space-y-6">
        <PageHeader title="Soạn nội dung" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <PageHeader
        title={`Soạn nội dung — ${mode.name}`}
        description={
          <>
            <code className="font-mono text-xs">/may-chu/{mode.slug}</code> · hỗ trợ Tailwind classes
            (danh sách có sẵn trong safelist) — tag trần sẽ ăn style mặc định của <code>.aqs-prose</code>.
            {dirty && <span className="ml-2 font-semibold text-amber-500">● chưa lưu</span>}
          </>
        }
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onPickImage(f)
                e.target.value = ''
              }}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || saving}>
              {uploading ? 'Đang upload…' : '🖼 Chèn ảnh'}
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading || !dirty}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <Link to="/admin/game-modes" className="text-sm font-medium text-muted hover:text-fg">
              ← Danh sách
            </Link>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {/* ===== HTML SOURCE ===== */}
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-border-c py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted">HTML Source</CardTitle>
            <span className="text-[11px] text-muted">Ctrl+S để lưu</span>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <HtmlEditor ref={editorRef} value={doc} onChange={setDoc} />
          </CardContent>
        </Card>

        {/* ===== CLIENT PREVIEW ===== */}
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-border-c py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted">Client Preview</CardTitle>
            <button
              type="button"
              onClick={() => setPreviewDark((v) => !v)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                previewDark
                  ? 'border-border-c bg-surface-2 text-fg'
                  : 'border-transparent text-muted hover:text-fg',
              )}
            >
              {previewDark ? '🌙 Dark' : '☀️ Light'}
            </button>
          </CardHeader>
          <CardContent className={cn('min-h-0 flex-1 overflow-y-auto p-0', previewDark && 'dark')}>
            {/* Preview không sanitize phía client: đây là source CHƯA LƯU của
                chính admin, chạy trong browser của họ; server sanitize khi ghi. */}
            <div className="aqs-prose min-h-full bg-bg p-6 text-fg" dangerouslySetInnerHTML={previewHtml} />
          </CardContent>
        </Card>
      </div>

      {/* ===== Modal 409 — 3 lựa chọn (FRONTEND-4 §6) ===== */}
      <Modal
        open={conflict !== null}
        onClose={() => {
          setConflict(null)
          setShowDiff(false)
        }}
        title="Nội dung đã bị thay đổi ở nơi khác"
        description={
          conflict
            ? `Bản trên server đang ở version #${conflict.version}${conflict.updatedAt ? ` (lưu lúc ${fmtIsoVN(conflict.updatedAt)})` : ''}. Bản của bạn dựa trên version cũ hơn.`
            : undefined
        }
        className="max-w-3xl"
        footer={
          showDiff ? (
            <Button
              variant="outline"
              onClick={() =>
                setShowDiff(false)
              }
            >
              ← Quay lại lựa chọn
            </Button>
          ) : (
            <Button variant="ghost" disabled={applying} onClick={() => setConflict(null)}>
              Đóng (soạn tiếp)
            </Button>
          )
        }
      >
        {conflict && !showDiff ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={applying}
              onClick={conflictLoadLatest}
              className="w-full rounded-xl border border-border-c bg-surface-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--border)] disabled:opacity-60"
            >
              <b className="block font-bold text-fg">1. Tải bản mới nhất</b>
              <span className="text-muted">Nạp nội dung + version mới từ server vào editor{dirty ? ' (CẢNH BÁO: mất nháp chưa lưu của bạn)' : ''}.</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDiff(true)}
              disabled={conflict.serverDoc == null}
              className="w-full rounded-xl border border-border-c bg-surface-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--border)] disabled:opacity-60"
            >
              <b className="block font-bold text-fg">2. Xem diff rồi quyết định</b>
              <span className="text-muted">
                {conflict.serverDoc == null ? 'Không tải được bản server để so sánh.' : 'Đối chiếu bản của tôi với bản server theo dòng — đóng để quay lại soạn.'}
              </span>
            </button>
            <button
              type="button"
              disabled={applying || !dirty}
              onClick={conflictOverwrite}
              className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm transition-colors hover:bg-red-500/20 disabled:opacity-60"
            >
              <b className="block font-bold text-red-500">3. Ghi đè (nguy hiểm)</b>
              <span className="text-muted">
                Lưu bản của bạn đè lên bản server bằng version vừa nhận #{conflict.version} — thay đổi của người/phiên khác sẽ MẤT.
                {!dirty && ' (Nháp của bạn trùng bản đã lưu — không có gì để ghi đè.)'}
              </span>
            </button>
          </div>
        ) : conflict ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { key: 'l' as const, label: 'Bản của tôi (chưa lưu)', color: 'text-red-500' },
                { key: 'r' as const, label: `Bản server #${conflict.version}`, color: 'text-emerald-500' },
              ]
            ).map((pane) => (
              <div key={pane.key} className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{pane.label}</p>
                <pre className="max-h-[55vh] overflow-auto rounded-xl border border-border-c bg-surface-2 p-2 text-[11px] leading-relaxed">
                  {diffLines(doc, conflict.serverDoc ?? '')
                    .filter((row) => (pane.key === 'l' ? row.l !== null : row.r !== null))
                    .map((row, idx) => {
                      const text = pane.key === 'l' ? row.l : row.r
                      const changed = row.t !== 'same'
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'whitespace-pre-wrap break-all px-1',
                            changed && (pane.key === 'l' ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500'),
                            !changed && 'text-muted',
                          )}
                        >
                          {text === '' ? ' ' : text}
                        </div>
                      )
                    })}
                </pre>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default AdminGameModeContentPage
