import { useEffect, useMemo, useState } from 'react'
import { useLinks } from '../../hooks/useInvoke'
import { useAppStore } from '../../stores/useAppStore'
import { useToastStore } from '../../stores/useToastStore'
import MatrixGrid, { type MatrixRow } from './MatrixGrid'
import StatsCards from './StatsCards'
import UnmanagedSkillsBanner from './UnmanagedSkillsBanner'
import type { UnmanagedSkill } from '../../types'

export default function Dashboard() {
  const {
    skills,
    agents,
    loadSkills,
    loadAgents,
    enableSkill,
    disableSkill,
    batchEnableSkills,
    batchDisableSkills,
  } = useAppStore()
  const { getSkillLinks, detectUnmanagedSkills, importUnmanagedSkill } = useLinks()
  const { pushToast } = useToastStore()

  const [linksMap, setLinksMap] = useState<Record<string, Set<string>>>({})
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [unmanagedSkills, setUnmanagedSkills] = useState<UnmanagedSkill[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      try {
        await Promise.all([loadSkills(), loadAgents()])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [loadAgents, loadSkills])

  useEffect(() => {
    let active = true

    const loadLinks = async () => {
      if (!skills.length) {
        setLinksMap({})
        return
      }

      const entries = await Promise.all(
        skills.map(async (skill) => {
          const links = await getSkillLinks(skill.name)
          return [
            skill.name,
            new Set(
              links.filter((link) => link.is_enabled).map((link) => link.agent_id)
            ),
          ] as const
        })
      )

      if (active) {
        setLinksMap(Object.fromEntries(entries))
      }
    }

    void loadLinks()
    return () => {
      active = false
    }
  }, [getSkillLinks, skills])

  // 检测未托管的 skill
  useEffect(() => {
    let active = true

    const detect = async () => {
      try {
        const result = await detectUnmanagedSkills()
        if (active) {
          setUnmanagedSkills(result)
        }
      } catch {
        // 忽略检测失败
      }
    }

    void detect()
    return () => {
      active = false
    }
  }, [detectUnmanagedSkills, skills])

  const agentIds = useMemo(() => agents.map((agent) => agent.id), [agents])

  const rows = useMemo<MatrixRow[]>(
    () =>
      skills.map((skill) => {
        const enabledSet = linksMap[skill.name] ?? new Set<string>()
        const states: Record<string, boolean> = {}

        for (const agentId of agentIds) {
          states[agentId] = enabledSet.has(agentId)
        }

        return {
          skillName: skill.name,
          states,
          group: skill.group,
        }
      }),
    [agentIds, linksMap, skills]
  )

  const enabledLinks = useMemo(
    () =>
      Object.values(linksMap).reduce(
        (acc, enabledAgentSet) => acc + enabledAgentSet.size,
        0
      ),
    [linksMap]
  )

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName]
    )
  }

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    )
  }

  const handleToggleCell = async (
    skillName: string,
    agentId: string,
    enabled: boolean
  ) => {
    try {
      if (enabled) {
        await disableSkill(skillName, agentId)
      } else {
        await enableSkill(skillName, agentId)
      }

      setLinksMap((prev) => {
        const next = { ...prev }
        const setForSkill = new Set(next[skillName] ?? [])

        if (enabled) {
          setForSkill.delete(agentId)
        } else {
          setForSkill.add(agentId)
        }

        next[skillName] = setForSkill
        return next
      })
    } catch {
      pushToast({ type: 'error', message: '切换失败，请重试' })
    }
  }

  const handleBatchEnable = async (skillNames: string[], agentSelection: string[]) => {
    try {
      await batchEnableSkills(skillNames, agentSelection)
      setLinksMap((prev) => {
        const next = { ...prev }
        for (const skillName of skillNames) {
          const setForSkill = new Set(next[skillName] ?? [])
          for (const agentId of agentSelection) {
            setForSkill.add(agentId)
          }
          next[skillName] = setForSkill
        }
        return next
      })
      pushToast({ type: 'success', message: '批量启用成功' })
    } catch {
      pushToast({ type: 'error', message: '批量启用失败' })
    }
  }

  const handleBatchDisable = async (
    skillNames: string[],
    agentSelection: string[]
  ) => {
    try {
      await batchDisableSkills(skillNames, agentSelection)
      setLinksMap((prev) => {
        const next = { ...prev }
        for (const skillName of skillNames) {
          const setForSkill = new Set(next[skillName] ?? [])
          for (const agentId of agentSelection) {
            setForSkill.delete(agentId)
          }
          next[skillName] = setForSkill
        }
        return next
      })
      pushToast({ type: 'success', message: '批量禁用成功' })
    } catch {
      pushToast({ type: 'error', message: '批量禁用失败' })
    }
  }

  const handleImportUnmanaged = async (name: string, agentId: string) => {
    await importUnmanagedSkill(name, agentId)
    setUnmanagedSkills((prev) =>
      prev.filter((s) => !(s.name === name && s.agent_id === agentId))
    )
    pushToast({ type: 'success', message: `已导入 ${name}` })
    await loadSkills()
  }

  const handleImportAllUnmanaged = async () => {
    const remaining = [...unmanagedSkills]
    for (const skill of remaining) {
      await importUnmanagedSkill(skill.name, skill.agent_id)
    }
    setUnmanagedSkills([])
    pushToast({ type: 'success', message: `已全部导入 ${remaining.length} 个 Skill` })
    await loadSkills()
  }

  if (loading) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">加载 Dashboard...</div>
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* 固定区域：统计卡片 */}
      <StatsCards
        totalSkills={skills.length}
        totalAgents={agents.length}
        enabledLinks={enabledLinks}
      />
      {/* 未托管 Skill 提示 */}
      {unmanagedSkills.length > 0 && (
        <UnmanagedSkillsBanner
          skills={unmanagedSkills}
          onImport={handleImportUnmanaged}
          onImportAll={handleImportAllUnmanaged}
          onDismiss={() => setUnmanagedSkills([])}
        />
      )}
      {/* 可滚动区域：矩阵表格 */}
      <div className="min-h-0 flex-1">
        <MatrixGrid
          rows={rows}
          agentIds={agentIds}
          selectedSkills={selectedSkills}
          selectedAgents={selectedAgents}
          onToggleSkill={toggleSkillSelection}
          onToggleAgent={toggleAgentSelection}
          onToggleCell={handleToggleCell}
          onBatchEnable={handleBatchEnable}
          onBatchDisable={handleBatchDisable}
        />
      </div>
    </div>
  )
}
