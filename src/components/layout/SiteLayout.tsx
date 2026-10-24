import type { ReactNode } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getSiteData } from '@/data'
import { useSeo, type SeoInput } from '@/hooks/useSeo'

type SiteLayoutProps = {
  seo: SeoInput
  children: ReactNode
}

/**
 * Khung chung: Header + main + Footer.
 * Header/Footer lấy menu, footer, IP server từ data layer (window.DATA hoặc mock).
 * SEO được upsert theo từng trang.
 */
export const SiteLayout = ({ seo, children }: SiteLayoutProps) => {
  useSeo(seo)
  const site = getSiteData()

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <Header menu={site.header.menu} />
      <main className="flex-1">{children}</main>
      <Footer
        columns={site.footer.columns}
        socials={site.footer.socials}
        copyright={site.footer.copyright}
        ip={site.server_info.ip}
      />
    </div>
  )
}

export default SiteLayout