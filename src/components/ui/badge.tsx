import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-surface-2 text-muted border border-border-c',
  brand: 'bg-primary-soft text-primary border border-primary/30',
  success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/30',
  danger: 'bg-red-500/10 text-red-500 border border-red-500/30',
}

export const Badge = ({ className, variant = 'default', ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      variants[variant],
      className,
    )}
    {...props}
  />
)
