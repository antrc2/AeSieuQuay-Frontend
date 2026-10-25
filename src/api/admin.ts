/**
 * Admin API client — /api/admin/*
 *
 * - Mặc định (cả dev lẫn prod): gọi THẲNG `/api/admin/*` của backend
 *   (JWT cookie access_token, path `/`, đã có role=admin trong token →
 *   Flask-JWT-Extended nhận cả cookie lẫn Bearer; CORS dev đã bật credentials).
 * - `VITE_DATA_SOURCE=mock` trong `.env.development`: dùng `adminMock` in-memory
 *   (trả ĐÚNG shape backend) khi backend chưa chạy / muốn UI offline.
 *
 * Mọi hàm trả thẳng `data` của envelope `{ success, code, message, data, request_id }`.
 * Lỗi bắn `ApiError` (err.message = message backend, err.status, err.data = envelope).
 */
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/api/client'
import { adminMock } from '@/mock-data/admin'

/**
 * Khu admin KHÁC trang SEO: luôn gọi API thật theo mặc định
 * (kể cả dev, vì backend `/api/admin/*` đã chạy).
 * Chỉ khi đặt `VITE_DATA_SOURCE=mock` mới rơi về mock in-memory.
 */
const useAdminMock = import.meta.env.VITE_DATA_SOURCE === 'mock'

/**
 * Mock in-memory dev — mô phỏng đúng shape payload backend.
 * Kiểu trả về do chính module này khai báo (interface ở trên), nên ép `any`
 * tại ranh giới mock để không lặp lại toàn bộ union/optional trong mock.
 */
const mock = adminMock as any

/* ================= Types ================= */

export type ServerRole = 'proxy' | 'lobby' | 'game'
export type KeyKind = 'monitor' | 'points'

export interface AdminCluster {
  id: number
  slug: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string | null
  updated_at: string | null
  servers?: AdminServer[] | null
}

