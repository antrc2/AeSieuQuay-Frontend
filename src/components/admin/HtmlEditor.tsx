import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'

/**
 * Host CodeMirror 6 dùng chung cho 2 trang soạn HTML admin
 * (AdminGameModeContentPage + AdminPageEditorPage).
 *
 * Tách khỏi page để router lazy-load đúng: CodeMirror (~450KB) chỉ nằm
 * trong chunk của 2 trang editor, không kéo vào bundle admin mặc định.
 */

export interface HtmlEditorHandle {
  insertAtCursor: (text: string) => void
  setValue: (v: string) => void
}

/**
 * Bọc CodeMirror 6 thủ công (không dùng react-codemirror).
 * Mount 1 lần với doc khởi tạo; thay đổi sau đó qua `setValue`.
 */
export const HtmlEditor = forwardRef<HtmlEditorHandle, { value: string; onChange: (v: string) => void }>(
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

export default HtmlEditor