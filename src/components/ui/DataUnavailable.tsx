import { EmptyState } from '@/components/ui/States'

type DataUnavailableProps = {
  title?: string
  description?: string
}

/**
 * Trạng thái khi production không nhận được `window.DATA` cho trang hiện tại.
 * Không fallback mock — hiển thị rõ để phát hiện lỗi tích hợp backend.
 */
export const DataUnavailable = ({
  title = 'Dữ liệu trang chưa sẵn sàng',
  description = 'Máy chủ chưa trả dữ liệu cho trang này. Vui lòng thử tải lại trang hoặc quay lại sau.',
}: DataUnavailableProps) => (
  <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
    <EmptyState
      icon="🗂️"
      title={title}
      description={description}
      action={
        <a
          href="/"
          className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong"
        >
          Về trang chủ
        </a>
      }
    />
  </div>
)

export default DataUnavailable