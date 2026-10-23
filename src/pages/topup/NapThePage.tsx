import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

type FormType = 'card' | 'atm'

export const NapThePage = () => {
  const [formType, setFormType] = useState<FormType>('card')
  const [cardForm, setCardForm] = useState({
    telco: 'viettel',
    card_code: '',
    card_serial: '',
    amount: '',
  })
  const [atmForm, setAtmForm] = useState({
    bank: '',
    account_name: '',
    account_number: '',
    amount: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const onSubmitCard = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO: implement sau
    setTimeout(() => setSubmitting(false), 800)
  }

  const onSubmitAtm = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO: implement sau
    setTimeout(() => setSubmitting(false), 800)
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Nạp thẻ</h1>
          <p className="mt-2 text-muted">Chọn hình thức nạp phù hợp với bạn</p>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-xl border border-border-c bg-surface p-1">
            <button
              type="button"
              onClick={() => setFormType('card')}
              className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
                formType === 'card'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-fg'
              }`}
            >
              Nạp bằng thẻ cào
            </button>
            <button
              type="button"
              onClick={() => setFormType('atm')}
              className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
                formType === 'atm'
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-fg'
              }`}
            >
              Nạp bằng ATM/Bank
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border-c bg-surface shadow-lg shadow-black/10">
          {formType === 'card' ? (
            <form onSubmit={onSubmitCard} className="p-6 sm:p-8">
              <h2 className="text-xl font-bold">Form nạp thẻ cào</h2>
              <p className="mt-1 text-sm text-muted">Nhập thông tin thẻ để thực hiện nạp</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Nhà mạng</label>
                  <select
                    value={cardForm.telco}
                    onChange={(e) => setCardForm((s) => ({ ...s, telco: e.target.value }))}
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                  >
                    <option value="viettel">Viettel</option>
                    <option value="mobifone">Mobifone</option>
                    <option value="vinaphone">Vinaphone</option>
                    <option value="vietnamobile">Vietnamobile</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Mã thẻ</label>
                  <input
                    type="text"
                    value={cardForm.card_code}
                    onChange={(e) => setCardForm((s) => ({ ...s, card_code: e.target.value }))}
                    placeholder="Nhập mã thẻ cào"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Seri thẻ</label>
                  <input
                    type="text"
                    value={cardForm.card_serial}
                    onChange={(e) => setCardForm((s) => ({ ...s, card_serial: e.target.value }))}
                    placeholder="Nhập số seri thẻ"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Mệnh giá</label>
                  <input
                    type="number"
                    value={cardForm.amount}
                    onChange={(e) => setCardForm((s) => ({ ...s, amount: e.target.value }))}
                    placeholder="Nhập mệnh giá thẻ"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60 sm:w-auto"
              >
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu nạp thẻ'}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmitAtm} className="p-6 sm:p-8">
              <h2 className="text-xl font-bold">Form nạp ATM/Bank</h2>
              <p className="mt-1 text-sm text-muted">Điền thông tin chuyển khoản để xác nhận nạp</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Ngân hàng</label>
                  <input
                    type="text"
                    value={atmForm.bank}
                    onChange={(e) => setAtmForm((s) => ({ ...s, bank: e.target.value }))}
                    placeholder="Tên ngân hàng (VD: Vietcombank, MB Bank...)"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Tên tài khoản</label>
                  <input
                    type="text"
                    value={atmForm.account_name}
                    onChange={(e) => setAtmForm((s) => ({ ...s, account_name: e.target.value }))}
                    placeholder="Tên chủ tài khoản"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Số tài khoản</label>
                  <input
                    type="text"
                    value={atmForm.account_number}
                    onChange={(e) => setAtmForm((s) => ({ ...s, account_number: e.target.value }))}
                    placeholder="Số tài khoản"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Số tiền</label>
                  <input
                    type="number"
                    value={atmForm.amount}
                    onChange={(e) => setAtmForm((s) => ({ ...s, amount: e.target.value }))}
                    placeholder="Số tiền chuyển khoản"
                    className="w-full rounded-xl border border-border-c bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Nội dung chuyển khoản</label>
                  <input
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
                disabled={submitting}
                className="mt-6 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60 sm:w-auto"
              >
                {submitting ? 'Đang gửi...' : 'Gửi thông tin chuyển khoản'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default NapThePage
