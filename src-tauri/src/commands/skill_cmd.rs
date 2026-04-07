use crate::core::installer::Installer;
use crate::core::registry::{RegistryManager, Skill, SkillDetail};
use crate::error::Result;
use std::path::Path;
use tauri::State;

use super::config_cmd::AppState;
use super::SkillFilter;

/// 列出所有 skills
#[tauri::command]
pub async fn list_skills(
    state: State<'_, AppState>,
    filter: Option<SkillFilter>,
) -> Result<Vec<Skill>> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let registry = RegistryManager::new(manager.get_config());
    let skills = registry.list_skills()?;

    // 应用过滤器
    let filtered = if let Some(f) = filter {
        if f.enabled_only.unwrap_or(false) {
            // TODO: 实现启用状态过滤
            skills
        } else {
            skills
        }
    } else {
        skills
    };

    Ok(filtered)
}

/// 获取 skill 详情
#[tauri::command]
pub async fn get_skill_detail(
    state: State<'_, AppState>,
    name: String,
) -> Result<SkillDetail> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let registry = RegistryManager::new(manager.get_config());
    let detail = registry.get_skill_detail(&name)?;
    Ok(detail)
}

/// 从本地路径安装
#[tauri::command]
pub async fn install_skill_from_path(
    state: State<'_, AppState>,
    path: String,
) -> Result<Skill> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let installer = Installer::new(manager.get_config());
    let skill = installer.install_from_path(Path::new(&path))?;
    Ok(skill)
}

/// 卸载 skill
#[tauri::command]
pub async fn uninstall_skill(
    state: State<'_, AppState>,
    name: String,
) -> Result<()> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let installer = Installer::new(manager.get_config());
    installer.uninstall(&name)?;
    Ok(())
}

/// 更新 SKILL.md
#[tauri::command]
pub async fn update_skill_md(
    state: State<'_, AppState>,
    name: String,
    content: String,
) -> Result<()> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let registry = RegistryManager::new(manager.get_config());
    registry.update_skill_md(&name, &content)?;
    Ok(())
}