export interface AdminServer {
  id: number
  cluster_id: number
  cluster_slug: string | null
  server_key: string
  name: string
  role: ServerRole
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
  monitor_key_configured: boolean
  points_key_configured: boolean
  monitor_key_rotated_at: string | null
  points_key_rotated_at: string | null
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

export interface ServerKeys {
  server_id: number
  server_key: string
  cluster_id: number
  monitor: { configured: boolean; rotated_at: string | null }
  points: { configured: boolean; rotated_at: string | null }
}

export interface RotateKeyResult {
  server_id: number
  server_key: string
  kind: KeyKind
  api_key: string
}

export interface ServerDraft {
  server_key: string
  name: string
  role: ServerRole
  group_slug?: string | null
  host?: string | null
  port?: number | null
  monitoring_enabled?: boolean
  points_enabled?: boolean | null
  sort_order?: number
}

export interface ClusterCreateBody {
  slug: string
  name: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
  servers?: ServerDraft[]
}

/* ================= Helpers ================= */

/** Bỏ param null/undefined/rỗng để query string sạch. */
const cleanParams = (params: object = {}) => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

const unwrap = (res: any) => res?.data ?? null

/* ================= Clusters ================= */

export const listClusters = async (): Promise<AdminCluster[]> => {
  if (useAdminMock) return mock.listClusters()
  return unwrap(await apiGet('/admin/clusters')) ?? []
}

export const getCluster = async (id: number): Promise<AdminCluster> => {
  if (useAdminMock) return mock.getCluster(id)
  return unwrap(await apiGet(`/admin/clusters/${id}`))
}

export const createCluster = async (body: ClusterCreateBody): Promise<AdminCluster> => {
  if (useAdminMock) return mock.createCluster(body)
  return unwrap(await apiPost('/admin/clusters', body))
}

export const updateCluster = async (id: number, body: Partial<ClusterCreateBody>): Promise<AdminCluster> => {
  if (useAdminMock) return mock.updateCluster(id, body)
  return unwrap(await apiPatch(`/admin/clusters/${id}`, body))
}

export const deleteCluster = async (id: number): Promise<null> => {
  if (useAdminMock) return mock.deleteCluster(id)
  await apiDelete(`/admin/clusters/${id}`)
  return null
}

/* ================= Servers ================= */

export interface ServerListQuery {
  cluster_id?: number | ''
  role?: string
  include_inactive?: boolean
}

export const listServers = async (query: ServerListQuery = {}): Promise<AdminServer[]> => {
  if (useAdminMock) {
    return mock.listServers({
      cluster_id: query.cluster_id === '' ? undefined : query.cluster_id,
      role: query.role || undefined,
      include_inactive: !!query.include_inactive,
    })
  }
  const params = cleanParams({ ...query, include_inactive: query.include_inactive ? '1' : undefined })
  return unwrap(await apiGet('/admin/servers', { params })) ?? []
}

export const createServer = async (body: ServerDraft & { cluster_id: number }): Promise<AdminServer> => {
  if (useAdminMock) return mock.createServer(body)
  return unwrap(await apiPost('/admin/servers', body))
}

export const updateServer = async (id: number, body: Record<string, unknown>): Promise<AdminServer> => {
  if (useAdminMock) return mock.updateServer(id, body)
  return unwrap(await apiPatch(`/admin/servers/${id}`, body))
}

export const deleteServer = async (id: number): Promise<null> => {
  if (useAdminMock) return mock.deleteServer(id)
  await apiDelete(`/admin/servers/${id}`)
  return null
}

/* ================= Server keys ================= */

export const getServerKeys = async (serverId: number): Promise<ServerKeys> => {
  if (useAdminMock) return mock.getServerKeys(serverId)
  return unwrap(await apiGet(`/admin/servers/${serverId}/keys`))
}

/** Key raw chỉ tồn tại trong response này — hiển thị đúng 1 lần, không log, không lưu. */
export const rotateServerKey = async (serverId: number, kind: KeyKind): Promise<RotateKeyResult> => {
  if (useAdminMock) return mock.rotateKey(serverId, kind)
  return unwrap(await apiPost(`/admin/servers/${serverId}/keys/${kind}/rotate`))
}

export const setServerKey = async (serverId: number, kind: KeyKind, apiKey: string): Promise<ServerKeys> => {
  if (useAdminMock) return mock.setKey(serverId, kind, apiKey)
  return unwrap(await apiPut(`/admin/servers/${serverId}/keys/${kind}`, { api_key: apiKey }))
}

export const revokeServerKey = async (serverId: number, kind: KeyKind): Promise<ServerKeys> => {
  if (useAdminMock) return mock.revokeKey(serverId, kind)
  return unwrap(await apiDelete(`/admin/servers/${serverId}/keys/${kind}`))
}

/* ================= Monitor =================
 * LƯU Ý: chuyển xu KHÔNG thuộc admin — đó là tính năng user đăng nhập
 * (`/api/points/**`, xem backend/points-user-api.md).
 * Admin chỉ quản hạ tầng: cụm / server / API key / monitor dashboard.
 */

export interface MonitorOverview {
  servers_total: number
  servers_online: number
  players_online: number
  alerts: { low_tps: string[]; high_mspt: string[]; offline: string[] }
}

export interface MonitorServerSummary {
  server_name: string
  online: boolean
  last_seen_ms: number
  last_seq?: number
  current_boot_id?: string
  agent?: { name: string; version: string }
  heartbeat: { ts_ms?: number | null; online: number | null; max: number | null; mc_version?: string | null; server_impl?: string | null; motd?: string | null }
  perf: { tps_1m: number | null; mspt_avg: number | null; heap_used: number | null; heap_max: number | null; [k: string]: number | null }
  system?: { load_avg: number | null; mem_total?: number | null; mem_free?: number | null; proc_rss?: number | null }
}

export interface MonitorServerDetail {
  server: MonitorServerSummary
  /** `java`/`os` là object nest theo `_boot_dict` của backend. */
  latest_boot: {
    boot_id: string
    started_at_ms: number
    last_seen_ms?: number
    ended_at_ms?: number | null
    uptime_ms: number
    agent?: { name: string | null; version: string | null }
    mc_version?: string | null
    server_impl?: string | null
    java?: { version?: string | null; vendor?: string | null; vm?: string | null } | null
    os?: { name?: string | null; arch?: string | null; cpus?: number | null } | null
  } | null
  counts: { plugins: number; open_players: number; samples_24h: number; events_24h: number; exception_groups: number }
}

export interface MetricPoint {
  bucket_ms: number
  [field: string]: number | null
}

export interface MetricsResult {
  server_name: string
  kind: string
  granularity: string
  from_ms: number
  to_ms: number
  points: MetricPoint[]
}

export interface MonitorEvent {
  event_id: string
  ts_ms: number
  kind: string
  player: { uuid: string; name: string } | null
  data: Record<string, unknown>
}

export interface OnlinePlayer {
  player_name: string
  player_uuid: string
  joined_at_ms: number
  online_s: number
}

export interface ExceptionGroup {
  source: string
  message: string
  stack?: string
  count: number
  first_seen_ms: number
  last_seen_ms: number
}

export interface PluginInfo {
  name: string
  version?: string
  enabled?: boolean
  authors?: string[]
}

export interface PagedResult<T> {
  total: number
  limit: number
  offset: number
  items: T[]
}

export const monitorOverview = async (): Promise<MonitorOverview> => {
  if (useAdminMock) return (await mock.monitorOverview()) as MonitorOverview
  return unwrap(await apiGet('/admin/monitor/overview'))
}

export const monitorServers = async (): Promise<MonitorServerSummary[]> => {
  if (useAdminMock) return (await mock.monitorServers()) as MonitorServerSummary[]
  return unwrap(await apiGet('/admin/monitor/servers')) ?? []
}

export const monitorServerDetail = async (name: string): Promise<MonitorServerDetail> => {
  if (useAdminMock) return (await mock.monitorServerDetail(name)) as MonitorServerDetail
  return unwrap(await apiGet(`/admin/monitor/servers/${encodeURIComponent(name)}`))
}

export type MetricKind = 'heartbeat' | 'perf' | 'system'
export type Granularity = 'minute' | 'hour'

export const monitorMetrics = async (
  name: string,
  query: { kind: MetricKind; granularity?: Granularity; from_ms?: number; to_ms?: number },
): Promise<MetricsResult> => {
  if (useAdminMock) return (await mock.monitorMetrics(name, query)) as MetricsResult
  return unwrap(await apiGet(`/admin/monitor/servers/${encodeURIComponent(name)}/metrics`, { params: query }))
}

export const monitorEvents = async (
  name: string,
  query: { limit?: number; offset?: number; kind?: string } = {},
): Promise<PagedResult<MonitorEvent>> => {
  if (useAdminMock) return (await mock.monitorEvents(name, query)) as PagedResult<MonitorEvent>
  return unwrap(await apiGet(`/admin/monitor/servers/${encodeURIComponent(name)}/events`, { params: cleanParams(query) }))
}

export const monitorOnlinePlayers = async (name: string): Promise<OnlinePlayer[]> => {
  if (useAdminMock) return (await mock.monitorOnlinePlayers(name)) as OnlinePlayer[]
  return unwrap(await apiGet(`/admin/monitor/servers/${encodeURIComponent(name)}/players/online`)) ?? []
}

export const monitorExceptions = async (name: string, limit = 10): Promise<ExceptionGroup[]> => {
  if (useAdminMock) return (await mock.monitorExceptions(name, { limit })) as ExceptionGroup[]
  const data = unwrap(await apiGet(`/admin/monitor/servers/${encodeURIComponent(name)}/exceptions`, { params: { limit } }))
  return Array.isArray(data) ? data : data?.items ?? []
}

export const monitorPlugins = async (name: string): Promise<PluginInfo[]> => {
  if (useAdminMock) return (await mock.monitorPlugins(name)) as PluginInfo[]
  const data = unwrap(await apiGet(`/admin/monitor/servers/${encodeURIComponent(name)}/plugins`))
  return Array.isArray(data) ? data : data?.items ?? []
}

/* ================= Game modes (máy chủ game — trang /may-chu) =================
 * Backend: modules/api/admin_machine — CRUD `/api/admin/game-modes`,
 * `content_html` được sanitize (nh3) TRƯỚC khi ghi DB; response luôn là
 * bản đã sạch. Upload ảnh: POST /api/admin/upload (multipart → S3, đồng bộ).
 */

export interface AdminGameMode {
  id: number
  slug: string
  name: string
  tagline: string | null
  short_desc: string | null
  desc: string | null
  status: 'hot' | 'new' | 'normal'
  cluster_id: number | null
  content_html: string | null
  image_key: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  // legacy — backend vẫn trả (giữ cho form cũ), UI mới không hiển thị:
  players_online: number
  difficulty: string | null
  features: string[] | null
  highlights: Array<{ title: string; desc?: string }> | null
  images: string[] | null
  rules: string[] | null
  commands: string[] | null
  created_at: string | null
  updated_at: string | null
}

export const listGameModes = async (): Promise<AdminGameMode[]> => {
  if (useAdminMock) return mock.listGameModes()
  return unwrap(await apiGet('/admin/game-modes')) ?? []
}

export const getGameMode = async (id: number): Promise<AdminGameMode> => {
  if (useAdminMock) return mock.getGameMode(id)
  return unwrap(await apiGet(`/admin/game-modes/${id}`))
}

export const createGameMode = async (body: Partial<AdminGameMode>): Promise<AdminGameMode> => {
  if (useAdminMock) return mock.createGameMode(body)
  return unwrap(await apiPost('/admin/game-modes', body))
}

export const updateGameMode = async (id: number, body: Partial<AdminGameMode>): Promise<AdminGameMode> => {
  if (useAdminMock) return mock.updateGameMode(id, body)
  return unwrap(await apiPatch(`/admin/game-modes/${id}`, body))
}

export const deleteGameMode = async (id: number): Promise<null> => {
  if (useAdminMock) return mock.deleteGameMode(id)
  await apiDelete(`/admin/game-modes/${id}`)
  return null
}

export interface AdminUploadResult {
  key: string
  url: string
  status: string
  thread: boolean
  content_type: string
  local_file_deleted?: boolean
}

/**
 * Upload ảnh qua backend → S3 (multipart, đồng bộ — editor lấy URL ngay).
 *
 * `Content-Type: null` là BẮT BUỘC: instance mặc định đặt
 * `application/json`, và axios sẽ `JSON.stringify(FormData)` (mất file) nếu
 * header JSON còn đó; ngược lại set tay `multipart/form-data` thì XHR adapter
 * không tự thêm boundary → backend không parse được. Để null = browser tự
 * sinh "multipart/form-data; boundary=…".
 */
export const uploadAdminImage = async (file: File, prefix = 'game-modes'): Promise<AdminUploadResult> => {
  if (useAdminMock) return mock.uploadGameModeImage(file)
  const form = new FormData()
  form.append('file', file)
  form.append('prefix', prefix)
  return unwrap(await apiPost('/admin/upload', form, { headers: { 'Content-Type': null } }))
}
