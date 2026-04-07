import { useState } from 'react'
import { useToastStore } from '../../stores/useToastStore'

interface InstallDialogProps {
  open: boolean
  onClose: () => void
  onInstallPath: (path: string) => Promise<void>
}

export default function InstallDialog({
  open,
  onClose,
  onInstallPath,
}: InstallDialogProps) {
  const [path, setPath] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useToastStore()

  if (!open) return null

  const handleInstall = async () => {
    const nextPath = path.trim()
    if (!nextPath || submitting) return

    setSubmitting(true)
    try {
      await onInstallPath(nextPath)
      pushToast({ type: 'success', message: '安装成功' })
      setPath('')
      onClose()
    } catch {
      pushToast({ type: 'error', message: '安装失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-gray-700 bg-gray-900 p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 text-sm font-medium text-gray-100">安装 Skill</div>
        <input
          className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
          placeholder="输入本地路径"
          value={path}
          onChange={(event) => setPath(event.target.value)}
        />
        <p className="mt-2 text-xs text-gray-500">支持拖拽文件到窗口快速安装</p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800"
          >
            取消
          </button>
          <button
            onClick={() => {
              void handleInstall()
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || !path.trim()}
          >
            {submitting ? '安装中...' : '安装'}
          </button>
        </div>
      </div>
    </div>
  )
}
