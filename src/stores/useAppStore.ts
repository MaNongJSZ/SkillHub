import { create } from 'zustand'
import type {
  Agent,
  AppConfig,
  SearchResult,
  Skill,
  SkillDetail,
  SkillLink,
} from '../types'
import {
  useAgents,
  useConfig,
  useLinks,
  useSearch,
  useSkills,
} from '../hooks/useInvoke'

interface AppState {
  skills: Skill[]
  selectedSkill: string | null
  skillDetail: SkillDetail | null
  skillFilter: 'all' | 'enabled' | 'disabled'
  searchQuery: string
  searchResults: SearchResult[]
  agents: Agent[]
  agentLinks: Map<string, SkillLink[]>
  config: AppConfig | null

  view: 'list' | 'detail' | 'search' | 'settings' | 'agents' | 'dashboard'
  sidebarOpen: boolean
  installDialogOpen: boolean

  loadSkills: () => Promise<void>
  loadAgents: () => Promise<void>
  loadConfig: () => Promise<void>
  selectSkill: (name: string) => Promise<void>
  enableSkill: (skillName: string, agentId: string) => Promise<void>
  disableSkill: (skillName: string, agentId: string) => Promise<void>
  batchEnableSkills: (skillNames: string[], agentIds: string[]) => Promise<void>
  batchDisableSkills: (skillNames: string[], agentIds: string[]) => Promise<void>
  search: (query: string) => Promise<void>
  installFromPath: (path: string) => Promise<void>
  uninstallSkill: (name: string) => Promise<void>
  setView: (view: AppState['view']) => void
  setSidebarOpen: (open: boolean) => void
  setInstallDialogOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  skills: [],
  selectedSkill: null,
  skillDetail: null,
  skillFilter: 'all',
  searchQuery: '',
  searchResults: [],
  agents: [],
  agentLinks: new Map(),
  config: null,
  view: 'dashboard',
  sidebarOpen: true,
  installDialogOpen: false,

  loadSkills: async () => {
    const { listSkills } = useSkills()

    try {
      const skills = await listSkills()
      set({ skills })
    } catch (error) {
      console.error('Failed to load skills:', error)
    }
  },

  loadAgents: async () => {
    const { detectAgents } = useAgents()

    try {
      const agents = await detectAgents()
      set({ agents })
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  },

  loadConfig: async () => {
    const { getConfig } = useConfig()

    try {
      const config = await getConfig()
      set({ config })
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  },

  selectSkill: async (name: string) => {
    const { getSkillDetail } = useSkills()
    const { getSkillLinks } = useLinks()

    try {
      const [detail, links] = await Promise.all([
        getSkillDetail(name),
        getSkillLinks(name),
      ])

      set({
        selectedSkill: name,
        skillDetail: detail,
        agentLinks: new Map([[name, links]]),
        view: 'detail',
      })
    } catch (error) {
      console.error('Failed to load skill detail:', error)
    }
  },

  enableSkill: async (skillName: string, agentId: string) => {
    const { enableSkill: enable } = useLinks()

    try {
      await enable(skillName, agentId)

      const { getSkillLinks } = useLinks()
      const links = await getSkillLinks(skillName)

      set((state) => ({
        agentLinks: new Map(state.agentLinks).set(skillName, links),
      }))
    } catch (error) {
      console.error('Failed to enable skill:', error)
      throw error
    }
  },

  disableSkill: async (skillName: string, agentId: string) => {
    const { disableSkill: disable } = useLinks()

    try {
      await disable(skillName, agentId)

      const { getSkillLinks } = useLinks()
      const links = await getSkillLinks(skillName)

      set((state) => ({
        agentLinks: new Map(state.agentLinks).set(skillName, links),
      }))
    } catch (error) {
      console.error('Failed to disable skill:', error)
      throw error
    }
  },

  batchEnableSkills: async (skillNames: string[], agentIds: string[]) => {
    const { batchEnable } = useLinks()

    try {
      await batchEnable(skillNames, agentIds)
    } catch (error) {
      console.error('Failed to batch enable skills:', error)
      throw error
    }
  },

  batchDisableSkills: async (skillNames: string[], agentIds: string[]) => {
    try {
      for (const skillName of skillNames) {
        for (const agentId of agentIds) {
          await get().disableSkill(skillName, agentId)
        }
      }
    } catch (error) {
      console.error('Failed to batch disable skills:', error)
      throw error
    }
  },

  search: async (query: string) => {
    const { searchLocal, searchContent } = useSearch()

    set({ searchQuery: query })

    if (!query.trim()) {
      set({ searchResults: [], view: 'list' })
      return
    }

    try {
      const [localResults, contentResults] = await Promise.all([
        searchLocal(query),
        searchContent(query),
      ])

      const allResults = [...localResults, ...contentResults]
      const seen = new Set<string>()
      const uniqueResults = allResults.filter((result) => {
        const key = `${result.skill_name}-${result.matched_field}`
        if (seen.has(key)) {
          return false
        }
        seen.add(key)
        return true
      })

      set({ searchResults: uniqueResults, view: 'search' })
    } catch (error) {
      console.error('Search failed:', error)
    }
  },

  installFromPath: async (path: string) => {
    const { installFromPath: install } = useSkills()

    try {
      await install(path)
      await get().loadSkills()
    } catch (error) {
      console.error('Failed to install skill:', error)
      throw error
    }
  },

  uninstallSkill: async (name: string) => {
    const { uninstallSkill: uninstall } = useSkills()

    try {
      await uninstall(name)

      set({
        selectedSkill: null,
        skillDetail: null,
        view: 'list',
      })

      await get().loadSkills()
    } catch (error) {
      console.error('Failed to uninstall skill:', error)
      throw error
    }
  },

  setView: (view: AppState['view']) => {
    set({ view })
  },
  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },
  setInstallDialogOpen: (open: boolean) => {
    set({ installDialogOpen: open })
  },
}))
