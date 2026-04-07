use crate::core::config::AppConfig;
use crate::error::{Result, SkillHubError};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::SystemTime;

/// Skill 基础信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// Skill 名称
    pub name: String,

    /// Skill 描述（从 SKILL.md 提取）
    pub description: String,

    /// 标签列表
    pub tags: Vec<String>,

    /// Skill 目录路径
    pub path: PathBuf,

    /// 安装时间
    #[serde(with = "serde_system_time")]
    pub installed_at: SystemTime,
}

/// Skill 详情（包含完整内容）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDetail {
    /// Skill 基础信息
    pub skill: Skill,

    /// SKILL.md 完整内容
    pub content: String,
}

/// SystemTime 序列化模块
mod serde_system_time {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::SystemTime;

    pub fn serialize<S>(time: &SystemTime, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let duration = time
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(serde::ser::Error::custom)?;
        serializer.serialize_u64(duration.as_secs())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<SystemTime, D::Error>
    where
        D: Deserializer<'de>,
    {
        let secs = u64::deserialize(deserializer)?;
        SystemTime::UNIX_EPOCH
            .checked_add(std::time::Duration::from_secs(secs))
            .ok_or_else(|| serde::de::Error::custom("invalid SystemTime value"))
    }
}

/// 中央仓库管理器
pub struct RegistryManager {
    /// 中央仓库路径
    pub registry_path: PathBuf,
}

impl RegistryManager {
    /// 创建新的仓库管理器
    pub fn new(config: &AppConfig) -> Self {
        Self {
            registry_path: config.registry_path.clone(),
        }
    }

    /// 列出所有 skills
    pub fn list_skills(&self) -> Result<Vec<Skill>> {
        let mut skills = Vec::new();

        // 确保仓库目录存在
        if !self.registry_path.exists() {
            return Ok(skills);
        }

        // 遍历仓库目录
        for entry in fs::read_dir(&self.registry_path)? {
            let entry = entry?;
            let path = entry.path();

            // 只处理目录
            if path.is_dir() {
                if let Some(skill_name) = path.file_name().and_then(|n| n.to_str()) {
                    // 跳过隐藏目录
                    if skill_name.starts_with('.') {
                        continue;
                    }

                    // 尝试加载 skill 信息
                    if let Ok(skill) = self.load_skill_info(skill_name) {
                        skills.push(skill);
                    }
                }
            }
        }

        // 按名称排序
        skills.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(skills)
    }

    /// 加载单个 skill 信息
    pub fn load_skill_info(&self, name: &str) -> Result<Skill> {
        let skill_path = self.registry_path.join(name);

        // 检查 skill 目录是否存在
        if !skill_path.exists() {
            return Err(SkillHubError::SkillNotFound(name.to_string()));
        }

        // 读取 SKILL.md
        let skill_md_path = skill_path.join("SKILL.md");
        if !skill_md_path.exists() {
            return Err(SkillHubError::SkillMdNotFound(name.to_string()));
        }

        let content = fs::read_to_string(&skill_md_path)?;

        // 解析 frontmatter
        let (description, tags) = self.parse_frontmatter(&content);

        // 获取安装时间（使用目录的修改时间）
        let metadata = fs::metadata(&skill_path)?;
        let installed_at = metadata.modified().unwrap_or_else(|_| SystemTime::now());

        Ok(Skill {
            name: name.to_string(),
            description,
            tags,
            path: skill_path,
            installed_at,
        })
    }

    /// 获取 skill 详情（包含完整内容）
    pub fn get_skill_detail(&self, name: &str) -> Result<SkillDetail> {
        let skill = self.load_skill_info(name)?;

        let skill_md_path = skill.path.join("SKILL.md");
        let content = fs::read_to_string(&skill_md_path)?;

        Ok(SkillDetail { skill, content })
    }

