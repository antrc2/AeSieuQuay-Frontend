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
      content_version: 3, // backend-4 §6 optimistic locking — editor gửi lại khi lưu
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
      content_version: 1,
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
      content_version: 0,
      image_key: null,
      image_url: null,
      sort_order: 2,
      is_active: true,
      created_at: msAgo(60 * 24 * 5),
      updated_at: msAgo(60 * 3),
    },
  ] as AnyObj[],

  /* ---- FRONTEND-3: lịch sử tiền (bank / points / card) + users ---- */

  users: [
    { id: 16, username: 'AnTrc2', realname: 'An Trc', email: 'an@example.com', role_slug: 'admin', registered_at: msAgo(60 * 24 * 300), last_login: msAgo(12) },
    { id: 17, username: 'MinhTom', realname: 'Minh Tom', email: 'tom@example.com', role_slug: 'user', registered_at: msAgo(60 * 24 * 120), last_login: msAgo(90) },
    { id: 18, username: 'pe_Sity', realname: 'Bi Sity', email: null, role_slug: 'user', registered_at: msAgo(60 * 24 * 40), last_login: msAgo(60 * 26) },
    { id: 19, username: 'GamerPro2012', realname: 'Pro Gamer', email: 'pro@example.com', role_slug: 'user', registered_at: msAgo(60 * 24 * 9), last_login: null },
  ] as AnyObj[],

  bankDeposits: [
    { id: 1, transaction_id: 'a1', reference_code: 'OCB2610001', gateway: 'OCB', amount_vnd: 500000, content: 'AnTrc2', status: 'credited', user_id: 16, username: 'AnTrc2', realname: 'An Trc', xu_amount: 500, sandbox: false, note: null, credit_command_id: 'c1', credit_attempts: 1, credit_command_status: 'done', credit_command_attempts: 1, credit_command_error: null, credit_result_balance: 2350, transaction_date_ms: nowMs() - 3_600_000, created_at: msAgo(60), credited_at: msAgo(58) },
    { id: 2, transaction_id: 'a2', reference_code: 'OCB2610002', gateway: 'OCB', amount_vnd: 200000, content: 'MinhTom', status: 'credited', user_id: 17, username: 'MinhTom', realname: 'Minh Tom', xu_amount: 200, sandbox: false, note: null, credit_command_id: 'c2', credit_attempts: 1, credit_command_status: 'pending', credit_command_attempts: 0, credit_command_error: null, credit_result_balance: null, transaction_date_ms: nowMs() - 120_000, created_at: msAgo(2), credited_at: msAgo(2) },
    { id: 3, transaction_id: 'a3', reference_code: 'OCB9988776', gateway: 'OCB', amount_vnd: 100000, content: 'nickkhongtontai', status: 'unmatched', user_id: null, username: null, realname: null, xu_amount: null, sandbox: false, note: 'không tìm thấy username trong authme', credit_command_id: null, credit_attempts: 0, credit_command_status: null, credit_command_attempts: null, credit_command_error: null, credit_result_balance: null, transaction_date_ms: nowMs() - 2 * 3_600_000, created_at: msAgo(120), credited_at: null },
    { id: 4, transaction_id: 'a4', reference_code: 'OCB2610004', gateway: 'OCB', amount_vnd: 100000, content: 'pe_Sity', status: 'credited', user_id: 18, username: 'pe_Sity', realname: 'Bi Sity', xu_amount: 100, sandbox: false, note: null, credit_command_id: 'c4', credit_attempts: 1, credit_command_status: 'failed', credit_command_attempts: 3, credit_command_error: 'player_not_found', credit_result_balance: null, transaction_date_ms: nowMs() - 26 * 3_600_000, created_at: msAgo(26 * 60), credited_at: msAgo(26 * 60 - 2) },
    { id: 5, transaction_id: 'a5', reference_code: 'OCB2610005', gateway: 'OCB', amount_vnd: 50000, content: 'GamerPro2012', status: 'matched', user_id: 19, username: 'GamerPro2012', realname: 'Pro Gamer', xu_amount: 50, sandbox: false, note: 'server points chưa bật', credit_command_id: null, credit_attempts: 0, credit_command_status: null, credit_command_attempts: null, credit_command_error: null, credit_result_balance: null, transaction_date_ms: nowMs() - 5 * 3_600_000, created_at: msAgo(300), credited_at: null },
    { id: 6, transaction_id: 'a6', reference_code: 'OCB2610006', gateway: 'OCB', amount_vnd: 10000, content: 'AnTrc2', status: 'credited', user_id: 16, username: 'AnTrc2', realname: 'An Trc', xu_amount: 10, sandbox: true, note: null, credit_command_id: 'c6', credit_attempts: 1, credit_command_status: 'uncertain', credit_command_attempts: 1, credit_command_error: null, credit_result_balance: null, transaction_date_ms: nowMs() - 8 * 3_600_000, created_at: msAgo(480), credited_at: msAgo(479) },
    { id: 7, transaction_id: 'a7', reference_code: 'TEST0007', gateway: 'OCB', amount_vnd: 20000, content: 'test noii dung', status: 'rejected', user_id: null, username: null, realname: null, xu_amount: null, sandbox: true, note: 'nội dung không hợp lệ (test)', credit_command_id: null, credit_attempts: 0, credit_command_status: null, credit_command_attempts: null, credit_command_error: null, credit_result_balance: null, transaction_date_ms: nowMs() - 9 * 3_600_000, created_at: msAgo(540), credited_at: null },
    { id: 8, transaction_id: 'a8', reference_code: null, gateway: 'OCB', amount_vnd: 5000, content: 'iken qua thap', status: 'received', user_id: null, username: null, realname: null, xu_amount: null, sandbox: false, note: null, credit_command_id: null, credit_attempts: 0, credit_command_status: null, credit_command_attempts: null, credit_command_error: null, credit_result_balance: null, transaction_date_ms: nowMs() - 10 * 3_600_000, created_at: msAgo(600), credited_at: null },
  ] as AnyObj[],

  transfers: [
    { transfer_id: 'tr-completed-0001', idempotency_key: 'user16:abc', from_server_key: 'lobby-1', to_server_key: 'survival-1', player_uuid: uuid(), player_name: 'AnTrc2', created_by: 16, amount: 1200, status: 'completed', debit_command_id: 'tc-d1', credit_command_id: 'tc-c1', refund_command_id: null, from_balance_before: 2350, from_balance_after: 1150, to_balance_before: 800, to_balance_after: 2000, error: null, created_at: msAgo(200), updated_at: msAgo(197), completed_at: msAgo(197) },
    { transfer_id: 'tr-pending-0002', idempotency_key: null, from_server_key: 'lobby-1', to_server_key: 'skyblock-1', player_uuid: uuid(), player_name: 'MinhTom', created_by: 17, amount: 300, status: 'debited', debit_command_id: 'tc-d2', credit_command_id: 'tc-c2', refund_command_id: null, from_balance_before: 900, from_balance_after: 600, to_balance_before: null, to_balance_after: null, error: null, created_at: msAgo(6), updated_at: msAgo(5), completed_at: null },
    { transfer_id: 'tr-refund-0003', idempotency_key: null, from_server_key: 'lobby-1', to_server_key: 'pvp-1', player_uuid: uuid(), player_name: 'pe_Sity', created_by: 18, amount: 500, status: 'refund_pending', debit_command_id: 'tc-d3', credit_command_id: 'tc-c3', refund_command_id: 'tc-r3', from_balance_before: 700, from_balance_after: 200, to_balance_before: 0, to_balance_after: null, error: 'credit expired: pvp-1 offline quá TTL', created_at: msAgo(60 * 50), updated_at: msAgo(60 * 48), completed_at: null },
    { transfer_id: 'tr-reconcile-0004', idempotency_key: null, from_server_key: 'lobby-1', to_server_key: 'survival-1', player_uuid: uuid(), player_name: 'GamerPro2012', created_by: 19, amount: 800, status: 'needs_reconcile', debit_command_id: 'tc-d4', credit_command_id: 'tc-c4', refund_command_id: null, from_balance_before: 1500, from_balance_after: 700, to_balance_before: null, to_balance_after: null, error: 'agent báo uncertain nhưng timeout — cần kiểm tra thủ công', created_at: msAgo(60 * 70), updated_at: msAgo(60 * 69), completed_at: null },
    { transfer_id: 'tr-failed-0005', idempotency_key: null, from_server_key: 'lobby-1', to_server_key: 'minigame-1', player_uuid: uuid(), player_name: 'AnTrc2', created_by: 16, amount: 100, status: 'failed', debit_command_id: 'tc-d5', credit_command_id: null, refund_command_id: null, from_balance_before: 2350, from_balance_after: null, to_balance_before: null, to_balance_after: null, error: 'server_key không bật points', created_at: msAgo(60 * 90), updated_at: msAgo(60 * 90), completed_at: null },
  ] as AnyObj[],

  commands: [
    { id: 'c1', transfer_id: null, type: 'credit', server_key: 'survival-1', player_uuid: uuid(), player_name: 'AnTrc2', amount: 500, status: 'done', attempts: 1, ok: true, balance: 2350, balance_before: -150, error: null, expires_at_ms: nowMs() + 47 * 3_600_000, created_at_ms: nowMs() - 3_600_000, claimed_at_ms: nowMs() - 3_600_000 + 4000, completed_at_ms: nowMs() - 3_600_000 + 5200, deposit_id: 1 },
    { id: 'c2', transfer_id: null, type: 'credit', server_key: 'survival-1', player_uuid: uuid(), player_name: 'MinhTom', amount: 200, status: 'pending', attempts: 0, ok: null, balance: null, balance_before: null, error: null, expires_at_ms: nowMs() + 48 * 3_600_000, created_at_ms: nowMs() - 120_000, claimed_at_ms: null, completed_at_ms: null, deposit_id: 2 },
    { id: 'c4', transfer_id: null, type: 'credit', server_key: 'survival-1', player_uuid: uuid(), player_name: 'pe_Sity', amount: 100, status: 'failed', attempts: 3, ok: false, balance: null, balance_before: null, error: 'player_not_found', expires_at_ms: nowMs() - 2 * 86_400_000, created_at_ms: nowMs() - 26 * 3_600_000, claimed_at_ms: nowMs() - 26 * 3_600_000 + 9000, completed_at_ms: nowMs() - 25 * 3_600_000, deposit_id: 4 },
    { id: 'tc-d1', transfer_id: 'tr-completed-0001', type: 'debit', server_key: 'lobby-1', player_uuid: null, player_name: 'AnTrc2', amount: 1200, status: 'done', attempts: 1, ok: true, balance: 1150, balance_before: 2350, error: null, expires_at_ms: nowMs() - 197 * 60_000 + 60_000, created_at_ms: nowMs() - 200 * 60_000, claimed_at_ms: nowMs() - 200 * 60_000, completed_at_ms: nowMs() - 199 * 60_000, deposit_id: null },
    { id: 'tc-c1', transfer_id: 'tr-completed-0001', type: 'credit', server_key: 'survival-1', player_uuid: null, player_name: 'AnTrc2', amount: 1200, status: 'done', attempts: 1, ok: true, balance: 2000, balance_before: 800, error: null, expires_at_ms: nowMs() - 197 * 60_000 + 60_000, created_at_ms: nowMs() - 200 * 60_000, claimed_at_ms: nowMs() - 198 * 60_000, completed_at_ms: nowMs() - 197 * 60_000, deposit_id: null },
    { id: 'tc-d2', transfer_id: 'tr-pending-0002', type: 'debit', server_key: 'lobby-1', player_uuid: null, player_name: 'MinhTom', amount: 300, status: 'done', attempts: 1, ok: true, balance: 600, balance_before: 900, error: null, expires_at_ms: nowMs() - 4 * 60_000, created_at_ms: nowMs() - 6 * 60_000, claimed_at_ms: nowMs() - 6 * 60_000, completed_at_ms: nowMs() - 5 * 60_000, deposit_id: null },
    { id: 'tc-c2', transfer_id: 'tr-pending-0002', type: 'credit', server_key: 'skyblock-1', player_uuid: null, player_name: 'MinhTom', amount: 300, status: 'claimed', attempts: 1, ok: null, balance: null, balance_before: null, error: null, expires_at_ms: nowMs() - 2 * 60_000, created_at_ms: nowMs() - 6 * 60_000, claimed_at_ms: nowMs() - 3 * 60_000, completed_at_ms: null, deposit_id: null },
    { id: 'tc-d3', transfer_id: 'tr-refund-0003', type: 'debit', server_key: 'lobby-1', player_uuid: null, player_name: 'pe_Sity', amount: 500, status: 'done', attempts: 1, ok: true, balance: 200, balance_before: 700, error: null, expires_at_ms: nowMs() - 60 * 48_000_000, created_at_ms: nowMs() - 60 * 50 * 60_000, claimed_at_ms: nowMs() - 60 * 50 * 60_000, completed_at_ms: nowMs() - 60 * 50 * 60_000, deposit_id: null },
    { id: 'tc-c3', transfer_id: 'tr-refund-0003', type: 'credit', server_key: 'pvp-1', player_uuid: null, player_name: 'pe_Sity', amount: 500, status: 'expired', attempts: 0, ok: false, balance: null, balance_before: null, error: 'expired', expires_at_ms: nowMs() - 60 * 49 * 60_000, created_at_ms: nowMs() - 60 * 50 * 60_000, claimed_at_ms: null, completed_at_ms: null, deposit_id: null },
    { id: 'tc-r3', transfer_id: 'tr-refund-0003', type: 'refund', server_key: 'lobby-1', player_uuid: null, player_name: 'pe_Sity', amount: 500, status: 'pending', attempts: 0, ok: null, balance: null, balance_before: null, error: null, expires_at_ms: nowMs() + 60_000, created_at_ms: nowMs() - 60 * 48 * 60_000, claimed_at_ms: null, completed_at_ms: null, deposit_id: null },
    { id: 'look-xyz', transfer_id: null, type: 'look', server_key: 'survival-1', player_uuid: uuid(), player_name: 'Notch', amount: 0, status: 'done', attempts: 1, ok: true, balance: 410, balance_before: null, error: null, expires_at_ms: nowMs() - 30_000, created_at_ms: nowMs() - 90_000, claimed_at_ms: nowMs() - 60_000, completed_at_ms: nowMs() - 59_000, deposit_id: null },
  ] as AnyObj[],

  /* P&L (FRONTEND-4 §5): real_amount = tiền thật về ví · user_receive = giá trị user nhận
   * (card_value − 10% fee) · admin_adjustment = real_amount − user_receive (ÂM = admin bù). */
  cardTx: [
    { id: 1, request_id: 'r-aaaa-1111', trans_id: 700123, user_id: 16, username: 'AnTrc2', telco: 'VIETTEL', card_type: 'the cào', serial: '654321098765', card_code_masked: '****5678', amount_vnd: 100000, real_amount: 80000, card_value: 100000, user_receive: 90000, admin_adjustment: -10000, xu_amount: 108, status: 'success', gateway_code: 1, gateway_message: 'Thành công', in_game: true, requeue_count: 0, promotion_id: 2, bonus_xu: 18, created_at: msAgo(30), credited_at: msAgo(29), callback_at: msAgo(29) },
    { id: 2, request_id: 'r-bbbb-2222', trans_id: 700124, user_id: 17, username: 'MinhTom', telco: 'MOBIFONE', card_type: 'the cào', serial: '112233445566', card_code_masked: '****1234', amount_vnd: 50000, real_amount: null, card_value: null, user_receive: null, admin_adjustment: null, xu_amount: null, status: 'pending', gateway_code: 99, gateway_message: 'Đang chờ nhà cung cấp', in_game: false, requeue_count: 0, promotion_id: null, bonus_xu: null, created_at: msAgo(2), credited_at: null, callback_at: null },
    { id: 3, request_id: 'r-cccc-3333', trans_id: 700125, user_id: 18, username: 'pe_Sity', telco: 'VINAPHONE', card_type: 'the cào', serial: '998877665544', card_code_masked: '****9900', amount_vnd: 200000, real_amount: 160000, card_value: 200000, user_receive: 180000, admin_adjustment: -20000, xu_amount: 180, status: 'success', gateway_code: 1, gateway_message: 'Thành công', in_game: false, requeue_count: 1, promotion_id: null, bonus_xu: null, created_at: msAgo(45), credited_at: msAgo(44), callback_at: msAgo(44), credit_command_status: 'pending' },
    { id: 4, request_id: 'r-dddd-4444', trans_id: null, user_id: 19, username: 'GamerPro2012', telco: 'VIETTEL', card_type: 'the cào', serial: '556677889900', card_code_masked: '****4321', amount_vnd: 50000, real_amount: null, card_value: 20000, user_receive: 18000, admin_adjustment: null, xu_amount: null, status: 'failed', gateway_code: 2, gateway_message: 'Thẻ đúng nhưng sai mệnh giá khai báo', in_game: false, requeue_count: 0, promotion_id: null, bonus_xu: null, created_at: msAgo(120), credited_at: null, callback_at: msAgo(119) },
    { id: 5, request_id: 'r-eeee-5555', trans_id: null, user_id: 17, username: 'MinhTom', telco: 'ZING', card_type: null, serial: '334455667788', card_code_masked: '****7777', amount_vnd: 100000, real_amount: null, card_value: null, user_receive: null, admin_adjustment: null, xu_amount: null, status: 'error', gateway_code: 100, gateway_message: 'Lỗi đối soát từ cổng', in_game: false, requeue_count: 0, promotion_id: null, bonus_xu: null, created_at: msAgo(300), credited_at: null, callback_at: null },
    // demo requeue: success + !in_game + cmd failed → nút "Tạo lại lệnh cộng Xu" hiện.
    { id: 6, request_id: 'r-ffff-6666', trans_id: 700126, user_id: 16, username: 'AnTrc2', telco: 'GATE', card_type: 'the cào', serial: '778899001122', card_code_masked: '****8080', amount_vnd: 100000, real_amount: 79000, card_value: 100000, user_receive: 90000, admin_adjustment: -11000, xu_amount: 90, status: 'success', gateway_code: 1, gateway_message: 'Thành công', in_game: false, requeue_count: 0, promotion_id: null, bonus_xu: null, created_at: msAgo(15), credited_at: msAgo(14), callback_at: msAgo(14), credit_command_status: 'failed', credit_command_error: 'player_not_found' },
    // demo tooltip pending lâu: tạo cách đây 15 phút.
    { id: 7, request_id: 'r-gggg-7777', trans_id: 700127, user_id: 18, username: 'pe_Sity', telco: 'MOBIFONE', card_type: 'the cào', serial: '223344556677', card_code_masked: '****1919', amount_vnd: 30000, real_amount: null, card_value: null, user_receive: null, admin_adjustment: null, xu_amount: null, status: 'pending', gateway_code: 99, gateway_message: 'Đang chờ nhà cung cấp', in_game: false, requeue_count: 0, promotion_id: null, bonus_xu: null, created_at: msAgo(15), credited_at: null, callback_at: null },
  ] as AnyObj[],

  /* ---- FRONTEND-4 §4: event khuyến mãi nạp (topup_promotions) ----
   * claimed_users mock = số user DISTINCT trong claims (backend tính subquery).
   */
  promotions: [
    { id: 1, name: 'X2 Xu cuối tuần', applies_to: 'bank', bonus_percent: 100, starts_at: msAgo(60 * 60 * 24 * 3), ends_at: msAgo(60 * 60 * 24), max_users: 20, max_per_user: 1, is_active: true, claimed_users: 14, created_at: msAgo(60 * 24 * 10), updated_at: msAgo(60 * 24 * 10) }, // đã kết thúc
    { id: 2, name: 'Mừng ra mắt server — +20% Xu', applies_to: 'all', bonus_percent: 20, starts_at: msAgo(60 * 24), ends_at: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 19), max_users: 10, max_per_user: 1, is_active: true, claimed_users: 4, created_at: msAgo(60 * 30), updated_at: msAgo(60 * 2) }, // đang chạy
    { id: 3, name: 'Sale Tết — +50% thẻ cào', applies_to: 'card', bonus_percent: 50, starts_at: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 19), ends_at: new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 19), max_users: 100, max_per_user: 2, is_active: true, claimed_users: 0, created_at: msAgo(60 * 5), updated_at: msAgo(60 * 5) }, // sắp diễn ra
    { id: 4, name: 'KM thử nghiệm (đã tắt)', applies_to: 'bank', bonus_percent: 10, starts_at: msAgo(60 * 24 * 20), ends_at: msAgo(60 * 24 * 15), max_users: 5, max_per_user: 1, is_active: false, claimed_users: 2, created_at: msAgo(60 * 24 * 25), updated_at: msAgo(60 * 24 * 16) }, // tắt
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
      content_version: 0,
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
      // backend-4 §6 optimistic locking — content_html bắt buộc kèm base_content_version khớp.
      const base = patch.base_content_version
      if (base === undefined || base === null)
        fail('Trùng sửa: vui lòng tải lại nội dung (thiếu base_content_version)', 400, 'bad_request')
      if (Number(base) !== (m.content_version ?? 0)) {
        const msg = 'Nội dung đã bị thay đổi bởi lần lưu khác — tải bản mới nhất hoặc ghi đè có chủ đích.'
        throw new ApiError(msg, 409, {
          success: false,
          code: 'conflict',
          message: msg,
          data: { content_version: m.content_version ?? 0, updated_at: m.updated_at },
        })
      }
      // Mock sanitizer: backend (nh3) sẽ bỏ <script>/on* — mô phỏng để test round-trip.
      m.content_html =
        patch.content_html === null
          ? null
          : String(patch.content_html)
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      m.content_version = (m.content_version ?? 0) + 1
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

  /* ================= bank deposits (FRONTEND-3 §2) ================= */

  async listBankDeposits(q: AnyObj = {}) {
    await wait()
    let rows = [...state.bankDeposits].sort((a, b) => b.id - a.id)
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.user_id) rows = rows.filter((r) => r.user_id === Number(q.user_id))
    if (q.q) {
      const needle = String(q.q).toLowerCase()
      rows = rows.filter(
        (r) =>
          r.credit_command_id === q.q ||
          [r.content, r.reference_code, r.username].some((v) => v && String(v).toLowerCase().includes(needle)),
      )
    }
    return pagedAdmin(rows, q.page, q.limit ?? 20)
  },

  async getBankDeposit(id: number) {
    await wait()
    return { ...findBankDeposit(id) }
  },

  async requeueBankDeposit(id: number, username?: string) {
    await wait()
    const d = findBankDeposit(id)
    if (d.status === 'rejected' || d.status === 'ignored') fail('Giao dịch đã reject/ignore — không requeue', 400, 'bad_request')
    if (d.status === 'credited' && (d.credit_command_status === 'pending' || d.credit_command_status === 'claimed'))
      fail(`Lệnh cũ còn ${d.credit_command_status} — chờ agent, không requeue được`, 400, 'bad_request')
    if (username) {
      const user = state.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase())
      if (!user) fail(`Không có tài khoản tên '${username}'`, 400, 'bad_request')
      d.user_id = user.id
      d.username = user.username
      d.realname = user.realname
    }
    if (!d.user_id) fail('Chưa match được user — requeue kèm {username} sau khi player đăng ký đúng nickname', 400, 'bad_request')
    d.status = 'credited'
    d.credit_command_id = uuid()
    d.credit_command_status = 'pending'
    d.credit_command_attempts = 0
    d.credit_command_error = null
    d.credit_attempts = (d.credit_attempts ?? 0) + 1
    d.credited_at = nowIso()
    // mô phỏng agent online: 2.5s sau lệnh done + cộng dư
    setTimeout(() => {
      d.credit_command_status = 'done'
      d.credit_command_attempts = 1
      d.credit_result_balance = 2350
    }, 2500)
    return { ...d }
  },

  /* ================= points history (FRONTEND-3 §3) ================= */

  async listPointTransfers(q: AnyObj = {}) {
    await wait()
    let rows = [...state.transfers]
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.user_id) rows = rows.filter((r) => r.created_by === Number(q.user_id))
    if (q.q) {
      const needle = String(q.q).toLowerCase()
      rows = rows.filter(
        (r) =>
          (r.player_name || '').toLowerCase().includes(needle) ||
          r.transfer_id.startsWith(String(q.q)) ||
          r.from_server_key.toLowerCase().includes(needle) ||
          r.to_server_key.toLowerCase().includes(needle),
      )
    }
    return pagedAdmin(rows, q.page, q.limit ?? 20)
  },

  async getPointTransfer(transferId: string) {
    await wait()
    const t = state.transfers.find((x) => x.transfer_id === transferId)
    if (!t) fail('Transfer không tồn tại', 404, 'not_found')
    return {
      transfer: { ...t },
      commands: state.commands.filter((c) => c.transfer_id === transferId).map((c) => ({ ...c })),
    }
  },

  async listPointCommands(q: AnyObj = {}) {
    await wait()
    let rows = [...state.commands].sort((a, b) => b.created_at_ms - a.created_at_ms)
    if (q.server_key) rows = rows.filter((r) => r.server_key === q.server_key)
    if (q.type) rows = rows.filter((r) => r.type === q.type)
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.q) {
      const needle = String(q.q).toLowerCase()
      rows = rows.filter((r) => (r.player_name || '').toLowerCase().includes(needle) || r.id.startsWith(String(q.q)))
    }
    return pagedAdmin(rows, q.page, q.limit ?? 20)
  },

  /* ================= card transactions (FRONTEND-3 §4) ================= */

  async listCardTransactions(q: AnyObj = {}) {
    await wait()
    let rows = [...state.cardTx].sort((a, b) => b.id - a.id)
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    if (q.user_id) rows = rows.filter((r) => r.user_id === Number(q.user_id))
    if (q.q) {
      const needle = String(q.q).toLowerCase()
      rows = rows.filter((r) => [r.request_id, r.serial, r.username].some((v) => v && String(v).toLowerCase().includes(needle)))
    }
    const page = Math.max(1, Number(q.page || 1))
    const size = Number(q.page_size || 20)
    return { total: rows.length, page, page_size: size, items: rows.slice((page - 1) * size, page * size).map((r) => ({ ...r })) }
  },

  /** backend-4 §1 — mirror điều kiện service requeue bank (xem docstring trong api/admin.ts). */
  async requeueCardTransaction(id: number) {
    await wait()
    const t = state.cardTx.find((x) => x.id === id)
    if (!t) fail('Giao dịch thẻ không tồn tại', 404, 'not_found')
    if (t.status !== 'success') fail('Chỉ requeue được thẻ ĐÃ success (tiền đã mất cho cổng)', 400, 'bad_request')
    const cmd = t.credit_command_status
    if (cmd === 'pending' || cmd === 'claimed') fail('Lệnh cũ còn pending — chờ agent', 400, 'bad_request')
    if (t.in_game && cmd !== 'failed' && cmd !== 'expired' && cmd !== 'uncertain')
      fail('Thẻ đã vào game — không cần requeue', 400, 'bad_request')
    // tạo CREDIT command mới tinh (pending) + flip in_game như backend; agent mock: 2.5s sau done.
    const commandId = uuid()
    state.commands.push({
      id: commandId, transfer_id: null, type: 'credit', server_key: 'lobby-1',
      player_uuid: uuid(), player_name: t.username, amount: t.xu_amount ?? 0, status: 'pending',
      attempts: 0, ok: null, balance: null, balance_before: null, error: null,
      expires_at_ms: nowMs() + 48 * 3_600_000, created_at_ms: nowMs(), claimed_at_ms: null, completed_at_ms: null, deposit_id: null,
    })
    t.credit_command_status = 'pending'
    t.credit_command_error = null
    t.in_game = true
    t.credited_at = nowIso()
    t.requeue_count = (t.requeue_count ?? 0) + 1
    setTimeout(() => {
      t.credit_command_status = 'done'
    }, 2500)
    return { ...t }
  },

  /* ================= khuyến mãi nạp (FRONTEND-4 §4 / backend-4 §4.5) ================= */

  async listPromotions(q: AnyObj = {}) {
    await wait()
    const rows = [...state.promotions].sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1))
    return pagedAdmin(rows, q.page, q.limit ?? 20)
  },

  async createPromotion(payload: AnyObj) {
    await wait()
    const p = validatePromotion(payload, null)
    const id = Math.max(0, ...state.promotions.map((x) => x.id)) + 1
    const promo = { id, claimed_users: 0, created_at: nowIso(), updated_at: nowIso(), ...p }
    state.promotions.push(promo)
    return { ...promo }
  },

  async updatePromotion(id: number, patch: AnyObj) {
    await wait()
    const promo = state.promotions.find((x) => x.id === id)
    if (!promo) fail(`Event ${id} không tồn tại`, 404, 'not_found')
    const merged = validatePromotion({ ...promo, ...patch }, id)
    Object.assign(promo, merged, { updated_at: nowIso() })
    return { ...promo }
  },

  /** Soft-off: KHÔNG API hard-delete khi đã có claim (backend-4 §4.5). */
  async deactivatePromotion(id: number) {
    await wait()
    const promo = state.promotions.find((x) => x.id === id)
    if (!promo) fail(`Event ${id} không tồn tại`, 404, 'not_found')
    promo.is_active = false
    promo.updated_at = nowIso()
    return { ...promo }
  },

  /* ================= users (FRONTEND-3 §5) ================= */

  async listUsers(q: AnyObj = {}) {
    await wait()
    let rows = [...state.users]
    if (q.q) {
      const needle = String(q.q).toLowerCase()
      rows = rows.filter((u) => [u.username, u.realname, u.email].some((v) => v && String(v).toLowerCase().includes(needle)))
    }
    const sort = q.sort || 'regdate'
    const dir = q.order === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      if (sort === 'id') return (a.id - b.id) * dir
      if (sort === 'username') return String(a.username).localeCompare(String(b.username)) * dir
      if (sort === 'lastlogin') return (isoMs(a.last_login) - isoMs(b.last_login)) * dir
      return (isoMs(a.registered_at) - isoMs(b.registered_at)) * dir
    })
    const page = Math.max(1, Number(q.page || 1))
    const size = Number(q.page_size || 20)
    return { total: rows.length, page, page_size: size, items: rows.slice((page - 1) * size, page * size) }
  },

  async getUser(id: number) {
    await wait()
    const u = state.users.find((x) => x.id === id)
    if (!u) fail('User không tồn tại', 404, 'not_found')
    const bank = state.bankDeposits.filter((d) => d.user_id === id)
    const cards = state.cardTx.filter((c) => c.user_id === id)
    const transfers = state.transfers.filter((t) => t.created_by === id)
    return {
      ...u,
      money_summary: {
        bank_deposits: {
          count: bank.length,
          sum_vnd_credited: bank.filter((d) => d.status === 'credited').reduce((s, d) => s + d.amount_vnd, 0),
          last_at: bank[0]?.created_at ?? null,
        },
        card_tx: {
          count: cards.length,
          sum_vnd_success: cards.filter((c) => c.status === 'success').reduce((s, c) => s + (c.real_amount || 0), 0),
          last_at: cards[0]?.created_at ?? null,
        },
        point_transfers: {
          count: transfers.length,
          sum_amount: transfers.filter((t) => t.status === 'completed').reduce((s, t) => s + t.amount, 0),
          last_at: transfers[0]?.created_at ?? null,
        },
      },
    }
  },

  /* ================= monitor mở rộng (FRONTEND-3 §8) ================= */

  async monitorUptimePeriods(serverName: string) {
    await wait()
    const base = findMonitor(serverName)
    const now = nowMs()
    const online = base.online
    return [
      { status: 'online', started_at_ms: now - 7 * 86_400_000, ended_at_ms: now - 6.7 * 86_400_000, duration_ms: 0.3 * 86_400_000, reason: 'boot', source: 'agent' },
      { status: 'offline', started_at_ms: now - 6.7 * 86_400_000, ended_at_ms: now - 6.65 * 86_400_000, duration_ms: 0.05 * 86_400_000, reason: 'crash', source: 'period-builder' },
      { status: 'online', started_at_ms: now - 6.65 * 86_400_000, ended_at_ms: now - 3.1 * 86_400_000, duration_ms: 3.55 * 86_400_000, reason: 'boot', source: 'agent' },
      { status: 'offline', started_at_ms: now - 3.1 * 86_400_000, ended_at_ms: now - 3.02 * 86_400_000, duration_ms: 0.08 * 86_400_000, reason: 'shutdown', source: 'agent' },
      { status: 'online', started_at_ms: now - 3.02 * 86_400_000, ended_at_ms: online ? null : now - 0.4 * 86_400_000, duration_ms: online ? now - (now - 3.02 * 86_400_000) : 2.62 * 86_400_000, reason: 'boot', source: 'agent' },
      ...(online ? [] : [{ status: 'offline', started_at_ms: now - 0.4 * 86_400_000, ended_at_ms: null, duration_ms: 0.4 * 86_400_000, reason: 'lost', source: 'period-builder' }]),
    ]
  },

  async monitorPlayersTop(serverName: string, limit = 20) {
    await wait()
    const rand = seededRandom(`${serverName}:top`)
    const names = ['Notch', 'Steve', 'Alex', 'ĐứcVK', 'MinhTom', 'pe_Sity', 'GamerPro2012', 'TrangXinh']
    return names.slice(0, Math.min(limit, names.length)).map((n) => ({
      player_name: n,
      player_uuid: uuid(),
      sessions: 1 + Math.floor(rand() * 40),
      seconds: Math.floor(rand() * 90 * 3600),
    }))
  },

  async monitorDisks(serverName: string) {
    await wait()
    const rand = seededRandom(`${serverName}:disk`)
    return ['/data', '/data/backups'].map((path) => {
      const total = 960 * 1024 ** 3
      const free = Math.floor(total * (0.2 + rand() * 0.6))
      return { path, ts_ms: nowMs(), total_bytes: total, free_bytes: free, usable_bytes: free, free_pct: Math.round((free / total) * 10000) / 100 }
    })
  },

  async monitorWorlds(serverName: string) {
    await wait()
    const rand = seededRandom(`${serverName}:world`)
    return [
      { world: 'world', ts_ms: nowMs() - 3_600_000, size_bytes: Math.floor((2 + rand() * 3) * 1024 ** 3) },
      { world: 'world_nether', ts_ms: nowMs() - 3_600_000, size_bytes: Math.floor((300 + rand() * 400) * 1024 ** 2) },
      { world: 'world_the_end', ts_ms: nowMs() - 3_600_000, size_bytes: Math.floor((100 + rand() * 200) * 1024 ** 2) },
      { world: 'world', ts_ms: nowMs() - 86_400_000 * 2, size_bytes: Math.floor((1.8 + rand() * 2) * 1024 ** 3) },
      { world: 'world_nether', ts_ms: nowMs() - 86_400_000 * 2, size_bytes: Math.floor((280 + rand() * 200) * 1024 ** 2) },
      { world: 'world_the_end', ts_ms: nowMs() - 86_400_000 * 2, size_bytes: Math.floor((90 + rand() * 100) * 1024 ** 2) },
    ]
  },

  async monitorSamples(serverName: string, q: AnyObj = {}) {
    await wait()
    const base = findMonitor(serverName)
    const count = Math.min(Number(q.limit || 50), 30)
    const items = Array.from({ length: count }, (_, i) => ({
      id: 9000 - i,
      kind: i % 3 === 0 ? 'heartbeat' : i % 3 === 1 ? 'perf' : 'system',
      boot_id: base.current_boot_id ?? 'boot-mock',
      seq: (base.last_seq ?? 500) - i * 5,
      ts_ms: nowMs() - i * 60_000,
      data: { sample: true, index: i, server: serverName },
    }))
    return { from_ms: nowMs() - count * 60_000, to_ms: nowMs(), total: 605, items }
  },

  async monitorBatches(serverName: string, limit = 50) {
    await wait()
    const base = findMonitor(serverName)
    return Array.from({ length: Math.min(Number(limit), 12) }, (_, i) => ({
      batch_id: uuid(),
      boot_id: base.current_boot_id ?? 'boot-mock',
      seq: (base.last_seq ?? 500) - i * 10,
      sent_at_ms: nowMs() - i * 120_000 - 900,
      received_at_ms: nowMs() - i * 120_000,
      record_count: 12 + (i % 5),
      accepted_count: 12 + (i % 5) - (i === 3 ? 2 : 0),
      rejected_count: i === 3 ? 2 : 0,
      replay: false,
      errors: i === 3 ? [{ index: 7, error: 'unknown metric kind: bogus' }] : null,
    }))
  },
}

