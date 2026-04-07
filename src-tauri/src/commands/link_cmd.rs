use crate::core::agent::AgentManager;
use crate::core::registry::RegistryManager;
use crate::core::symlink;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

use super::config_cmd::AppState;

/// Skill 链接状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillLink {
    pub skill_name: String,
    pub agent_id: String,
    pub link_path: PathBuf,
    pub is_enabled: bool,
    pub is_managed_link: bool,
}

/// 获取配置的辅助函数
fn get_config_from_state(state: &State<'_, AppState>) -> Result<crate::core::config::AppConfig> {
    let manager = state
        .config_manager
        .lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;
    Ok(manager.get_config().clone())
}

/// 启用单个 skill 到 agent 的核心逻辑
fn do_enable_skill(
    config: &crate::core::config::AppConfig,
    skill_name: &str,
    agent_id: &str,
) -> Result<()> {
    let registry = RegistryManager::new(config);
    let skill = registry.get_skill_detail(skill_name)?;

    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();

    let agent = agents
        .iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| crate::error::SkillHubError::AgentNotFound(agent_id.to_string()))?;

    // 确保目录存在
    agent.ensure_skills_dir()?;

    // 创建 symlink
    let source = &skill.skill.path;
    let target = &agent.skills_path.join(skill_name);

    if target.exists() {
        return Ok(());
    }

    symlink::create_skill_link(source, target)?;

    Ok(())
}

/// 禁用单个 skill 的核心逻辑
fn do_disable_skill(skill_name: &str, agent_id: &str) -> Result<()> {
    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();

    let agent = agents
        .iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| crate::error::SkillHubError::AgentNotFound(agent_id.to_string()))?;

    let target = &agent.skills_path.join(skill_name);

    if !target.exists() || !symlink::is_skill_link(target) {
        return Ok(());
    }

    symlink::remove_skill_link(target)?;

    Ok(())
}

/// 启用 skill 到 agent
#[tauri::command]
pub async fn enable_skill(
    state: State<'_, AppState>,
    skill_name: String,
    agent_id: String,
) -> Result<()> {
    let config = get_config_from_state(&state)?;
    do_enable_skill(&config, &skill_name, &agent_id)
}

/// 禁用 skill
#[tauri::command]
pub async fn disable_skill(
    _state: State<'_, AppState>,
    skill_name: String,
    agent_id: String,
) -> Result<()> {
    do_disable_skill(&skill_name, &agent_id)
}

/// 批量启用
#[tauri::command]
pub async fn batch_enable(
    state: State<'_, AppState>,
    skill_names: Vec<String>,
    agent_ids: Vec<String>,
) -> Result<()> {
    let config = get_config_from_state(&state)?;

    for skill_name in &skill_names {
        for agent_id in &agent_ids {
            do_enable_skill(&config, skill_name, agent_id)?;
        }
    }
    Ok(())
}

/// 批量禁用
#[tauri::command]
pub async fn batch_disable(
    _state: State<'_, AppState>,
    skill_names: Vec<String>,
    agent_ids: Vec<String>,
) -> Result<()> {
    for skill_name in &skill_names {
        for agent_id in &agent_ids {
            do_disable_skill(skill_name, agent_id)?;
        }
    }
    Ok(())
}

/// 获取 skill 的所有链接状态
#[tauri::command]
pub async fn get_skill_links(
    _state: State<'_, AppState>,
    skill_name: String,
) -> Result<Vec<SkillLink>> {
    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();

    let mut links = Vec::new();

    for agent in agents {
        let link_path = agent.skills_path.join(&skill_name);
        let is_managed_link = symlink::is_skill_link(&link_path);
        let is_enabled = link_path.exists();

        links.push(SkillLink {
            skill_name: skill_name.clone(),
            agent_id: agent.id.clone(),
            link_path,
            is_enabled,
            is_managed_link,
        });
    }

    Ok(links)
}
