import { useNavigate } from 'react-router-dom'
import { FiXCircle, FiHome, FiSearch } from 'react-icons/fi'
import Logo from '@/components/Logo'

export const NotFound = () => {
  const navigate = useNavigate()

  return (
    <section className="min-h-screen bg-bg text-fg">
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <Logo size="md" className="mb-8" />

        <div className="w-full max-w-md text-center">
          <FiXCircle className="mx-auto mb-4 w-16 h-16 text-warning" />

          <h1 className="text-4xl font-bold text-primary">404 - Không tìm thấy</h1>

          <p className="mt-3 text-lg text-muted">
            Trang bạn truy cập không tồn tại hoặc đã được xóa.
          </p>

          <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white transition-all hover:bg-primary-strong active:scale-[0.98]"
            >
              <FiHome /> Quay về trang chủ
            </button>

            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-c bg-surface px-4 py-2.5 font-semibold text-fg transition-all hover:bg-surface-2 active:scale-[0.98]"
            >
              <FiSearch /> Tìm lại
            </button>
          </div>
        </div>

        <div className="mt-10 w-full max-w-md border-t border-border-c pt-6 text-center text-sm text-muted">
          © 2026 AeSieuQuay - Minecraft Việt Nam
        </div>
      </div>
    </section>
  )
}

export default NotFound
