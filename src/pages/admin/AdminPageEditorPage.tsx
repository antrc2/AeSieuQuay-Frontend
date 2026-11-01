import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useSeo } from '@/hooks/useSeo'
import { getContentPage, updateContentPage, type AdminContentPage } from '@/api/admin'
import { ApiError } from '@/api/client'
import { showApiError, showSuccess } from '@/utils/swal'
import { PageHeader } from '@/components/admin/blocks'
import { Field, ctlCls } from '@/components/admin/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/States'
import { cn } from '@/lib/utils'
import { HtmlEditor, type HtmlEditorHandle } from '@/pages/admin/AdminGameModeContentPage'

/** Editor HTML cho trang nội dung tĩnh (luật lệ / điều khoản / chính sách). */
export const AdminPageEditorPage = () => {
  const { id = '' } = useParams()
  const pageId = Number(id)
  useSeo({ title: 'Quản trị — Soạn nội dung trang — SV AeSieuQuay', noindex: true })

  const [page, setPage] = useState<AdminContentPage | null>(null)
  const [title, setTitle] = useState('')
  const [savedTitle, setSavedTitle] = useState('')
  const [doc, setDoc] = useState('')
  const [savedDoc, setSavedDoc] = useState('')
  const [preview, setPreview] = useState('')
  const [previewDark, setPreviewDark] = useState(false)
  const [baseVersion, setBaseVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HtmlEditorHandle>(null)

  const apply = useCallback((p: AdminContentPage) => {
    setPage(p)
    setTitle(p.title)
    setSavedTitle(p.title)
    const html = p.content_html ?? ''
    setDoc(html)
    setSavedDoc(html)
    setPreview(html)
    setBaseVersion(Number(p.content_version) || 0)
    editorRef.current?.setValue(html)
  }, [])

  useEffect(() => {
    let alive = true
    if (!Number.isInteger(pageId)) return
    getContentPage(pageId)
      .then((p) => { if (alive) apply(p) })
      .catch(async (err) => { if (alive) { await showApiError(err, 'Không tải được trang'); setPage(null) } })
    return () => { alive = false }
  }, [pageId, apply])

  useEffect(() => {
    const t = setTimeout(() => setPreview(doc), 250)
    return () => clearTimeout(t)
  }, [doc])

  const dirty = page !== null && (doc !== savedDoc || title !== savedTitle)
  const previewHtml = useMemo(() => ({ __html: preview }), [preview])

  const save = async () => {
    if (!page || saving) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      if (doc !== savedDoc) {
        payload.content_html = doc
        payload.base_content_version = baseVersion
      }
      if (title !== savedTitle) payload.title = title.trim()
      const updated = await updateContentPage(page.id, payload)
      apply(updated)
      await showSuccess('Đã lưu trang', 'HTML đã được sanitize server-side.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await showApiError(err, 'Nội dung vừa được sửa ở nơi khác — tải lại trang để lấy bản mới nhất')
      } else {
        await showApiError(err, 'Không lưu được trang')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!page) {
    return (
      <div className="space-y-6">
        <PageHeader title="Soạn nội dung trang" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <PageHeader
        title={`Soạn nội dung — ${page.title}`}
        description={
          <>
            <code className="font-mono text-xs">/{page.slug}</code> · HTML được sanitize khi lưu.
            {dirty && <span className="ml-2 font-semibold text-amber-500">● chưa lưu</span>}
          </>
        }
        actions={
          <>
            <Button onClick={save} disabled={saving || !dirty}>{saving ? 'Đang lưu…' : 'Lưu'}</Button>
            <Link to="/admin/pages" className="text-sm font-medium text-muted hover:text-fg">← Danh sách</Link>
          </>
        }
      />

      <Card className="shrink-0">
        <CardContent className="py-4">
          <Field label="Tiêu đề">
            <input className={ctlCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-border-c py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted">HTML Source</CardTitle>
            <span className="text-[11px] text-muted">v{baseVersion}</span>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <HtmlEditor ref={editorRef} value={doc} onChange={setDoc} />
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-border-c py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted">Client Preview</CardTitle>
            <button
              type="button"
              onClick={() => setPreviewDark((v) => !v)}
              className={cn('rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                previewDark ? 'border-border-c bg-surface-2 text-fg' : 'border-transparent text-muted hover:text-fg')}
            >
              {previewDark ? '🌙 Dark' : '☀️ Light'}
            </button>
          </CardHeader>
          <CardContent className={cn('min-h-0 flex-1 overflow-y-auto p-0', previewDark && 'dark')}>
            <div className="aqs-prose min-h-full bg-bg p-6 text-fg" dangerouslySetInnerHTML={previewHtml} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminPageEditorPage