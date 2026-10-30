import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard } from 'lucide-react'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getTopupPageData } from '@/data'
import { BANK_QR_BASE_URL, BANK_RECEIVING_FALLBACK, BANK_VND_PER_XU_FALLBACK } from '@/data/site'
import { CARD_TELCO_OPTIONS, DEFAULT_TELCO, formatCardValue, getCardValues, telcoLabel } from '@/data/card-options'
import type { BankDepositRow, CardFeeValue, CardTxRow, PromotionBanner, TopupPayload } from '@/data/contract'
import useAuth from '@/hooks/useAuth'
import { apiPost } from '@/api/client'
import { getMyBankDeposits, getMyCardHistory } from '@/api/admin'
import { showApiError, showSuccess } from '@/utils/swal'
import { Badge } from '@/components/ui/badge'
import DepositStatusBadge from '@/components/admin/DepositStatusBadge'
import { cn } from '@/lib/utils'
import { fmtDateTimeMs, fmtIsoVN, fmtVnd, fmtXu, isoToMs } from '@/lib/format'

/** FRONTEND-4 §2 — trang /nap-the đọc 100% window.DATA (biểu phí + bank + KM + lịch sử).
 *  Layout mới (chốt 27/10): 2 block thanh toán LUÔN hiển thị song song (grid 2 cột,
 *  mobile xếp chồng) — KHÔNG còn tab chuyển Thẻ cào ↔ Chuyển khoản; lịch sử bên dưới.
 *  API còn lại CHỈ là action (`POST /card/charge`, `POST /card/check`) +
 *  poll NGẮN giao dịch vừa action (card 10s×18, bank 20s×9) rồi DỪNG. */

type CardFormErrors = {
  telco?: string
  amount?: string
  code?: string
  serial?: string
  form?: string
}

interface TelcoView {
  telco: string
  label: string
  values: CardFeeValue[]
}

/* Fallback khi payload.card.telcos rỗng (cổng lỗi — backend-4 §2.2): card-options.js cũ, phí 0 → có cảnh báo. */
const fallbackTelcos = (vndPerXu: number): TelcoView[] =>
  CARD_TELCO_OPTIONS.map((o) => ({
    telco: o.telco,
    label: telcoLabel(o.telco),
    values: getCardValues(o.telco).map((amount) => ({
      amount,
      fee_percent: 0,
      real_receive_vnd: amount,
      xu: vndPerXu > 0 ? Math.floor(amount / vndPerXu) : 0,
    })),
  }))

const PROMOTION_CHANNEL: Record<PromotionBanner['applies_to'], string> = {
  card: 'Thẻ cào',
  bank: 'Chuyển khoản',
  all: 'Mọi kênh nạp',
}

/* ================= Block khuyến mãi (FRONTEND-4 §2) ================= */

const PromotionStrip = ({ promo }: { promo: PromotionBanner }) => (
  <div className="mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="text-xl" aria-hidden>
        🎁
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold text-fg">
        {promo.name} — <span className="text-amber-500">+{promo.bonus_percent}% Xu</span>
        <span className="ml-2 font-normal text-muted">({PROMOTION_CHANNEL[promo.applies_to]})</span>
      </p>
      <p className="text-xs tabular-nums text-muted">Kết thúc: {fmtIsoVN(promo.ends_at)}</p>
      <Badge variant={promo.applied ? 'default' : 'success'}>
        {promo.applied ? 'Bạn đã nhận ưu đãi' : promo.slots_left === null ? 'Còn suất' : `Còn ${promo.slots_left} suất`}
      </Badge>
    </div>
  </div>
)

/* ================= Block lịch sử nạp của bạn (FRONTEND-4 §2.3) ================= */

const BonusChip = ({ bonus }: { bonus: number }) => (
  <Badge variant="success" className="text-[10px]" title="Thưởng khuyến mãi nạp">
    +{bonus.toLocaleString('vi-VN')} Xu KM
  </Badge>
)

