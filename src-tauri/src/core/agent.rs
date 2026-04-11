use crate::error::{Result, SkillHubError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
#[cfg(test)]
use std::path::Path;
use std::path::PathBuf;

const CUSTOM_AGENTS_FILE: &str = "custom_agents.json";

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    /// Agent ID（例如 "claude-code", "cursor"）
    pub id: String,

    /// 显示名称
    pub name: String,

    /// 全局 skills 路径
    pub skills_path: PathBuf,

    /// 工作区路径（可选）
    pub workspace_path: Option<PathBuf>,

    /// 是否自动检测到
    pub detected: bool,
}

impl Agent {
    /// 创建新的 Agent
    pub fn new(
        id: String,
        name: String,
        skills_path: PathBuf,
        workspace_path: Option<PathBuf>,
        detected: bool,
    ) -> Self {
        Self {
            id,
            name,
            skills_path,
            workspace_path,
            detected,
        }
    }

    /// 获取 skill 的全局 symlink 路径
    #[cfg(test)]
    pub fn skill_link_path(&self, skill_name: &str) -> PathBuf {
        self.skills_path.join(skill_name).join("SKILL.md")
    }

    /// 获取 skill 的工作区 symlink 路径
    #[cfg(test)]
    pub fn workspace_skill_link_path(&self, workspace: &Path, skill_name: &str) -> PathBuf {
        if let Some(ref base_workspace) = self.workspace_path {
            // 使用配置的工作区基础路径
            base_workspace.join(workspace).join(".claude").join("skills").join(skill_name).join("SKILL.md")
        } else {
            // 使用默认路径
            workspace.join(".claude").join("skills").join(skill_name).join("SKILL.md")
        }
    }

    /// 检查 agent 的 skills 目录是否存在
    #[cfg(test)]
    pub fn skills_dir_exists(&self) -> bool {
        self.skills_path.exists()
    }

    /// 确保 agent 的 skills 目录存在
    pub fn ensure_skills_dir(&self) -> Result<()> {
        if !self.skills_path.exists() {
            fs::create_dir_all(&self.skills_path)
                .map_err(|e| SkillHubError::IoError(format!("无法创建 skills 目录: {}", e)))?;
        }
        Ok(())
    }
}

/// Agent 管理器
pub struct AgentManager {
    /// 所有已知的 agents
    agents: HashMap<String, Agent>,
}

impl AgentManager {
    fn custom_agents_file_path() -> Option<PathBuf> {
        dirs::home_dir().map(|home| home.join(".skillforge").join(CUSTOM_AGENTS_FILE))
    }

    fn load_custom_agents(&mut self) -> Result<()> {
        let Some(file_path) = Self::custom_agents_file_path() else {
            return Ok(());
        };

        if !file_path.exists() {
            return Ok(());
        }

        let content = fs::read_to_string(&file_path)?;
        let custom_agents: Vec<Agent> = serde_json::from_str(&content)?;

        for agent in custom_agents {
            // 不覆盖自动检测到的 agent，避免 detected 标志被自定义版本覆盖
            self.agents.entry(agent.id.clone()).or_insert(agent);
        }

        Ok(())
    }

    fn save_custom_agents(&self) -> Result<()> {
        let Some(file_path) = Self::custom_agents_file_path() else {
            return Ok(());
        };

        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let custom_agents: Vec<Agent> = self
            .agents
            .values()
            .filter(|agent| !agent.detected)
            .cloned()
            .collect();

        let content = serde_json::to_string_pretty(&custom_agents)?;
        fs::write(file_path, content)?;

        Ok(())
    }

    /// 创建新的 agent 管理器
    pub fn new() -> Self {
        let mut manager = Self {
            agents: HashMap::new(),
        };

        // 自动检测已安装的 agents
        manager.detect_agents();

        if let Err(err) = manager.load_custom_agents() {
            eprintln!("Failed to load custom agents: {}", err);
        }

        manager
    }

    /// 自动检测已安装的 agents
    pub fn detect_agents(&mut self) {
        let home = match dirs::home_dir() {
            Some(h) => h,
            None => return,
        };

        // 定义要检测的 agents
        let agent_configs = vec![
            (
                "claude-code",
                "Claude Code",
                home.join(".claude").join("skills"),
                None,
            ),
            (
                "cursor",
                "Cursor",
                home.join(".cursor").join("skills"),
                None,
            ),
            (
                "kiro",
                "Kiro",
                home.join(".kiro").join("skills"),
                None,
            ),
            (
                "codex",
                "OpenAI Codex",
                home.join(".codex").join("skills"),
                None,
            ),
            (
                "openclaw",
                "OpenClaw",
                home.join(".openclaw").join("skills"),
                None,
            ),
        ];

        // 检测每个 agent
        for (id, name, skills_path, workspace_path) in agent_configs {
            let detected = skills_path.exists();

            let agent = Agent::new(
                id.to_string(),
                name.to_string(),
                skills_path,
                workspace_path,
                detected,
            );

            self.agents.insert(id.to_string(), agent);
        }
    }

