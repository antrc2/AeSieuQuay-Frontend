import type { GameModeSummary } from '@/data/contract'

const STATUS_BADGE: Record<string, string> = { hot: '🔥 HOT', new: '✨ MỚI' }

/**
 * Card máy chủ gọn (home + danh sách) — phong cách glass hiện đại:
 * ảnh zoom nhẹ khi hover, viền gradient phát sáng, badge trạng thái nổi trên ảnh.
 * Không còn chips `features` legacy, không "Khám phá →" — cả card là một liên kết.
 */
export function ServerConCard({ mode }: { mode: GameModeSummary }) {
  return (
    <a
      href={`/may-chu/${mode.slug}`}
      className="group block h-full overflow-hidden rounded-2xl border border-border-c bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/15"
    >
      {/* Ảnh cover + lớp phủ gradient để badge không chìm */}
      <div className="relative overflow-hidden">
        {mode.image ? (
          <img
            src={mode.image}
            alt={mode.name}
            loading="lazy"
            className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="aspect-video w-full bg-[linear-gradient(135deg,var(--surface-2),var(--bg))]"
            aria-hidden
          />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {mode.status && STATUS_BADGE[mode.status] && (
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-lg backdrop-blur-sm">
            {STATUS_BADGE[mode.status]}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-lg text-fg transition-colors group-hover:text-primary">{mode.name}</h3>
          {/* Mũi tên nhỏ hiện dần khi hover — điểm nhấn "modern" */}
          <svg
            aria-hidden
            className="h-4 w-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </div>
        {mode.short_desc && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{mode.short_desc}</p>
        )}
        {/* Gạch chân gradient chạy ngang khi hover */}
        <span
          aria-hidden
          className="mt-3 block h-0.5 w-full origin-left scale-x-0 rounded-full bg-[linear-gradient(90deg,var(--brand),var(--accent))] transition-transform duration-300 group-hover:scale-x-100"
        />
      </div>
    </a>
  )
}

export default ServerConCard
