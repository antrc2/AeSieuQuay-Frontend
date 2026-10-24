import { useState } from 'react'
import SiteLayout from '@/components/layout/SiteLayout'
import DataUnavailable from '@/components/ui/DataUnavailable'
import { getTopupPageData } from '@/data'
import {
  CARD_TELCO_OPTIONS,
  DEFAULT_TELCO,
  formatCardValue,
  getCardValues,
  telcoLabel,
} from '@/data/card-options'

export const NapThePage = () => {
  const result = getTopupPageData()

  const [cardForm, setCardForm] = useState({
    telco: DEFAULT_TELCO,
    amount: String(getCardValues(DEFAULT_TELCO)[0] ?? ''),
    card_code: '',
    card_serial: '',
  })
  const [atmForm, setAtmForm] = useState({
    bank: '',
    account_name: '',
    account_number: '',
    amount: '',
    note: '',
  })
  const [submittingCard, setSubmittingCard] = useState(false)
  const [submittingAtm, setSubmittingAtm] = useState(false)

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
  const amountOptions = getCardValues(cardForm.telco)

  const onTelcoChange = (telco: string) => {
    const values = getCardValues(telco)
    setCardForm((s) => ({
      ...s,
      telco,
      amount: values.length ? String(values[0]) : '',
    }))
  }

  const onSubmitCard = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingCard(true)
    // TODO: implement sau
    setTimeout(() => setSubmittingCard(false), 800)
  }

  const onSubmitAtm = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingAtm(true)
    // TODO: implement sau
    setTimeout(() => setSubmittingAtm(false), 800)
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
            <form onSubmit={onSubmitCard} className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">
                  💳
                </span>
                <div>
                  <h2 className="text-xl font-bold">Nạp bằng thẻ cào</h2>
                  <p className="mt-0.5 text-sm text-muted">Nhập thông tin thẻ để thực hiện nạp</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="card-telco" className="mb-1.5 block text-sm font-medium">
                    Nhà mạng
                  </label>
                  <select
                    id="card-telco"
                    value={cardForm.telco}
                    onChange={(e) => onTelcoChange(e.target.value)}
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {CARD_TELCO_OPTIONS.map(({ telco }) => (
                      <option key={telco} value={telco}>
                        {telcoLabel(telco)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="card-amount" className="mb-1.5 block text-sm font-medium">
                    Mệnh giá
                  </label>
                  <select
                    id="card-amount"
                    value={cardForm.amount}
                    onChange={(e) => setCardForm((s) => ({ ...s, amount: e.target.value }))}
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  >
                    {amountOptions.map((value) => (
                      <option key={value} value={String(value)}>
                        {formatCardValue(value)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="card-code" className="mb-1.5 block text-sm font-medium">
                    Mã thẻ
                  </label>
                  <input
                    id="card-code"
                    type="text"
                    value={cardForm.card_code}
                    onChange={(e) => setCardForm((s) => ({ ...s, card_code: e.target.value }))}
                    placeholder="Nhập mã thẻ cào"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="card-serial" className="mb-1.5 block text-sm font-medium">
                    Seri thẻ
                  </label>
                  <input
                    id="card-serial"
                    type="text"
                    value={cardForm.card_serial}
                    onChange={(e) => setCardForm((s) => ({ ...s, card_serial: e.target.value }))}
                    placeholder="Nhập số seri thẻ"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingCard}
                className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
              >
                {submittingCard ? 'Đang gửi...' : 'Gửi yêu cầu nạp thẻ'}
              </button>
            </form>
          </section>

          {/* ================= Nạp bằng ATM/Bank ================= */}
          <section className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
            <form onSubmit={onSubmitAtm} className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">
                  🏦
                </span>
                <div>
                  <h2 className="text-xl font-bold">Nạp bằng ATM/Bank</h2>
                  <p className="mt-0.5 text-sm text-muted">Điền thông tin chuyển khoản để xác nhận nạp</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="atm-bank" className="mb-1.5 block text-sm font-medium">
                    Ngân hàng
                  </label>
                  <input
                    id="atm-bank"
                    type="text"
                    value={atmForm.bank}
                    onChange={(e) => setAtmForm((s) => ({ ...s, bank: e.target.value }))}
                    placeholder="Tên ngân hàng (VD: Vietcombank, MB Bank...)"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="atm-account-name" className="mb-1.5 block text-sm font-medium">
                    Tên tài khoản
                  </label>
                  <input
                    id="atm-account-name"
                    type="text"
                    value={atmForm.account_name}
                    onChange={(e) => setAtmForm((s) => ({ ...s, account_name: e.target.value }))}
                    placeholder="Tên chủ tài khoản"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="atm-account-number" className="mb-1.5 block text-sm font-medium">
                    Số tài khoản
                  </label>
                  <input
                    id="atm-account-number"
                    type="text"
                    value={atmForm.account_number}
                    onChange={(e) => setAtmForm((s) => ({ ...s, account_number: e.target.value }))}
                    placeholder="Số tài khoản"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="atm-amount" className="mb-1.5 block text-sm font-medium">
                    Số tiền
                  </label>
                  <input
                    id="atm-amount"
                    type="number"
                    value={atmForm.amount}
                    onChange={(e) => setAtmForm((s) => ({ ...s, amount: e.target.value }))}
                    placeholder="Số tiền chuyển khoản"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="atm-note" className="mb-1.5 block text-sm font-medium">
                    Nội dung chuyển khoản
                  </label>
                  <input
                    id="atm-note"
                    type="text"
                    value={atmForm.note}
                    onChange={(e) => setAtmForm((s) => ({ ...s, note: e.target.value }))}
                    placeholder="Nội dung (VD: Nap tien tai khoan...)"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingAtm}
                className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
              >
                {submittingAtm ? 'Đang gửi...' : 'Gửi thông tin chuyển khoản'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </SiteLayout>
  )
}

export default NapThePage