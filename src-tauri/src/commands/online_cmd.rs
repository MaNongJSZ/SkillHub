use crate::core::cache::SearchCache;
use crate::core::config::AppConfig;
use crate::core::git_clone;
use crate::core::github_source::GitHubSource;
use crate::core::source::{InstallResult, RemoteSkill, RemoteSkillDetail, SkillSource, SkillSourceType};
use crate::error::{Result, SkillHubError};
use tauri::State;

use super::config_cmd::AppState;

/// 从 AppState 中获取 config 的 clone（同步释放锁）
fn get_config(state: &State<'_, AppState>) -> Result<AppConfig> {
    let manager = state
        .config_manager
        .lock()
        .map_err(|e| SkillHubError::IoError(e.to_string()))?;
    Ok(manager.get_config().clone())
}

/// 在线搜索（GitHub 仓库）
#[tauri::command]
pub async fn search_online(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<RemoteSkill>> {
    let config = get_config(&state)?;

    // 检查缓存
    let cache = SearchCache::new(config.cache_path.clone(), config.cache_ttl_minutes);
    if let Some(cached) = cache.get(&query) {
        return Ok(cached);
    }

    let github = GitHubSource::new(config.github_token.clone());
    let results = github.search(query.trim()).await?;

    // 写入缓存
    if let Err(e) = cache.set(&query, results.clone()) {
        log::warn!("写入搜索缓存失败: {}", e);
    }

    Ok(results)
}

/// 获取远程 skill 详情（预览用）
#[tauri::command]
pub async fn get_remote_skill_detail(
    state: State<'_, AppState>,
    _source: SkillSourceType,
    id: String,
) -> Result<RemoteSkillDetail> {
    let config = get_config(&state)?;

    let github = GitHubSource::new(config.github_token);
    github.get_detail(&id).await
}

/// 从在线源安装 skill（clone 到 registry）
#[tauri::command]
pub async fn install_from_online(
    state: State<'_, AppState>,
    _source: SkillSourceType,
    id: String,
    url: String,
    overwrite: bool,
) -> Result<InstallResult> {
    let config = get_config(&state)?;

    let github = GitHubSource::new(config.github_token);
    github.install(&id, &url, &config.registry_path, overwrite).await
}

/// 从 Git URL 直接安装
#[tauri::command]
pub async fn install_from_git(
    state: State<'_, AppState>,
    url: String,
    overwrite: bool,
) -> Result<InstallResult> {
    let config = get_config(&state)?;

    git_clone::git_clone_to_registry(&url, &config.registry_path, overwrite).await
}
