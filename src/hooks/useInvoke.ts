import { invoke } from "@tauri-apps/api/core";
import type {
  Agent,
  AppConfig,
  InstallResult,
  RemoteSkill,
  RemoteSkillDetail,
  SearchResult,
  Skill,
  SkillDetail,
  SkillFilter,
  SkillLink,
  SkillSourceType,
} from "../types";

export const useConfig = () => ({
  getConfig: () => invoke<AppConfig>("get_config"),
  updateConfig: (config: AppConfig) => invoke("update_config", { config }),
});

export const useSkills = () => ({
  listSkills: (filter?: SkillFilter) => invoke<Skill[]>("list_skills", { filter }),
  getSkillDetail: (name: string) => invoke<SkillDetail>("get_skill_detail", { name }),
  installFromPath: (path: string) => invoke<Skill>("install_skill_from_path", { path }),
  uninstallSkill: (name: string) => invoke("uninstall_skill", { name }),
  updateSkillMd: (name: string, content: string) =>
    invoke("update_skill_md", { name, content }),
});

export const useAgents = () => ({
  detectAgents: () => invoke<Agent[]>("detect_agents"),
  listAgents: () => invoke<Agent[]>("list_agents"),
  addCustomAgent: (agent: Agent) => invoke<Agent>("add_custom_agent", { agent }),
  removeAgent: (id: string) => invoke("remove_agent", { id }),
});

export const useLinks = () => ({
  enableSkill: (skillName: string, agentId: string) =>
    invoke("enable_skill", { skillName, agentId }),
  disableSkill: (skillName: string, agentId: string) =>
    invoke("disable_skill", { skillName, agentId }),
  batchEnable: (skillNames: string[], agentIds: string[]) =>
    invoke("batch_enable", { skillNames, agentIds }),
  getSkillLinks: (skillName: string) =>
    invoke<SkillLink[]>("get_skill_links", { skillName }),
});

export const useSearch = () => ({
  searchLocal: (query: string) => invoke<SearchResult[]>("search_local", { query }),
  searchContent: (query: string) =>
    invoke<SearchResult[]>("search_content", { query }),
});

export const useOnline = () => ({
  searchOnline: (query: string) => invoke<RemoteSkill[]>("search_online", { query }),
  getRemoteSkillDetail: (source: SkillSourceType, id: string) =>
    invoke<RemoteSkillDetail>("get_remote_skill_detail", { source, id }),
  installFromOnline: (source: SkillSourceType, id: string, url: string, overwrite: boolean) =>
    invoke<InstallResult>("install_from_online", { source, id, url, overwrite }),
  installFromGit: (url: string, overwrite: boolean) =>
    invoke<InstallResult>("install_from_git", { url, overwrite }),
});