    /// 列出所有 agents
    pub fn list_agents(&self) -> Vec<Agent> {
        let mut agents: Vec<Agent> = self.agents.values().cloned().collect();
        // 按名称排序
        agents.sort_by(|a, b| a.name.cmp(&b.name));
        agents
    }

    /// 获取单个 agent
    #[cfg(test)]
    pub fn get_agent(&self, id: &str) -> Option<&Agent> {
        self.agents.get(id)
    }

    /// 添加自定义 agent
    pub fn add_agent(&mut self, agent: Agent) -> Result<()> {
        // 检查 ID 是否已存在
        if self.agents.contains_key(&agent.id) {
            return Err(SkillHubError::AgentAlreadyExists(agent.id.clone()));
        }

        self.agents.insert(agent.id.clone(), agent);
        self.save_custom_agents()?;
        Ok(())
    }

    /// 移除 agent
    pub fn remove_agent(&mut self, id: &str) -> Result<()> {
        // 只允许移除手动添加的 agents（detected = false）
        if let Some(agent) = self.agents.get(id) {
            if agent.detected {
                return Err(SkillHubError::CannotRemoveDetectedAgent(id.to_string()));
            }
        }

        self.agents
            .remove(id)
            .ok_or_else(|| SkillHubError::AgentNotFound(id.to_string()))?;

        self.save_custom_agents()?;
        Ok(())
    }

    /// 获取所有检测到的 agents
    #[cfg(test)]
    pub fn detected_agents(&self) -> Vec<Agent> {
        self.list_agents().into_iter().filter(|a| a.detected).collect()
    }

    /// 获取所有手动添加的 agents
    #[cfg(test)]
    pub fn custom_agents(&self) -> Vec<Agent> {
        self.list_agents()
            .into_iter()
            .filter(|a| !a.detected)
            .collect()
    }

