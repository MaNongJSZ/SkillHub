import { useEffect } from 'react'
import { useToastStore } from '../../stores/useToastStore'

export default function Toast() {
  const { toasts, removeToast } = useToastStore()

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), 3000)
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [toasts, removeToast])

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-700 bg-emerald-900/90 text-emerald-100'
              : toast.type === 'error'
                ? 'border-red-700 bg-red-900/90 text-red-100'
                : 'border-gray-700 bg-gray-900/90 text-gray-100'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              className="rounded px-1 text-xs opacity-70 hover:opacity-100"
              onClick={() => removeToast(toast.id)}
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
