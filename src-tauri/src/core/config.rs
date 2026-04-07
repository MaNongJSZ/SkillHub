use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 中央仓库路径
    pub registry_path: PathBuf,

    /// 缓存目录路径
    pub cache_path: PathBuf,

    /// AgentSkills.io API Key
    pub agentskills_api_key: Option<String>,

    /// 外部编辑器路径
    pub external_editor: Option<String>,

    /// 启动时自动检测 agent
    pub auto_detect_agents: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        let home = dirs::home_dir().expect("无法获取用户主目录");
        let skillforge_dir = skillforge_dir(&home);

        Self {
            registry_path: shared_skills_dir(&home),
            cache_path: skillforge_dir.join("cache"),
            agentskills_api_key: None,
            external_editor: None,
            auto_detect_agents: true,
        }
    }
}

/// 配置管理器
pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}

impl ConfigManager {
    /// 创建新的配置管理器
    pub fn new() -> Result<Self> {
        let home = dirs::home_dir().ok_or_else(|| {
            crate::error::SkillHubError::ConfigDirCreationFailed
        })?;

        let skillforge_dir = skillforge_dir(&home);

        // 创建目录
        std::fs::create_dir_all(&skillforge_dir)?;

        let config_path = skillforge_dir.join("config.json");
        let mut config = if config_path.exists() {
            // 读取现有配置
            let content = std::fs::read_to_string(&config_path)?;
            serde_json::from_str(&content)?
        } else {
            // 使用默认配置
            let default_config = AppConfig::default();
            let content = serde_json::to_string_pretty(&default_config)?;
            std::fs::write(&config_path, content)?;
            default_config
        };

        let migrated = migrate_registry_path_if_needed(&home, &mut config);

        if !config.registry_path.exists() {
            std::fs::create_dir_all(&config.registry_path)?;
        }
        if !config.cache_path.exists() {
            std::fs::create_dir_all(&config.cache_path)?;
        }

        if migrated {
            let content = serde_json::to_string_pretty(&config)?;
            std::fs::write(&config_path, content)?;
        }

        Ok(Self {
            config_path,
            config,
        })
    }

    /// 获取配置
    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }

    /// 更新配置
    pub fn update_config(&mut self, new_config: AppConfig) -> Result<()> {
        self.config = new_config.clone();

        // 创建必要的目录
        if !self.config.registry_path.exists() {
            std::fs::create_dir_all(&self.config.registry_path)?;
        }
        if !self.config.cache_path.exists() {
            std::fs::create_dir_all(&self.config.cache_path)?;
        }

        // 写入配置文件
        let content = serde_json::to_string_pretty(&new_config)?;
        std::fs::write(&self.config_path, content)?;

        Ok(())
    }
}

fn skillforge_dir(home: &Path) -> PathBuf {
    home.join(".skillhub")
}

fn legacy_registry_dir(home: &Path) -> PathBuf {
    skillforge_dir(home).join("registry")
}

fn shared_skills_dir(home: &Path) -> PathBuf {
    home.join(".cc-switch").join("skills")
}

fn migrate_registry_path_if_needed(home: &Path, config: &mut AppConfig) -> bool {
    let legacy_path = legacy_registry_dir(home);
    let shared_path = shared_skills_dir(home);

    if config.registry_path == legacy_path && !legacy_path.exists() && shared_path.exists() {
        config.registry_path = shared_path;
        return true;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert!(config.registry_path.ends_with(".cc-switch/skills"));
        assert!(config.cache_path.ends_with(".skillhub/cache"));
        assert!(config.auto_detect_agents);
    }

    #[test]
    fn test_migrate_registry_path_if_needed() {
        let home = std::env::temp_dir().join("skillforge-config-migrate");
        let legacy = legacy_registry_dir(&home);
        let shared = shared_skills_dir(&home);
        let cache = skillforge_dir(&home).join("cache");

        std::fs::create_dir_all(shared.parent().unwrap()).unwrap();
        std::fs::create_dir_all(&shared).unwrap();

        let mut config = AppConfig {
            registry_path: legacy,
            cache_path: cache,
            agentskills_api_key: None,
            external_editor: None,
            auto_detect_agents: true,
        };

        let migrated = migrate_registry_path_if_needed(&home, &mut config);

        assert!(migrated);
        assert_eq!(config.registry_path, shared);

        let _ = std::fs::remove_dir_all(skillforge_dir(&home));
        let _ = std::fs::remove_dir_all(home.join(".cc-switch"));
    }
}