/** Badge card theo §2.3: pending info-pulse · success+in_game xanh · success+!in_game info · failed/error danger. */
const CardHistoryBadge = ({ t }: { t: CardTxRow }) => {
  if (t.status === 'pending')
    return (
      <Badge variant="brand" className="animate-pulse" title="Cổng đang xử lý, tối thiểu 1–3 phút">
        chờ cổng
      </Badge>
    )
  if (t.status === 'success')
    return t.in_game ? (
      <Badge variant="success">đã vào game</Badge>
    ) : (
      <Badge variant="brand" title="Cổng đã ghi nhận — hàng đợi cộng Xu của lobby đang chạy">
        Đã ghi nhận, cộng Xu trong phút giây
      </Badge>
    )
  return (
    <Badge variant="danger" title={t.gateway_message ?? undefined}>
      {t.status}
    </Badge>
  )
}

const CardHistoryRow = ({ t }: { t: CardTxRow }) => (
  <li className="flex items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-fg">
        {fmtVnd(t.amount_vnd)} <span className="font-normal text-muted">→ {fmtXu(t.xu_amount)}</span>
        {t.bonus_xu != null && t.bonus_xu > 0 && <span className="ml-1.5 inline-flex align-middle"><BonusChip bonus={t.bonus_xu} /></span>}
      </p>
      <p className="text-xs text-muted">
        Thẻ {telcoLabel(t.telco)}
        {t.serial ? ` · seri ${t.serial.slice(-6)}` : ''}
        {t.card_code_masked ? ` · ${t.card_code_masked}` : ''} · {fmtIsoVN(t.created_at)}
      </p>
      {t.status === 'pending' && <p className="mt-0.5 text-xs text-muted">Cổng đang xử lý, tối thiểu 1–3 phút.</p>}
      {t.status === 'failed' || t.status === 'error' ? (
        <p className="mt-0.5 text-xs text-red-500">{t.gateway_message ?? 'Giao dịch thất bại'}</p>
      ) : null}
    </div>
    <CardHistoryBadge t={t} />
  </li>
)

/** Row bank — badge dùng chung với admin qua DepositStatusBadge (frontend-3 §2.2 tách ra). */
const BankHistoryRow = ({ d }: { d: BankDepositRow }) => (
  <li className="flex items-center justify-between gap-3 py-3">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-fg">
        {fmtVnd(d.amount_vnd)} <span className="font-normal text-muted">→ {fmtXu(d.xu_amount)}</span>
        {d.bonus_xu != null && d.bonus_xu > 0 && <span className="ml-1.5 inline-flex align-middle"><BonusChip bonus={d.bonus_xu} /></span>}
      </p>
      <p className="text-xs text-muted">
        Chuyển khoản bank · {d.reference_code ? `mã GD ${d.reference_code}` : d.content} · {fmtDateTimeMs(d.transaction_date_ms)}
      </p>
      {d.credit_command_error && (
        <p className="mt-0.5 text-xs text-amber-500">
          Lỗi cộng game: {d.credit_command_error} — cần hỗ trợ? đưa mã {d.reference_code ?? d.id} cho admin Discord.
        </p>
      )}
    </div>
    <span className="shrink-0">
      <DepositStatusBadge deposit={d} />
    </span>
  </li>
)

type HistoryEntry = { kind: 'card'; at: number; row: CardTxRow } | { kind: 'bank'; at: number; row: BankDepositRow }

