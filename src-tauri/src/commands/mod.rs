pub mod agent_cmd;
pub mod config_cmd;
pub mod link_cmd;
pub mod search_cmd;
pub mod skill_cmd;

// 公共类型
use serde::{Deserialize, Serialize};

/// Skill 过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillFilter {
    pub enabled_only: Option<bool>,
    pub agent_id: Option<String>,
}
