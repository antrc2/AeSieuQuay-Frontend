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
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'

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

  const editorRef = useRef<HtmlEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    if (!Number.isInteger(modeId)) return // id lỗi → giữ skeleton, không gọi API
    getGameMode(modeId)
      .then((m) => {
        if (!alive) return
        setMode(m)
        const html = m.content_html ?? ''
        setSavedDoc(html)
        setDoc(html)
        setPreview(html)
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
      const updated = await updateGameMode(mode.id, { content_html: doc })
      const clean = updated?.content_html ?? ''
      setSavedDoc(clean)
      setDoc(clean)
      setPreview(clean)
      editorRef.current?.setValue(clean)
      setMode(updated)
      await showSuccess('Đã lưu nội dung', 'HTML đã được sanitize server-side (thẻ/script ngoài allowlist bị loại).')
    } catch (err) {
      await showApiError(err, 'Không lưu được nội dung')
    } finally {
      setSaving(false)
    }
  }, [mode, doc, saving, uploading])

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
    </div>
  )
}

export default AdminGameModeContentPage