    /// 从 SKILL.md 内容中解析 frontmatter
    /// 返回 (description, tags)
    pub fn parse_frontmatter(&self, content: &str) -> (String, Vec<String>) {
        let mut description = String::new();
        let mut tags = Vec::new();
        let mut in_frontmatter = false;
        let mut frontmatter_lines = Vec::new();

        for line in content.lines() {
            // 检测 frontmatter 开始标记
            if line.trim() == "---" {
                if !in_frontmatter {
                    in_frontmatter = true;
                    continue;
                } else {
                    // frontmatter 结束
                    break;
                }
            }

            if in_frontmatter {
                frontmatter_lines.push(line);
            }
        }

        // 解析 frontmatter
        for line in &frontmatter_lines {
            if let Some((key, value)) = line.split_once(':') {
                let key = key.trim();
                let value = value.trim();

                match key {
                    "description" | "desc" => {
                        description = value.to_string();
                    }
                    "tags" => {
                        // 解析标签列表，支持 [tag1, tag2] 或 tag1,tag2 格式
                        let value = value.trim_start_matches('[').trim_end_matches(']');
                        tags = value
                            .split(',')
                            .map(|t| t.trim().trim_matches('"').trim_matches('\'').to_string())
                            .filter(|t| !t.is_empty())
                            .collect();
                    }
                    _ => {}
                }
            }
        }

        // 如果没有描述，使用第一个非空行
        if description.is_empty() {
            let content_start = if frontmatter_lines.is_empty() {
                0
            } else {
                // frontmatter 有两个 --- 标记，所以从 frontmatter_lines.len() + 2 开始
                frontmatter_lines.len() + 2
            };

            for line in content.lines().skip(content_start) {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    description = trimmed.to_string();
                    break;
                }
            }
        }

        (description, tags)
    }

    /// 创建 skill 目录
    pub fn create_skill_dir(&self, name: &str) -> Result<PathBuf> {
        let skill_path = self.registry_path.join(name);

        // 如果已存在，返回错误
        if skill_path.exists() {
            return Err(SkillHubError::SkillNotFound(format!(
                "Skill '{}' already exists",
                name
            )));
        }

        // 创建目录
        fs::create_dir_all(&skill_path)?;

        Ok(skill_path)
    }

    /// 删除 skill
    pub fn delete_skill(&self, name: &str) -> Result<()> {
        let skill_path = self.registry_path.join(name);

        // 检查是否存在
        if !skill_path.exists() {
            return Err(SkillHubError::SkillNotFound(name.to_string()));
        }

        // 删除目录
        fs::remove_dir_all(&skill_path)?;

        Ok(())
    }

