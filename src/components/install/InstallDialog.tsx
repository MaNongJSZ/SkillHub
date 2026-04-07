import { useState } from 'react'
import { useAppStore } from '../../stores/useAppStore'
import { useToastStore } from '../../stores/useToastStore'

type InstallTab = 'local' | 'git'

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
  const [tab, setTab] = useState<InstallTab>('local')
  const [path, setPath] = useState('')
  const [gitUrl, setGitUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useToastStore()
  const { installFromGit } = useAppStore()

  if (!open) return null

  const handleInstall = async () => {
    if (submitting) return

    if (tab === 'local') {
      const nextPath = path.trim()
      if (!nextPath) return

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
    } else {
      const url = gitUrl.trim()
      if (!url) return

      setSubmitting(true)
      try {
        await installFromGit(url)
        pushToast({ type: 'success', message: '从 Git 安装成功' })
        setGitUrl('')
        onClose()
      } catch (e) {
        pushToast({ type: 'error', message: `安装失败: ${e}` })
      } finally {
        setSubmitting(false)
      }
    }
  }

  const canSubmit = tab === 'local' ? !!path.trim() : !!gitUrl.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-[color:var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 text-sm font-medium text-[var(--text-primary)]">安装 Skill</div>

        {/* Tab 切换 */}
        <div className="mb-3 flex gap-1">
          <button
            onClick={() => setTab('local')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === 'local'
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            本地路径
          </button>
          <button
            onClick={() => setTab('git')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              tab === 'git'
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Git URL
          </button>
        </div>

        {tab === 'local' ? (
          <>
            <input
              className="w-full rounded-md border border-[color:var(--text-secondary)]/20 bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
              placeholder="输入本地路径"
              value={path}
              onChange={(event) => setPath(event.target.value)}
            />
            <p className="mt-2 text-xs text-[var(--text-secondary)]">支持拖拽文件到窗口快速安装</p>
          </>
        ) : (
          <>
            <input
              className="w-full rounded-md border border-[color:var(--text-secondary)]/20 bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
              placeholder="https://github.com/user/skill-repo.git"
              value={gitUrl}
              onChange={(event) => setGitUrl(event.target.value)}
            />
            <p className="mt-2 text-xs text-[var(--text-secondary)]">输入 Git 仓库地址，将自动 clone 到本地</p>
          </>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
          >
            取消
          </button>
          <button
            onClick={() => {
              void handleInstall()
            }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || !canSubmit}
          >
            {submitting ? '安装中...' : '安装'}
          </button>
        </div>
      </div>
    </div>
  )
}
