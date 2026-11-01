import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getSitePageData } from '@/data'

/** Trang nội dung tĩnh (luật lệ / điều khoản / chính sách) — HTML do admin soạn. */
export const ContentPage = ({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) => {
  const result = getSitePageData(slug)

  if (result.status !== 'ok' || !result.data.page) {
    return (
      <SiteLayout seo={{ title: `${fallbackTitle} — SV AeSieuQuay`, description: fallbackTitle, path: `/${slug}`, noindex: true }}>
        <DataUnavailable title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined} />
      </SiteLayout>
    )
  }

  const page = result.data.page

  return (
    <SiteLayout
      seo={{
        title: `${page.title} — SV AeSieuQuay`,
        description: `${page.title} của máy chủ AeSieuQuay.`,
        path: `/${page.slug}`,
      }}
    >
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-14 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-gradient-brand">{page.title}</span>
        </h1>
        <div className="mt-8 rounded-2xl border border-border-c bg-surface p-6 sm:p-8">
          {/* HTML đã được backend sanitize (nh3) trước khi ghi DB. */}
          <div className="aqs-prose" dangerouslySetInnerHTML={{ __html: page.content_html }} />
        </div>
      </section>
    </SiteLayout>
  )
}

export default ContentPage