    /// 更新 SKILL.md 内容
    pub fn update_skill_md(&self, name: &str, content: &str) -> Result<()> {
        let skill_path = self.registry_path.join(name);

        // 检查 skill 是否存在
        if !skill_path.exists() {
            return Err(SkillHubError::SkillNotFound(name.to_string()));
        }

        // 写入 SKILL.md
        let skill_md_path = skill_path.join("SKILL.md");
        fs::write(&skill_md_path, content)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_registry() -> (TempDir, AppConfig) {
        let temp_dir = TempDir::new().unwrap();
        let registry_path = temp_dir.path().join("registry");
        fs::create_dir_all(&registry_path).unwrap();

        let config = AppConfig {
            registry_path,
            cache_path: temp_dir.path().join("cache"),
            agentskills_api_key: None,
            external_editor: None,
            auto_detect_agents: true,
        };

        (temp_dir, config)
    }

    #[test]
    fn test_parse_frontmatter_with_description_and_tags() {
        let registry = RegistryManager {
            registry_path: PathBuf::from("/tmp"),
        };

        let content = r#"---
description: A test skill
tags: [test, example]
---
# Test Skill

This is a test skill content.
"#;

        let (description, tags) = registry.parse_frontmatter(content);

        assert_eq!(description, "A test skill");
        assert_eq!(tags, vec!["test", "example"]);
    }

    #[test]
    fn test_parse_frontmatter_without_description() {
        let registry = RegistryManager {
            registry_path: PathBuf::from("/tmp"),
        };

        let content = r#"---
tags: [test, example]
---
# Test Skill

This is a test skill content.
"#;

        let (description, tags) = registry.parse_frontmatter(content);

        assert_eq!(description, "This is a test skill content.");
        assert_eq!(tags, vec!["test", "example"]);
    }

    #[test]
    fn test_parse_frontmatter_no_frontmatter() {
        let registry = RegistryManager {
            registry_path: PathBuf::from("/tmp"),
        };

        let content = r#"# Test Skill

This is a test skill content.
"#;

        let (description, tags) = registry.parse_frontmatter(content);

        assert_eq!(description, "This is a test skill content.");
        assert!(tags.is_empty());
    }

    #[test]
    fn test_parse_frontmatter_tags_without_brackets() {
        let registry = RegistryManager {
            registry_path: PathBuf::from("/tmp"),
        };

        let content = r#"---
tags: test, example, demo
---
# Test Skill
"#;

        let (description, tags) = registry.parse_frontmatter(content);

        assert_eq!(tags, vec!["test", "example", "demo"]);
    }

    #[test]
    fn test_create_and_list_skills() {
        let (_temp_dir, config) = create_test_registry();
        let registry = RegistryManager::new(&config);

        // 创建两个 skills
        let skill1_path = registry.create_skill_dir("skill1").unwrap();
        let skill2_path = registry.create_skill_dir("skill2").unwrap();

        // 写入 SKILL.md
        fs::write(
            skill1_path.join("SKILL.md"),
            "---\ndescription: First skill\ntags: [test]\n---\n# Skill 1\n",
        )
        .unwrap();

        fs::write(
            skill2_path.join("SKILL.md"),
            "---\ndescription: Second skill\ntags: [demo]\n---\n# Skill 2\n",
        )
        .unwrap();

        // 列出 skills
        let skills = registry.list_skills().unwrap();

        assert_eq!(skills.len(), 2);
        assert_eq!(skills[0].name, "skill1");
        assert_eq!(skills[1].name, "skill2");
        assert_eq!(skills[0].description, "First skill");
        assert_eq!(skills[1].description, "Second skill");
    }

    #[test]
    fn test_get_skill_detail() {
        let (_temp_dir, config) = create_test_registry();
        let registry = RegistryManager::new(&config);

        let skill_path = registry.create_skill_dir("detail-test").unwrap();
        let content = "---\ndescription: Test detail\ntags: [test]\n---\n# Content\n\nSome content here.";
        fs::write(skill_path.join("SKILL.md"), content).unwrap();

        let detail = registry.get_skill_detail("detail-test").unwrap();

        assert_eq!(detail.skill.name, "detail-test");
        assert_eq!(detail.skill.description, "Test detail");
        assert_eq!(detail.content, content);
    }

    #[test]
    fn test_skill_detail_serializes_with_nested_skill() {
        let detail = SkillDetail {
            skill: Skill {
                name: "nested-test".to_string(),
                description: "Nested skill".to_string(),
                tags: vec!["test".to_string()],
                path: PathBuf::from("/tmp/nested-test"),
                installed_at: SystemTime::UNIX_EPOCH,
            },
            content: "content".to_string(),
        };

        let value = serde_json::to_value(&detail).unwrap();

        assert!(value.get("skill").is_some());
        assert_eq!(value["skill"]["name"], "nested-test");
        assert_eq!(value["content"], "content");
    }

    #[test]
    fn test_delete_skill() {
        let (_temp_dir, config) = create_test_registry();
        let registry = RegistryManager::new(&config);

        registry.create_skill_dir("to-delete").unwrap();

        assert!(registry.registry_path.join("to-delete").exists());

        registry.delete_skill("to-delete").unwrap();

        assert!(!registry.registry_path.join("to-delete").exists());
    }

    #[test]
    fn test_update_skill_md() {
        let (_temp_dir, config) = create_test_registry();
        let registry = RegistryManager::new(&config);

        let skill_path = registry.create_skill_dir("update-test").unwrap();
        fs::write(
            skill_path.join("SKILL.md"),
            "Old content",
        )
        .unwrap();

        registry
            .update_skill_md("update-test", "New content")
            .unwrap();

        let new_content = fs::read_to_string(skill_path.join("SKILL.md")).unwrap();
        assert_eq!(new_content, "New content");
    }

    #[test]
    fn test_load_nonexistent_skill() {
        let (_temp_dir, config) = create_test_registry();
        let registry = RegistryManager::new(&config);

        let result = registry.load_skill_info("nonexistent");

        assert!(result.is_err());
        match result.unwrap_err() {
            SkillHubError::SkillNotFound(name) => assert_eq!(name, "nonexistent"),
            _ => panic!("Expected SkillNotFound error"),
        }
    }
}
