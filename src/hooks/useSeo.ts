import { useEffect } from 'react'
import { SITE_URL } from '@/config/env'

export type SeoInput = {
  title: string
  description?: string
  /** Đường dẫn canonical (mặc định: pathname hiện tại). */
  path?: string
  noindex?: boolean
  ogType?: 'website' | 'article'
  ogImage?: string
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>
}

const SITE_NAME = 'AeSieuQuay'
const ABSOLUTE_URL_RE = /^https?:\/\//i

const siteBase = () => {
  if (SITE_URL) return SITE_URL
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

const absoluteUrl = (value?: string) => {
  if (!value) return ''
  if (ABSOLUTE_URL_RE.test(value)) return value
  return `${siteBase()}${value.startsWith('/') ? value : `/${value}`}`
}

const canonicalPath = (path?: string) => {
  const raw = path || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const clean = raw.split('?')[0].split('#')[0]
  if (clean === '/') return '/'
  return clean.replace(/\/+$/, '') || '/'
}

const upsertMeta = (attr: 'name' | 'property', key: string, content?: string) => {
  if (!content) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const upsertLink = (rel: string, href?: string) => {
  if (!href) return
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const removeLink = (rel: string) => {
  document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.remove()
}

/**
 * Cập nhật SEO client-side: title, description, canonical, OG/Twitter, robots,
 * JSON-LD. Chỉ upsert các thẻ đã có (backend SSR) — không tạo trùng.
 * JSON-LD do hook tạo được dọn khi unmount/đổi trang.
 */
export const useSeo = ({
  title,
  description,
  path,
  noindex = false,
  ogType = 'website',
  ogImage,
  jsonLd,
}: SeoInput) => {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (title) document.title = title

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    // Trang noindex (404/403/500) không nên có canonical trừ khi được chỉ định rõ.
    const canonical = `${siteBase()}${canonicalPath(path)}`
    if (path || !noindex) {
      upsertLink('canonical', canonical)
    } else {
      removeLink('canonical')
    }

    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:locale', 'vi_VN')
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', absoluteUrl(ogImage))

    upsertMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', absoluteUrl(ogImage))

    // JSON-LD: chỉ dọn các node do hook này tạo.
    const parsed = jsonLdKey
      ? (JSON.parse(jsonLdKey) as Record<string, unknown> | Array<Record<string, unknown>>)
      : []
    const schemas = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
    const nodes: HTMLScriptElement[] = []

    schemas.forEach((schema) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-seo-jsonld', 'true')
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
      nodes.push(script)
    })

    return () => {
      nodes.forEach((node) => node.remove())
    }
  }, [title, description, path, noindex, ogType, ogImage, jsonLdKey])
}

export default useSeo