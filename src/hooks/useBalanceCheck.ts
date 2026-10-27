import { useCallback, useEffect, useRef, useState } from 'react'

import { useMockData } from '@/config/env'
import { ApiError, apiGet, apiPost } from '@/api/client'

/**
 * FRONTEND-4 §3.2 (backend-4 §3.1b) — số dư lobby theo mô hình QUEUE + POLL:
 *
 *   POST /api/points/balance-check            → 202 { check_id, command_id }
 *   GET  /api/points/balance-check/<check_id> → { status: 'pending' | 'done' | 'error', balance? }
 *   poll mỗi 1s, timeout 20s (trạng thái nằm Redis — rẻ).
 *
 * Đây là NHÓM API DUY NHẤT trang user được gọi lúc mở trang (số dư nằm
 * PlayerPoints in-game, bất khả kháng SSR). Mock-mode và real-mode chạy
 * CÙNG một đường code — component không if/else nguồn dữ liệu.
 */

const POLL_MS = 1_000
const MAX_TRIES = 20

export type BalancePhase = 'idle' | 'checking' | 'done' | 'error'

export interface UseBalanceCheckResult {
  balance: number | null
  phase: BalancePhase
  error: string | null
  /** Bỏ queue-check mới (mount / nút "Thử lại" / sau transfer terminal). */
  refresh: () => void
  /** Chỉ dùng cho nhánh mô phỏng transfer ở mock-mode (trừ Xu tại chỗ cho UX). */
  adjust: (delta: number) => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useBalanceCheck(enabled: boolean, onUnauthorized?: () => void): UseBalanceCheckResult {
  const [balance, setBalance] = useState<number | null>(null)
  const [phase, setPhase] = useState<BalancePhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const aliveRef = useRef(true)
  const runningRef = useRef(false)
  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    setPhase('checking')
    setError(null)
    try {
      if (useMockData) {
        // Mock offline: mô phỏng đúng nhịp queue→poll (agent lobby trả lời sau ~1.5s).
        await sleep(1500)
        if (!aliveRef.current) return
        setBalance(2350)
        setPhase('done')
        return
      }

      let checkId: string | null = null
      try {
        const res = await apiPost('/points/balance-check')
        checkId = res?.data?.check_id ?? null
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          unauthorizedRef.current?.()
          setPhase('error')
          return
        }
        setPhase('error')
        setError(err instanceof ApiError ? err.message : 'Không kiểm tra được số dư')
        return
      }
      if (!checkId) {
        setPhase('error')
        setError('Backend không trả check_id')
        return
      }

      for (let i = 0; i < MAX_TRIES; i++) {
        await sleep(POLL_MS)
        if (!aliveRef.current) return
        try {
          const p = await apiGet(`/points/balance-check/${checkId}`)
          const d = p?.data
          if (d?.status === 'done') {
            setBalance(Number(d.balance) || 0)
            setPhase('done')
            return
          }
          if (d?.status === 'error') {
            setPhase('error')
            setError(d.error ? String(d.error) : 'Lobby báo lỗi khi đọc số dư')
            return
          }
          // status pending → poll tiếp (1s)
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            unauthorizedRef.current?.()
            setPhase('error')
            return
          }
          if (err instanceof ApiError && err.status === 404) {
            // key read-once TTL 90s / đã đọc — form KHÔNG bị chặn, chỉ cần Thử lại.
            setPhase('error')
            setError('Phiên kiểm tra hết hạn — bấm Thử lại')
            return
          }
          // lỗi mạng transient → thử tới khi hết 20s
        }
      }
      setPhase('error')
      setError('Lobby chưa trả lời (20s) — server có thể offline')
    } finally {
      runningRef.current = false
    }
  }, [])

  useEffect(() => {
    if (enabled) refresh()
    else {
      setPhase('idle')
      setBalance(null)
    }
  }, [enabled, refresh])

  const adjust = useCallback((delta: number) => {
    setBalance((b) => (b === null ? b : b + delta))
  }, [])

  return { balance, phase, error, refresh, adjust }
}

export default useBalanceCheck
