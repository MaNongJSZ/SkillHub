use crate::core::config::AppConfig;
use crate::core::registry::{RegistryManager, Skill};
use crate::error::{Result, SkillHubError};
use std::fs;
use std::path::{Path, PathBuf};

/// Skill 安装器
pub struct Installer {
    /// 注册表管理器
    pub registry: RegistryManager,
}

impl Installer {
    /// 创建新的安装器
    pub fn new(config: &AppConfig) -> Self {
        Self {
            registry: RegistryManager::new(config),
        }
    }

    /// 从本地路径安装 skill
    ///
    /// 支持两种路径格式:
    /// 1. 直接指向 SKILL.md 文件
    /// 2. 指向包含 SKILL.md 的目录
    pub fn install_from_path(&self, source_path: &Path) -> Result<Skill> {
        // 检查路径是否存在
        if !source_path.exists() {
            return Err(SkillHubError::InvalidSkillPath(format!(
                "路径不存在: {}",
                source_path.display()
            )));
        }

        // 查找 SKILL.md 文件
        let skill_md_path = self.find_skill_md(source_path)?;

        // 读取 SKILL.md 内容
        let content = fs::read_to_string(&skill_md_path).map_err(|e| {
            SkillHubError::InvalidSkillPath(format!("读取 SKILL.md 失败: {}", e))
        })?;

        // 提取 skill 名称
        let name = self.extract_name(&content, &skill_md_path)?;

        // 创建 skill 目录
        let skill_path = self.registry.create_skill_dir(&name)?;

        // 复制文件到注册表
        self.copy_skill_files(&skill_md_path, &skill_path)?;

        // 加载并返回 skill 信息
        self.registry.load_skill_info(&name)
    }

    /// 卸载 skill
    pub fn uninstall(&self, name: &str) -> Result<()> {
        self.registry.delete_skill(name)
    }

    /// 查找 SKILL.md 文件
    ///
    /// 如果 source_path 是文件，直接返回
    /// 如果是目录，在目录中查找 SKILL.md
    fn find_skill_md(&self, source_path: &Path) -> Result<PathBuf> {
        if source_path.is_file() {
            // 如果是文件，检查是否为 SKILL.md
            if source_path.file_name().and_then(|n| n.to_str()) == Some("SKILL.md") {
                return Ok(source_path.to_path_buf());
            } else {
                return Err(SkillHubError::SkillMdNotFound(format!(
                    "文件不是 SKILL.md: {}",
                    source_path.display()
                )));
            }
        } else if source_path.is_dir() {
            // 如果是目录，查找 SKILL.md
            let skill_md = source_path.join("SKILL.md");
            if skill_md.exists() {
                return Ok(skill_md);
            } else {
                return Err(SkillHubError::SkillMdNotFound(format!(
                    "目录中未找到 SKILL.md: {}",
                    source_path.display()
                )));
            }
        }

        Err(SkillHubError::SkillMdNotFound(format!(
            "无法从路径找到 SKILL.md: {}",
            source_path.display()
        )))
    }

    /// 从 SKILL.md 内容中提取名称
    ///
    /// 提取优先级:
    /// 1. Frontmatter 中的 "name" 字段
    /// 2. 如果 SKILL.md 不在根目录，使用目录名
    /// 3. 从 H1 标题提取 (# Title)
    fn extract_name(&self, content: &str, skill_md_path: &Path) -> Result<String> {
        // 尝试从 frontmatter 提取 name
        if let Some(name) = self.extract_name_from_frontmatter(content) {
            return Ok(name);
        }

        // 尝试从目录名提取
        if let Some(dir_name) = self.extract_name_from_directory(skill_md_path) {
            return Ok(dir_name);
        }

        // 尝试从 H1 标题提取
        if let Some(title) = self.extract_name_from_h1(content) {
            return Ok(title);
        }

        Err(SkillHubError::InvalidSkillPath(
            "无法确定 skill 名称".to_string(),
        ))
    }

    /// 从 frontmatter 中提取 name 字段
    fn extract_name_from_frontmatter(&self, content: &str) -> Option<String> {
        let mut in_frontmatter = false;

        for line in content.lines() {
            let trimmed = line.trim();

            // 检测 frontmatter 边界
            if trimmed == "---" {
                if !in_frontmatter {
                    in_frontmatter = true;
                    continue;
                } else {
                    // frontmatter 结束
                    break;
                }
            }

            if in_frontmatter {
                // 查找 name 字段
                if let Some((key, value)) = line.split_once(':') {
                    let key = key.trim();
                    if key == "name" {
                        return Some(value.trim().to_string());
                    }
                }
            }
        }

        None
    }

