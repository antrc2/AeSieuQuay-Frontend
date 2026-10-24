import { cn } from '@/lib/utils'

export const Card = ({ className, interactive = false, ...props }) => (
  <div
    className={cn(
      'rounded-2xl border border-border-c bg-surface',
      interactive &&
        'transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
      className,
    )}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
)

export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-bold text-fg', className)} {...props} />
)

export const CardContent = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0 text-muted', className)} {...props} />
)

export const CardFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
)
