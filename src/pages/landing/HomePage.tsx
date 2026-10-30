import { useEffect, useState } from 'react'
import SiteLayout from '@/components/layout/SiteLayout'
import Toast from '@/components/ui/Toast'
import { EmptyState } from '@/components/ui/States'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getHomePageData, type HomePayload } from '@/data'
import { cn } from '@/lib/utils'
import ClusterStatsStrip from '@/components/stats/ClusterStatsStrip'
import ServerStatusWidget from '@/components/stats/ServerStatusWidget'
import TopDonators from '@/components/donators/TopDonators'
import ServerConCard from '@/components/game/ServerConCard'
import { formatAddress } from '@/lib/siteAddress'

/* ================= Helpers ================= */

// Reveal on scroll (tôn trọng prefers-reduced-motion qua CSS)
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ================= Hero (slideshow + fallback) ================= */

const useSlideshow = (count: number, interval: number) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (count <= 1) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), interval)
    return () => clearInterval(timer)
  }, [count, interval])

  return [index, setIndex] as const
}

// Fisher–Yates — random thứ tự ảnh mỗi lần vào trang
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Vị trí ảnh ngẫu nhiên trang trí quanh coverflow (desktop)
const SURROUND_SLOTS = [
  'left-[0%] top-[1%] w-20 -rotate-6 xl:w-24',
  'right-[1%] top-[4%] w-20 rotate-6 xl:w-24',
  'bottom-[18%] left-[2%] w-16 rotate-3 xl:w-20',
  'bottom-[14%] right-[2%] w-16 -rotate-3 xl:w-20',
]

