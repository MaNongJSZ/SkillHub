use crate::core::agent::{Agent, AgentManager};
use crate::error::Result;
use tauri::State;

use super::config_cmd::AppState;

/// 自动检测 agents
#[tauri::command]
pub async fn detect_agents(_state: State<'_, AppState>) -> Result<Vec<Agent>> {
    let manager = AgentManager::new();
    let agents = manager.list_agents();
    Ok(agents)
}

/// 列出所有 agents
#[tauri::command]
pub async fn list_agents(_state: State<'_, AppState>) -> Result<Vec<Agent>> {
    // 实际应用中应该缓存 agent 列表
    let manager = AgentManager::new();
    let agents = manager.list_agents();
    Ok(agents)
}

/// 添加自定义 agent
#[tauri::command]
pub async fn add_custom_agent(
    _state: State<'_, AppState>,
    agent: Agent,
) -> Result<Agent> {
    let mut manager = AgentManager::new();
    manager.add_agent(agent.clone())?;
    Ok(agent)
}

/// 移除 agent
#[tauri::command]
pub async fn remove_agent(
    _state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    let mut manager = AgentManager::new();
    manager.remove_agent(&id)?;
    Ok(())
}
