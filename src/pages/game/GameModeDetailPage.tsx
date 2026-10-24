import { useState } from 'react'
import { useParams } from 'react-router-dom'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import NotFound from '@/pages/errors/NotFound'
import Toast from '@/components/ui/Toast'
import { getMachineDetailData } from '@/data'

const defaultHighlights = [
  { title: 'Ổn định', desc: 'Máy chủ ổn định, tối ưu ping Việt Nam' },
  { title: 'Cộng đồng AE', desc: 'Nhiều hoạt động, sự kiện thường xuyên' },
  { title: 'Phần thưởng', desc: 'Nhiều quà tặng khi tham gia' },
]

export const GameModeDetailPage = () => {
  const { slug = '' } = useParams()
  const result = getMachineDetailData(slug)
  const [playModalOpen, setPlayModalOpen] = useState(false)
  const [ipCopied, setIpCopied] = useState(false)

  if (result.status === 'not_found') {
    return <NotFound />
  }

  if (result.status !== 'ok') {
    return (
      <SiteLayout
        seo={{
          title: 'Máy chủ Minecraft — SV AeSieuQuay',
          description: 'Thông tin máy chủ Minecraft tại SV AeSieuQuay.',
          path: `/may-chu/${slug}`,
          noindex: true,
        }}
      >
        <DataUnavailable />
      </SiteLayout>
    )
  }

  const mode = result.data
  const highlights = mode.highlights?.length ? mode.highlights : defaultHighlights
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const canonicalPath = `/may-chu/${mode.slug || slug}`
  const description =
    mode.short_desc || mode.desc || `Thông tin máy chủ ${mode.name} tại SV AeSieuQuay.`

  const copyIp = async () => {
    const ip = mode.ip
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

  return (
    <SiteLayout
      seo={{
        title: `${mode.name} — SV AeSieuQuay`,
        description,
        path: canonicalPath,
        ogImage: mode.images?.[0],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: mode.name,
            description,
            url: `${siteUrl}${canonicalPath}`,
            image: mode.images?.[0] ? (mode.images[0].startsWith('http') ? mode.images[0] : `${siteUrl}${mode.images[0]}`) : undefined,
            gamePlatform: 'Minecraft',
            genre: 'Minecraft Server',
            inLanguage: 'vi-VN',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${siteUrl}/` },
              { '@type': 'ListItem', position: 2, name: 'Máy chủ', item: `${siteUrl}/may-chu` },
              {
                '@type': 'ListItem',
                position: 3,
                name: mode.name,
                item: `${siteUrl}${canonicalPath}`,
              },
            ],
          },
        ],
      }}
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {mode.images?.[0] && (
            <img src={mode.images[0]} alt="" className="h-full w-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,transparent,rgba(0,0,0,0.9))]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/60 to-bg" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
          <a href="/may-chu" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Quay lại danh sách
          </a>
          <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {mode.tagline && (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {mode.tagline}
                  </span>
                )}
                {typeof mode.players_online === 'number' && (
                  <span className="rounded-full border border-border-c px-3 py-1 text-xs text-muted">
                    {mode.players_online} người chơi
                  </span>
                )}
                {mode.difficulty && (
                  <span className="rounded-full border border-border-c px-3 py-1 text-xs text-muted">
                    Độ khó: {mode.difficulty}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{mode.name}</h1>
              {mode.desc && <p className="mt-4 max-w-2xl text-lg text-muted">{mode.desc}</p>}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPlayModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-strong"
                >
                  Chơi ngay
                </button>
                {mode.discord_url && (
                  <a
                    href={mode.discord_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-border-c bg-surface px-8 py-3 text-base font-semibold transition-all hover:bg-surface-2"
                  >
                    Tham gia Discord
                  </a>
                )}
              </div>
            </div>
            {(mode.images?.[1] || mode.images?.[0]) && (
              <div className="overflow-hidden rounded-3xl border border-border-c shadow-2xl shadow-black/40">
                <img
                  src={mode.images?.[1] || mode.images?.[0]}
                  alt={mode.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Tính năng nổi bật</h2>
            {(mode.features?.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-muted">Thông tin tính năng đang được cập nhật.</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {mode.features?.map((feat) => (
                  <div key={feat} className="flex items-start gap-3 rounded-2xl border border-border-c p-4">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">✓</span>
                    <p className="font-medium">{feat}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Ưu điểm khi chơi</h2>
            <div className="mt-6 grid gap-4">
              {highlights.map((highlight) => (
                <div key={highlight.title} className="flex items-start gap-4 rounded-2xl border border-border-c p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">{highlight.title}</h3>
                    {highlight.desc && <p className="mt-1 text-sm text-muted">{highlight.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {((mode.commands?.length ?? 0) > 0 || (mode.rules?.length ?? 0) > 0) && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {(mode.commands?.length ?? 0) > 0 && (
              <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
                <h2 className="text-2xl font-bold">Lệnh hữu ích</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mode.commands?.map((cmd) => (
                    <code key={cmd} className="rounded-lg border border-border-c px-3 py-1.5 text-sm">
                      {cmd}
                    </code>
                  ))}
                </div>
              </div>
            )}
            {(mode.rules?.length ?? 0) > 0 && (
              <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
                <h2 className="text-2xl font-bold">Quy định máy chủ</h2>
                <ul className="mt-4 space-y-2">
                  {mode.rules?.map((rule) => (
                    <li key={rule} className="flex items-start gap-3 text-muted">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {playModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-[fadeIn_.2s_ease]"
          onClick={() => setPlayModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-6 text-center shadow-2xl shadow-black/40 animate-[modalIn_.25s_ease] sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-bold">Tham gia {mode.name}</h3>
            <p className="mt-2 text-sm text-muted">Sao chép IP và thêm vào Minecraft của bạn</p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border-c bg-surface-2 px-4 py-2.5">
              <code className="flex-1 text-center font-mono text-sm">{mode.ip || '—'}</code>
              <button
                type="button"
                onClick={copyIp}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Sao chép
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setPlayModalOpen(false)}
                className="rounded-xl border border-border-c px-6 py-2.5 text-sm font-semibold"
              >
                Đóng
              </button>
              <a href="/dang-ky" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white">
                Tạo tài khoản
              </a>
            </div>
          </div>
        </div>
      )}
      {ipCopied && <Toast message="Đã sao chép IP server!" type="success" />}
    </SiteLayout>
  )
}

export default GameModeDetailPage