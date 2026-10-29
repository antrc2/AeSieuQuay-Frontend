import { useState } from 'react'

import type { TopDonatorItem, TopDonatorsBlock } from '@/data/contract'
import { fmtAgoMs, fmtVnd } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Widget "Top 5 Đại gia" — Frontend Requirements v2 §2.
 *
 * Nguồn: `window.DATA.top_donators` (SSR, cache Redis 300s) — tổng hợp TOÀN THỜI GIAN
 * từ bank_deposits(credited) + card_transactions(success), chỉ amount_vnd thực nạp,
 * đã loại role admin. FE KHÔNG fetch API, không tab tháng.
 * - items [] hoặc block thiếu → ẩn cả section.
 * - Avatar CDN thứ 3 (mc-heads) có thể chậm/chặn → placeholder nền khi load,
 *   onError fallback đầu Steve cùng size.
 */

const steveFallback = (size: number) => `https://mc-heads.net/avatar/Steve/${size}`

const MEDAL_META: Record<NonNullable<TopDonatorItem['medal']>, { icon: string; label: string; cls: string }> = {
  gold: { icon: '🥇', label: 'Huy hiệu vàng', cls: 'text-amber-400' },
  silver: { icon: '🥈', label: 'Huy hiệu bạc', cls: 'text-slate-300' },
  bronze: { icon: '🥉', label: 'Huy hiệu đồng', cls: 'text-orange-400' },
}

const avatarSize = (rank: number) => (rank === 1 ? 80 : 64)

const DonatorAvatar = ({ item }: { item: TopDonatorItem }) => {
  const size = avatarSize(item.rank)
  const [failed, setFailed] = useState(false)
  const src = failed || !item.avatar_url ? steveFallback(size) : item.avatar_url

  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-xl bg-surface-2"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={item.username}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  )
}

interface Props {
  block?: TopDonatorsBlock | null
}

export function TopDonators({ block }: Props) {
  const items = block?.items ?? []
  // Block thiếu hoặc rỗng (chưa ai nạp / lỗi DB) → ẩn hẳn section trên home.
  if (!block || items.length === 0) return null

  return (
    <section className="reveal mx-auto mt-20 max-w-3xl px-4 sm:px-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          👑 {block.title || 'Bảng xếp hạng đại gia'}
        </h2>
        <p className="mt-2 text-muted">
          Top nạp tích luỹ toàn thời gian · đơn vị {block.currency || 'VND'}
        </p>
      </div>

      <ol className="space-y-3">
        {items.map((item) => {
          const medal = item.medal ? MEDAL_META[item.medal] : null
          const isTop = item.rank === 1
          const isMedal = item.rank === 2 || item.rank === 3

          return (
            <li
              key={`${item.rank}-${item.username}`}
              className={cn(
                'flex items-center gap-4 rounded-2xl border p-3 transition-colors sm:p-4',
                isTop &&
                  'border-amber-400/50 bg-gradient-to-r from-amber-400/20 via-amber-300/10 to-transparent shadow-lg shadow-amber-500/10',
                isMedal && 'border-border-c bg-surface',
                !isTop && !isMedal && 'border-border-c bg-surface/60',
              )}
            >
              {/* Hạng — #1 vương miện, còn lại số thứ tự */}
              <span
                className={cn(
                  'w-8 shrink-0 text-center text-lg font-extrabold tabular-nums',
                  isTop ? 'text-amber-400' : medal ? medal.cls : 'text-muted',
                )}
                aria-label={`Hạng ${item.rank}`}
              >
                {isTop ? '👑' : `#${item.rank}`}
              </span>

              <DonatorAvatar item={item} />

              {/* Tên hiển thị + tên in-game */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{item.display_name || item.username}</p>
                <p className="truncate font-mono text-xs text-muted">@{item.username}</p>
              </div>

              {/* Medal #2/#3 */}
              {medal && (
                <span
                  className={cn('hidden shrink-0 text-xl sm:block', medal.cls)}
                  title={medal.label}
                  aria-label={medal.label}
                >
                  {medal.icon}
                </span>
              )}

              {/* Tiền — fmtVnd → "12.500.000 ₫" */}
              <span
                className={cn(
                  'shrink-0 text-right font-bold tabular-nums',
                  isTop ? 'text-amber-400' : 'text-fg',
                )}
              >
                {fmtVnd(item.total_vnd)}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-3 text-center text-xs text-muted opacity-60">
        Cập nhật {fmtAgoMs(block.updated_at_ms)}
      </p>
    </section>
  )
}

export default TopDonators
