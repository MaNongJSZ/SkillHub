import { create } from 'zustand'
import type {
  Agent,
  AppConfig,
  RemoteSkill,
  RemoteSkillDetail,
  SearchResult,
  Skill,
  SkillDetail,
  SkillLink,
  SkillSourceType,
} from '../types'
import {
  useAgents,
  useConfig,
  useLinks,
  useOnline,
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

  // 在线搜索状态
  searchMode: 'local' | 'online'
  onlineSearchResults: RemoteSkill[]
  onlineSearchLoading: boolean
  remoteSkillDetail: RemoteSkillDetail | null

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
  setSearchMode: (mode: 'local' | 'online') => void
  searchOnline: (query: string) => Promise<void>
  getRemoteDetail: (source: SkillSourceType, id: string) => Promise<void>
  installFromOnline: (source: SkillSourceType, id: string, url: string) => Promise<void>
  installFromGit: (url: string) => Promise<void>
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
  searchMode: 'local',
  onlineSearchResults: [],
  onlineSearchLoading: false,
  remoteSkillDetail: null,
  view: 'dashboard',
  sidebarOpen: true,
  installDialogOpen: false,

  loadSkills: async () => {
    const { listSkills } = useSkills()
    const { getSkillLinks } = useLinks()

    try {
      const skills = await listSkills()
      // 批量加载所有 skill 的链接状态，用于筛选
      const entries = await Promise.all(
        skills.map(async (skill) => {
          const links = await getSkillLinks(skill.name)
          return [skill.name, links] as const
        })
      )
      set({
        skills,
        agentLinks: new Map(entries),
      })
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

      set((state) => ({
        selectedSkill: name,
        skillDetail: detail,
        agentLinks: new Map(state.agentLinks).set(name, links),
        view: 'detail',
      }))
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
    const { batchDisable } = useLinks()
    try {
      await batchDisable(skillNames, agentIds)
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

  setSearchMode: (mode: 'local' | 'online') => {
    set({ searchMode: mode })
  },

  searchOnline: async (query: string) => {
    const { searchOnline: search } = useOnline()

    set({ searchQuery: query })

    if (!query.trim()) {
      set({ onlineSearchResults: [], view: 'list' })
      return
    }

    set({ onlineSearchLoading: true })

    try {
      const results = await search(query)
      set({ onlineSearchResults: results, onlineSearchLoading: false, view: 'search' })
    } catch (error) {
      console.error('Online search failed:', error)
      set({ onlineSearchLoading: false })
    }
  },

  getRemoteDetail: async (source: SkillSourceType, id: string) => {
    const { getRemoteSkillDetail } = useOnline()

    try {
      const detail = await getRemoteSkillDetail(source, id)
      set({ remoteSkillDetail: detail, view: 'search' })
    } catch (error) {
      console.error('Failed to get remote skill detail:', error)
    }
  },

  installFromOnline: async (source: SkillSourceType, id: string, url: string) => {
    const { installFromOnline: install } = useOnline()

    try {
      const result = await install(source, id, url, false)

      if ('already_exists' in result) {
        const overwrite = window.confirm('该 Skill 已存在，是否覆盖？')
        if (overwrite) {
          await install(source, id, url, true)
        } else {
          return
        }
      } else if ('failed' in result) {
        throw new Error(result.failed.reason)
      }

      await get().loadSkills()
    } catch (error) {
      console.error('Failed to install from online:', error)
      throw error
    }
  },

  installFromGit: async (url: string) => {
    const { installFromGit: install } = useOnline()

    try {
      const result = await install(url, false)

      if ('already_exists' in result) {
        const overwrite = window.confirm('该 Skill 已存在，是否覆盖？')
        if (overwrite) {
          await install(url, true)
        } else {
          return
        }
      } else if ('failed' in result) {
        throw new Error(result.failed.reason)
      }

      await get().loadSkills()
    } catch (error) {
      console.error('Failed to install from git:', error)
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
