import { useState } from 'react'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getTopupPageData } from '@/data'
import { BANK_QR_BASE_URL } from '@/data/site'
import {
  CARD_TELCO_OPTIONS,
  DEFAULT_TELCO,
  formatCardValue,
  getCardValues,
  telcoLabel,
} from '@/data/card-options'
import useAuth from '@/hooks/useAuth'
import { apiPost } from '@/api/client'
import { showApiError, showSuccess } from '@/utils/swal'
import { cn } from '@/lib/utils'

type CardFormErrors = {
  telco?: string
  amount?: string
  code?: string
  serial?: string
  form?: string
}

export const NapThePage = () => {
  const result = getTopupPageData()
  const { user, loading: authLoading } = useAuth()

  const [cardForm, setCardForm] = useState({
    telco: DEFAULT_TELCO,
    amount: String(getCardValues(DEFAULT_TELCO)[0] ?? ''),
    card_code: '',
    card_serial: '',
  })
  const [submittingCard, setSubmittingCard] = useState(false)
  const [errors, setErrors] = useState<CardFormErrors>({})

  const clearErrors = () => setErrors({})

  if (result.status !== 'ok') {
    return (
      <SiteLayout
        seo={{
          title: 'Nạp thẻ — SV AeSieuQuay',
          description: 'Nạp thẻ vào tài khoản AeSieuQuay.',
          path: '/nap-the',
          noindex: true,
        }}
      >
        <DataUnavailable
          title={result.status === 'not_found' ? 'Trang không tồn tại' : undefined}
        />
      </SiteLayout>
    )
  }

  const data = result.data
  const description = data.subtitle || 'Nạp thẻ vào tài khoản AeSieuQuay nhanh chóng và an toàn.'
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const isLoggedIn = Boolean(user)
  const canTopup = !authLoading && isLoggedIn
  const realname = typeof user?.realname === 'string' ? user.realname.trim() : ''
  const amountOptions = getCardValues(cardForm.telco)

  // Chưa đăng nhập → QR không kèm addInfo; đã đăng nhập → addInfo = realname.
  const qrUrl = realname
    ? `${BANK_QR_BASE_URL}?addInfo=${encodeURIComponent(realname)}`
    : BANK_QR_BASE_URL

  const onTelcoChange = (telco: string) => {
    const values = getCardValues(telco)
    clearErrors()
    setCardForm((s) => ({
      ...s,
      telco,
      amount: values.length ? String(values[0]) : '',
    }))
  }

  const onSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: CardFormErrors = {}

    // Chặn gửi thẻ khi chưa đăng nhập (backend cũng yêu cầu JWT).
    if (!isLoggedIn) {
      nextErrors.form = 'Vui lòng đăng nhập để nạp thẻ.'
    }

    if (!CARD_TELCO_OPTIONS.some((option) => option.telco === cardForm.telco)) {
      nextErrors.telco = 'Vui lòng chọn nhà mạng.'
    }

    const code = cardForm.card_code.trim()
    const serial = cardForm.card_serial.trim()
    const amount = Number(cardForm.amount)

    if (!code) nextErrors.code = 'Vui lòng nhập mã thẻ.'
    if (!serial) nextErrors.serial = 'Vui lòng nhập seri thẻ.'
    if (!Number.isFinite(amount) || !getCardValues(cardForm.telco).includes(amount)) {
      nextErrors.amount = 'Vui lòng chọn mệnh giá hợp lệ.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmittingCard(true)
    try {
      const res = await apiPost('/card/charge', {
        telco: cardForm.telco,
        amount,
        serial,
        code,
      })
      await showSuccess('Gửi thẻ thành công', res?.message || 'Thẻ đang được xử lý.')
      setCardForm((s) => ({ ...s, card_code: '', card_serial: '' }))
    } catch (err) {
      // SweetAlert chỉ dùng cho response API (lỗi/thành công).
      await showApiError(err, 'Nạp thẻ thất bại')
    } finally {
      setSubmittingCard(false)
    }
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{data.title || 'Nạp thẻ'}</h1>
          {data.subtitle && <p className="mt-2 text-muted">{data.subtitle}</p>}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* ================= Nạp bằng thẻ cào ================= */}
          <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
            <form onSubmit={onSubmitCard} className="p-6 sm:p-8" noValidate>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">
                  💳
                </span>
                <div>
                  <h2 className="text-xl font-bold">Nạp bằng thẻ cào</h2>
                  <p className="mt-0.5 text-sm text-muted">Nhập thông tin thẻ để thực hiện nạp</p>
                </div>
              </div>

              {!authLoading && !isLoggedIn && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted">
                  Bạn cần{' '}
                  <a href="/dang-nhap" className="font-semibold text-primary underline">
                    đăng nhập
                  </a>{' '}
                  để nạp thẻ.
                </div>
              )}

              <fieldset
                disabled={!canTopup}
                className={cn(
                  'mt-6 grid gap-4 border-0 p-0 sm:grid-cols-2',
                  !canTopup && 'opacity-60',
                )}
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
                    {CARD_TELCO_OPTIONS.map(({ telco }) => (
                      <option key={telco} value={telco}>
                        {telcoLabel(telco)}
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
                    {amountOptions.map((value) => (
                      <option key={value} value={String(value)}>
                        {formatCardValue(value)}
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

              <button
                type="submit"
                disabled={!canTopup || submittingCard}
                className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingCard
                  ? 'Đang gửi...'
                  : canTopup
                    ? 'Nạp thẻ'
                    : 'Đăng nhập để nạp thẻ'}
              </button>

              {errors.form && (
                <p role="alert" className="mt-3 text-sm text-red-500">
                  {errors.form}
                </p>
              )}
            </form>
          </section>

          {/* ================= Nạp bằng ATM/Bank (VietQR) ================= */}
          <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">
                  🏦
                </span>
                <div>
                  <h2 className="text-xl font-bold">Nạp bằng ATM/Bank</h2>
                  <p className="mt-0.5 text-sm text-muted">Quét mã VietQR để chuyển khoản</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <div className="relative w-full max-w-[300px]">
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

                {canTopup && realname && (
                  <p className="mt-4 text-center text-sm text-muted">
                    Nội dung chuyển khoản:{' '}
                    <span className="font-semibold text-fg">{realname}</span>
                  </p>
                )}

                <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-muted">
                  Mở ứng dụng ngân hàng và quét mã. Nội dung chuyển khoản tự điền theo tên tài
                  khoản của bạn.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </SiteLayout>
  )
}

export default NapThePage