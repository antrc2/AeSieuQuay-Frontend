import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { EmptyState } from '@/components/ui/States'
import { getMachineListData } from '@/data'
import { cn } from '@/lib/utils'

const statusStyle: Record<string, string> = {
  hot: 'bg-red-500/10 text-red-400 border-red-500/30',
  new: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  normal: 'bg-primary/10 text-primary border-primary/30',
}

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status || status === 'normal') return null
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusStyle[status])}>
      {status === 'hot' ? 'HOT' : status === 'new' ? 'MỚI' : status.toUpperCase()}
    </span>
  )
}

export const GameModesListPage = () => {
  const result = getMachineListData()

  if (result.status !== 'ok') {
    return (
      <SiteLayout
        seo={{
          title: 'Máy chủ Minecraft — SV AeSieuQuay',
          description: 'Danh sách máy chủ Minecraft tại SV AeSieuQuay.',
          path: '/may-chu',
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
  const modes = data.modes ?? []
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const description =
    data.subtitle || 'Khám phá tất cả máy chủ Minecraft tại SV AeSieuQuay.'

  return (
    <SiteLayout
      seo={{
        title: `${data.title || 'Máy chủ'} — SV AeSieuQuay`,
        description,
        path: '/may-chu',
        ogImage: modes[0]?.images?.[0],
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: data.title || 'Máy chủ',
            itemListElement: modes.map((mode, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: mode.name,
              url: `${siteUrl}/may-chu/${mode.slug}`,
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Trang chủ',
                item: `${siteUrl}/`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Máy chủ',
                item: `${siteUrl}/may-chu`,
              },
            ],
          },
        ],
      }}
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(30,144,255,0.25),transparent)]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="text-gradient-brand">{data.title || 'Máy chủ'}</span>
            </h1>
            {data.subtitle && <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{data.subtitle}</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {modes.length === 0 ? (
          <EmptyState
            icon="🖥️"
            title="Chưa có máy chủ"
            description="Danh sách máy chủ sẽ được cập nhật khi có dữ liệu chính thức."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modes.map((mode) => (
              <a
                key={mode.slug}
                href={`/may-chu/${mode.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-border-c bg-surface transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="relative h-44 overflow-hidden">
                  {mode.images?.[0] ? (
                    <img
                      src={mode.images[0]}
                      alt={mode.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-5xl opacity-60">
                      🎮
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <StatusBadge status={mode.status} />
                  </div>
                  {typeof mode.players_online === 'number' && (
                    <div className="absolute right-4 top-4 rounded-full border border-border-c bg-surface/80 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                      {mode.players_online} đang online
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {mode.tagline && (
                        <p className="text-xs uppercase tracking-widest text-primary">{mode.tagline}</p>
                      )}
                      <h3 className="mt-1 text-xl font-bold">{mode.name}</h3>
                    </div>
                  </div>
                  {mode.short_desc && <p className="mt-2 text-sm text-muted">{mode.short_desc}</p>}
                  {(mode.features?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {mode.features?.slice(0, 3).map((feat) => (
                        <span
                          key={feat}
                          className="rounded-full border border-border-c px-2.5 py-1 text-xs text-muted"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Xem chi tiết
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  )
}

export default GameModesListPage