import type { GameModeSummary } from '@/data/contract'

const STATUS_BADGE: Record<string, string> = { hot: '🔥 HOT', new: '✨ MỚI' }

/**
 * Card máy chủ gọn (home + danh sách). Không còn chips `features` legacy,
 * không "Khám phá →" — cả card là một liên kết.
 */
export function ServerConCard({ mode }: { mode: GameModeSummary }) {
  return (
    <a
      href={`/may-chu/${mode.slug}`}
      className="card-lift group block h-full overflow-hidden rounded-2xl border border-border-c bg-surface"
    >
      {mode.image ? (
        <img
          src={mode.image}
          alt={mode.name}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="aspect-video w-full bg-surface-2" aria-hidden />
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-lg text-fg">{mode.name}</h3>
          {mode.status && STATUS_BADGE[mode.status] && (
            <span className="text-xs">{STATUS_BADGE[mode.status]}</span>
          )}
        </div>
        {mode.short_desc && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{mode.short_desc}</p>
        )}
      </div>
    </a>
  )
}

export default ServerConCard