const Hero = ({ hero = {}, serverStatus, serverInfo = {} }: { hero?: HomePayload['hero']; serverStatus?: HomePayload['server_status']; serverInfo?: HomePayload['server_info'] }) => {

  // Ảnh thật (URL https:// đầy đủ) — 0 ảnh → gradient, 1 ảnh → 1 card, > 1 → coverflow
  const rawSlides = (hero.images ?? []).filter((img) => img.src) as Array<{
    id?: number | string
    src: string
    alt?: string
  }>
  const initialSlides = rawSlides.length
    ? rawSlides
    : hero.bg_image
      ? [{ id: 'bg', src: hero.bg_image as string, alt: '' }]
      : []

  // Random thứ tự 1 lần khi mount → 2 ảnh bên cạnh cũng random theo
  const [items] = useState(() => shuffleArray(initialSlides))
  const count = items.length

  const [index, setIndex] = useSlideshow(count, hero.slideshow_interval ?? 5000)
  const [playModalOpen, setPlayModalOpen] = useState(false)
  const [ipCopied, setIpCopied] = useState(false)

  // Modal: Esc để đóng + khoá scroll nền
  useEffect(() => {
    if (!playModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlayModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [playModalOpen])

  // Doc v2 §1: IP lấy từ server_status (fallback server_info), chỉ nối :port khi ≠ 25565.
  const displayIp = formatAddress(serverStatus?.ip ?? serverInfo?.ip, serverStatus?.port)

  const copyIp = async () => {
    const ip = displayIp
    if (!ip) return
    try {
      await navigator.clipboard.writeText(ip)
    } catch {
      const el = document.createElement('textarea')
      el.value = ip
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setIpCopied(true)
    setTimeout(() => setIpCopied(false), 2000)
  }

  // Ảnh ngẫu nhiên rải quanh slideshow (desktop) — random mỗi lần vào trang
  const [surround] = useState(() =>
    Array.from({ length: SURROUND_SLOTS.length }, (_, i) => ({
      key: `sur-${i}`,
      slot: SURROUND_SLOTS[i],
      slide: items.length ? items[Math.floor(Math.random() * items.length)] : null,
    })).filter((s) => s.slide),
  )

  const prev = () => setIndex((i) => (i <= 0 ? count - 1 : i - 1))
  const next = () => setIndex((i) => (i >= count - 1 ? 0 : i + 1))

  return (
    <section className="relative overflow-hidden">
      {/* Nền ambient: glow orbs trôi chậm + lưới mờ (dark-first) */}
      <div className="absolute inset-0" aria-hidden>
        <span className="ambient-orb animate-float-slow left-[-10%] top-[-20%] h-[420px] w-[420px]" style={{ background: 'var(--glow-primary)' }} />
        <span className="ambient-orb animate-float-slow right-[-8%] top-[10%] h-[360px] w-[360px] [animation-delay:-4s]" style={{ background: 'var(--glow-accent)' }} />
        <div className="bg-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8">
          {/* ===== Cột nội dung ===== */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            {hero.tagline && (
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_20px_-6px_var(--glow-primary)]">
                🟩 {hero.tagline}
              </span>
            )}

            <h1 className="glow-text mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:mx-0 xl:text-6xl">
              <span className="text-gradient-brand">{hero.name || 'SV AeSieuQuay'}</span>
            </h1>

            {hero.description && (
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0">
                {hero.description}
              </p>
            )}

            {/* Dải IP nhanh — copy one-click theo doc v2 §1 */}
            {displayIp && (
              <button
                type="button"
                onClick={copyIp}
                title={`Sao chép ${displayIp}`}
                className="glass glow-ring mx-auto mt-6 flex max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] lg:mx-0"
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    serverStatus?.status === 'online' && 'bg-emerald-500 shadow-[0_0_10px_2px_rgba(16,185,129,0.6)]',
                    serverStatus?.status === 'offline' && 'bg-red-500',
                    serverStatus?.status === 'maintenance' && 'bg-amber-400',
                    !serverStatus && 'bg-muted',
                  )} />
                  <code className="font-mono text-sm font-semibold text-fg sm:text-base">{displayIp}</code>
                </span>
                <span className={cn('shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold', ipCopied ? 'bg-emerald-500/15 text-emerald-500' : 'bg-primary text-white')}>
                  {ipCopied ? 'Đã copies ✓' : 'Copy IP'}
                </span>
              </button>
            )}

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <button
                type="button"
                onClick={() => setPlayModalOpen(true)}
                className="w-full max-w-[240px] rounded-xl bg-gradient-to-r from-primary to-accent px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 hover:brightness-110 active:scale-[0.98] sm:w-auto"
              >
                {hero.cta?.primary || 'Chơi ngay'}
              </button>
              {hero.discord_url ? (
                <a
                  href={hero.discord_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-[240px] rounded-xl border border-border-c bg-surface px-8 py-3 text-base font-semibold text-fg transition-all hover:bg-surface-2 active:scale-[0.98] sm:w-auto"
                >
                  {hero.cta?.secondary || 'Tham gia Discord'}
                </a>
              ) : (
                <span
                  title="Đang chờ link Discord chính thức"
                  className="w-full max-w-[240px] cursor-not-allowed rounded-xl border border-dashed border-border-c px-8 py-3 text-base font-semibold text-muted sm:w-auto"
                >
                  {hero.cta?.secondary || 'Tham gia Discord'} (sắp ra mắt)
                </span>
              )}
            </div>
          </div>

          {/* ===== Cột slideshow: mobile dưới text, desktop bên phải ===== */}
          {count > 0 && (
            <div className="group/hero relative mx-auto w-full max-w-2xl lg:max-w-none">
              {/* Ảnh ngẫu nhiên rải xung quanh — hover để zoom */}
              {surround.map(({ key, slot, slide }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Xem ảnh: ${slide?.alt || ''}`}
                  onClick={() => {
                    if (!slide) return
                    setIndex(items.indexOf(slide))
                  }}
                  className={cn(
                    'absolute z-[5] hidden aspect-video overflow-hidden rounded-xl border border-border-c bg-surface opacity-70 shadow-xl shadow-black/30 transition-all duration-300 hover:z-40 hover:scale-125 hover:rotate-0 hover:border-primary/50 hover:opacity-100 sm:block',
                    slot,
                  )}
                >
                  <img
                    src={slide?.src}
                    alt={slide?.alt || ''}
                    width={320}
                    height={180}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}

              <div className="relative aspect-[16/10] overflow-hidden [perspective:1200px] sm:aspect-[16/9]">
                {items.map((slide, i) => {
                  // Offset vòng tròn: 0 = giữa, ±1 = 2 bên, còn lại ẩn
                  const rel = (i - index + count) % count
                  const offset = rel > count / 2 ? rel - count : rel
                  const isActive = offset === 0
                  const isSide = Math.abs(offset) === 1

                  return (
                    <button
                      key={slide.id ?? slide.src}
                      type="button"
                      tabIndex={isActive || isSide ? 0 : -1}
                      aria-hidden={!isActive && !isSide}
                      aria-label={isActive ? `Ảnh ${index + 1}/${count}` : `Xem ảnh: ${slide.alt || i + 1}`}
                      onClick={() => !isActive && setIndex(i)}
                      className={cn(
                        'group/card absolute left-1/2 top-1/2 aspect-video w-[92%] overflow-hidden rounded-2xl border bg-surface transition-all duration-700 ease-out motion-reduce:transition-none sm:w-[84%]',
                        isActive
                          ? 'z-20 border-primary/40 opacity-100 shadow-2xl shadow-primary/20'
                          : isSide
                            ? 'z-10 cursor-pointer border-border-c opacity-45 blur-[1px] hover:opacity-70'
                            : 'pointer-events-none z-0 border-transparent opacity-0',
                      )}
                      style={{
                        transform: `translate(-50%, -50%) translateX(${offset * 58}%) scale(${isActive ? 1 : 0.78}) rotate(${offset * 5}deg)`,
                      }}
                    >
                      <img
                        src={slide.src}
                        alt={slide.alt || ''}
                        width={1280}
                        height={720}
                        loading={isActive ? 'eager' : 'lazy'}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04] motion-reduce:transition-none"
                      />
                      {/* Lớp phủ tối cho ảnh bên */}
                      {!isActive && <span className="absolute inset-0 bg-bg/35" />}
                    </button>
                  )
                })}
              </div>

              {/* Nút < > */}
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Ảnh trước"
                    onClick={prev}
                    className="absolute -left-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-c bg-surface/90 text-fg shadow-lg backdrop-blur transition-all hover:border-primary/50 hover:text-primary active:scale-95 sm:-left-3 sm:h-11 sm:w-11"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Ảnh tiếp theo"
                    onClick={next}
                    className="absolute -right-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-c bg-surface/90 text-fg shadow-lg backdrop-blur transition-all hover:border-primary/50 hover:text-primary active:scale-95 sm:-right-3 sm:h-11 sm:w-11"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}

              {/* Dots */}
              {count > 1 && (
                <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label="Chuyển ảnh hero">
                  {items.map((slide, i) => (
                    <button
                      key={slide.id ?? slide.src}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Ảnh ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={cn(
                        'h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none',
                        i === index ? 'w-7 bg-primary' : 'w-2.5 bg-[var(--border)] hover:bg-muted',
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {playModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-[fadeIn_.2s_ease]"
          onClick={() => setPlayModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="play-modal-title"
            className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-6 text-center shadow-2xl shadow-black/40 animate-[modalIn_.25s_ease] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h3 id="play-modal-title" className="mt-4 text-xl font-bold text-fg">
              Cách tham gia server
            </h3>
            <p className="mt-2 text-sm text-muted">
              Sao chép IP bên dưới và thêm vào danh sách server Minecraft của bạn.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border-c bg-surface-2 px-4 py-2.5">
              <code className="flex-1 text-center font-mono text-sm text-fg sm:text-base">
                {displayIp || '—'}
              </code>
              <button
                type="button"
                onClick={copyIp}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
              >
                Sao chép
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setPlayModalOpen(false)}
                className="rounded-xl border border-border-c px-6 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
              >
                Đóng
              </button>
              <a
                href="/dang-ky"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
              >
                Tạo tài khoản
              </a>
            </div>
          </div>
        </div>
      )}
      {ipCopied && <Toast message="Đã sao chép IP server!" type="success" />}
    </section>
  )
}

/* ========== Server info bar (DELETED — Frontend Requirements v2 §1) ==========
 * ServerInfoBar cũ đọc `server_info` nay được thay bằng <ServerStatusWidget />
 * đọc khối động `window.DATA.server_status`. `server_info` chỉ còn là fallback ip. */

/* ================= Chế độ chơi =================
 * ≤ 3 mode  → grid căn giữa
 * > 3 mode  → carousel: auto-next 4s, nút < >, dots
 * Responsive: mobile 1 card / tablet 2 / desktop 3
 */

const usePerView = (enabled) => {
  const [perView, setPerView] = useState(3)

  useEffect(() => {
    if (!enabled) return
    const calc = () => {
      const w = window.innerWidth
      setPerView(w >= 1024 ? 3 : w >= 640 ? 2 : 1)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [enabled])

  return perView
}

const GameModes = ({
  section = {},
  stats,
}: {
  section?: HomePayload['game_modes']
  stats?: HomePayload['stats']
}) => {
  const modes = section?.modes ?? []
  const perView = usePerView(true)
  const isCarousel = modes.length > Math.max(perView, 3) // > 3 mode mới chuyển carousel

  const [slide, setSlide] = useState(0)
  const maxSlide = Math.max(modes.length - perView, 0)

  useEffect(() => {
    setSlide((s) => Math.min(s, maxSlide))
  }, [maxSlide])

  useEffect(() => {
    if (!isCarousel) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setSlide((s) => (s >= maxSlide ? 0 : s + 1)), 4000)
    return () => clearInterval(timer)
  }, [isCarousel, maxSlide, slide])

  return (
    <section className="reveal mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      {/* Tiêu đề — luôn căn giữa */}
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-gradient-brand">{section?.title ?? 'Máy chủ'}</span>
        </h2>
        {section?.subtitle && (
          <p className="mt-2 text-muted">{section.subtitle}</p>
        )}
      </div>
      {/* Stat cụm thật — non-compact (FRONTEND-3 §6.2: lộ cả TPS + uptime); ẩn khi chưa có stats */}
      <ClusterStatsStrip stats={stats} className="mb-6 justify-center" />

      {!isCarousel ? (
        /* ===== Grid căn giữa (≤ 3 mode) ===== */
        <div
          className={cn(
            'mx-auto grid max-w-4xl justify-items-center gap-6',
            modes.length === 2
              ? 'sm:grid-cols-2'
              : modes.length >= 3
                ? 'sm:grid-cols-2 lg:grid-cols-3'
                : '',
          )}
        >
          {modes.map((mode) => (
            <ServerConCard key={mode.slug} mode={mode} />
          ))}
        </div>
      ) : (
        /* ===== Carousel (> 3 mode) ===== */
        <div className="group/car relative mx-auto max-w-5xl">
          <div className="overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-500 ease-out"
              style={{ transform: `translateX(calc(-${slide} * (100% + 1.5rem) / ${perView}))` }}
            >
              {modes.map((mode) => (
                <div
                  key={mode.slug}
                  className="shrink-0"
                  style={{ width: `calc((100% - ${(perView - 1) * 1.5}rem) / ${perView})` }}
                >
                  <ServerConCard mode={mode} />
                </div>
              ))}
            </div>
          </div>

          {/* Nút < > */}
          <button
            type="button"
            aria-label="Chế độ trước"
            onClick={() => setSlide((s) => (s <= 0 ? maxSlide : s - 1))}
            className="absolute -left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-c bg-surface text-fg opacity-0 shadow-lg transition-all hover:border-primary/50 hover:text-primary group-hover/car:opacity-100 focus-visible:opacity-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Chế độ tiếp theo"
            onClick={() => setSlide((s) => (s >= maxSlide ? 0 : s + 1))}
            className="absolute -right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-c bg-surface text-fg opacity-0 shadow-lg transition-all hover:border-primary/50 hover:text-primary group-hover/car:opacity-100 focus-visible:opacity-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Dots */}
          <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Chuyển nhóm chế độ chơi">
            {Array.from({ length: maxSlide + 1 }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === slide}
                aria-label={`Nhóm ${i + 1}`}
                onClick={() => setSlide(i)}
                className={cn(
                  'h-2.5 rounded-full transition-all duration-300',
                  i === slide ? 'w-7 bg-primary' : 'w-2.5 bg-[var(--border)] hover:bg-muted',
                )}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ================= Điểm nổi bật ================= */

const Highlights = ({ section }: { section?: HomePayload['highlights'] }) => (
  <section className="reveal mx-auto mt-20 max-w-6xl px-4 sm:px-6">
    <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
      <span className="text-gradient-brand">{section?.title ?? 'Điểm nổi bật'}</span>
    </h2>
    <div className="mx-auto mt-3 mb-8 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-accent" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(section?.items ?? []).map((item) => (
        <div
          key={item.title}
          className="card-lift group relative overflow-hidden rounded-2xl border border-border-c bg-surface p-5"
        >
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary-soft opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            {item.icon}
          </span>
          <h3 className="mt-3 font-bold text-fg">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.desc}</p>
        </div>
      ))}
    </div>
  </section>
)

/* ============ Gallery (src_asset null → tile placeholder không vỡ layout) ============ */

const galleryIcons = ['🌳', '🏝️', '⚔️', '🏙️']

const Gallery = ({ gallery }: { gallery?: HomePayload['gallery'] }) => (
  <section className="reveal mx-auto mt-20 max-w-6xl px-4 sm:px-6">
    <h2 className="mb-8 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
      {gallery?.title ?? 'Khám phá thế giới AeSieuQuay'}
    </h2>

    {(gallery?.images ?? []).length === 0 ? (
      <EmptyState
        icon="📷"
        title="Chưa có hình ảnh"
        description="Ảnh chụp trong game sẽ được cập nhật khi server có tài nguyên chính thức."
      />
    ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(gallery?.images ?? []).map((img, i) => (
          <figure
            key={img.id ?? i}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border-c/50 bg-surface-2 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_36px_-12px_var(--glow-primary)]',
              i % 5 === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square',
            )}
          >
            {img.src_asset ? (
              <img
                src={img.src_asset}
                alt={img.alt || img.title || `Ảnh server ${i + 1}`}
                width={img.width}
                height={img.height}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <span className="text-4xl opacity-50 transition-transform duration-500 group-hover:scale-110">
                  {galleryIcons[i % galleryIcons.length]}
                </span>
                <span className="px-2 text-center text-[10px] text-muted">ảnh đang cập nhật</span>
              </div>
            )}
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {img.title}
            </figcaption>
          </figure>
        ))}
      </div>
    )}
  </section>
)

/* ============ Cộng đồng / mạng xã hội ============ */

const Community = ({ community }: { community?: HomePayload['community'] }) => {
  if (!community) return null

  return (
    <section className="reveal mx-auto mt-20 max-w-6xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border-c bg-surface p-8 text-center sm:p-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="ambient-orb left-[5%] top-[-50%] h-72 w-72" style={{ background: 'var(--glow-primary)' }} />
          <span className="ambient-orb bottom-[-50%] right-[5%] h-72 w-72" style={{ background: 'var(--glow-accent)' }} />
        </div>
        <div className="relative">
          <span className="text-5xl">💬</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-gradient-brand">{community.title}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">{community.description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {(community.socials ?? []).map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'card-lift inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-xl px-7 py-3 text-base font-semibold transition-all active:scale-[0.98] sm:w-auto',
                  s.icon === 'discord'
                    ? 'border-transparent bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 hover:brightness-110'
                    : 'border border-border-c bg-surface text-fg hover:bg-surface-2',
                )}
              >
                {s.icon === 'discord' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.51 13.8 13.8 0 0 0-.64 1.28 18.3 18.3 0 0 0-5.5 0 13.8 13.8 0 0 0-.64-1.28c-1.71.29-3.37.8-4.93 1.51A20.3 20.3 0 0 0 .1 18.06a19.9 19.9 0 0 0 6.07 3.03c.49-.66.93-1.37 1.3-2.1a12.9 12.9 0 0 1-2.05-.98c.17-.12.34-.25.5-.38a14.2 14.2 0 0 0 12.16 0c.17.13.33.26.5.38-.65.39-1.34.71-2.05.98.37.73.81 1.44 1.3 2.1a19.8 19.8 0 0 0 6.07-3.03 20.3 20.3 0 0 0-3.58-13.69ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
                  </svg>
                )}
                {s.icon === 'facebook' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12a10 10 0 1 0-11.56 9.88v-7H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.88h-2.34v7A10 10 0 0 0 22 12Z" />
                  </svg>
                )}
                {s.icon === 'tiktok' && (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1Z" />
                  </svg>
                )}
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}




/* ================= Trang chủ ================= */

export const HomePage = () => {
  useReveal()

  const result = getHomePageData()

  if (result.status !== 'ok') {
    return (
      <SiteLayout
        seo={{
          title: 'SV AeSieuQuay — Minecraft Việt Nam',
          description:
            'Máy chủ Minecraft Việt Nam — sinh tồn, xây dựng và cạnh tranh cùng cộng đồng AE.',
          path: '/',
          noindex: true,
        }}
      >
        <DataUnavailable
          title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined}
        />
      </SiteLayout>
    )
  }

  const data = result.data
  const hero: NonNullable<HomePayload['hero']> = data.hero ?? {}
  // Doc v2 §1: server_status thắng server_info — IP cho FinalCTA lấy từ block mới, fallback key cũ.
  const siteIp = formatAddress(data.server_status?.ip ?? data.server_info?.ip, data.server_status?.port)
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const socials = data.community?.socials ?? []
  const description =
    hero.description ||
    'Máy chủ Minecraft Việt Nam — sinh tồn, xây dựng và cạnh tranh cùng cộng đồng AE.'

  return (
    <SiteLayout
      seo={{
        title: `${hero.name || 'SV AeSieuQuay'} — ${hero.tagline || 'Minecraft Việt Nam'}`,
        description,
        path: '/',
        ogImage: hero.bg_image || hero.images?.[0]?.src,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: hero.name || 'SV AeSieuQuay',
            alternateName: hero.tagline || 'Minecraft Server Việt Nam',
            url: siteUrl || '/',
            description,
            inLanguage: 'vi-VN',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'SV AeSieuQuay',
            url: siteUrl || '/',
            logo: siteUrl ? `${siteUrl}/logo.png` : '/logo.png',
            sameAs: socials.map((social) => social.url),
          },
        ],
      }}
    >
      <Hero hero={data.hero} serverStatus={data.server_status} serverInfo={data.server_info} />
      {/* Doc v2 §1: widget đọc khối động server_status; server_info chỉ fallback khi backend cũ. */}
      <ServerStatusWidget status={data.server_status} legacyInfo={data.server_info} />
      {data.game_modes && <GameModes section={data.game_modes} stats={data.stats} />}
      {/* Doc v2 §2: Top 5 đại gia — items rỗng/thiếu block → component tự ẩn. */}
      <TopDonators block={data.top_donators} />
      {data.highlights?.items?.length ? <Highlights section={data.highlights} /> : null}
      {data.gallery ? <Gallery gallery={data.gallery} /> : null}
      {data.community ? <Community community={data.community} /> : null}
    </SiteLayout>
  )
}

export default HomePage
