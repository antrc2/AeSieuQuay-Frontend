import { cn } from '@/lib/utils'

export const Skeleton = ({ className, ...props }) => (
  <div
    aria-hidden
    className={cn('animate-pulse rounded-xl bg-surface-2', className)}
    {...props}
  />
)

export const EmptyState = ({ icon = '📦', title, description, action = null }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-c bg-surface px-8 py-14 text-center">
    <span className="text-4xl">{icon}</span>
    <h3 className="text-lg font-bold text-fg">{title}</h3>
    {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    {action}
  </div>
)

export const ErrorState = ({ title = 'Có lỗi xảy ra', description, onRetry }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-c bg-surface px-8 py-14 text-center">
    <span className="text-4xl">⚠️</span>
    <h3 className="text-lg font-bold text-fg">{title}</h3>
    {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-strong"
      >
        Thử lại
      </button>
    )}
  </div>
)
