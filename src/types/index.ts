export interface Skill {
  name: string;
  description: string;
  tags: string[];
  path: string;
  installed_at: number;
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
}

export interface SkillFilter {
  enabled_only?: boolean;
  agent_id?: string;
}
