use crate::core::search::{SearchManager, SearchResult};
use crate::error::Result;
use tauri::State;

use super::config_cmd::AppState;

/// 本地搜索（名称/描述/标签）
#[tauri::command]
pub async fn search_local(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResult>> {
    let manager = state
        .config_manager
        .lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let search = SearchManager::new(manager.get_config());
    let results = search.search_local(&query);
    Ok(results)
}

/// 内容搜索（SKILL.md 全文）
#[tauri::command]
pub async fn search_content(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResult>> {
    let manager = state
        .config_manager
        .lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let search = SearchManager::new(manager.get_config());
    let results = search.search_content(&query);
    Ok(results)
}
