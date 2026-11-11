import { cn } from '@/lib/utils'

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface LogoProps {
  /** Bọc logo trong link tới route này; null/'' = không bọc. */
  linkTo?: string | null
  size?: LogoSize
  textOnly?: boolean
  className?: string
}

const SIZES: Record<LogoSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-28 w-28',
  full: 'h-44 w-44 sm:h-56 sm:w-56',
}

/**
 * Logo SV AeSieuQuay — file ảnh tại /logo.png (thư mục public).
 */
export const Logo = ({ linkTo = '/', size = 'md', textOnly = false, className = '' }: LogoProps) => {
  const content = (
    <span className={cn('flex items-center gap-3', className)}>
      <img
        src="/logo.png"
        alt="Logo SV AeSieuQuay - Minecraft Việt Nam"
        width={56}
        height={56}
        className={cn(SIZES[size], 'rounded-full object-cover shadow-lg shadow-primary/30')}
      />
      {!textOnly && (
        <span className="leading-tight">
          <span className="block bg-gradient-to-r from-sky-400 to-primary bg-clip-text text-lg font-extrabold tracking-wide text-transparent">
            AeSieuQuay
          </span>
          <span className="block text-[11px] font-medium text-muted">Minecraft Việt Nam</span>
        </span>
      )}
    </span>
  )

  if (linkTo) {
    return (
      <a href={linkTo} aria-label="Trang chủ AeSieuQuay" className="inline-flex">
        {content}
      </a>
    )
  }
  return content
}

export default Logo