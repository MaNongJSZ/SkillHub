use crate::core::config::{AppConfig, ConfigManager};
use crate::error::Result;
use std::sync::Mutex;
use tauri::State;

/// 全局状态
pub struct AppState {
    pub config_manager: Mutex<ConfigManager>,
}

/// 获取配置
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<AppConfig> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    let config = manager.get_config().clone();
    Ok(config)
}

/// 更新配置
#[tauri::command]
pub async fn update_config(
    state: State<'_, AppState>,
    config: AppConfig,
) -> Result<()> {
    let mut manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillHubError::IoError(e.to_string()))?;

    manager.update_config(config)?;
    Ok(())
}
