export interface Skill {
  name: string;
  description: string;
  tags: string[];
  path: string;
  installed_at: number;
  group?: string;
}

export interface SkillDetail {
  skill: Skill;
  content: string;
}

export interface Agent {
  id: string;
  name: string;
  skills_path: string;
  workspace_path: string | null;
  detected: boolean;
}

export interface SkillLink {
  skill_name: string;
  agent_id: string;
  link_path: string;
  is_enabled: boolean;
  is_managed_link: boolean;
}

export type MatchedField = "Name" | "Description" | "Tag" | "Content";

export interface SearchResult {
  skill_name: string;
  matched_field: MatchedField;
  matched_text: string;
  relevance: number;
}

export interface AppConfig {
  registry_path: string;
  cache_path: string;
  agentskills_api_key: string | null;
  external_editor: string | null;
  auto_detect_agents: boolean;
  github_token: string | null;
  cache_ttl_minutes: number;
}

export interface SkillFilter {
  enabled_only?: boolean;
  agent_id?: string;
}

// === 在线发现与安装类型 ===

export type SkillSourceType = 'github'

export interface RemoteSkill {
  id: string
  name: string
  description: string
  source: SkillSourceType
  install_url: string
  author: string
  tags: string[]
}

export interface RemoteSkillDetail {
  skill: RemoteSkill
  content: string
  file_count: number
  last_updated: string
}

export type InstallResult =
  | { installed: { path: string } }
  | { already_exists: { path: string } }
  | { failed: { reason: string } }