/* ================= helpers mock FRONTEND-3 ================= */

function pagedAdmin(rows: AnyObj[], pageRaw: unknown, limitRaw: number) {
  const page = Math.max(1, Number(pageRaw || 1))
  const items = rows.slice((page - 1) * limitRaw, page * limitRaw)
  return { total: rows.length, page, limit: limitRaw, items: items.map((r) => ({ ...r })) }
}

const isoMs = (iso: string | null | undefined) => (iso ? new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime() : 0)

function findBankDeposit(id: number): AnyObj {
  const d = state.bankDeposits.find((x) => x.id === id)
  if (!d) fail(`Giao dịch ngân hàng không tồn tại (id=${id})`, 404, 'not_found')
  return d
}

function findGameMode(modeId: number): AnyObj {
  const m = state.gameModes.find((x) => x.id === modeId)
  if (!m) fail(`Không tìm thấy máy chủ id=${modeId}`, 404, 'not_found')
  return m
}

/**
 * Validation theo backend-4 §4.2: field bắt buộc + "duy nhất 1 event active
 * trên cùng kênh tại 1 thời điểm" (card∩bank không chặn nhau, 'all' chặn hết)
 * → 409 Conflict nêu rõ event xung đột (message showApiError hiển thị thẳng).
 */
function validatePromotion(input: AnyObj, excludeId: number | null) {
  const name = String(input.name ?? '').trim()
  if (!name) fail('name là bắt buộc', 422, 'validation_error')
  const appliesTo = String(input.applies_to ?? 'all')
  if (!['card', 'bank', 'all'].includes(appliesTo)) fail('applies_to phải là card|bank|all', 422, 'validation_error')
  const bonus = Number(input.bonus_percent)
  if (!Number.isFinite(bonus) || bonus <= 0 || bonus > 500) fail('bonus_percent phải trong (0, 500]', 422, 'validation_error')
  const startsAt = String(input.starts_at ?? '').slice(0, 19)
  const endsAt = String(input.ends_at ?? '').slice(0, 19)
  if (!startsAt || !endsAt) fail('starts_at/ends_at là bắt buộc', 422, 'validation_error')
  if (startsAt >= endsAt) fail('starts_at phải trước ends_at', 422, 'validation_error')
  const maxUsers = Number(input.max_users)
  if (!Number.isFinite(maxUsers) || maxUsers < 1) fail('max_users phải ≥ 1', 422, 'validation_error')
  const isActive = input.is_active !== false
  if (isActive) {
    const sharesChannel = (a: string, b: string) => a === 'all' || b === 'all' || a === b
    const clash = state.promotions.find(
      (x) => x.id !== excludeId && x.is_active && sharesChannel(String(x.applies_to), appliesTo) && !(x.ends_at <= startsAt || x.starts_at >= endsAt),
    )
    if (clash) fail(`Trùng thời gian với event '#${clash.id} ${clash.name}'`, 409, 'conflict')
  }
  return {
    name,
    applies_to: appliesTo,
    bonus_percent: bonus,
    starts_at: startsAt,
    ends_at: endsAt,
    max_users: maxUsers,
    max_per_user: Math.max(1, Number(input.max_per_user ?? 1)),
    is_active: isActive,
  }
}

/* ---------------- misc helpers ---------------- */

function assertKind(kind: string) {
  if (kind !== 'monitor' && kind !== 'points') fail('kind phải là monitor|points', 400, 'bad_request')
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
const round2 = (v: number) => Math.round(v * 100) / 100
const round4 = (v: number) => Math.round(v * 10000) / 10000
