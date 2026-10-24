import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-strong active:scale-[0.98]',
  secondary: 'bg-surface-2 text-fg hover:bg-[var(--border)] active:scale-[0.98]',
  outline: 'border border-border-c bg-transparent text-fg hover:bg-surface-2 active:scale-[0.98]',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-fg',
  destructive: 'bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]',
}

const sizes = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-7 text-base',
  icon: 'h-9 w-9',
}

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-xl font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
