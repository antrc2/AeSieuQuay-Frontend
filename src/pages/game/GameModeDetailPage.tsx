import { useState } from 'react'
import { useParams } from 'react-router-dom'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import NotFound from '@/pages/errors/NotFound'
import ClusterStatsStrip from '@/components/stats/ClusterStatsStrip'
import CopyIpButton from '@/components/ui/CopyIpButton'
import { getMachineDetailData, getSiteData } from '@/data'
import { DEFAULT_DISCORD_URL } from '@/data/site'

export const GameModeDetailPage = () => {
  const { slug = '' } = useParams()
  const result = getMachineDetailData(slug)
  const [playModalOpen, setPlayModalOpen] = useState(false)
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
  const site = getSiteData()
  // Payload không còn ip/discord_url → chỉ dùng cấu hình site.
  const serverIp = site.server_info.ip || ''
  const discordUrl = DEFAULT_DISCORD_URL
  const cover = mode.image || mode.images?.[0]
  const gallery = mode.images ?? []
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const canonicalPath = `/may-chu/${mode.slug || slug}`
  const description =
    mode.short_desc || `Thông tin máy chủ ${mode.name} tại SV AeSieuQuay.`

  return (
    <SiteLayout
      seo={{
        title: `${mode.name} — SV AeSieuQuay`,
        description,
        path: canonicalPath,
        ogImage: cover,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'VideoGame',
            name: mode.name,
            description,
            url: `${siteUrl}${canonicalPath}`,
            image: cover ? (cover.startsWith('http') ? cover : `${siteUrl}${cover}`) : undefined,
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
          {cover && <img src={cover} alt="" className="h-full w-full object-cover opacity-40" />}
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
              </div>
              <h1 className="text-gradient-brand mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                {mode.name}
              </h1>
              {/* Số liệu thật theo cụm — ẩn khi backend chưa từng report */}
              <ClusterStatsStrip stats={mode.stats} className="mt-4" />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPlayModalOpen(true)}
                  className="glow-ring inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-strong active:scale-[0.98]"
                >
                  Chơi ngay
                </button>
                {discordUrl && (
                  <a
                    href={discordUrl}
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

      {/* Gallery: giữ ảnh dưới header, trước khối nội dung */}
      {gallery.length > 1 && (
        <section className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {gallery.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt={`${mode.name} — ảnh ${i + 1}`}
                loading="lazy"
                className="card-lift aspect-video w-full rounded-xl border border-border-c object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {mode.content_html ? (
          <div
            className="aqs-prose mx-auto max-w-4xl"
            // Nội dung đã sanitize allowlist ở backend (core/sanitize.py) lúc ghi DB.
            dangerouslySetInnerHTML={{ __html: mode.content_html }}
          />
        ) : (
          /* content_html null (admin chưa soạn) → chỉ paragraph short_desc. */
          <p className="mx-auto max-w-4xl text-muted">{mode.short_desc}</p>
        )}
      </section>

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
              <code className="flex-1 text-center font-mono text-sm">{serverIp || '—'}</code>
              <CopyIpButton compact />
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
    </SiteLayout>
  )
}

export default GameModeDetailPage