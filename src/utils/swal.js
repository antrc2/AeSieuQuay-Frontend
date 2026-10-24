import Swal from 'sweetalert2'

/**
 * Helper SweetAlert2 cho toàn app.
 * - showApiError(err): hiển thị lỗi từ API (envelope { success, code, message, data })
 * - showSuccess(title, text): hiển thị thông báo thành công
 */

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))

/** Lấy danh sách lỗi validation từ envelope 422 */
const validationRows = (err) => {
  const errors = err?.data?.data?.errors
  if (!Array.isArray(errors) || !errors.length) return []
  return errors.map((e) => {
    const field = Array.isArray(e.loc) ? e.loc.join('.') : ''
    const msg = escapeHtml(e.msg || 'Dữ liệu không hợp lệ')
    return field ? `<b>${escapeHtml(field)}</b>: ${msg}` : msg
  })
}

/** Hiển thị lỗi API (axios + ApiError) */
export const showApiError = async (err, fallbackTitle = 'Thất bại') => {
  // Ưu tiên message backend trả về trong envelope { success, code, message, data }
  const message =
    err?.data?.message || err?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
  const rows = validationRows(err)

  await Swal.fire({
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

/** Hiển thị thành công; tự đóng sau `timer` ms (mặc định 1600) */
export const showSuccess = async (title, text, timer = 1600) => {
  await Swal.fire({
    icon: 'success',
    title,
    text,
    timer,
    timerProgressBar: true,
    showConfirmButton: false,
  })
}

/** Thông báo thông thường (info) */
export const showInfo = (title, text) =>
  Swal.fire({
    icon: 'info',
    title,
    text,
    confirmButtonColor: '#1e90ff',
  })

export default Swal
