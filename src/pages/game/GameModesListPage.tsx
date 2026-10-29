import { Server } from 'lucide-react'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { EmptyState } from '@/components/ui/States'
import { getMachineListData } from '@/data'
import ClusterStatsStrip from '@/components/stats/ClusterStatsStrip'
import ServerConCard from '@/components/game/ServerConCard'

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
        ogImage: modes[0]?.image,
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(99,102,241,0.22),transparent)]" />
          {/* lưới ô vuông mờ — phong cách gaming */}
          <div aria-hidden className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-24">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Server className="h-3.5 w-3.5" aria-hidden /> Hệ thống máy chủ
            </span>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="text-gradient-brand">{data.title || 'Máy chủ'}</span>
            </h1>
            {data.subtitle && <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{data.subtitle}</p>}
            {/* Stat cụm thật — ẩn khi backend chưa trả stats */}
            <ClusterStatsStrip stats={data.stats} className="mt-6 justify-center" />
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
              <ServerConCard key={mode.slug} mode={mode} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  )
}

export default GameModesListPage