import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden
    className={cn('animate-pulse rounded-xl bg-surface-2', className)}
    {...props}
  />
)

export interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export const EmptyState = ({ icon = '📦', title, description, action = null }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-c bg-surface px-8 py-14 text-center">
    <span className="text-4xl">{icon}</span>
    <h3 className="text-lg font-bold text-fg">{title}</h3>
    {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    {action}
  </div>
)

