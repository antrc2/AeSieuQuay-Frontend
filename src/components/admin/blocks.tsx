import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-2xl font-extrabold tracking-tight text-fg">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

/**
 * Card số liệu tổng quan — chiều cao ổn định (label 1 dòng, value 1 dòng),
 * hint nhỏ bên dưới truncate thay vì đẩy card giãn ra.
 */
export const StatCard = ({
  label,
  value,
  sub,
  icon,
  tone = 'default',
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
}) => {
  const valueTones = {
    default: 'text-fg',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    primary: 'text-primary',
  }
  const barTones = {
    default: 'bg-transparent',
    success: 'bg-emerald-500/60',
    warning: 'bg-amber-500/60',
    danger: 'bg-red-500/60',
    primary: 'bg-primary/60',
  }
  return (
    <Card className="relative overflow-hidden p-4">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', barTones[tone])} />
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon && <span aria-hidden>{icon}</span>}
        <span className="truncate">{label}</span>
      </p>
      <p className={cn('mt-1.5 text-2xl font-extrabold leading-none tabular-nums sm:text-[26px]', valueTones[tone])}>
        {value}
      </p>
      {sub != null && sub !== '' && (
        <p className="mt-1.5 truncate text-xs text-muted">{sub}</p>
      )}
    </Card>
  )
}

/** Cụm sections có title + action góc phải (dùng cho alert/list trong overview). */
export const SectionHeader = ({
  title,
  actions,
  className,
}: {
  title: ReactNode
  actions?: ReactNode
  className?: string
}) => (
  <div className={cn('flex items-center justify-between gap-3', className)}>
    <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
)

/** Bảng sọc gọn trong trang admin — luôn bọc overflow-x để không phá layout mobile. */
export const TableWrap = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0', className)}>
    <table className="w-full min-w-[560px] border-collapse text-sm">{children}</table>
  </div>
)

export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn('border-b border-border-c px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted', className)}>
    {children}
  </th>
)

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn('border-b border-border-c px-3 py-2.5 align-middle text-fg', className)}>{children}</td>
)
