import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { EmptyState } from '@/components/ui/States'
import { getSitePageData } from '@/data'

/**
 * Trang Ban quản trị MÁY CHỦ MINECRAFT — lưới card đơn giản:
 * avatar (hoặc chữ cái đầu), tên, chức vụ.
 */
export const TeamPage = () => {
  const result = getSitePageData('ban-quan-tri')

  if (result.status !== 'ok') {
    return (
      <SiteLayout
        seo={{ title: 'Ban Quản Trị — SV AeSieuQuay', description: 'Ban quản trị máy chủ Minecraft AeSieuQuay.', path: '/ban-quan-tri', noindex: true }}
      >
        <DataUnavailable title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined} />
      </SiteLayout>
    )
  }

  const data = result.data
  const members = data.members ?? []

  return (
    <SiteLayout
      seo={{
        title: `${data.title ?? 'Ban Quản Trị'} — SV AeSieuQuay`,
        description: data.subtitle ?? 'Đội ngũ vận hành & hỗ trợ máy chủ Minecraft AeSieuQuay.',
        path: '/ban-quan-tri',
      }}
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(99,102,241,0.22),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="text-gradient-brand">{data.title ?? 'Ban Quản Trị'}</span>
          </h1>
          {data.subtitle && <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{data.subtitle}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        {members.length === 0 ? (
          <EmptyState icon="👥" title="Chưa có thành viên" description="Danh sách ban quản trị sẽ được cập nhật sớm." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((m) => (
              <article
                key={m.id}
                className="card-lift rounded-2xl border border-border-c bg-surface p-6 text-center"
              >
                {m.avatar ? (
                  <img
                    src={m.avatar}
                    alt={m.name}
                    loading="lazy"
                    className="mx-auto h-20 w-20 rounded-full border-2 border-primary/30 object-cover"
                  />
                ) : (
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-2xl font-bold text-white shadow-[0_0_18px_rgba(99,102,241,0.35)]">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <h2 className="mt-3 truncate font-bold text-fg" title={m.name}>{m.name}</h2>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{m.role_title}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  )
}

export default TeamPage
