import Logo from '@/components/Logo'
import { DEFAULT_FOOTER, DEFAULT_SERVER_INFO } from '@/data/site'

/**
 * @typedef {{ title: string, links: Array<{ label: string, to: string }> }} FooterColumn
 * @typedef {{ label: string, url: string }} FooterSocial
 */

/**
 * @param {{
 *   columns?: FooterColumn[],
 *   socials?: FooterSocial[],
 *   copyright?: string,
 *   ip?: string,
 * }} props
 */
export const Footer = ({ columns = [], socials = [], copyright = '', ip = '' }) => {
  const cols = columns.length ? columns : DEFAULT_FOOTER.columns
  const socialsList = socials.length ? socials : DEFAULT_FOOTER.socials
  const copyrightText = copyright || DEFAULT_FOOTER.copyright
  const serverIp = ip || DEFAULT_SERVER_INFO.ip

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-border-c bg-surface">
      {/* Nền glow hiện đại */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {/* Khu vực chính */}
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Logo + mô tả + IP */}
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Máy chủ Minecraft Việt Nam — sinh tồn, xây dựng và cạnh tranh cùng
              cộng đồng AE.
            </p>

            {/* IP server — copy nhanh (chỉ hiện khi có IP) */}
            {serverIp && (
              <button
                type="button"
                title="Nhấn để sao chép IP"
                onClick={() => navigator.clipboard?.writeText(serverIp)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border-c bg-surface-2 px-3.5 py-2 font-mono text-xs text-fg shadow-sm transition-all hover:border-primary/60 hover:shadow-glow"
              >
                📋 {serverIp}
              </button>
            )}
          </div>

          {/* Các cột liên kết */}
          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="mb-4 inline-block border-b-2 border-primary/40 pb-1 text-xs font-bold uppercase tracking-widest text-fg">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <a
                      href={link.to}
                      className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-primary/0 transition-all group-hover:bg-primary" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Cộng đồng — chỉ render khi có link thật */}
          {socialsList.length > 0 && (
            <nav aria-label="Cộng đồng">
              <h4 className="mb-4 inline-block border-b-2 border-accent/40 pb-1 text-xs font-bold uppercase tracking-widest text-fg">
                Cộng đồng
              </h4>
              <ul className="space-y-2.5">
                {socialsList.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {s.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        {/* Hàng dưới: copyright + liên kết phụ */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border-c pt-6 sm:flex-row">
          <p className="text-center text-xs text-muted sm:text-left">
            {copyrightText}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted">
            <a href="/may-chu" className="transition-colors hover:text-primary">
              Máy chủ
            </a>
            <span aria-hidden className="h-3 w-px bg-[var(--border)]" />
            <a href="/nap-the" className="transition-colors hover:text-primary">
              Nạp thẻ
            </a>
            <span aria-hidden className="h-3 w-px bg-[var(--border)]" />
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="transition-colors hover:text-primary"
            >
              ↑ Lên đầu trang
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
