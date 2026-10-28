import { cn } from '@/lib/utils'

/** Card chuẩn mới: viền mảnh + shadow nhiều lớp + bo góc lớn — dark/light tự động theo token. */
export const Card = ({ className = '', interactive = false, ...props }) => (
  <div
    className={cn(
      'rounded-2xl border border-border-c bg-surface',
      'shadow-[var(--shadow-sm)] transition-all duration-300',
      interactive &&
        'hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-glow)]',
      className,
    )}
    {...props}
  />
)

/** Header card dạng thanh gọn (admin): có thể truyền actions bên phải. */
export const CardHeader = ({ className = '', ...props }) => (
  <div className={cn('flex flex-col gap-1.5 border-b border-border-c/70 p-5', className)} {...props} />
)

export const CardTitle = ({ className = '', ...props }) => (
  <h3 className={cn('text-[15px] font-bold tracking-tight text-fg', className)} {...props} />
)

export const CardContent = ({ className = '', ...props }) => (
  <div className={cn('p-5 text-muted', className)} {...props} />
)

export const CardFooter = ({ className = '', ...props }) => (
  <div className={cn('flex items-center border-t border-border-c/70 p-5', className)} {...props} />
)
