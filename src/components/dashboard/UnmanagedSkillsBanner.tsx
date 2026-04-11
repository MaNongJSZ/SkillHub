import { useState } from 'react'
import type { UnmanagedSkill } from '../../types'

interface UnmanagedSkillsBannerProps {
  skills: UnmanagedSkill[]
  onImport: (name: string, agentId: string) => Promise<void>
  onImportAll: () => Promise<void>
  onDismiss: () => void
}

export default function UnmanagedSkillsBanner({
  skills,
  onImport,
  onImportAll,
  onDismiss,
}: UnmanagedSkillsBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [importingAll, setImportingAll] = useState(false)

  if (!skills.length) return null

  const handleImport = async (name: string, agentId: string) => {
    const key = `${name}@${agentId}`
    setImporting(key)
    try {
      await onImport(name, agentId)
    } finally {
      setImporting(null)
    }
  }

  const handleImportAll = async () => {
    setImportingAll(true)
    try {
      await onImportAll()
    } finally {
      setImportingAll(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium">
            发现 {skills.length} 个未托管的 Skill 文件
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleImportAll()}
            disabled={importingAll}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importingAll ? '导入中...' : '全部导入'}
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            忽略
          </button>
        </div>
      </div>

      {/* 展开列表 */}
      {expanded && (
        <div className="border-t border-amber-500/20 px-4 py-2">
          <div className="space-y-1">
            {skills.map((skill) => {
              const key = `${skill.name}@${skill.agent_id}`
              const isImporting = importing === key
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-amber-500/10"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-primary)]">{skill.name}</span>
                    <span className="text-[var(--text-secondary)]">→</span>
                    <span className="text-[var(--text-secondary)]">{skill.agent_id}</span>
                  </div>
                  <button
                    onClick={() => void handleImport(skill.name, skill.agent_id)}
                    disabled={isImporting}
                    className="rounded bg-amber-600/80 px-2 py-0.5 text-xs text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isImporting ? '导入中...' : '导入'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
