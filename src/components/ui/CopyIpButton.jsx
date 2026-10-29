import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { getSiteAddress } from '@/lib/siteAddress'
import { cn } from '@/lib/utils'

/**
 * Nút copy IP server (doc v2 §1) — nguồn window.DATA.server_status qua
 * getSiteAddress(), chỉ hiện ":port" khi port ≠ 25565.
 * Dùng chung cho Header navbar; Hero/FinalCTA giữ logic copy riêng vì đã có ip prop.
 */
export const CopyIpButton = ({ className, compact = false }) => {
  const [address, setAddress] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setAddress(getSiteAddress())
  }, [])

  if (!address) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
    } catch {
      const el = document.createElement('textarea')
      el.value = address
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Sao chép ${address}`}
      aria-label={`Sao chép địa chỉ server ${address}`}
      className={cn(
        'group/copy inline-flex h-9 items-center gap-2 rounded-xl border border-border-c bg-surface px-3 text-xs font-semibold transition-all hover:border-primary/50 hover:text-primary active:scale-[0.97]',
        compact && 'px-2.5',
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-muted group-hover/copy:text-primary" />
      )}
      <span className={cn('font-mono tracking-tight', copied ? 'text-emerald-500' : 'text-fg')}>
        {copied ? 'Đã copies!' : address}
      </span>
    </button>
  )
}

export default CopyIpButton
