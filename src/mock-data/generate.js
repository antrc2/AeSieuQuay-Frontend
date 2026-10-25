/**
 * Sinh dữ liệu chi tiết máy chủ cho slug bất kỳ (chỉ dùng ở development).
 *
 * Deterministic: cùng slug → cùng dữ liệu ở mọi lần reload.
 * Cách làm: hash slug (FNV-1a) → seed PRNG (mulberry32) → chọn template trong
 * `machineListPageMock` và biến đổi ổn định.
 *
 * Shape mới (backend.md 0.1): không còn features/highlights/rules/commands/
 * difficulty/players_online — nội dung dài nằm trong `content_html`,
 * số liệu động nằm trong `stats`.
 */

import { machineListPageMock } from './pages'

const TAGLINES = ['Khám phá thế giới', 'Cộng đồng AE', 'Thử thách mới', 'Phiêu lưu bất tận']
const STATUSES = ['normal', 'new', 'hot']

/** FNV-1a 32-bit — ổn định, không phụ thuộc thứ tự. */
const fnv1a = (value) => {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** PRNG nhỏ, seed cố định để kết quả lặp lại được. */
const mulberry32 = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 'dao-muoi' → 'Dao Muoi' */
const humanizeSlug = (slug) => {
  const words = slug.split(/[-_\s]+/).filter(Boolean)
  if (!words.length) return 'Máy chủ mới'
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}


/**
 * @param {string} slug
 * @returns {import('@/data/contract').MachineDetailPayload}
 */
export const generateMachineDetail = (slug) => {
  const normalized = String(slug ?? '').trim().toLowerCase()
  const modes = machineListPageMock.modes ?? []
  const hash = fnv1a(normalized || 'may-chu')
  const rnd = mulberry32(hash)
  const base = modes[hash % Math.max(modes.length, 1)] ?? {}
  const name = humanizeSlug(normalized)

  const pick = (list) => list[Math.floor(rnd() * list.length)]
  const image = base.image ?? null
  const players = 20 + Math.floor(rnd() * 380)
  const max = 200 + Math.floor(rnd() * 8) * 50
  const tps = 17 + rnd() * 3
  const uptime = 90 + rnd() * 10

  // Nội dung dài mock — cùng template prose với trang có content_html.
  const contentHtml = `
<h2>${name}</h2>
<p>Máy chủ giả lập cho slug <code>${normalized || '—'}</code> — dev chỉ, để test giao diện chi tiết với mọi slug. Ở production nội dung này do admin soạn trong <b>/admin/game-modes</b>.</p>
${image ? `<img src="${image}" alt="${name}" loading="lazy" class="rounded-xl w-full" />` : ''}
<div class="grid gap-4 md:grid-cols-2">
  <div class="rounded-xl border border-border-c bg-surface p-4">
    <h3 class="font-bold">Lối chơi</h3>
    <p class="text-sm text-muted">Nội dung minh hoạ sinh tự động, deterministic theo slug.</p>
  </div>
  <div class="rounded-xl border border-border-c bg-surface p-4">
    <h3 class="font-bold">Cộng đồng</h3>
    <p class="text-sm text-muted">Kiểm tra dark mode + safelist class.</p>
  </div>
</div>
`

  return {
    slug: normalized,
    name,
    tagline: pick(TAGLINES),
    short_desc: `Máy chủ ${name} dành cho cộng đồng AE — khám phá, xây dựng và cạnh tranh.`,
    status: pick(STATUSES),
    image,
    images: image ? [image] : [],
    cluster: { id: 1 },
    stats: {
      cluster: { id: 1, slug: 'aesq', name: 'AESQ Network' },
      scope: `group:${normalized}`,
      status: 'online',
      updated_at_ms: Date.now(),
      players: { online: players, max },
      tps: { avg_1m: Number(tps.toFixed(2)) },
      uptime: { percent_7d: Number(uptime.toFixed(2)), window_hours: 168 },
      servers: { total: 2, online: 2 },
      server_status: [
        {
          server_key: normalized,
          name,
          role: 'game',
          online: true,
          maintenance: false,
          players_online: players,
          players_max: max,
        },
      ],
    },
    content_html: contentHtml,
  }
}

export default generateMachineDetail