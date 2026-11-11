import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Card = ({ className = '', interactive = false, ...props }: CardProps) => (
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

export const CardHeader = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
)

export const CardTitle = ({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-bold text-fg', className)} {...props} />
)

export const CardContent = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0 text-muted', className)} {...props} />
)