const HistoryBlock = ({
  data,
  liveCard,
  liveBank,
  isLoggedIn,
}: {
  data: TopupPayload
  liveCard: CardTxRow[]
  liveBank: BankDepositRow[]
  isLoggedIn: boolean
}) => {
  const rows = useMemo<HistoryEntry[]>(() => {
    // Merge theo id: dữ liệu poll đè dữ liệu SSR (cùng request_id/id → bản mới hơn).
    const cardMap = new Map<string, CardTxRow>()
    for (const r of data.my?.card_history ?? []) cardMap.set(r.request_id, r)
    for (const r of liveCard) cardMap.set(r.request_id, r)
    const bankMap = new Map<number, BankDepositRow>()
    for (const r of data.my?.bank_history ?? []) bankMap.set(r.id, r)
    for (const r of liveBank) bankMap.set(r.id, r)
    return [
      ...[...cardMap.values()].map((r): HistoryEntry => ({ kind: 'card', at: isoToMs(r.created_at), row: r })),
      ...[...bankMap.values()].map((r): HistoryEntry => ({ kind: 'bank', at: r.transaction_date_ms ?? 0, row: r })),
    ].sort((a, b) => b.at - a.at)
  }, [data.my, liveCard, liveBank])

  const guest = !isLoggedIn

  return (
    <section className="relative mt-8 overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
      <div className={cn('p-6 sm:p-8', guest && 'pointer-events-none select-none opacity-40 blur-[6px]')} aria-hidden={guest || undefined}>
        <h2 className="text-xl font-bold">Lịch sử nạp của bạn</h2>
        <p className="mt-0.5 text-sm text-muted">10 giao dịch gần nhất · thẻ cào + chuyển khoản, mới nhất trước.</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Chưa có giao dịch nào.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {rows.map((entry) =>
              entry.kind === 'card' ? (
                <CardHistoryRow key={`c-${entry.row.request_id}`} t={entry.row} />
              ) : (
                <BankHistoryRow key={`b-${entry.row.id}`} d={entry.row} />
              ),
            )}
          </ul>
        )}
      </div>

      {/* Khách: overlay blur + login CTA — KHÔNG redirect (giữ nguyên principle trang public). */}
      {guest && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/30 p-4 text-center backdrop-blur-[2px]">
          <span className="text-3xl">🔒</span>
          <p className="text-sm font-semibold text-fg">Đăng nhập để xem lịch sử nạp</p>
          <a
            href="/dang-nhap"
            className="mt-1 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
          >
            Đăng nhập
          </a>
        </div>
      )}
    </section>
  )
}

/* ================= Trang ================= */

