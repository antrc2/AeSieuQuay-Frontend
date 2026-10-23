import { Link } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { gameModesMock } from '@/mock-data/game-modes'
import { cn } from '@/lib/utils'

const statusStyle: Record<string, string> = {
  hot: 'bg-red-500/10 text-red-400 border-red-500/30',
  new: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  normal: 'bg-primary/10 text-primary border-primary/30',
}

const StatusBadge = ({ status }: { status: string }) => {
  if (!status || status === 'normal') return null
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusStyle[status])}>
      {status === 'hot' ? 'HOT' : status === 'new' ? 'MỚI' : status.toUpperCase()}
    </span>
  )
}

export const GameModesListPage = () => {
  const data = gameModesMock.list

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(30,144,255,0.25),transparent)]" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-24">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                <span className="text-gradient-brand">{data.title}</span>
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{data.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.modes.map((mode) => (
              <Link
                key={mode.slug}
                to={`/che-do-choi/${mode.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-border-c bg-surface transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={mode.images?.[0]}
                    alt={mode.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <StatusBadge status={mode.status} />
                  </div>
                  <div className="absolute right-4 top-4 rounded-full border border-border-c bg-surface/80 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                    {mode.players_online} đang online
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-primary">{mode.tagline}</p>
                      <h3 className="mt-1 text-xl font-bold">{mode.name}</h3>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted">{mode.short_desc}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {mode.features.slice(0, 3).map((feat) => (
                      <span
                        key={feat}
                        className="rounded-full border border-border-c px-2.5 py-1 text-xs text-muted"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Xem chi tiết
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default GameModesListPage
