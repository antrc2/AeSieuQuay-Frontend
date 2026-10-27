import { useCallback, useMemo, useState } from 'react'

/**
 * Nền tảng phân trang + filter server-side cho các trang lịch sử admin.
 *
 * - Đổi BẤT KỲ filter nào → tự reset `page = 1` (deep link `?status=` giữ đúng).
 * - `query` là object sạch (bỏ rỗng) đưa thẳng vào `params` của apiGet.
 * - Đếm `filters` được áp dụng bằng chính số key có giá trị — trang dùng
 *   để quyết định polling ("còn row non-terminal trong trang này không").
 */
export interface PagedQueryState<T extends Record<string, string>> {
  page: number
  setPage: (p: number) => void
  limit: number
  filters: T
  /** patch một phần filter — reset trang về 1. */
  setFilters: (patch: Partial<T>) => void
  /** đặt lại toàn bộ filter (giữ nguyên filter từ deep link nếu truyền lại). */
  replaceFilters: (next: T) => void
  /** { ...filters, page, limit } chỉ chứa key có giá trị. */
  query: Record<string, string | number>
  next: () => void
  prev: () => void
  resetPage: () => void
}

export function usePagedQuery<T extends Record<string, string>>(initial: T, limit = 20): PagedQueryState<T> {
  const [page, setPage] = useState(1)
  const [filters, setFiltersState] = useState<T>(initial)

  const setFilters = useCallback((patch: Partial<T>) => {
    setFiltersState((f) => ({ ...f, ...patch }))
    setPage(1)
  }, [])

  const replaceFilters = useCallback((next: T) => {
    setFiltersState(next)
    setPage(1)
  }, [])

  const query = useMemo(() => {
    const out: Record<string, string | number> = { page, limit }
    for (const [k, v] of Object.entries(filters)) {
      if (v !== '' && v != null) out[k] = v
    }
    return out
  }, [filters, page, limit])

  return {
    page,
    setPage,
    limit,
    filters,
    setFilters,
    replaceFilters,
    query,
    next: () => setPage((p) => p + 1),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    resetPage: () => setPage(1),
  }
}

export default usePagedQuery