export const NapThePage = () => {
  const result = getTopupPageData()
  const { user, loading: authLoading } = useAuth()

  const [cardForm, setCardForm] = useState({ telco: DEFAULT_TELCO, amount: '', card_code: '', card_serial: '' })
  const [submittingCard, setSubmittingCard] = useState(false)
  const [checking, setChecking] = useState(false)
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [errors, setErrors] = useState<CardFormErrors>({})

  /* Data "sống" từ poll sau action — merge đè window.DATA theo request_id/id. */
  const [liveCard, setLiveCard] = useState<CardTxRow[]>([])
  const [liveBank, setLiveBank] = useState<BankDepositRow[]>([])
  const [cardPolling, setCardPolling] = useState(false)
  const [bankPolling, setBankPolling] = useState(false)
  const cardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bankTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearErrors = () => setErrors({})

  const stopCardPoll = useCallback(() => {
    if (cardTimerRef.current) clearInterval(cardTimerRef.current)
    cardTimerRef.current = null
    setCardPolling(false)
  }, [])

  const stopBankPoll = useCallback(() => {
    if (bankTimerRef.current) clearInterval(bankTimerRef.current)
    bankTimerRef.current = null
    setBankPolling(false)
  }, [])

  useEffect(() => () => {
    if (cardTimerRef.current) clearInterval(cardTimerRef.current)
    if (bankTimerRef.current) clearInterval(bankTimerRef.current)
  }, [])

  /* ===== mọi giá trị phái sinh + hook phải chạy TRƯỚC early return (rules of hooks) ===== */
  const data = result.status === 'ok' ? result.data : null

  const vndPerXu = data?.card?.vnd_per_xu || data?.bank?.vnd_per_xu || BANK_VND_PER_XU_FALLBACK
  // §2.1: telcos rỗng (cổng lỗi) → fallback card-options.js + inline warning.
  const feeDegraded = Boolean(data) && !(data.card?.telcos?.length > 0)
  const telcos: TelcoView[] = !data ? [] : feeDegraded ? fallbackTelcos(vndPerXu) : data.card.telcos.map((t) => ({ telco: t.telco, label: t.label || telcoLabel(t.telco), values: t.values }))

  const currentTelco = telcos.find((o) => o.telco === cardForm.telco) ?? telcos[0]
  const amountOptions = currentTelco?.values ?? []
  const selectedFee = amountOptions.find((v) => v.amount === Number(cardForm.amount))

  const knownBankIds = useMemo(() => new Set((data?.my?.bank_history ?? []).map((d) => d.id)), [data])

  /* amount khởi tạo/lại khi đổi nhà mạng — dùng effect để không làm trong render. */
  useEffect(() => {
    const values = amountOptions.map((v) => v.amount)
    if (!values.length) {
      setCardForm((s) => (s.amount === '' ? s : { ...s, amount: '' }))
      return
    }
    setCardForm((s) => (values.includes(Number(s.amount)) ? s : { ...s, amount: String(values[0]) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi danh sách nhà mạng thật sự đổi
  }, [currentTelco?.telco, amountOptions.length])

  if (result.status !== 'ok' || !data) {
    return (
      <SiteLayout
        seo={{
          title: 'Nạp thẻ — SV AeSieuQuay',
          description: 'Nạp thẻ vào tài khoản AeSieuQuay.',
          path: '/nap-the',
          noindex: true,
        }}
      >
        <DataUnavailable title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined} />
      </SiteLayout>
    )
  }

  const description = data.subtitle || 'Nạp thẻ vào tài khoản AeSieuQuay nhanh chóng và an toàn.'
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Nguồn đăng nhập DUY NHẤT là useAuth (cookie JWT thật).
  // KHÔNG suy ra từ data.my — mock/dev có `my` giả, và key thiếu (undefined !== null)
  // từng khiến khách bị tính là đã login → QR không blur (fix 29/10).
  const isLoggedIn = Boolean(user)
  const canTopup = !authLoading && isLoggedIn
  // Chỉ lấy từ phiên đăng nhập THẬT (user) — không fallback data.my (mock/dev có `my` giả).
  const realname = (typeof user?.realname === 'string' && user.realname.trim())
    || (typeof user?.username === 'string' && user.username.trim())
    || ''

  /* VietQR chuẩn cứng (chốt 27/10): OCB-HNC61025015012, accountName NGUYEN NGOC AN.
   * Ưu tiên build từ payload.bank.receiving; thiếu → BANK_QR_BASE_URL fallback (site.js). */
  const rcv = data.bank?.receiving
  const qrBase = rcv?.account_number
    ? `https://img.vietqr.io/image/${encodeURIComponent(String(rcv.bank || BANK_RECEIVING_FALLBACK.bank).replace(/\s+/g, '').toUpperCase())}-${rcv.account_number}-compact2.svg`
    : BANK_QR_BASE_URL
  const qrAccountName = rcv?.account_name || BANK_RECEIVING_FALLBACK.account_name
  const qrUrl = `${qrBase}?addInfo=${encodeURIComponent(realname || '')}&accountName=${encodeURIComponent(qrAccountName)}`

  const onTelcoChange = (telco: string) => {
    clearErrors()
    setCardForm((s) => {
      const values = telcos.find((o) => o.telco === telco)?.values ?? []
      return { ...s, telco, amount: values.length ? String(values[0].amount) : '' }
    })
  }

  /* §2.1 poll sau charge: GET /card/history?page=1&page_size=5 mỗi 10s, tối đa 18 lần (3'),
   * bắt được terminal thì DỪNG + toast. §0: poll chỉ cho giao dịch vừa action. */
  const startCardPoll = (requestId: string) => {
    stopCardPoll()
    let tries = 0
    let busy = false
    setCardPolling(true)
    cardTimerRef.current = setInterval(async () => {
      if (busy) return
      busy = true
      tries += 1
      try {
        const res = await getMyCardHistory({ page: 1, page_size: 5 })
        const rows: CardTxRow[] = res?.items ?? []
        if (rows.length) setLiveCard(rows)
        const mine = rows.find((r) => r.request_id === requestId)
        if (mine && mine.status !== 'pending') {
          stopCardPoll()
          if (mine.status === 'success') {
            await showSuccess(
              mine.in_game ? 'Nạp thành công — Xu đã vào game' : 'Thẻ thành công',
              mine.in_game ? `${fmtXu(mine.xu_amount)} đã được cộng.` : 'Xu sẽ vào trong ít phút (hàng đợi lobby).',
            )
          } else {
            await showApiError({ message: mine.gateway_message ?? 'Giao dịch thẻ thất bại' } as Error, 'Thẻ không thành công')
          }
        }
      } catch {
        /* lỗi mạng transient — giữ poll tới khi hết 18 lần */
      } finally {
        busy = false
        if (tries >= 18) stopCardPoll()
      }
    }, 10_000)
  }

  const onSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: CardFormErrors = {}
    if (!isLoggedIn) nextErrors.form = 'Vui lòng đăng nhập để nạp thẻ.'
    if (!data.card?.enabled) nextErrors.form = nextErrors.form ?? 'Cổng thẻ cào đang tạm tắt.'
    if (!telcos.some((o) => o.telco === cardForm.telco)) nextErrors.telco = 'Vui lòng chọn nhà mạng.'

    const code = cardForm.card_code.trim()
    const serial = cardForm.card_serial.trim()
    const amount = Number(cardForm.amount)
    if (!code) nextErrors.code = 'Vui lòng nhập mã thẻ.'
    if (!serial) nextErrors.serial = 'Vui lòng nhập seri thẻ.'
    if (!Number.isFinite(amount) || !amountOptions.some((v) => v.amount === amount)) nextErrors.amount = 'Vui lòng chọn mệnh giá hợp lệ.'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmittingCard(true)
    setCheckMsg(null)
    try {
      const res = await apiPost('/card/charge', { telco: cardForm.telco, amount, serial, code })
      const requestId: string | null = res?.data?.request_id ?? null
      setLastRequestId(requestId)
      const statusName = res?.data?.status_name ? ` (${res.data.status_name})` : ''
      setCheckMsg({ ok: true, text: `${res?.message || 'Đã gửi thẻ'}${statusName}` })
      if (requestId) {
        // §2.1: row tạm pending ngay đầu lịch sử (match request_id) + poll 10s×18.
        setLiveCard((prev) => [
          {
            request_id: requestId,
            telco: cardForm.telco,
            amount_vnd: amount,
            xu_amount: null,
            status: 'pending',
            gateway_message: null,
            in_game: false,
            serial,
            created_at: new Date().toISOString(),
          },
          ...prev.filter((r) => r.request_id !== requestId),
        ])
        startCardPoll(requestId)
      }
      setCardForm((s) => ({ ...s, card_code: '', card_serial: '' }))
    } catch (err) {
      await showApiError(err, 'Nạp thẻ thất bại')
    } finally {
      setSubmittingCard(false)
    }
  }

  /* "Kiểm tra" sau khi gửi — cổng cho tra lại ĐÚNG request_id (idempotent). */
  const onCheck = async () => {
    if (!lastRequestId) return
    setChecking(true)
    try {
      const res = await apiPost('/card/check', { request_id: lastRequestId })
      const d = res?.data
      const label = d?.finalized ? (d?.status === 1 ? 'Thẻ thành công' : `Kết quả: ${d?.status_name ?? d?.message ?? d?.status}`) : 'Vẫn đang xử lý'
      setCheckMsg({ ok: d?.status === 1 || !d?.finalized, text: `${label}${d?.user_receive ? ` · thực nhận ${fmtVnd(d.user_receive)}` : ''}` })
      if (d?.finalized) {
        stopCardPoll()
        const polled = await getMyCardHistory({ page: 1, page_size: 5 }).catch(() => null)
        if (polled?.items?.length) setLiveCard(polled.items as CardTxRow[])
      }
    } catch (err) {
      await showApiError(err, 'Kiểm tra thất bại')
    } finally {
      setChecking(false)
    }
  }

  /* §2.2 poll bank: bấm "Chuyển xong? Kiểm tra" → GET /bank/deposits?limit=5 mỗi 20s, 9 lần,
   * thấy row mới (id chưa có trong SSR — knownBankIds ở trên) thì DỪNG. */
  const onCheckBank = () => {
    if (bankPolling) {
      stopBankPoll()
      return
    }
    let tries = 0
    let busy = false
    setBankPolling(true)
    bankTimerRef.current = setInterval(async () => {
      if (busy) return
      busy = true
      tries += 1
      try {
        const res = await getMyBankDeposits({ limit: 5 })
        const rows = (res?.items ?? []) as BankDepositRow[]
        if (rows.length) setLiveBank(rows)
        if (rows.some((r) => !knownBankIds.has(r.id))) stopBankPoll()
      } catch {
        /* transient — giữ nhịp */
      } finally {
        busy = false
        if (tries >= 9) stopBankPoll()
      }
    }, 20_000)
  }

  return (
    <SiteLayout
      seo={{
        title: `${data.title || 'Nạp thẻ'} — SV AeSieuQuay`,
        description,
        path: '/nap-the',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: data.title || 'Nạp thẻ',
          description,
          url: `${siteUrl}/nap-the`,
          inLanguage: 'vi-VN',
        },
      }}
    >
      <main className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* ambient glow — dark-first, nhẹ trên light */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 -z-10 flex justify-center">
          <div className="h-52 w-[36rem] rounded-full bg-primary/15 blur-[90px]" />
        </div>
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <CreditCard className="h-3.5 w-3.5" aria-hidden /> Nạp xu
          </span>
          <h1 className="mt-3 bg-gradient-to-b from-fg to-fg/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            {data.title || 'Nạp thẻ'}
          </h1>
          {data.subtitle && <p className="mx-auto mt-2 max-w-xl text-muted">{data.subtitle}</p>}
        </div>

        {/* [PromotionBanner — nếu payload.promotion] */}
        {data.promotion && <PromotionStrip promo={data.promotion} />}

        {/* ================= Block NẠP — grid 2 cột, LUÔN hiển thị CẢ HAI (chốt 27/10: bỏ tab) ================= */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* ----- Thẻ cào ----- */}
          <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
            <form onSubmit={onSubmitCard} className="p-6 sm:p-8" noValidate>
              <h2 className="text-xl font-bold">Nạp bằng thẻ cào</h2>
              <p className="mt-0.5 text-sm text-muted">
                {feeDegraded ? 'Chọn nhà mạng và mệnh giá' : 'Nhà mạng & mệnh giá theo biểu phí thật của cổng'}
              </p>

              {feeDegraded && (
                <p role="alert" className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-500">
                  ⚠️ Bảng phí tạm thời lỗi — giá trị thực có thể khác.
                </p>
              )}

              {!authLoading && !isLoggedIn && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted">
                  Bạn cần{' '}
                  <a href="/dang-nhap" className="font-semibold text-primary underline">
                    đăng nhập
                  </a>{' '}
                  để nạp thẻ.
                </div>
              )}

              {data.card && !data.card.enabled && (
                <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Cổng thẻ cào đang tạm tắt — thử kênh chuyển khoản.</p>
              )}

              <fieldset
                disabled={!canTopup || !data.card?.enabled}
                className={cn('mt-6 grid gap-4 border-0 p-0 sm:grid-cols-2', !canTopup && 'opacity-60')}
              >
                <div>
                  <label htmlFor="card-telco" className="mb-1.5 block text-sm font-medium">
                    Nhà mạng
                  </label>
                  <select
                    id="card-telco"
                    value={cardForm.telco}
                    disabled={!canTopup}
                    onChange={(e) => onTelcoChange(e.target.value)}
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                  >
                    {telcos.map((o) => (
                      <option key={o.telco} value={o.telco}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.telco && <p className="mt-1 text-xs text-red-500">{errors.telco}</p>}
                </div>

                <div>
                  <label htmlFor="card-amount" className="mb-1.5 block text-sm font-medium">
                    Mệnh giá
                  </label>
                  <select
                    id="card-amount"
                    value={cardForm.amount}
                    disabled={!canTopup}
                    onChange={(e) => {
                      clearErrors()
                      setCardForm((s) => ({ ...s, amount: e.target.value }))
                    }}
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                  >
                    {amountOptions.map((v) => (
                      <option key={v.amount} value={String(v.amount)}>
                        {formatCardValue(v.amount)}
                        {v.fee_percent > 0 ? ` (−${v.fee_percent}%)` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                </div>

                <div>
                  <label htmlFor="card-code" className="mb-1.5 block text-sm font-medium">
                    Mã thẻ
                  </label>
                  <input
                    id="card-code"
                    type="text"
                    value={cardForm.card_code}
                    disabled={!canTopup}
                    onChange={(e) => {
                      clearErrors()
                      setCardForm((s) => ({ ...s, card_code: e.target.value }))
                    }}
                    placeholder="Nhập mã thẻ cào"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                  />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
                </div>

                <div>
                  <label htmlFor="card-serial" className="mb-1.5 block text-sm font-medium">
                    Seri thẻ
                  </label>
                  <input
                    id="card-serial"
                    type="text"
                    value={cardForm.card_serial}
                    disabled={!canTopup}
                    onChange={(e) => {
                      clearErrors()
                      setCardForm((s) => ({ ...s, card_serial: e.target.value }))
                    }}
                    placeholder="Nhập số seri thẻ"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:cursor-not-allowed"
                  />
                  {errors.serial && <p className="mt-1 text-xs text-red-500">{errors.serial}</p>}
                </div>
              </fieldset>

              {/* phí → thực nhận → Xu: THẲNG từ payload (FRONTEND-4 §2.1 — không tự tính) */}
              {selectedFee && (
                <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs tabular-nums text-muted">
                  {selectedFee.fee_percent > 0 ? `− phí ${selectedFee.fee_percent}%` : feeDegraded ? 'phí chưa xác định' : 'không phí'} →{' '}
                  <b className="text-fg">thực nhận {fmtVnd(selectedFee.real_receive_vnd)}</b> →{' '}
                  <b className="text-fg">{fmtXu(selectedFee.xu)}</b>
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={!canTopup || !data.card?.enabled || submittingCard}
                  className="flex-1 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingCard ? 'Đang gửi...' : canTopup ? 'Nạp thẻ' : 'Đăng nhập để nạp thẻ'}
                </button>
                {lastRequestId && (
                  <button
                    type="button"
                    onClick={onCheck}
                    disabled={checking}
                    className="rounded-xl border border-border-c bg-surface px-5 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
                  >
                    {checking ? 'Đang kiểm tra…' : 'Kiểm tra trạng thái'}
                  </button>
                )}
              </div>

              {checkMsg && (
                <p role="status" className={cn('mt-3 text-sm', checkMsg.ok ? 'text-emerald-500' : 'text-amber-500')}>
                  {checkMsg.text}
                </p>
              )}
              {cardPolling && <p className="mt-2 text-xs text-muted">⏳ Đang theo dõi giao dịch (mỗi 10s, tối đa 3 phút)…</p>}

              {errors.form && (
                <p role="alert" className="mt-3 text-sm text-red-500">
                  {errors.form}
                </p>
              )}
            </form>
          </section>

          {/* ----- Chuyển khoản (payload.bank — hết fetch) ----- */}
          <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold">Nạp bằng ATM/Bank (VietQR)</h2>
              <p className="mt-0.5 text-sm text-muted">Quét mã VietQR — hệ thống tự match nội dung CK với tài khoản của bạn.</p>

              {!data.bank?.enabled && (
                <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Cổng chuyển khoản đang tạm tắt — thử kênh thẻ cào.</p>
              )}

              {/* QR ở trên + thông tin dưới (stack trong card): 2 card song song trên desktop,
                  chiều rộng card ~540px — để row label/value không bao giờ wrap vỡ. */}
              <div className="mt-6 flex flex-col items-center gap-6">
                <div className="relative w-full max-w-[280px] shrink-0">
                  <img
                    src={qrUrl}
                    alt={realname ? `Mã QR nạp tiền cho ${realname}` : 'Mã QR nạp tiền'}
                    className={cn(
                      'w-full select-none rounded-2xl border border-border-c bg-white p-2 shadow-sm',
                      !canTopup && 'pointer-events-none scale-[1.04] blur-lg',
                    )}
                    draggable={false}
                  />
                  {!canTopup && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-bg/40 p-4 text-center backdrop-blur-[2px]">
                      <span className="text-3xl">🔒</span>
                      <p className="mt-2 text-sm font-semibold text-fg">Đăng nhập để quét mã</p>
                      <a
                        href="/dang-nhap"
                        className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-strong"
                      >
                        Đăng nhập
                      </a>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-md text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Thông tin thụ hưởng</p>
                  <dl className="space-y-1.5 rounded-xl bg-surface-2 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap text-muted">Ngân hàng</dt>
                      <dd className="min-w-0 text-right font-semibold text-fg">{data.bank?.receiving?.bank || BANK_RECEIVING_FALLBACK.bank}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap text-muted">Số tài khoản</dt>
                      <dd className="min-w-0 text-right font-mono font-semibold text-fg">{data.bank?.receiving?.account_number || BANK_RECEIVING_FALLBACK.account_number}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap text-muted">Chủ tài khoản</dt>
                      <dd className="min-w-0 text-right font-semibold text-fg">{data.bank?.receiving?.account_name || BANK_RECEIVING_FALLBACK.account_name}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap text-muted">Tối thiểu</dt>
                      <dd className="min-w-0 text-right tabular-nums font-semibold text-fg">{fmtVnd(data.bank?.min_amount_vnd ?? 0)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap text-muted">Quy đổi</dt>
                      <dd className="min-w-0 text-right tabular-nums font-semibold text-fg">{data.bank?.vnd_per_xu || BANK_VND_PER_XU_FALLBACK} ₫ = 1 Xu</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {/* Bắt buộc login mới hiện nội dung CK (fix 29/10): khách chỉ thấy hướng dẫn chung + link đăng nhập. */}
                    {canTopup ? (
                      <>Nội dung chuyển khoản: <b className="text-fg">{realname || user?.username || 'ten ingame'}</b> — {data.bank?.content_format}.</>
                    ) : (
                      <>Nội dung chuyển khoản: <b className="text-fg">tên nhân vật của bạn</b> —{' '}
                        <a href="/dang-nhap" className="font-semibold text-primary underline">đăng nhập</a> để xem chính xác nội dung CK (hệ thống match theo tên đăng nhập).
                      </>
                    )}
                    {data.promotion?.applies_to === 'bank' && (
                      <> Đang chạy <b className="text-amber-500">+{data.promotion.bonus_percent}% Xu</b> ({data.promotion.name}).</>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={onCheckBank}
                    disabled={!canTopup}
                    className="mt-4 w-full rounded-xl border border-border-c bg-surface px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 disabled:opacity-60"
                  >
                    {bankPolling ? 'Đang kiểm tra (20s/lần)… bấm để dừng' : 'Chuyển xong rồi? Kiểm tra nạp'}
                  </button>
                  <p className="mt-2 text-xs text-muted">Sau khi chuyển, đối soát tự động 1–2 phút. Nút trên chỉ kiểm tra thêm, không bắt buộc.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ================= Block LỊCH SỬ NẠP CỦA BẠN (dưới 2 block thanh toán) ================= */}
        <HistoryBlock data={data} liveCard={liveCard} liveBank={liveBank} isLoggedIn={isLoggedIn} />
      </main>
    </SiteLayout>
  )
}

export default NapThePage
