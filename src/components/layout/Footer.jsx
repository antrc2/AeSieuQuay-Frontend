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
    <footer className="mt-24 border-t border-border-c bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
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
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border-c bg-surface-2 px-3 py-1.5 font-mono text-xs text-fg transition-colors hover:border-primary/50"
              >
                📋 {serverIp}
              </button>
            )}
          </div>

          {/* Các cột liên kết */}
          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-fg">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <a
                      href={link.to}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
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
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-fg">
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
