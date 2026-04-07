use serde::Serialize;
use thiserror::Error;

/// SkillHub 统一错误类型
#[derive(Error, Debug, Serialize)]
pub enum SkillHubError {
    #[error("IO 错误: {0}")]
    Io(String),

    #[error("JSON 序列化错误: {0}")]
    SerdeJson(String),

    #[error("Skill 不存在: {0}")]
    SkillNotFound(String),

    #[error("Agent 不存在: {0}")]
    AgentNotFound(String),

    #[error("配置目录创建失败")]
    ConfigDirCreationFailed,

    #[error("Symlink 创建失败: {0}")]
    SymlinkCreationFailed(String),

    #[error("无效的 Skill 路径: {0}")]
    InvalidSkillPath(String),

    #[error("SKILL.md 文件不存在: {0}")]
    SkillMdNotFound(String),

    #[error("Agent 已存在: {0}")]
    AgentAlreadyExists(String),

    #[error("不能删除检测到的 Agent: {0}")]
    CannotRemoveDetectedAgent(String),

    #[cfg(test)]
    #[error("无效的 Agent ID: {0}")]
    InvalidAgentId(String),

    #[error("IO 错误: {0}")]
    IoError(String),

    #[error("网络请求失败: {0}")]
    NetworkError(String),

    #[error("在线搜索失败: {0}")]
    OnlineSearchFailed(String),

    #[error("Git clone 失败: {0}")]
    GitCloneFailed(String),

    #[error("Skill 已存在: {0}")]
    #[allow(dead_code)]
    SkillAlreadyExists(String),
}

impl From<std::io::Error> for SkillHubError {
    fn from(e: std::io::Error) -> Self {
        SkillHubError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for SkillHubError {
    fn from(e: serde_json::Error) -> Self {
        SkillHubError::SerdeJson(e.to_string())
    }
}

impl From<reqwest::Error> for SkillHubError {
    fn from(e: reqwest::Error) -> Self {
        SkillHubError::NetworkError(e.to_string())
    }
}

/// Result 类型别名
pub type Result<T> = std::result::Result<T, SkillHubError>;
