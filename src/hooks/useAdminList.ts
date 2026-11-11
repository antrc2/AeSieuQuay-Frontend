import { useCallback, useEffect, useRef, useState } from 'react'

import { showApiError } from '@/utils/swal'

/**
 * Load danh sách + reload + toast lỗi — idiom chung các trang admin
 * (trích từ AdminContentPage.useContentList, FRONTEND-5).
 *
 * - `aliveRef` chống setState sau unmount.
 * - Lỗi → showApiError + rows = [] (trang hiện EmptyState, không spinner vĩnh viễn).
 * - `fetcher` nên là useCallback ổn định ở trang gọi (hoặc arrow trong render —
 *   hook chỉ chạy lại khi fetcher đổi identity).
 * - `setRows` expose cho trang cần mutate lạc quan (vd swap sort_order).
 */
export function useAdminList<T>(fetcher: () => Promise<T[]>, errorTitle: string) {
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

export default useAdminList