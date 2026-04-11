import { useMemo, useState } from 'react'

export interface MatrixRow {
  skillName: string
  states: Record<string, boolean>
  group?: string
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const selectedSkillSet = useMemo(() => new Set(selectedSkills), [selectedSkills])
  const selectedAgentSet = useMemo(() => new Set(selectedAgents), [selectedAgents])

  // 按 group 分组
  const { flatRows, groupedRows, groupSkillNames } = useMemo(() => {
    const flat: MatrixRow[] = []
    const grouped: Record<string, MatrixRow[]> = {}
    const names: Record<string, string[]> = {}

    for (const row of rows) {
      if (row.group) {
        if (!grouped[row.group]) {
          grouped[row.group] = []
          names[row.group] = []
        }
        grouped[row.group].push(row)
        names[row.group].push(row.skillName)
      } else {
        flat.push(row)
      }
    }

    return { flatRows: flat, groupedRows: grouped, groupSkillNames: names }
  }, [rows])

  // 计算分组在每个 agent 上的聚合状态
  const getGroupState = (group: string, agentId: string): 'all' | 'some' | 'none' => {
    const groupRows = groupedRows[group] ?? []
    const enabled = groupRows.filter((r) => r.states[agentId]).length
    if (enabled === 0) return 'none'
    if (enabled === groupRows.length) return 'all'
    return 'some'
  }

  // 分组整体切换
  const handleGroupToggle = (group: string, agentId: string) => {
    const state = getGroupState(group, agentId)
    const names = groupSkillNames[group] ?? []
    if (state === 'all') {
      void onBatchDisable(names, [agentId])
    } else {
      void onBatchEnable(names, [agentId])
    }
  }

  // 选择整组
  const handleGroupSelect = (group: string) => {
    const names = groupSkillNames[group] ?? []
    const allSelected = names.every((n) => selectedSkillSet.has(n))
    // 如果全选了就取消全选，否则全选
    for (const name of names) {
      if (allSelected) {
        if (selectedSkillSet.has(name)) onToggleSkill(name)
      } else {
        if (!selectedSkillSet.has(name)) onToggleSkill(name)
      }
    }
  }

  const toggleExpand = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

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

  const renderToggleCell = (skillName: string, agentId: string, enabled: boolean) => (
    <td key={agentId} className="px-3 py-2 text-center">
      <button
        type="button"
        aria-label={`${skillName}-${agentId}`}
        className={`rounded-md px-2 py-1 text-xs ${
          enabled
            ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'
            : 'text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]'
        }`}
        onClick={() => onToggleCell(skillName, agentId, enabled)}
      >
        {enabled ? '✅' : '○'}
      </button>
    </td>
  )

  return (
    <div className="flex h-full flex-col rounded-lg border border-[color:var(--text-secondary)]/25 bg-[var(--bg-secondary)]/50">
      {/* 固定顶部：批量操作栏 */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--text-secondary)]/25 px-4 py-3">
        <span className="text-xs text-[var(--text-secondary)]">
          已选 {selectedSkills.length} 个 Skill / {selectedAgents.length} 个 Agent
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleBatchEnable()}
            disabled={!selectedSkills.length || !selectedAgents.length || busy}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            批量启用
          </button>
          <button
            onClick={() => void handleBatchDisable()}
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
            {/* 平铺 Skill 行 */}
            {flatRows.map((row) => (
              <tr key={row.skillName} className="border-b border-[color:var(--text-secondary)]/20">
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedSkillSet.has(row.skillName)}
                    onChange={() => onToggleSkill(row.skillName)}
                    className="h-3.5 w-3.5"
                  />
                </td>
                <td className="px-3 py-2 text-[var(--text-primary)]">{row.skillName}</td>
                {agentIds.map((agentId) => renderToggleCell(row.skillName, agentId, Boolean(row.states[agentId])))}
              </tr>
            ))}

            {/* 分组行 */}
            {Object.entries(groupedRows).map(([group, groupRows]) => {
              const expanded = expandedGroups.has(group)
              const names = groupSkillNames[group] ?? []
              const allSelected = names.every((n) => selectedSkillSet.has(n))

              return (
                <tbody key={group}>
                  {/* 分组标题行 */}
                  <tr className="border-b border-[color:var(--text-secondary)]/25 bg-[var(--bg-secondary)]/60">
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => handleGroupSelect(group)}
                        className="h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleExpand(group)}
                        className="flex items-center gap-1.5 text-[var(--text-primary)] hover:text-blue-500"
                      >
                        <svg
                          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium">{group}</span>
                        <span className="text-xs text-[var(--text-secondary)]">({groupRows.length})</span>
                      </button>
                    </td>
                    {/* 分组级别的聚合 toggle */}
                    {agentIds.map((agentId) => {
                      const state = getGroupState(group, agentId)
                      return (
                        <td key={agentId} className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleGroupToggle(group, agentId)}
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              state === 'all'
                                ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'
                                : state === 'some'
                                  ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                                  : 'text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {state === 'all' ? '✅' : state === 'some' ? '🔶' : '○'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>

                  {/* 展开的子 Skill 行 */}
                  {expanded && groupRows.map((row) => (
                    <tr key={row.skillName} className="border-b border-[color:var(--text-secondary)]/10 bg-[var(--bg-primary)]/30">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSkillSet.has(row.skillName)}
                          onChange={() => onToggleSkill(row.skillName)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="px-3 py-2 pl-8 text-[var(--text-primary)]">{row.skillName.split('/').pop()}</td>
                      {agentIds.map((agentId) => renderToggleCell(row.skillName, agentId, Boolean(row.states[agentId])))}
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
