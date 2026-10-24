/**
 * Sinh dữ liệu chi tiết máy chủ cho slug bất kỳ (chỉ dùng ở development).
 *
 * Deterministic: cùng slug → cùng dữ liệu ở mọi lần reload.
 * Cách làm: hash slug (FNV-1a) → seed PRNG (mulberry32) → chọn template trong
 * `machineListPageMock` và biến đổi ổn định.
 */

import { machineListPageMock } from './pages'

const TAGLINES = ['Khám phá thế giới', 'Cộng đồng AE', 'Thử thách mới', 'Phiêu lưu bất tận']
const DIFFICULTIES = ['Dễ', 'Trung bình', 'Khó']
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

/** Xoay vòng mảng theo offset — vẫn giữ đủ phần tử, không trùng. */
const rotate = (list, offset) => {
  if (!Array.isArray(list) || list.length === 0) return []
  const start = offset % list.length
  return [...list.slice(start), ...list.slice(0, start)]
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
  const playersOnline = 20 + Math.floor(rnd() * 380)
  const highlights = rotate(base.highlights ?? [], hash).slice(0, 3)
  const features = rotate(base.features ?? [], hash).slice(0, 5)
  const images = rotate(base.images ?? [], hash)

  return {
    slug: normalized,
    name,
    tagline: pick(TAGLINES),
    short_desc: `Máy chủ ${name} dành cho cộng đồng AE — khám phá, xây dựng và cạnh tranh.`,
    desc: `${name} là một máy chủ giả lập được tạo tự động trong môi trường development. Nội dung minh hoạ dựa trên mẫu ${base.name ?? 'máy chủ'} để kiểm tra giao diện chi tiết với mọi slug.`,
    status: pick(STATUSES),
    players_online: playersOnline,
    difficulty: pick(DIFFICULTIES),
    features,
    highlights,
    images,
    rules: base.rules ?? [],
    commands: base.commands ?? [],
    gallery: images.slice(0, 2),
  }
}

export default generateMachineDetail