import { useMemo, useState } from 'react'

export interface MatrixRow {
  skillName: string
  states: Record<string, boolean>
}

interface MatrixGridProps {
  rows: MatrixRow[]
  agentIds: string[]
  selectedSkills: string[]
  selectedAgents: string[]
  onToggleSkill: (skillName: string) => void
  onToggleAgent: (agentId: string) => void
  onToggleCell: (skillName: string, agentId: string, enabled: boolean) => void
  onBatchEnable: (skillNames: string[], agentIds: string[]) => void
  onBatchDisable: (skillNames: string[], agentIds: string[]) => void
}

export default function MatrixGrid({
  rows,
  agentIds,
  selectedSkills,
  selectedAgents,
  onToggleSkill,
  onToggleAgent,
  onToggleCell,
  onBatchEnable,
  onBatchDisable,
}: MatrixGridProps) {
  const [busy, setBusy] = useState(false)

  const selectedSkillSet = useMemo(() => new Set(selectedSkills), [selectedSkills])
  const selectedAgentSet = useMemo(() => new Set(selectedAgents), [selectedAgents])

  const handleBatchEnable = async () => {
    if (!selectedSkills.length || !selectedAgents.length || busy) return
    setBusy(true)
    try {
      await onBatchEnable(selectedSkills, selectedAgents)
    } finally {
      setBusy(false)
    }
  }

  const handleBatchDisable = async () => {
    if (!selectedSkills.length || !selectedAgents.length || busy) return
    setBusy(true)
    try {
      await onBatchDisable(selectedSkills, selectedAgents)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-[color:var(--text-secondary)]/25 bg-[var(--bg-secondary)]/50">
      {/* 固定顶部：批量操作栏 */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--text-secondary)]/25 px-4 py-3">
        <span className="text-xs text-[var(--text-secondary)]">
          已选 {selectedSkills.length} 个 Skill / {selectedAgents.length} 个 Agent
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void handleBatchEnable()
            }}
            disabled={!selectedSkills.length || !selectedAgents.length || busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            批量启用
          </button>
          <button
            onClick={() => {
              void handleBatchDisable()
            }}
            disabled={!selectedSkills.length || !selectedAgents.length || busy}
            className="rounded-md bg-gray-600/60 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-gray-600/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            批量禁用
          </button>
        </div>
      </div>

      {/* 可滚动表格区域 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {/* 粘性表头 */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[color:var(--text-secondary)]/25 bg-[var(--bg-secondary)]">
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 text-left font-medium text-[var(--text-primary)]">Skill</th>
              {agentIds.map((agentId) => (
                <th key={agentId} className="px-3 py-2 text-center font-medium text-[var(--text-primary)]">
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedAgentSet.has(agentId)}
                      onChange={() => onToggleAgent(agentId)}
                      className="h-3.5 w-3.5"
                    />
                    {agentId}
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.skillName} className="border-b border-[color:var(--text-secondary)]/20 last:border-b-0">
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedSkillSet.has(row.skillName)}
                    onChange={() => onToggleSkill(row.skillName)}
                    className="h-3.5 w-3.5"
                    aria-label={`选择-${row.skillName}`}
                  />
                </td>
                <td className="px-3 py-2 text-[var(--text-primary)]">{row.skillName}</td>
                {agentIds.map((agentId) => {
                  const enabled = Boolean(row.states[agentId])
                  return (
                    <td key={agentId} className="px-3 py-2 text-center">
                      <button
                        type="button"
                        aria-label={`${row.skillName}-${agentId}`}
                        className={`rounded-md px-2 py-1 text-xs ${
                          enabled
                            ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'
                            : 'text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]'
                        }`}
                        onClick={() => onToggleCell(row.skillName, agentId, enabled)}
                      >
                        {enabled ? '✅' : '○'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
