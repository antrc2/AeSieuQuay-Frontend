import Swal from 'sweetalert2'

/**
 * Helper SweetAlert2 cho toàn app.
 * - showApiError(err): hiển thị lỗi từ API (envelope { success, code, message, data })
 * - showSuccess(title, text): hiển thị thông báo thành công
 */

/** Shape tối thiểu của ApiError mà helper này đọc (tránh phụ thuộc vòng vào api/client). */
interface ApiErrorLike {
  message?: string
  data?: {
    message?: string
    data?: {
      errors?: Array<{ loc?: unknown; msg?: string }>
    }
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}

const escapeHtml = (s: unknown = ''): string =>
  String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])

/** Lấy danh sách lỗi validation từ envelope 422 */
const validationRows = (err: unknown): string[] => {
  const errors = (err as ApiErrorLike | null | undefined)?.data?.data?.errors
  if (!Array.isArray(errors) || !errors.length) return []
  return errors.map((e) => {
    const field = Array.isArray(e.loc) ? e.loc.join('.') : ''
    const msg = escapeHtml(e.msg || 'Dữ liệu không hợp lệ')
    return field ? `<b>${escapeHtml(field)}</b>: ${msg}` : msg
  })
}

/** Hiển thị lỗi API (axios + ApiError) */
export const showApiError = async (err: unknown, fallbackTitle = 'Thất bại') => {
  const e = err as ApiErrorLike | null | undefined
  // Ưu tiên message backend trả về trong envelope { success, code, message, data }
  const message = e?.data?.message || e?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
  const rows = validationRows(err)

  return Swal.fire({
    icon: 'error',
    title: fallbackTitle,
    // Không có lỗi validation → hiển thị thẳng message backend
    text: rows.length ? undefined : message,
    // Có lỗi validation → message + danh sách lỗi từng field
    html: rows.length
      ? `<p style="margin-bottom:8px">${escapeHtml(message)}</p>
         <ul style="text-align:left;max-height:200px;overflow:auto;padding-left:20px">
           ${rows.map((r) => `<li>${r}</li>`).join('')}
         </ul>`
      : undefined,
    confirmButtonColor: '#1e90ff',
    confirmButtonText: 'Đã hiểu',
  })
}

/** Hiển thị thành công — có nút OK, ĐỒNG THỜI tự đóng sau `timer` ms (1.5s).
 *  Bấm OK nếu vội; truyền `timer` khác nếu muốn nhanh/chậm hơn. */
export const showSuccess = async (title: string, text?: string, timer = 1500) =>
  Swal.fire({
    icon: 'success',
    title,
    text,
    timer,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: 'OK',
    confirmButtonColor: '#1e90ff',
    allowOutsideClick: false,
  })

export default Swal