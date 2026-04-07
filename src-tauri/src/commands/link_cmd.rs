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

/// 启用 skill 到 agent
#[tauri::command]
pub async fn enable_skill(
    state: State<'_, AppState>,
    skill_name: String,
    agent_id: String,
) -> Result<()> {
    let config_manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let registry = RegistryManager::new(config_manager.get_config());
    let skill = registry.get_skill_detail(&skill_name)?;

    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();

    let agent = agents.iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| crate::error::SkillHubError::AgentNotFound(agent_id.clone()))?;

    // 确保目录存在
    agent.ensure_skills_dir()?;

    // 创建 symlink
    let source = &skill.skill.path;
    let target = &agent.skills_path.join(&skill_name);

    if target.exists() {
        return Ok(());
    }

    symlink::create_skill_link(source, target)?;

    Ok(())
}

/// 禁用 skill
#[tauri::command]
pub async fn disable_skill(
    _state: State<'_, AppState>,
    skill_name: String,
    agent_id: String,
) -> Result<()> {
    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();

    let agent = agents.iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| crate::error::SkillHubError::AgentNotFound(agent_id.clone()))?;

    let target = &agent.skills_path.join(&skill_name);

    if !target.exists() || !symlink::is_skill_link(target) {
        return Ok(());
    }

    symlink::remove_skill_link(target)?;

    Ok(())
}

/// 批量启用
#[tauri::command]
pub async fn batch_enable(
    state: State<'_, AppState>,
    skill_names: Vec<String>,
    agent_ids: Vec<String>,
) -> Result<()> {
    for skill_name in &skill_names {
        for agent_id in &agent_ids {
            enable_skill(state.clone(), skill_name.clone(), agent_id.clone()).await?;
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