    /// 更新 agent 信息
    #[cfg(test)]
    pub fn update_agent(&mut self, id: &str, mut updated_agent: Agent) -> Result<()> {
        // 确保 ID 一致
        if updated_agent.id != id {
            return Err(SkillHubError::InvalidAgentId(
                "Agent ID 不匹配".to_string(),
            ));
        }

        // 检查 agent 是否存在
        if !self.agents.contains_key(id) {
            return Err(SkillHubError::AgentNotFound(id.to_string()));
        }

        // 对于检测到的 agents，不允许修改 detected 状态
        if let Some(existing) = self.agents.get(id) {
            if existing.detected {
                updated_agent.detected = true;
            }
        }

        self.agents.insert(id.to_string(), updated_agent);
        Ok(())
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_agent_manager() -> (AgentManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let home = temp_dir.path();

        // 创建测试用的 agent 目录
        let claude_skills = home.join(".claude").join("skills");
        fs::create_dir_all(&claude_skills).unwrap();

        let cursor_skills = home.join(".cursor").join("skills");
        fs::create_dir_all(&cursor_skills).unwrap();

        // 创建 agent 管理器
        let manager = AgentManager::new();

        (manager, temp_dir)
    }

    #[test]
    fn test_agent_skill_link_path() {
        let agent = Agent::new(
            "claude-code".to_string(),
            "Claude Code".to_string(),
            PathBuf::from("/home/user/.claude/skills"),
            None,
            true,
        );

        let link_path = agent.skill_link_path("test-skill");
        assert!(link_path.ends_with(".claude/skills/test-skill/SKILL.md"));
    }

    #[test]
    fn test_agent_workspace_skill_link_path() {
        let agent = Agent::new(
            "claude-code".to_string(),
            "Claude Code".to_string(),
            PathBuf::from("/home/user/.claude/skills"),
            None,
            true,
        );

        let workspace = PathBuf::from("/home/user/projects/myproject");
        let link_path = agent.workspace_skill_link_path(&workspace, "test-skill");
        assert!(link_path.ends_with("myproject/.claude/skills/test-skill/SKILL.md"));
    }

    #[test]
    fn test_agent_workspace_skill_link_path_with_custom_base() {
        let workspace_base = PathBuf::from("/home/workspace");
        let agent = Agent::new(
            "claude-code".to_string(),
            "Claude Code".to_string(),
            PathBuf::from("/home/user/.claude/skills"),
            Some(workspace_base),
            true,
        );

        let project_name = PathBuf::from("myproject");
        let link_path = agent.workspace_skill_link_path(&project_name, "test-skill");
        assert!(link_path.ends_with("workspace/myproject/.claude/skills/test-skill/SKILL.md"));
    }

    #[test]
    fn test_agent_manager_new() {
        let manager = AgentManager::new();

        // 应该至少有预定义的 agents（即使目录不存在）
        let agents = manager.list_agents();
        assert!(!agents.is_empty());
    }

    #[test]
    fn test_agent_manager_list_agents() {
        let (manager, _temp_dir) = create_test_agent_manager();

        let agents = manager.list_agents();

        // 应该包含预定义的 agents
        let agent_ids: Vec<&str> = agents.iter().map(|a| a.id.as_str()).collect();
        assert!(agent_ids.contains(&"claude-code"));
        assert!(agent_ids.contains(&"cursor"));
    }

    #[test]
    fn test_agent_manager_get_agent() {
        let (manager, _temp_dir) = create_test_agent_manager();

        let agent = manager.get_agent("claude-code");
        assert!(agent.is_some());
        assert_eq!(agent.unwrap().id, "claude-code");

        let nonexistent = manager.get_agent("nonexistent");
        assert!(nonexistent.is_none());
    }

    #[test]
    fn test_agent_manager_add_custom_agent() {
        let (mut manager, _temp_dir) = create_test_agent_manager();

        let custom_agent = Agent::new(
            "custom-agent".to_string(),
            "Custom Agent".to_string(),
            PathBuf::from("/custom/path"),
            None,
            false,
        );

        assert!(manager.add_agent(custom_agent).is_ok());

        let added = manager.get_agent("custom-agent");
        assert!(added.is_some());
        assert_eq!(added.unwrap().name, "Custom Agent");
    }

    #[test]
    fn test_agent_manager_add_duplicate_agent() {
        let (mut manager, _temp_dir) = create_test_agent_manager();

        let custom_agent = Agent::new(
            "claude-code".to_string(),
            "Duplicate".to_string(),
            PathBuf::from("/duplicate/path"),
            None,
            false,
        );

        let result = manager.add_agent(custom_agent);
        assert!(result.is_err());
    }

    #[test]
    fn test_agent_manager_remove_custom_agent() {
        let (mut manager, _temp_dir) = create_test_agent_manager();

        let custom_agent = Agent::new(
            "removable".to_string(),
            "Removable Agent".to_string(),
            PathBuf::from("/removable/path"),
            None,
            false,
        );

        manager.add_agent(custom_agent).unwrap();
        assert!(manager.get_agent("removable").is_some());

        assert!(manager.remove_agent("removable").is_ok());
        assert!(manager.get_agent("removable").is_none());
    }

    #[test]
    fn test_agent_manager_cannot_remove_detected_agent() {
        let (mut manager, _temp_dir) = create_test_agent_manager();

        // 尝试删除检测到的 agent（应该失败）
        let result = manager.remove_agent("claude-code");
        assert!(result.is_err());
    }

    #[test]
    fn test_agent_manager_detected_agents() {
        let (mut manager, _temp_dir) = create_test_agent_manager();

        // 添加自定义 agent
        let custom_agent = Agent::new(
            "custom".to_string(),
            "Custom".to_string(),
            PathBuf::from("/custom/path"),
            None,
            false,
        );
        manager.add_agent(custom_agent).unwrap();

        let detected = manager.detected_agents();
        let custom = manager.custom_agents();

        // 检测到的 agents 应该不包含自定义的
        assert!(!detected.iter().any(|a| a.id == "custom"));
        assert!(custom.iter().any(|a| a.id == "custom"));
    }

    #[test]
    fn test_agent_manager_update_agent() {
        let (mut manager, temp_dir) = create_test_agent_manager();

        // 添加自定义 agent
        let custom_agent = Agent::new(
            "updatable".to_string(),
            "Old Name".to_string(),
            PathBuf::from("/old/path"),
            None,
            false,
        );
        manager.add_agent(custom_agent).unwrap();

        // 更新 agent
        let updated_agent = Agent::new(
            "updatable".to_string(),
            "New Name".to_string(),
            temp_dir.path().join("new").join("path"),
            None,
            false,
        );

        assert!(manager.update_agent("updatable", updated_agent).is_ok());

        let agent = manager.get_agent("updatable").unwrap();
        assert_eq!(agent.name, "New Name");
    }

    #[test]
    fn test_agent_manager_update_agent_id_mismatch() {
        let (mut manager, _temp_dir) = create_test_agent_manager();

        let agent = Agent::new(
            "original".to_string(),
            "Original".to_string(),
            PathBuf::from("/original/path"),
            None,
            false,
        );
        manager.add_agent(agent).unwrap();

        // 尝试用不同的 ID 更新
        let wrong_agent = Agent::new(
            "wrong".to_string(),
            "Wrong".to_string(),
            PathBuf::from("/wrong/path"),
            None,
            false,
        );

        let result = manager.update_agent("original", wrong_agent);
        assert!(result.is_err());
    }

    #[test]
    fn test_agent_skills_dir_exists() {
        let (manager, _temp_dir) = create_test_agent_manager();

        // Claude Code 应该存在（我们在测试设置中创建了目录）
        let claude = manager.get_agent("claude-code").unwrap();
        assert!(claude.skills_dir_exists());

        // Cursor 应该也存在
        let cursor = manager.get_agent("cursor").unwrap();
        assert!(cursor.skills_dir_exists());
    }
}
