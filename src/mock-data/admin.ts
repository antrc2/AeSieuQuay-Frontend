/**
 * Mock admin API — CHỈ dùng khi đặt `VITE_DATA_SOURCE=mock` (backend chưa chạy).
 * Mặc định (kể cả dev) khu admin gọi API thật `/api/admin/*`.
 *
 * Mirror ĐÚNG shape payload của backend (`/api/admin/*` — xem
 * `backend/admin-api.md`) để UI render y hệt production: envelope đã được axios
 * gỡ, nên các hàm dưới đây trả thẳng `data`.
 * Lỗi mô phỏng bằng `ApiError(message, status, { code, message })` giống client thật.
 *
 * Lưu ý: CHUYỂN XU KHÔNG thuộc admin (user API `/api/points/**`) — mock này
 * không có points transfer, chỉ hạ tầng: cụm / server / API key / monitor.
 */
import { ApiError } from '@/api/client'

/* ---------------- helpers ---------------- */

const wait = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms))
const nowIso = () => new Date().toISOString()
const nowMs = () => Date.now()
const msAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

const uuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const randomToken = () => (uuid() + uuid()).replace(/-/g, '')

const fail = (message: string, status = 400, code = 'bad_request'): never => {
  throw new ApiError(message, status, { success: false, code, message })
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/
const KEY_RE = /^[A-Za-z0-9._-]+$/
const ROLES = new Set(['proxy', 'lobby', 'game'])

/** PRNG cố định theo tên server → số liệu monitor mock ổn định giữa các lần reload. */
function seededRandom(seedText: string) {
  let h = 2166136261
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let s = h >>> 0
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------------- types internal (đủ rộng, khớp backend dict) ---------------- */

type AnyObj = Record<string, any>

interface MockServer {
  id: number
  cluster_id: number
  server_key: string
  name: string
  role: string
  group_slug: string | null
  host: string | null
  port: number | null
  mc_version: string | null
  server_impl: string | null
  motd: string | null
  max_players: number | null
  description: string | null
  image_url: string | null
  monitoring_enabled: boolean
  maintenance_mode: boolean
  is_active: boolean
  auto_created: boolean
  points_enabled: boolean
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

interface MockCluster {
  id: number
  slug: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

interface KeySlot {
  raw: string | null
  rotated_at: string | null
}

/* ---------------- state ---------------- */

const state = {
  clusters: [
    {
      id: 1,
      slug: 'aesq',
      name: 'AESQ Network',
      description: 'Cụm chính AeSieuQuay',
      is_active: true,
      sort_order: 0,
      created_at: msAgo(60 * 24 * 30),
      updated_at: msAgo(60 * 24),
    },
    {
      id: 2,
      slug: 'test',
      name: 'Cụm thử nghiệm',
      description: 'Môi trường staging',
      is_active: true,
      sort_order: 10,
      created_at: msAgo(60 * 24 * 10),
      updated_at: msAgo(60 * 24 * 2),
    },
  ] as MockCluster[],

  servers: [
    mkServer({
      id: 1,
      cluster_id: 1,
      server_key: 'proxy-1',
      name: 'Proxy 1',
      role: 'proxy',
      group_slug: 'network',
      host: 'play.aesieuquay.com',
      port: 25565,
      mc_version: '1.21.4',
      server_impl: 'Velocity',
      max_players: 1000,
      sort_order: 0,
    }),
    mkServer({
      id: 2,
      cluster_id: 1,
      server_key: 'lobby-1',
      name: 'Lobby 1',
      role: 'lobby',
      group_slug: 'lobby',
      host: 'lobby.aesieuquay.com',
      port: 25566,
      mc_version: '1.21.4',
      server_impl: 'Paper',
      max_players: 200,
      sort_order: 1,
    }),
    mkServer({
      id: 3,
      cluster_id: 1,
      server_key: 'survival-1',
      name: 'Survival 1',
      role: 'game',
      group_slug: 'survival',
      host: 'survival.aesieuquay.com',
      port: 25567,
      mc_version: '1.21.4',
      server_impl: 'Paper',
      max_players: 120,
      sort_order: 2,
    }),
    mkServer({
      id: 4,
      cluster_id: 1,
      server_key: 'skyblock-1',
      name: 'SkyBlock 1',
      role: 'game',
      group_slug: 'skyblock',
      host: 'skyblock.aesieuquay.com',
      port: 25568,
      mc_version: '1.21.4',
      server_impl: 'Folia',
      max_players: 120,
      sort_order: 3,
    }),
    mkServer({
      id: 5,
      cluster_id: 2,
      server_key: 'creative-test',
      name: 'Creative (test)',
      role: 'game',
      group_slug: 'creative',
      host: 'test.aesieuquay.com',
      port: 25570,
      auto_created: true,
      monitoring_enabled: true,
      points_enabled: true,
      sort_order: 0,
    }),
  ] as MockServer[],

  /** key raw mock chỉ để test luồng; production backend chỉ lưu SHA-256 hash. */
  keys: new Map<number, { monitor: KeySlot; points: KeySlot }>(),

  monitor: [
    mkMonitor('proxy-1', { online: true, players: 87, max: 1000, tps: 19.8, mspt: 28 }),
    mkMonitor('lobby-1', { online: true, players: 42, max: 200, tps: 20.0, mspt: 22 }),
    mkMonitor('survival-1', { online: true, players: 61, max: 120, tps: 17.6, mspt: 44 }),
    mkMonitor('skyblock-1', { online: false, players: 0, max: 120, tps: null, mspt: null }),
  ] as AnyObj[],

  /** game_modes — khớp schema `GameModeOut` (kèm field legacy). */
  gameModes: [
    {
      id: 1,
      slug: 'sinh-ton',
      name: 'Sinh tồn',
      tagline: 'Classic Survival',
      short_desc: 'Khám phá thế giới, bảo vệ lãnh thổ, chinh phục Boss mỗi cuối tuần.',
      desc: null,
      status: 'hot',
      players_online: 0,
      difficulty: null,
      features: [],
      highlights: [],
      images: [],
      rules: [],
      commands: [],
      cluster_id: 1,
      content_html:
        '<h2>Sinh tồn</h2><p>Nội dung mẫu do admin soạn — class Tailwind lấy từ safelist, tag trần lấy style từ <code>.aqs-prose</code>.</p>',
      image_key: 'game-modes/sinh-ton.jpg',
      image_url: 'https://images.unsplash.com/photo-1601987077677-5346c0c57d3f?q=80&w=1974&auto=format&fit=crop',
      sort_order: 0,
      is_active: true,
      created_at: msAgo(60 * 24 * 30),
      updated_at: msAgo(60 * 24),
    },
    {
      id: 2,
      slug: 'skyblock',
      name: 'Skyblock',
      tagline: 'Sky Islands',
      short_desc: 'Bắt đầu từ đảo nhỏ trên không, mở rộng thành đảo vương quốc.',
      desc: null,
      status: 'hot',
      players_online: 0,
      difficulty: null,
      features: [],
      highlights: [],
      images: [],
      rules: [],
      commands: [],
      cluster_id: 1,
      content_html: '<h2>Skyblock</h2><p>Mỗi block đều quý giá.</p>',
      image_key: null,
      image_url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=2050&auto=format&fit=crop',
      sort_order: 1,
      is_active: true,
      created_at: msAgo(60 * 24 * 20),
      updated_at: msAgo(60 * 12),
    },
    {
      id: 3,
      slug: 'pvp',
      name: 'PvP',
      tagline: 'Arena Combat',
      short_desc: 'Sảnh combat tối ưu ping Việt Nam.',
      desc: null,
      status: 'new',
      players_online: 0,
      difficulty: null,
      features: [],
      highlights: [],
      images: [],
      rules: [],
      commands: [],
      cluster_id: 1,
      content_html: null, // test badge "Trống" + fallback trang user
      image_key: null,
      image_url: null,
      sort_order: 2,
      is_active: true,
      created_at: msAgo(60 * 24 * 5),
      updated_at: msAgo(60 * 3),
    },
  ] as AnyObj[],
}

function mkServer(p: Partial<MockServer> & { id: number }): MockServer {
  return {
    cluster_id: 1,
    server_key: `server-${p.id}`,
    name: `Server ${p.id}`,
    role: 'game',
    group_slug: null,
    host: null,
    port: null,
    mc_version: null,
    server_impl: null,
    motd: null,
    max_players: null,
    description: null,
    image_url: null,
    monitoring_enabled: true,
    maintenance_mode: false,
    is_active: true,
    auto_created: false,
    points_enabled: p.role === 'proxy' ? false : true,
    sort_order: p.id,
    created_at: msAgo(60 * 24 * 20),
    updated_at: msAgo(60 * 24 * 2),
    ...p,
  } as MockServer
}

function mkMonitor(
  serverName: string,
  s: { online: boolean; players: number; max: number; tps: number | null; mspt: number | null },
) {
  const ts = s.online ? nowMs() : nowMs() - 40 * 60_000
  return {
    server_name: serverName,
    online: s.online,
    last_seen_ms: ts,
    last_seq: 5000 + Math.floor(Math.random() * 400),
    current_boot_id: uuid(),
    agent: { name: 'AESQ-Monitor', version: '1.3.2' },
    heartbeat: {
      ts_ms: ts,
      online: s.players,
      max: s.max,
      mc_version: '1.21.4',
      server_impl: 'Paper',
      server_impl_version: 'paper-1.21.4-build-100',
      motd: 'AeSieuQuay — chơi là ghiền',
    },
    perf: {
      ts_ms: ts,
      tps_1m: s.tps,
      tps_5m: s.tps,
      tps_15m: s.tps,
      mspt_avg: s.mspt,
      mspt_p95: s.mspt === null ? null : Math.round(s.mspt * 1.6),
      mspt_p99: s.mspt === null ? null : Math.round(s.mspt * 2.2),
      cpu_process: s.online ? 0.62 : null,
      cpu_system: s.online ? 0.81 : null,
      heap_used: s.online ? 4_200_000_000 : null,
      heap_max: 8_000_000_000,
      heap_post_gc: s.online ? 3_100_000_000 : null,
      thread_count: s.online ? 62 : null,
    },
    system: { ts_ms: ts, load_avg: s.online ? 1.24 : null, mem_total: 16_000_000_000, mem_free: 5_000_000_000, proc_rss: s.online ? 5_100_000_000 : null },
  }
}

function seedKeys() {
  state.keys.set(1, { monitor: { raw: `aesq_mon_${randomToken()}`, rotated_at: msAgo(60 * 20) }, points: { raw: null, rotated_at: null } })
  state.keys.set(2, { monitor: { raw: `aesq_mon_${randomToken()}`, rotated_at: msAgo(60 * 20) }, points: { raw: `aesq_pts_${randomToken()}`, rotated_at: msAgo(60 * 18) } })
  state.keys.set(3, { monitor: { raw: `aesq_mon_${randomToken()}`, rotated_at: msAgo(60 * 12) }, points: { raw: `aesq_pts_${randomToken()}`, rotated_at: msAgo(60 * 12) } })
  state.keys.set(4, { monitor: { raw: `aesq_mon_${randomToken()}`, rotated_at: msAgo(60 * 12) }, points: { raw: null, rotated_at: null } })
  state.keys.set(5, { monitor: { raw: null, rotated_at: null }, points: { raw: null, rotated_at: null } })
}

seedKeys()

/* ---------------- selectors / views ---------------- */

const findServer = (id: number): MockServer =>
  state.servers.find((s) => s.id === id) ?? fail(`Server ${id} không tồn tại`, 404, 'not_found')

const findCluster = (id: number): MockCluster =>
  state.clusters.find((c) => c.id === id) ?? fail(`Cụm ${id} không tồn tại`, 404, 'not_found')

const slotsFor = (serverId: number) => {
  if (!state.keys.has(serverId)) state.keys.set(serverId, { monitor: { raw: null, rotated_at: null }, points: { raw: null, rotated_at: null } })
  return state.keys.get(serverId)!
}

const serverView = (s: MockServer) => {
  const slots = slotsFor(s.id)
  const cluster = state.clusters.find((c) => c.id === s.cluster_id)
  return {
    ...s,
    cluster_slug: cluster?.slug ?? null,
    monitor_key_configured: !!slots.monitor.raw,
    points_key_configured: !!slots.points.raw,
    monitor_key_rotated_at: slots.monitor.rotated_at,
    points_key_rotated_at: slots.points.rotated_at,
  }
}

const keysView = (s: MockServer) => {
  const slots = slotsFor(s.id)
  return {
    server_id: s.id,
    server_key: s.server_key,
    cluster_id: s.cluster_id,
    monitor: { configured: !!slots.monitor.raw, rotated_at: slots.monitor.rotated_at },
    points: { configured: !!slots.points.raw, rotated_at: slots.points.rotated_at },
  }
}

const normalizePointsFlag = (role: string, value: boolean | null | undefined) => {
  if (role === 'proxy') {
    if (value === true) fail('Server role proxy không được bật points_enabled', 400, 'bad_request')
    return false
  }
  return value === undefined || value === null ? true : !!value
}

function validateServerDraft(s: AnyObj, idx: number) {
  const label = idx >= 0 ? `servers[${idx}]` : 'server'
  const key = String(s.server_key ?? '').trim()
  if (!KEY_RE.test(key)) fail(`${label}.server_key không hợp lệ (a-z A-Z 0-9 . _ -)`, 422, 'validation_error')
  if (state.servers.some((x) => x.server_key === key)) fail(`server_key "${key}" đã tồn tại`, 409, 'conflict')
  const role = s.role ?? 'game'
  if (!ROLES.has(role)) fail(`${label}.role phải là proxy|lobby|game`, 422, 'validation_error')
  const pointsEnabled = normalizePointsFlag(role, s.points_enabled)
  return {
    server_key: key,
    name: String(s.name ?? '').trim() || key,
    role,
    group_slug: s.group_slug || null,
    host: s.host || null,
    port: s.port ? Number(s.port) : null,
    monitoring_enabled: s.monitoring_enabled !== false,
    points_enabled: pointsEnabled,
    sort_order: Number(s.sort_order ?? idx + 1),
    cluster_id: s.cluster_id,
  }
}

const findMonitor = (serverName: string) =>
  state.monitor.find((m) => m.server_name === serverName) ??
  mkMonitor(serverName, { online: false, players: 0, max: 100, tps: null, mspt: null })

/* ---------------- mock API ---------------- */

export const adminMock = {
  /* ================= clusters ================= */

  async listClusters() {
    await wait()
    return state.clusters.map((c) => ({ ...c, servers: null }))
  },

  async getCluster(clusterId: number) {
    await wait()
    const c = findCluster(clusterId)
    return {
      ...c,
      servers: state.servers.filter((s) => s.cluster_id === c.id).map(serverView),
    }
  },

  async createCluster(payload: AnyObj) {
    await wait()
    const slug = String(payload.slug ?? '').trim().toLowerCase()
    if (!SLUG_RE.test(slug)) fail('slug phải khớp ^[a-z0-9][a-z0-9-]*$', 422, 'validation_error')
    if (state.clusters.some((c) => c.slug === slug)) fail(`slug "${slug}" đã tồn tại`, 409, 'conflict')
    if (!String(payload.name ?? '').trim()) fail('name là bắt buộc', 422, 'validation_error')

    const rows = (payload.servers ?? []).map((s: AnyObj, idx: number) => validateServerDraft(s, idx))

    const id = Math.max(0, ...state.clusters.map((c) => c.id)) + 1
    const cluster: MockCluster = {
      id,
      slug,
      name: String(payload.name).trim(),
      description: payload.description ?? null,
      is_active: payload.is_active !== false,
      sort_order: Number(payload.sort_order ?? 0),
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    state.clusters.push(cluster)
    let nextId = Math.max(0, ...state.servers.map((s) => s.id)) + 1
    for (const draft of rows) {
      state.servers.push(mkServer({ ...draft, id: nextId++, cluster_id: id }))
    }
    return { ...cluster, servers: state.servers.filter((s) => s.cluster_id === id).map(serverView) }
  },

  async updateCluster(clusterId: number, patch: AnyObj) {
    await wait()
    const c = findCluster(clusterId)
    if (patch.slug !== undefined) {
      const slug = String(patch.slug ?? '').trim().toLowerCase()
      if (!SLUG_RE.test(slug)) fail('slug phải khớp ^[a-z0-9][a-z0-9-]*$', 422, 'validation_error')
      if (state.clusters.some((x) => x.id !== c.id && x.slug === slug)) fail(`slug "${slug}" đã tồn tại`, 409, 'conflict')
      c.slug = slug
    }
    if (patch.name !== undefined) c.name = String(patch.name).trim() || c.name
    if (patch.description !== undefined) c.description = patch.description
    if (patch.is_active !== undefined) c.is_active = !!patch.is_active
    if (patch.sort_order !== undefined) c.sort_order = Number(patch.sort_order)
    c.updated_at = nowIso()
    return { ...c, servers: state.servers.filter((s) => s.cluster_id === c.id).map(serverView) }
  },

  async deleteCluster(clusterId: number) {
    await wait()
    const c = findCluster(clusterId)
    c.is_active = false
    c.updated_at = nowIso()
    for (const s of state.servers) {
      if (s.cluster_id === c.id) {
        s.is_active = false
        s.updated_at = nowIso()
      }
    }
    return null
  },

  /* ================= servers ================= */

  async listServers(params: { cluster_id?: number; role?: string; include_inactive?: boolean } = {}) {
    await wait()
    return state.servers
      .filter((s) => (params.include_inactive ? true : s.is_active))
      .filter((s) => (params.cluster_id ? s.cluster_id === params.cluster_id : true))
      .filter((s) => (params.role ? s.role === params.role : true))
      .sort((a, b) => a.cluster_id - b.cluster_id || a.sort_order - b.sort_order)
      .map(serverView)
  },

  async createServer(payload: AnyObj) {
    await wait()
    const draft = validateServerDraft(payload, -1)
    const cluster = findCluster(Number(draft.cluster_id))
    const id = Math.max(0, ...state.servers.map((s) => s.id)) + 1
    const server = mkServer({ ...draft, id, cluster_id: cluster.id })
    state.servers.push(server)
    return serverView(server)
  },

  async updateServer(serverId: number, patch: AnyObj) {
    await wait()
    const s = findServer(serverId)
    if (patch.server_key !== undefined) {
      const key = String(patch.server_key).trim()
      if (!KEY_RE.test(key)) fail('server_key chỉ được chứa a-z A-Z 0-9 . _ -', 422, 'validation_error')
      if (state.servers.some((x) => x.id !== s.id && x.server_key === key)) fail(`server_key "${key}" đã tồn tại`, 409, 'conflict')
      s.server_key = key
    }
    if (patch.role !== undefined) {
      if (!ROLES.has(patch.role)) fail('role phải là proxy|lobby|game', 422, 'validation_error')
      s.role = patch.role
    }
    if (patch.points_enabled !== undefined) {
      s.points_enabled = normalizePointsFlag(patch.role ?? s.role, patch.points_enabled)
    }
    if (patch.cluster_id !== undefined) findCluster(Number(patch.cluster_id))
    for (const field of ['name', 'group_slug', 'host', 'port', 'mc_version', 'server_impl', 'motd', 'max_players', 'description', 'image_url', 'monitoring_enabled', 'maintenance_mode', 'is_active', 'sort_order']) {
      if (patch[field] !== undefined) (s as AnyObj)[field] = patch[field]
    }
    if (s.role === 'proxy') s.points_enabled = false
    s.updated_at = nowIso()
    return serverView(s)
  },

  async deleteServer(serverId: number) {
    await wait()
    const s = findServer(serverId)
    s.is_active = false
    s.updated_at = nowIso()
    return null
  },

  /* ================= server keys ================= */

  async getServerKeys(serverId: number) {
    await wait()
    return keysView(findServer(serverId))
  },

  async rotateKey(serverId: number, kind: string) {
    await wait()
    const s = findServer(serverId)
    const slots = slotsFor(s.id)
    assertKind(kind)
    if (kind === 'points') {
      if (s.role === 'proxy') fail('Server role proxy không được bật points', 400, 'bad_request')
      slots.points = { raw: `aesq_pts_${randomToken()}`, rotated_at: nowIso() }
      s.points_enabled = true
    } else {
      slots.monitor = { raw: `aesq_mon_${randomToken()}`, rotated_at: nowIso() }
      s.monitoring_enabled = true
    }
    s.updated_at = nowIso()
    return { server_id: s.id, server_key: s.server_key, kind, api_key: slots[kind as 'monitor' | 'points'].raw }
  },

  async setKey(serverId: number, kind: string, apiKey: string) {
    await wait()
    const s = findServer(serverId)
    const slots = slotsFor(s.id)
    assertKind(kind)
    const value = String(apiKey ?? '')
    if (value.length < 24) fail('api_key phải có ít nhất 24 ký tự', 422, 'validation_error')
    for (const [id, k] of state.keys) {
      if (id !== s.id && (k.monitor.raw === value || k.points.raw === value)) {
        fail('api_key trùng với server khác', 409, 'conflict')
      }
    }
    if (kind === 'points') {
      if (s.role === 'proxy') fail('Server role proxy không được bật points', 400, 'bad_request')
      slots.points = { raw: value, rotated_at: nowIso() }
      s.points_enabled = true
    } else {
      slots.monitor = { raw: value, rotated_at: nowIso() }
      s.monitoring_enabled = true
    }
    s.updated_at = nowIso()
    return keysView(s)
  },

  async revokeKey(serverId: number, kind: string) {
    await wait()
    const s = findServer(serverId)
    const slots = slotsFor(s.id)
    assertKind(kind)
    if (kind === 'points') {
      slots.points = { raw: null, rotated_at: null }
      s.points_enabled = false
    } else {
      slots.monitor = { raw: null, rotated_at: null }
      s.monitoring_enabled = false
    }
    s.updated_at = nowIso()
    return keysView(s)
  },

  /* ================= monitor ================= */

  async monitorOverview() {
    await wait()
    const servers = state.monitor
    const online = servers.filter((s) => s.online)
    return {
      servers_total: servers.length,
      servers_online: online.length,
      players_online: online.reduce((sum, s) => sum + (s.heartbeat.online || 0), 0),
      alerts: {
        low_tps: online.filter((s) => s.perf.tps_1m !== null && s.perf.tps_1m < 18).map((s) => s.server_name),
        high_mspt: online.filter((s) => s.perf.mspt_avg !== null && s.perf.mspt_avg > 40).map((s) => s.server_name),
        offline: servers.filter((s) => !s.online).map((s) => s.server_name),
      },
    }
  },

  async monitorServers() {
    await wait()
    return state.monitor.map((s) => ({ ...s }))
  },

  async monitorServerDetail(serverName: string) {
    await wait()
    const rand = seededRandom(serverName)
    const summary = findMonitor(serverName)
    return {
      server: summary,
      latest_boot: summary.online
        ? {
            boot_id: uuid(),
            started_at_ms: nowMs() - Math.floor(3 + rand() * 20) * 3_600_000,
            last_seen_ms: nowMs(),
            ended_at_ms: null,
            uptime_ms: Math.floor(3 + rand() * 20) * 3_600_000,
            agent: { name: 'aesieuquay-monitor', version: '1.4.2' },
            mc_version: summary.heartbeat.mc_version ?? null,
            server_impl: summary.heartbeat.server_impl ?? null,
            java: { version: '21.0.5+11-LTS', vendor: 'Adoptium', vm: 'OpenJDK 64-Bit Server VM' },
            os: { name: 'Windows 11', arch: 'amd64', cpus: 8 },
          }
        : null,
      counts: {
        plugins: 42 + Math.floor(rand() * 20),
        open_players: summary.online ? summary.heartbeat.online : 0,
        samples_24h: summary.online ? 6000 + Math.floor(rand() * 2000) : 0,
        events_24h: 120 + Math.floor(rand() * 400),
        exception_groups: Math.floor(rand() * 6),
      },
    }
  },

  /**
   * points luôn tăng dần theo bucket_ms (khớp backend) — vẽ chart trực tiếp.
   * kind: perf | heartbeat | system.
   */
  async monitorMetrics(serverName: string, q: AnyObj = {}) {
    await wait()
    const kind = String(q.kind ?? 'perf')
    const granularity = q.granularity === 'hour' ? 'hour' : 'minute'
    const spanDefault = granularity === 'hour' ? 30 * 24 : 24
    const to = Number(q.to_ms) || nowMs()
    const from = Number(q.from_ms) || to - spanDefault * 3_600_000
    const n = 60
    const step = Math.max(1, Math.floor((to - from) / n))
    const rand = seededRandom(`${serverName}:${kind}:${granularity}:${Math.floor(from / 3_600_000)}`)
    const base = findMonitor(serverName)
    const alive = base.online
    const points: AnyObj[] = []
    let tps = 20
    let players = alive ? Math.max(1, (base.heartbeat.online || 20) * 0.6) : 0

    for (let i = 0; i < n; i++) {
      const ts = from + i * step
      tps = clamp(tps + (rand() - 0.5) * 0.9, alive ? 14.5 : 0, 20.5)
      players = Math.max(0, players + (rand() - 0.5) * 8)
      if (kind === 'perf') {
        const mspt = alive ? clamp(1000 / Math.max(tps, 1) - 18 + rand() * 6, 5, 120) : 0
        points.push({
          bucket_ms: ts,
          sample_count: granularity === 'hour' ? 720 : 12,
          tps_avg: round2(tps),
          tps_min: round2(Math.max(tps - 0.6, 0)),
          tps_max: round2(Math.min(tps + 0.4, 20)),
          mspt_avg: round2(mspt),
          mspt_p95_max: round2(mspt * 1.7),
          mspt_p99_max: round2(mspt * 2.4),
          mspt_max_max: round2(mspt * 4),
          cpu_process_avg: round4(0.3 + (20 - tps) / 40),
          cpu_process_max: round4(0.5 + (20 - tps) / 30),
          heap_used_avg: Math.round(3.2e9 + rand() * 2.6e9),
          heap_used_max: Math.round(5.4e9 + rand() * 2e9),
          heap_post_gc_avg: Math.round(1.8e9 + rand() * 1.2e9),
          heap_post_gc_max: Math.round(2.6e9 + rand() * 1.4e9),
          thread_avg: Math.round(55 + rand() * 12),
          thread_max: Math.round(60 + rand() * 16),
        })
      } else if (kind === 'heartbeat') {
        points.push({
          bucket_ms: ts,
          sample_count: 4,
          online_avg: Math.round(players),
          online_min: Math.round(players * 0.85),
          online_max: Math.round(players * 1.15),
          tps_avg: round2(tps),
        })
      } else {
        points.push({
          bucket_ms: ts,
          sample_count: 4,
          load_avg_avg: round2(0.8 + (20 - tps) / 8),
          proc_rss_avg: Math.round(4.5e9 + rand() * 1.2e9),
          proc_rss_max: Math.round(5.6e9 + rand() * 1e9),
          os_mem_free_min: Math.round(3.2e9 + rand() * 2.5e9),
        })
      }
    }
    return { server_name: serverName, kind, granularity, from_ms: from, to_ms: to, points }
  },

  async monitorEvents(serverName: string, q: AnyObj = {}) {
    await wait()
    const rand = seededRandom(`${serverName}:events`)
    const names = ['Notch', 'Steve', 'Alex', 'Herobrine', 'ĐứcVK', 'MinhTom', 'LêThị']
    const kinds = ['join', 'quit', 'command', 'lag', 'death', 'server_start']
    const items = Array.from({ length: 20 }, (_, i) => {
      const kind = kinds[Math.floor(rand() * kinds.length)]
      const isPlayerEvent = kind === 'join' || kind === 'quit' || kind === 'command' || kind === 'death'
      return {
        event_id: uuid(),
        ts_ms: nowMs() - (i * 17 + Math.floor(rand() * 15)) * 60_000,
        kind,
        player: isPlayerEvent ? { uuid: uuid(), name: names[Math.floor(rand() * names.length)] } : null,
        data: kind === 'lag' ? { mspt: Math.round(60 + rand() * 140) } : kind === 'command' ? { cmd: '/home' } : {},
      }
    })
    const limit = Number(q.limit ?? 20)
    return { total: 137, limit, offset: 0, items: items.slice(0, limit) }
  },

  async monitorOnlinePlayers(serverName: string) {
    await wait()
    const base = findMonitor(serverName)
    if (!base.online) return []
    const rand = seededRandom(`${serverName}:players`)
    const names = ['Notch', 'Steve', 'Alex', 'ĐứcVK', 'MinhTom', 'LêThị', 'GamerPro2012', 'pe_Sity', 'TrangXinh']
    const count = Math.min(12, Math.max(3, Math.round((base.heartbeat.online || 0) / 8)))
    return Array.from({ length: count }, () => ({
      player_name: names[Math.floor(rand() * names.length)],
      player_uuid: uuid(),
      joined_at_ms: nowMs() - Math.floor(rand() * 4) * 3_600_000,
      online_s: Math.floor(rand() * 12000),
    }))
  },

  async monitorExceptions(serverName: string) {
    await wait()
    const base = findMonitor(serverName)
    if (!base.online) return []
    const rand = seededRandom(`${serverName}:exc`)
    const samples = [
      { source: 'WorldGuard', message: 'IllegalArgumentException: region id is null', stack: 'at com.sk89q...' },
      { source: 'AESQPoints', message: 'IOException: redis connection reset', stack: 'at redis.clients...' },
      { source: 'Minecraft', message: 'Can\'t transport entity Cow from world "survival" to "nether"', stack: 'at net.minecraft...' },
    ]
    return samples.slice(0, 2 + Math.floor(rand() * 2)).map((s, i) => ({
      ...s,
      count: 1 + Math.floor(rand() * 30),
      first_seen_ms: nowMs() - (40 + i * 30) * 3_600_000,
      last_seen_ms: nowMs() - Math.floor(rand() * 8) * 3_600_000,
    }))
  },

  async monitorPlugins(serverName: string) {
    await wait()
    const rand = seededRandom(`${serverName}:plugins`)
    const names = ['WorldEdit', 'WorldGuard', 'EssentialsX', 'LuckPerms', 'ProtocolLib', 'ViaVersion', 'Citizens', 'Multiverse-Core', 'Vault', 'AESQPoints', 'AESQMonitor', 'PlaceholderAPI']
    return names.map((n) => ({
      name: n,
      version: `1.${Math.floor(rand() * 20)}.${Math.floor(rand() * 9)}`,
      enabled: true,
      authors: ['AESQ Team'],
    }))
  },

  /* ================= game modes ================= */

  async listGameModes() {
    await wait()
    return state.gameModes.map((m) => ({ ...m }))
  },

  async getGameMode(modeId: number) {
    await wait()
    return { ...findGameMode(modeId) }
  },

  async createGameMode(payload: AnyObj) {
    await wait()
    const slug = String(payload.slug ?? '').trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail('slug phải khớp ^[a-z0-9-]+$', 422, 'validation_error')
    if (state.gameModes.some((m) => m.slug === slug)) fail(`slug "${slug}" đã tồn tại`, 409, 'conflict')
    if (!String(payload.name ?? '').trim()) fail('name là bắt buộc', 422, 'validation_error')
    const id = Math.max(0, ...state.gameModes.map((m) => m.id)) + 1
    const mode: AnyObj = {
      id,
      slug,
      name: String(payload.name).trim(),
      tagline: payload.tagline ?? null,
      short_desc: payload.short_desc ?? null,
      desc: payload.desc ?? null,
      status: payload.status ?? 'normal',
      players_online: Number(payload.players_online ?? 0),
      difficulty: payload.difficulty ?? null,
      features: payload.features ?? [],
      highlights: payload.highlights ?? [],
      images: payload.images ?? [],
      rules: payload.rules ?? [],
      commands: payload.commands ?? [],
      cluster_id: payload.cluster_id ?? 1,
      content_html: payload.content_html ?? null,
      image_key: null,
      image_url: null,
      sort_order: Number(payload.sort_order ?? 0),
      is_active: payload.is_active !== false,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    state.gameModes.push(mode)
    return { ...mode }
  },

  async updateGameMode(modeId: number, patch: AnyObj) {
    await wait()
    const m = findGameMode(modeId)
    if (patch.slug !== undefined) {
      const slug = String(patch.slug ?? '').trim().toLowerCase()
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail('slug phải khớp ^[a-z0-9-]+$', 422, 'validation_error')
      if (state.gameModes.some((x) => x.id !== m.id && x.slug === slug)) fail(`slug "${slug}" đã tồn tại`, 409, 'conflict')
      m.slug = slug
    }
    if (patch.content_html !== undefined) {
      // Mock sanitizer: backend (nh3) sẽ bỏ <script>/on* — mô phỏng để test round-trip.
      m.content_html =
        patch.content_html === null
          ? null
          : String(patch.content_html)
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    }
    for (const key of ['name', 'tagline', 'short_desc', 'desc', 'status', 'players_online', 'difficulty', 'features', 'highlights', 'images', 'rules', 'commands', 'cluster_id', 'sort_order', 'is_active']) {
      if (patch[key] !== undefined) (m as AnyObj)[key] = patch[key]
    }
    m.updated_at = nowIso()
    return { ...m }
  },

  async deleteGameMode(modeId: number) {
    await wait()
    const m = findGameMode(modeId)
    state.gameModes = state.gameModes.filter((x) => x.id !== m.id)
  },

  /** Upload mock — trả URL ảnh "public" giả lập để editor chèn <img>. */
  async uploadGameModeImage(file: File) {
    await wait(500)
    const key = `game-modes/${Date.now()}-${(file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '-')}`
    return {
      key,
      url: `https://picsum.photos/seed/${encodeURIComponent(key)}/1200/675`,
      status: 'public',
      thread: false,
      content_type: file.type || 'image/jpeg',
      local_file_deleted: true,
    }
  },
}

function findGameMode(modeId: number): AnyObj {
  const m = state.gameModes.find((x) => x.id === modeId)
  if (!m) fail(`Không tìm thấy máy chủ id=${modeId}`, 404, 'not_found')
  return m
}

/* ---------------- misc helpers ---------------- */

function assertKind(kind: string) {
  if (kind !== 'monitor' && kind !== 'points') fail('kind phải là monitor|points', 400, 'bad_request')
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
const round2 = (v: number) => Math.round(v * 100) / 100
const round4 = (v: number) => Math.round(v * 10000) / 10000