    /// 从目录名提取名称
    ///
    /// 只有当 SKILL.md 不在根目录时才使用目录名
    fn extract_name_from_directory(&self, skill_md_path: &Path) -> Option<String> {
        // 获取 SKILL.md 的父目录
        let parent = skill_md_path.parent()?;

        // 检查父目录是否为根目录或者有明显特征（如 registry、skills 等）
        // 如果父目录名为 "SKILL.md"，说明 SKILL.md 在根目录，不使用目录名
        if let Some(dir_name) = parent.file_name().and_then(|n| n.to_str()) {
            // 简单启发式：如果目录名以点开头或太短，可能不是有效的 skill 名称
            if !dir_name.starts_with('.') && dir_name.len() > 2 {
                return Some(dir_name.to_string());
            }
        }

        None
    }

    /// 从 H1 标题提取名称
    fn extract_name_from_h1(&self, content: &str) -> Option<String> {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("# ") {
                let title = trimmed[2..].trim();
                if !title.is_empty() {
                    return Some(title.to_string());
                }
            }
        }
        None
    }

    /// 复制 skill 文件到注册表
    ///
    /// 复制 SKILL.md 和辅助文件（如图片等）
    fn copy_skill_files(&self, source: &Path, target: &Path) -> Result<()> {
        // 复制 SKILL.md
        let target_md = target.join("SKILL.md");
        fs::copy(source, &target_md).map_err(|e| {
            SkillHubError::InvalidSkillPath(format!("复制 SKILL.md 失败: {}", e))
        })?;

        // 如果 source 在目录中，尝试复制辅助文件
        if let Some(source_dir) = source.parent() {
            self.copy_auxiliary_files(source_dir, target)?;
        }

        Ok(())
    }

    /// 复制辅助文件（图片、资源等）
    ///
    /// 常见的辅助文件:
    /// - 图片: *.png, *.jpg, *.jpeg, *.gif, *.svg
    /// - 文档: README.md, *.txt
    fn copy_auxiliary_files(&self, source_dir: &Path, target_dir: &Path) -> Result<()> {
        // 定义要复制的文件扩展名
        const AUX_EXTENSIONS: &[&str] = &[
            // 图片
            "png", "jpg", "jpeg", "gif", "svg", "webp", "ico",
            // 文档
            "txt", "md",
            // 其他
            "json", "yaml", "yml",
        ];

        // 定义要复制的文件名（忽略大小写）
        const AUX_FILENAMES: &[&str] = &["README.md", "LICENSE", "CHANGELOG.md"];

        // 读取源目录
        let entries = fs::read_dir(source_dir).map_err(|e| {
            SkillHubError::InvalidSkillPath(format!("读取源目录失败: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                SkillHubError::InvalidSkillPath(format!("读取目录项失败: {}", e))
            })?;
            let path = entry.path();

            // 跳过目录和 SKILL.md
            if path.is_dir() || path.file_name().and_then(|n| n.to_str()) == Some("SKILL.md") {
                continue;
            }

            // 检查是否为辅助文件
            let should_copy = if let Some(extension) = path.extension().and_then(|e| e.to_str()) {
                AUX_EXTENSIONS.contains(&extension.to_lowercase().as_str())
            } else if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                AUX_FILENAMES
                    .iter()
                    .any(|name| filename.eq_ignore_ascii_case(name))
            } else {
                false
            };

            if should_copy {
                let filename = path.file_name().unwrap();
                let target_path = target_dir.join(filename);
                fs::copy(&path, &target_path).map_err(|e| {
                    SkillHubError::InvalidSkillPath(format!("复制辅助文件失败: {}", e))
                })?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_installer() -> (TempDir, AppConfig, Installer) {
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

        let installer = Installer::new(&config);

        (temp_dir, config, installer)
    }

    #[test]
    fn test_extract_name_from_frontmatter() {
        let (_temp_dir, _config, installer) = create_test_installer();

        let content = r#"---
name: test-skill
description: A test skill
tags: [test]
---
# Test Skill

Some content.
"#;

        let name = installer
            .extract_name_from_frontmatter(content)
            .expect("应该提取到 name");

        assert_eq!(name, "test-skill");
    }

    #[test]
    fn test_extract_name_from_h1() {
        let (_temp_dir, _config, installer) = create_test_installer();

        let content = r#"# My Awesome Skill

Some content without frontmatter.
"#;

        let name = installer.extract_name_from_h1(content).expect("应该提取到 H1 标题");

        assert_eq!(name, "My Awesome Skill");
    }

    #[test]
    fn test_install_from_file() {
        let (temp_dir, _config, installer) = create_test_installer();

        // 创建临时 SKILL.md 文件
        let skill_dir = temp_dir.path().join("skills");
        fs::create_dir_all(&skill_dir).unwrap();

        let skill_md = skill_dir.join("SKILL.md");
        let content = r#"---
name: file-test-skill
description: Test from file
tags: [test]
---
# File Test Skill

This skill was installed from a file.
"#;
        fs::write(&skill_md, content).unwrap();

        // 安装
        let skill = installer.install_from_path(&skill_md).unwrap();

        assert_eq!(skill.name, "file-test-skill");
        assert_eq!(skill.description, "Test from file");

        // 验证文件已复制
        let installed_md = installer.registry.registry_path.join("file-test-skill/SKILL.md");
        assert!(installed_md.exists());
    }

    #[test]
    fn test_install_from_directory() {
        let (temp_dir, _config, installer) = create_test_installer();

        // 创建包含 SKILL.md 的目录
        let skill_dir = temp_dir.path().join("my-cool-skill");
        fs::create_dir_all(&skill_dir).unwrap();

        let skill_md = skill_dir.join("SKILL.md");
        let content = r#"---
description: Test from directory
tags: [test]
---
# Directory Test Skill

This skill was installed from a directory.
"#;
        fs::write(&skill_md, content).unwrap();

        // 添加一个辅助文件
        let readme = skill_dir.join("README.md");
        fs::write(&readme, "This is a readme").unwrap();

        // 安装
        let skill = installer.install_from_path(&skill_dir).unwrap();

        assert_eq!(skill.name, "my-cool-skill");
        assert_eq!(skill.description, "Test from directory");

        // 验证文件已复制
        let installed_md = installer.registry.registry_path.join("my-cool-skill/SKILL.md");
        let installed_readme = installer.registry.registry_path.join("my-cool-skill/README.md");
        assert!(installed_md.exists());
        assert!(installed_readme.exists());
    }

    #[test]
    fn test_install_nonexistent_path() {
        let (_temp_dir, _config, installer) = create_test_installer();

        let result = installer.install_from_path(Path::new("/nonexistent/path"));

        assert!(result.is_err());
        match result.unwrap_err() {
            SkillHubError::InvalidSkillPath(msg) => {
                assert!(msg.contains("不存在"));
            }
            _ => panic!("期望 InvalidSkillPath 错误"),
        }
    }

    #[test]
    fn test_install_without_skill_md() {
        let (temp_dir, _config, installer) = create_test_installer();

        // 创建一个没有 SKILL.md 的目录
        let empty_dir = temp_dir.path().join("empty-skill");
        fs::create_dir_all(&empty_dir).unwrap();

        let result = installer.install_from_path(&empty_dir);

        assert!(result.is_err());
        match result.unwrap_err() {
            SkillHubError::SkillMdNotFound(_) => {}
            _ => panic!("期望 SkillMdNotFound 错误"),
        }
    }

    #[test]
    fn test_uninstall() {
        let (temp_dir, _config, installer) = create_test_installer();

        // 先安装一个 skill
        let skill_dir = temp_dir.path().join("to-uninstall");
        fs::create_dir_all(&skill_dir).unwrap();

        let skill_md = skill_dir.join("SKILL.md");
        let content = r#"---
name: to-uninstall
description: Will be uninstalled
tags: [test]
---
# To Uninstall
"#;
        fs::write(&skill_md, content).unwrap();

        installer.install_from_path(&skill_dir).unwrap();

        // 验证已安装
        let skill_path = installer.registry.registry_path.join("to-uninstall");
        assert!(skill_path.exists());

        // 卸载
        installer.uninstall("to-uninstall").unwrap();

        // 验证已删除
        assert!(!skill_path.exists());
    }
}
