use crate::core::agent::{AgentKind, AgentManager};
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

    // Claude Desktop 需要同步 manifest.json
    if agent.kind == AgentKind::ClaudeDesktop {
        if let Some(manifest_dir) = agent.skills_path.parent() {
            crate::core::claude_desktop::Manifest::add_skill(
                manifest_dir,
                skill_name,
                &skill.skill.description,
            )?;
        }
    }

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

    // Claude Desktop 需要同步 manifest.json
    if agent.kind == AgentKind::ClaudeDesktop {
        if let Some(manifest_dir) = agent.skills_path.parent() {
            crate::core::claude_desktop::Manifest::remove_skill(manifest_dir, skill_name)?;
        }
    }

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

/// 未托管的 Skill 信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnmanagedSkill {
    pub name: String,
    pub agent_id: String,
    pub path: PathBuf,
}

/// 检测所有 agent 目录中未托管（非 symlink）的 skill
#[tauri::command]
pub async fn detect_unmanaged_skills(
    _state: State<'_, AppState>,
) -> Result<Vec<UnmanagedSkill>> {
    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();
    let mut results = Vec::new();

    for agent in &agents {
        if !agent.skills_path.exists() {
            continue;
        }

        for entry in std::fs::read_dir(&agent.skills_path)? {
            let entry = entry?;
            let path = entry.path();

            if !path.is_dir() {
                continue;
            }

            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                // 跳过隐藏目录
                if name.starts_with('.') {
                    continue;
                }

                // 已是 symlink/junction → 托管的，跳过
                if symlink::is_skill_link(&path) {
                    continue;
                }

                // 检查是否有 SKILL.md（独立 skill）
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    results.push(UnmanagedSkill {
                        name: name.to_string(),
                        agent_id: agent.id.clone(),
                        path: path.clone(),
                    });
                } else {
                    // 无 SKILL.md → 可能是分组目录，扫描内部子 skill
                    for sub_entry in std::fs::read_dir(&path)? {
                        let sub_entry = sub_entry?;
                        let sub_path = sub_entry.path();

                        if !sub_path.is_dir() {
                            continue;
                        }

                        if let Some(sub_name) = sub_path.file_name().and_then(|n| n.to_str()) {
                            if sub_name.starts_with('.') {
                                continue;
                            }

                            // 已是 symlink/junction → 跳过
                            if symlink::is_skill_link(&sub_path) {
                                continue;
                            }

                            let full_name = format!("{name}/{sub_name}");
                            results.push(UnmanagedSkill {
                                name: full_name,
                                agent_id: agent.id.clone(),
                                path: sub_path.clone(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(results)
}

/// 导入未托管的 skill（转为 symlink 管理）
#[tauri::command]
pub async fn import_unmanaged_skill(
    state: State<'_, AppState>,
    name: String,
    agent_id: String,
) -> Result<()> {
    let config = get_config_from_state(&state)?;
    let registry_path = &config.registry_path;
    let registry_skill = registry_path.join(&name);

    let agent_manager = AgentManager::new();
    let agents = agent_manager.list_agents();
    let agent = agents
        .iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| crate::error::SkillHubError::AgentNotFound(agent_id.clone()))?;

    let agent_skill = agent.skills_path.join(&name);

    if !agent_skill.exists() {
        return Err(crate::error::SkillHubError::SkillNotFound(format!(
            "Skill '{name}' not found in agent '{agent_id}'"
        )));
    }

    // 如果已是 symlink，无需处理
    if symlink::is_skill_link(&agent_skill) {
        return Ok(());
    }

    // 如果中央仓库没有该 skill，先复制过去
    if !registry_skill.exists() {
        // 复制整个目录到中央仓库
        copy_dir_recursive(&agent_skill, &registry_skill)?;
    }

    // 删除 agent 目录中的副本
    std::fs::remove_dir_all(&agent_skill)?;

    // 创建 symlink
    symlink::create_skill_link(&registry_skill, &agent_skill)?;

    Ok(())
}

/// 递归复制目录
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<()> {
    std::fs::create_dir_all(dst)?;

    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}
