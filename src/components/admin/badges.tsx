import { Badge } from '@/components/ui/badge'
import type { ServerRole } from '@/api/admin'

const ROLE_META: Record<ServerRole, { label: string; variant: 'brand' | 'success' | 'default' }> = {
  proxy: { label: 'Proxy', variant: 'brand' },
  lobby: { label: 'Lobby', variant: 'success' },
  game: { label: 'Game', variant: 'default' },
}

export const RoleBadge = ({ role }: { role: string }) => {
  const meta = ROLE_META[role as ServerRole] ?? { label: role, variant: 'default' as const }
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

/** Badge trạng thái API key: configured = xanh, chưa = ĐỎ (cảnh báo mục UI). */
export const KeyBadge = ({ kind, configured }: { kind: 'monitor' | 'points'; configured: boolean }) => (
  <Badge variant={configured ? 'success' : 'danger'}>
    <span aria-hidden>{configured ? '✓' : '!'}</span>
    {kind === 'monitor' ? 'Monitor key' : 'Points key'}
    {!configured && ' chưa set'}
  </Badge>
)

export const ActiveBadge = ({ active }: { active: boolean }) => (
  <Badge variant={active ? 'success' : 'danger'}>{active ? 'Đang bật' : 'Đã tắt'}</Badge>
)

export const OnlineBadge = ({ online }: { online: boolean | null }) => (
  <Badge variant={online ? 'success' : 'danger'}>{online ? '● online' : '● offline'}</Badge>
)
