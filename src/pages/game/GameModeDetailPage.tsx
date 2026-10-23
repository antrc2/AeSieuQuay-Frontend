import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Toast from '@/components/ui/Toast'
import { gameModesMock } from '@/mock-data/game-modes'
import { home_mock } from '@/mock-data/home'
import { cn } from '@/lib/utils'

const highlights = [
  { icon: 'shield', title: 'Ổn định', desc: 'Máy chủ ổn định, tối ưu ping Việt Nam' },
  { icon: 'users', title: 'Cộng đồng AE', desc: 'Nhiều hoạt động, sự kiện thường xuyên' },
  { icon: 'gift', title: 'Phần thưởng', desc: 'Nhiều quà tặng khi tham gia' },
]

export const GameModeDetailPage = () => {
  const { slug } = useParams()
  const mode = gameModesMock.list.modes.find((m) => m.slug === slug)
  const [playModalOpen, setPlayModalOpen] = useState(false)
  const [ipCopied, setIpCopied] = useState(false)

  const copyIp = async () => {
    try {
      await navigator.clipboard.writeText(home_mock.server_info.ip)
    } catch {
      const el = document.createElement('textarea')
      el.value = home_mock.server_info.ip
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setIpCopied(true)
    setTimeout(() => setIpCopied(false), 2000)
  }

  if (!mode) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <Header />
        <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Không tìm thấy máy chủ</h1>
          <p className="mt-2 text-muted">Máy chủ này không tồn tại hoặc đã bị gỡ.</p>
          <Link
            to="/may-chu"
            className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white"
          >
            Quay lại danh sách máy chủ
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={mode.images?.[0]} alt="" className="h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,transparent,rgba(0,0,0,0.9))]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/60 to-bg" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
            <Link to="/may-chu" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Quay lại danh sách
            </Link>
            <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {mode.tagline}
                  </span>
                  <span className="rounded-full border border-border-c px-3 py-1 text-xs text-muted">
                    {mode.players_online} người chơi
                  </span>
                  <span className="rounded-full border border-border-c px-3 py-1 text-xs text-muted">
                    Độ khó: {mode.difficulty}
                  </span>
                </div>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{mode.name}</h1>
                <p className="mt-4 max-w-2xl text-lg text-muted">{mode.desc}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPlayModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-strong"
                  >
                    Chơi ngay
                  </button>
                  <a
                    href={home_mock.hero.discord_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-border-c bg-surface px-8 py-3 text-base font-semibold transition-all hover:bg-surface-2"
                  >
                    Tham gia Discord
                  </a>
                </div>
              </div>
              <div className="overflow-hidden rounded-3xl border border-border-c shadow-2xl shadow-black/40">
                <img src={mode.images?.[1] || mode.images?.[0]} alt={mode.name} className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Tính năng nổi bật</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {mode.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-3 rounded-2xl border border-border-c p-4">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">✓</span>
                    <p className="font-medium">{feat}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Ưu điểm khi chơi</h2>
              <div className="mt-6 grid gap-4">
                {highlights.map((h) => (
                  <div key={h.title} className="flex items-start gap-4 rounded-2xl border border-border-c p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">{h.title}</h3>
                      <p className="mt-1 text-sm text-muted">{h.desc}</p>
                    </div>
                  </div>
                ))}
                {mode.highlights?.map((h) => (
                  <div key={h.title} className="flex items-start gap-4 rounded-2xl border border-border-c p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">{h.title}</h3>
                      <p className="mt-1 text-sm text-muted">{h.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Lệnh hữu ích</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {mode.commands?.map((cmd) => (
                  <code key={cmd} className="rounded-lg border border-border-c px-3 py-1.5 text-sm">
                    {cmd}
                  </code>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-border-c bg-surface p-6 sm:p-8">
              <h2 className="text-2xl font-bold">Quy định máy chủ</h2>
              <ul className="mt-4 space-y-2">
                {mode.rules?.map((rule) => (
                  <li key={rule} className="flex items-start gap-3 text-muted">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {playModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setPlayModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border-c bg-surface p-6 text-center shadow-2xl shadow-black/40 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-bold">Tham gia {mode.name}</h3>
            <p className="mt-2 text-sm text-muted">Sao chép IP và thêm vào Minecraft của bạn</p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border-c bg-surface-2 px-4 py-2.5">
              <code className="flex-1 text-center font-mono text-sm">{home_mock.server_info.ip}</code>
              <button
                type="button"
                onClick={copyIp}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Sao chép
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setPlayModalOpen(false)}
                className="rounded-xl border border-border-c px-6 py-2.5 text-sm font-semibold"
              >
                Đóng
              </button>
              <Link to="/dang-ky" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white">
                Tạo tài khoản
              </Link>
            </div>
          </div>
        </div>
      )}
      {ipCopied && <Toast message="Đã sao chép IP server!" type="success" />}
    </div>
  )
}

export default GameModeDetailPage
