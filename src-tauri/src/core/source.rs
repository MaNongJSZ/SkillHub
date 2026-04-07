use serde::{Deserialize, Serialize};
use std::path::Path;

/// 远程 skill 来源类型（目前仅 GitHub，trait 架构支持后续扩展）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceType {
    GitHub,
}

/// 远程 skill 摘要（搜索结果）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: SkillSourceType,
    pub install_url: String,
    pub author: String,
    pub tags: Vec<String>,
}

/// 远程 skill 详情（预览用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteSkillDetail {
    pub skill: RemoteSkill,
    pub content: String,
    pub file_count: u32,
    pub last_updated: String,
}

/// 在线安装结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallResult {
    Installed { path: String },
    AlreadyExists { path: String },
    Failed { reason: String },
}

/// 数据源 trait（预留扩展能力）
#[allow(async_fn_in_trait)]
pub trait SkillSource {
    /// 搜索远程 skill
    async fn search(&self, query: &str) -> crate::error::Result<Vec<RemoteSkill>>;

    /// 获取远程 skill 详情
    async fn get_detail(&self, id: &str) -> crate::error::Result<RemoteSkillDetail>;

    /// 安装远程 skill（clone 到 registry）
    async fn install(
        &self,
        id: &str,
        url: &str,
        registry_path: &Path,
        overwrite: bool,
    ) -> crate::error::Result<InstallResult>;
}
