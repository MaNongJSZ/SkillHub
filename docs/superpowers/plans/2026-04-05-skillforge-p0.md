# SkillForge P0 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建跨平台桌面应用，用于管理多个 AI IDE/Agent 的 Skills，实现 symlink 机制的启用/禁用、安装/卸载。

**Architecture:** Tauri 2 标准分层架构 — React 前端通过 Tauri invoke 调用 Rust 后端 Commands，Commands 调用 Core 模块处理业务逻辑。

**Tech Stack:** Tauri 2, Rust, React 18, TypeScript, Zustand, TailwindCSS, Vite, comrak, git2, reqwest

---

## 文件结构总览

### Rust 后端 (src-tauri/)
```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
└── src/
    ├── main.rs                 # Tauri 入口，注册所有 commands
    ├── lib.rs                  # 模块导出
    ├── error.rs                # 统一错误类型
    ├── commands/
    │   ├── mod.rs
    │   ├── config_cmd.rs       # 配置相关命令
    │   ├── skill_cmd.rs        # Skill CRUD 命令
    │   ├── agent_cmd.rs        # Agent 管理命令
    │   ├── link_cmd.rs         # 启用/禁用命令
    │   └── search_cmd.rs       # 搜索命令
    └── core/
        ├── mod.rs
        ├── config.rs           # 配置管理
        ├── registry.rs         # 中央仓库管理
        ├── symlink.rs          # 跨平台 symlink
        ├── agent.rs            # Agent 检测和管理
        ├── installer.rs        # 安装/卸载逻辑
        └── search.rs           # 本地搜索
```

### React 前端 (src/)
```
src/
├── main.tsx                   # React 入口
├── App.tsx                    # 主应用组件
├── types/
│   └── index.ts               # TypeScript 类型定义
├── stores/
│   └── useAppStore.ts         # Zustand 全局状态
├── hooks/
│   └── useInvoke.ts           # Tauri invoke 封装
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx     # 主布局
│   │   └── AgentBar.tsx       # 底部 Agent 栏
│   ├── skills/
│   │   ├── SkillList.tsx      # Skills 列表侧边栏
│   │   ├── SkillListItem.tsx  # 单个 Skill 项
│   │   └── SkillDetail.tsx    # Skill 详情面板
│   ├── agents/
│   │   └── AgentPanel.tsx     # Agent 管理面板
│   ├── search/
│   │   ├── SearchBar.tsx      # 搜索栏
│   │   └── SearchResults.tsx  # 搜索结果
│   └── settings/
│       └── Settings.tsx       # 设置对话框
└── utils/
    └── markdown.ts            # Markdown 渲染工具
```

---

## Task 1: Tauri 项目脚手架搭建

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`

---

### Task 1.1: 初始化 Tauri 项目结构

- [ ] **Step 1: 使用 npm create tauri-app 初始化项目**

```bash
cd E:/webtest/skillforge
npm create tauri-app@latest . -- --template react-ts --manager npm --yes
```

- [ ] **Step 2: 验证项目结构**

```bash
ls -la
cat package.json
```

Expected: `package.json` 包含 tauri 依赖，`src-tauri/` 目录存在

- [ ] **Step 3: 更新 Cargo.toml 依赖**

打开 `src-tauri/Cargo.toml`，更新为：

```toml
[package]
name = "skillforge"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["shell-open"] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
comrak = "0.30"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
dirs = "6"
git2 = "0.19"
reqwest = { version = "0.12", features = ["json"] }
thiserror = "2"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

- [ ] **Step 4: 验证编译**

```bash
cd src-tauri
cargo check
```

Expected: 编译成功，无错误

- [ ] **Step 5: 添加前端依赖**

```bash
cd ..
npm install zustand @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 6: 配置 TailwindCSS**

更新 `tailwind.config.js`：

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

更新 `src/index.css`（添加 Tailwind 指令）：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: 更新 .gitignore**

更新 `.gitignore`：

```
# Rust
/target
**/*.rs.bk
*.pdb

# Node
node_modules/
dist/
dist-ssr/

# Tauri
src-tauri/target/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# SkillForge runtime
.skillforge/
```

- [ ] **Step 8: 提交脚手架**

```bash
git add .
git commit -m "feat: initialize Tauri 2 + React TS project scaffolding

- Set up Tauri 2 with React and TypeScript
- Configure TailwindCSS for styling
- Add Zustand for state management
- Add project dependencies"
```

---

## Task 2: Core - 错误类型与通用工具

**Files:**
- Create: `src-tauri/src/error.rs`
- Create: `src-tauri/src/lib.rs`

---

### Task 2.1: 定义统一错误类型

- [ ] **Step 1: 创建 error.rs 文件**

创建 `src-tauri/src/error.rs`：

```rust
use thiserror::Error;

/// SkillForge 统一错误类型
#[derive(Error, Debug)]
pub enum SkillForgeError {
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON 序列化错误: {0}")]
    SerdeJson(#[from] serde_json::Error),

    #[error("Git 操作错误: {0}")]
    Git(#[from] git2::Error),

    #[error("HTTP 请求错误: {0}")]
    Http(#[from] reqwest::Error),

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

    #[error("在线搜索失败: {0}")]
    OnlineSearchFailed(String),
}

/// Result 类型别名
pub type Result<T> = std::result::Result<T, SkillForgeError>;

/// 将错误转换为 Tauri 可序列化的响应
impl From<SkillForgeError> for String {
    fn from(error: SkillForgeError) -> Self {
        error.to_string()
    }
}
```

- [ ] **Step 2: 创建 lib.rs 模块导出**

创建 `src-tauri/src/lib.rs`：

```rust
mod error;

pub use error::{Result, SkillForgeError};
```

- [ ] **Step 3: 更新 main.rs 引入 lib**

更新 `src-tauri/src/main.rs`：

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod lib;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/
git commit -m "feat(core): add unified error type

- Add SkillForgeError with thiserror
- Cover IO, JSON, Git, HTTP, and domain-specific errors
- Add Result type alias"
```

---

## Task 3: Core - 配置管理模块

**Files:**
- Create: `src-tauri/src/core/config.rs`
- Create: `src-tauri/src/core/mod.rs`

---

### Task 3.1: 定义配置数据结构

- [ ] **Step 1: 创建 core/mod.rs**

创建 `src-tauri/src/core/mod.rs`：

```rust
pub mod config;
```

- [ ] **Step 2: 定义配置结构**

创建 `src-tauri/src/core/config.rs`：

```rust
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
        let skillforge_dir = home.join(".skillforge");

        Self {
            registry_path: skillforge_dir.join("registry"),
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
            crate::error::SkillForgeError::ConfigDirCreationFailed
        })?;

        let skillforge_dir = home.join(".skillforge");

        // 创建目录
        std::fs::create_dir_all(&skillforge_dir)?;

        let config_path = skillforge_dir.join("config.json");
        let config = if config_path.exists() {
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

    /// 获取 registry 路径
    pub fn registry_path(&self) -> &PathBuf {
        &self.config.registry_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert!(config.registry_path.ends_with(".skillforge/registry"));
        assert!(config.cache_path.ends_with(".skillforge/cache"));
        assert!(config.auto_detect_agents);
    }
}
```

- [ ] **Step 3: 更新 lib.rs**

更新 `src-tauri/src/lib.rs`：

```rust
mod core;
mod error;

pub use error::{Result, SkillForgeError};
```

- [ ] **Step 4: 运行测试**

```bash
cd src-tauri && cargo test config::tests
```

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/core/
git commit -m "feat(core): add config management module

- Define AppConfig with registry_path, cache_path, API keys
- Implement ConfigManager with load/save logic
- Auto-create directories on init
- Add unit test for default config"
```

---

## Task 4: Core - 中央仓库管理模块

**Files:**
- Create: `src-tauri/src/core/registry.rs`

---

### Task 4.1: 定义 Skill 数据模型

- [ ] **Step 1: 定义 Skill 结构**

在 `src-tauri/src/core/registry.rs` 中添加：

```rust
use crate::core::config::ConfigManager;
use crate::error::{Result, SkillForgeError};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// 中央仓库中的 Skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// Skill 名称（目录名）
    pub name: String,
    /// 描述（从 SKILL.md 提取）
    pub description: String,
    /// 标签
    pub tags: Vec<String>,
    /// Skill 目录路径
    pub path: PathBuf,
    /// 安装时间
    pub installed_at: DateTime<Utc>,
}

/// Skill 详情（包含 Markdown 内容）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDetail {
    pub skill: Skill,
    pub content: String,
}

/// 中央仓库管理器
pub struct RegistryManager {
    registry_path: PathBuf,
}

impl RegistryManager {
    /// 创建新的仓库管理器
    pub fn new(config: &ConfigManager) -> Self {
        Self {
            registry_path: config.registry_path().clone(),
        }
    }

    /// 列出所有 skills
    pub fn list_skills(&self) -> Result<Vec<Skill>> {
        let mut skills = Vec::new();

        if !self.registry_path.exists() {
            return Ok(skills);
        }

        for entry in std::fs::read_dir(&self.registry_path)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                if let Some(skill) = self.load_skill_info(&name)? {
                    skills.push(skill);
                }
            }
        }

        skills.sort_by(|a, b| &a.name.cmp(&b.name));
        Ok(skills)
    }

    /// 加载单个 skill 信息
    pub fn load_skill_info(&self, name: &str) -> Result<Option<Skill>> {
        let skill_path = self.registry_path.join(name);
        let md_path = skill_path.join("SKILL.md");

        if !md_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&md_path)?;
        let (description, tags) = self.parse_frontmatter(&content);

        // 获取安装时间（从目录修改时间）
        let metadata = std::fs::metadata(&skill_path)?;
        let installed_at = metadata.modified()?
            .into();

        Ok(Some(Skill {
            name: name.to_string(),
            description,
            tags,
            path: skill_path,
            installed_at,
        }))
    }

    /// 获取 skill 详情（含 Markdown 内容）
    pub fn get_skill_detail(&self, name: &str) -> Result<SkillDetail> {
        let skill_path = self.registry_path.join(name);
        let md_path = skill_path.join("SKILL.md");

        if !md_path.exists() {
            return Err(SkillForgeError::SkillMdNotFound(skill_path.display().to_string()));
        }

        let content = std::fs::read_to_string(&md_path)?;
        let skill = self.load_skill_info(name)?
            .ok_or_else(|| SkillForgeError::SkillNotFound(name.to_string()))?;

        Ok(SkillDetail { skill, content })
    }

    /// 从 SKILL.md 解析 frontmatter（描述和标签）
    fn parse_frontmatter(&self, content: &str) -> (String, Vec<String>) {
        let mut description = String::new();
        let mut tags = Vec::new();
        let mut in_frontmatter = false;

        for line in content.lines().take(50) {
            let line = line.trim();

            if line == "---" {
                if !in_frontmatter {
                    in_frontmatter = true;
                } else {
                    break;
                }
                continue;
            }

            if in_frontmatter {
                if let Some(rest) = line.strip_prefix("description:") {
                    description = rest.trim().trim_matches('"').to_string();
                } else if let Some(rest) = line.strip_prefix("tags:") {
                    let tag_str = rest.trim();
                    if tag_str.starts_with('[') {
                        // JSON array format
                        if let Ok(parsed) = serde_json::from_str::<Vec<String>>(tag_str) {
                            tags = parsed;
                        }
                    } else {
                        // Comma-separated
                        tags = tag_str.split(',')
                            .map(|t| t.trim().trim_matches('"').to_string())
                            .filter(|t| !t.is_empty())
                            .collect();
                    }
                }
            }
        }

        // 如果没有描述，使用第一行非空内容
        if description.is_empty() {
            for line in content.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    description = trimmed.chars().take(100).collect();
                    break;
                }
            }
        }

        (description, tags)
    }

    /// 创建 skill 目录
    pub fn create_skill_dir(&self, name: &str) -> Result<PathBuf> {
        let skill_path = self.registry_path.join(name);

        if skill_path.exists() {
            return Err(SkillForgeError::InvalidSkillPath(
                format!("Skill '{}' 已存在", name)
            ));
        }

        std::fs::create_dir_all(&skill_path)?;
        Ok(skill_path)
    }

    /// 删除 skill
    pub fn delete_skill(&self, name: &str) -> Result<()> {
        let skill_path = self.registry_path.join(name);

        if !skill_path.exists() {
            return Err(SkillForgeError::SkillNotFound(name.to_string()));
        }

        std::fs::remove_dir_all(&skill_path)?;
        Ok(())
    }

    /// 更新 SKILL.md 内容
    pub fn update_skill_md(&self, name: &str, content: &str) -> Result<()> {
        let skill_path = self.registry_path.join(name);
        let md_path = skill_path.join("SKILL.md");

        if !skill_path.exists() {
            return Err(SkillForgeError::SkillNotFound(name.to_string()));
        }

        std::fs::write(&md_path, content)?;
        Ok(())
    }
}
```

- [ ] **Step 2: 更新 core/mod.rs**

更新 `src-tauri/src/core/mod.rs`：

```rust
pub mod config;
pub mod registry;
```

- [ ] **Step 3: 运行测试**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/core/registry.rs
git commit -m "feat(core): add registry manager module

- Define Skill and SkillDetail structs
- Implement list_skills, get_skill_detail, create_skill_dir
- Parse frontmatter from SKILL.md for description/tags
- Add delete_skill and update_skill_md methods"
```

---

## Task 5: Core - 跨平台 Symlink 模块

**Files:**
- Create: `src-tauri/src/core/symlink.rs`

---

### Task 5.1: 实现 Windows Junction 支持

- [ ] **Step 1: 实现 symlink 创建**

创建 `src-tauri/src/core/symlink.rs`：

```rust
use crate::error::{Result, SkillForgeError};
use std::path::Path;

/// 创建 skill symlink（跨平台）
pub fn create_skill_link(source: &Path, target: &Path) -> Result<()> {
    // 确保源目录存在
    if !source.exists() {
        return Err(SkillForgeError::SkillNotFound(
            source.display().to_string()
        ));
    }

    // 如果目标已存在，先删除
    if target.exists() || target.symlink_metadata().is_ok() {
        remove_skill_link(target)?;
    }

    // 创建父目录
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, target)?;
        return Ok(());
    }

    #[cfg(windows)]
    {
        use std::os::windows::fs::symlink_dir;

        // 先尝试创建 symlink（需要开发者模式或管理员权限）
        let symlink_result = symlink_dir(source, target);

        if symlink_result.is_err() {
            // Fallback: 使用 junction（无需特殊权限）
            create_junction(source, target)?;
        }

        Ok(())
    }
}

/// 删除 skill symlink
pub fn remove_skill_link(target: &Path) -> Result<()> {
    if !target.exists() && target.symlink_metadata().is_err() {
        return Ok(()); // 不存在，无需删除
    }

    #[cfg(unix)]
    {
        std::fs::remove_file(target)?;
    }

    #[cfg(windows)]
    {
        // Windows 上 junction 是目录，需要用 remove_dir
        if target.is_dir() || is_junction(target) {
            std::fs::remove_dir(target)?;
        } else {
            std::fs::remove_file(target)?;
        }
    }

    Ok(())
}

/// 检查是否为 symlink/junction
pub fn is_skill_link(target: &Path) -> bool {
    target.symlink_metadata().is_ok()
}

/// 读取 symlink 指向的目标
pub fn read_link_target(target: &Path) -> Option<PathBuf> {
    std::fs::read_link(target).ok()
}

#[cfg(windows)]
fn is_junction(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT,
        GetFileAttributesW, INVALID_FILE_ATTRIBUTES,
    };

    if let Ok(metadata) = std::fs::metadata(path) {
        // 检查 FILE_ATTRIBUTE_REPARSE_POINT
        let attrs = unsafe { GetFileAttributesW(path.as_raw_handle() as *const u16) };
        if attrs != INVALID_FILE_ATTRIBUTES {
            return (attrs & 0x400) != 0; // FILE_ATTRIBUTE_REPARSE_POINT
        }
    }
    false
}

#[cfg(windows)]
fn create_junction(source: &Path, target: &Path) -> Result<()> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    // 简化实现：使用 Windows API
    // 这是一个基本实现，生产环境可能需要更复杂的处理

    // 将路径转换为 NT 格式的绝对路径
    let source_absolute = std::fs::canonicalize(source)
        .map_err(|_| SkillForgeError::SymlinkCreationFailed(
            "无法解析源路径".to_string()
        ))?;

    let source_str = source_absolute.to_string_lossy().to_string();

    // 使用 cmd mklink 命令作为 fallback
    let output = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        .arg(target.to_string_lossy().as_ref())
        .arg(source_str)
        .output()
        .map_err(|_| SkillForgeError::SymlinkCreationFailed(
            "创建 junction 失败".to_string()
        ))?;

    if !output.status.success() {
        return Err(SkillForgeError::SymlinkCreationFailed(
            String::from_utf8_lossy(&output.stderr).to_string()
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_skill_link() {
        let temp = std::env::temp_dir();
        let link_path = temp.join("test_link_skillforge");
        let source_path = temp.join("test_source_skillforge");

        // 创建测试源目录
        std::fs::create_dir_all(&source_path).ok();

        // 清理可能存在的旧链接
        remove_skill_link(&link_path).ok();

        // 测试不存在的路径
        assert!(!is_skill_link(&link_path));

        // 创建链接后测试
        if create_skill_link(&source_path, &link_path).is_ok() {
            assert!(is_skill_link(&link_path));
            remove_skill_link(&link_path).ok();
        }

        // 清理
        std::fs::remove_dir_all(&source_path).ok();
    }
}
```

- [ ] **Step 2: 更新 Windows 依赖**

更新 `src-tauri/Cargo.toml`，添加 windows-sys：

```toml
[dependencies]
# ... existing dependencies ...
windows-sys = { version = "0.59", features = ["Win32_Storage_FileSystem"] }
```

- [ ] **Step 3: 更新 core/mod.rs**

更新 `src-tauri/src/core/mod.rs`：

```rust
pub mod config;
pub mod registry;
pub mod symlink;
```

- [ ] **Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/core/symlink.rs src-tauri/Cargo.toml
git commit -m "feat(core): add cross-platform symlink module

- Implement create_skill_link with Windows junction fallback
- Add remove_skill_link and is_skill_link utilities
- Use symlink_dir on Windows, fallback to junction via mklink
- Unix uses standard symlink
- Add unit test for link detection"
```

---

## Task 6: Core - Agent 管理模块

**Files:**
- Create: `src-tauri/src/core/agent.rs`

---

### Task 6.1: 定义 Agent 数据结构和检测逻辑

- [ ] **Step 1: 实现 agent 检测**

创建 `src-tauri/src/core/agent.rs`：

```rust
use crate::error::{Result, SkillForgeError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Agent 类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum AgentType {
    #[serde(rename = "claude-code")]
    ClaudeCode,
    #[serde(rename = "cursor")]
    Cursor,
    #[serde(rename = "kiro")]
    Kiro,
    #[serde(rename = "codex")]
    Codex,
    #[serde(rename = "openclaw")]
    OpenClaw,
    #[serde(rename = "custom")]
    Custom(String),
}

/// Agent 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    /// 唯一标识
    pub id: String,
    /// 显示名称
    pub name: String,
    /// 全局 skills 路径
    pub skills_path: PathBuf,
    /// 工作区 skills 路径（可选）
    pub workspace_path: Option<PathBuf>,
    /// 是否自动检测到
    pub detected: bool,
}

impl Agent {
    /// 获取全局 skills 目录
    pub fn global_skills_dir(&self) -> PathBuf {
        self.skills_path.clone()
    }

    /// 获取 skill 在此 agent 中的 symlink 路径
    pub fn skill_link_path(&self, skill_name: &str) -> PathBuf {
        self.skills_path.join(skill_name).join("SKILL.md")
    }

    /// 获取工作区 skill symlink 路径
    pub fn workspace_skill_link_path(&self, workspace: &Path, skill_name: &str) -> PathBuf {
        if let Some(ref base) = self.workspace_path {
            workspace.join(base).join(skill_name).join("SKILL.md")
        } else {
            workspace.join(".claude").join("skills").join(skill_name).join("SKILL.md")
        }
    }
}

/// Agent 管理器
pub struct AgentManager {
    agents: HashMap<String, Agent>,
}

impl AgentManager {
    /// 创建新的 agent 管理器
    pub fn new() -> Self {
        Self {
            agents: HashMap::new(),
        }
    }

    /// 自动检测已安装的 agents
    pub fn detect_agents(&mut self) -> Result<Vec<Agent>> {
        let home = dirs::home_dir()
            .ok_or_else(|| SkillForgeError::AgentNotFound("无法获取用户主目录".into()))?;

        let mut detected = Vec::new();

        // Claude Code: ~/.claude/skills/
        let claude_path = home.join(".claude/skills");
        if claude_path.exists() {
            detected.push(Agent {
                id: "claude-code".to_string(),
                name: "Claude Code".to_string(),
                skills_path: claude_path,
                workspace_path: Some(".claude/skills".into()),
                detected: true,
            });
        }

        // Cursor: ~/.cursor/skills/
        let cursor_path = home.join(".cursor/skills");
        if cursor_path.exists() {
            detected.push(Agent {
                id: "cursor".to_string(),
                name: "Cursor".to_string(),
                skills_path: cursor_path,
                workspace_path: Some(".cursor/skills".into()),
                detected: true,
            });
        }

        // Kiro: ~/.kiro/skills/
        let kiro_path = home.join(".kiro/skills");
        if kiro_path.exists() {
            detected.push(Agent {
                id: "kiro".to_string(),
                name: "Kiro".to_string(),
                skills_path: kiro_path,
                workspace_path: Some(".kiro/skills".into()),
                detected: true,
            });
        }

        // Codex: ~/.codex/skills/
        let codex_path = home.join(".codex/skills");
        if codex_path.exists() {
            detected.push(Agent {
                id: "codex".to_string(),
                name: "OpenAI Codex".to_string(),
                skills_path: codex_path,
                workspace_path: Some(".codex/skills".into()),
                detected: true,
            });
        }

        // OpenClaw: ~/clawd/skills/
        let claw_path = home.join("clawd/skills");
        if claw_path.exists() {
            detected.push(Agent {
                id: "openclaw".to_string(),
                name: "OpenClaw".to_string(),
                skills_path: claw_path,
                workspace_path: None,
                detected: true,
            });
        }

        // 更新内部 agents
        for agent in &detected {
            self.agents.insert(agent.id.clone(), agent.clone());
        }

        Ok(detected)
    }

    /// 列出所有 agents
    pub fn list_agents(&self) -> Vec<Agent> {
        self.agents.values().cloned().collect()
    }

    /// 获取单个 agent
    pub fn get_agent(&self, id: &str) -> Option<&Agent> {
        self.agents.get(id)
    }

    /// 添加自定义 agent
    pub fn add_agent(&mut self, agent: Agent) -> Result<()> {
        // 创建目录
        std::fs::create_dir_all(&agent.skills_path)?;

        self.agents.insert(agent.id.clone(), agent);
        Ok(())
    }

    /// 移除 agent
    pub fn remove_agent(&mut self, id: &str) -> Result<()> {
        if self.agents.remove(id).is_none() {
            return Err(SkillForgeError::AgentNotFound(id.to_string()));
        }
        Ok(())
    }

    /// 检查 agent skills 目录是否存在
    pub fn ensure_agent_dir(&self, id: &str) -> Result<()> {
        let agent = self.get_agent(id)
            .ok_or_else(|| SkillForgeError::AgentNotFound(id.to_string()))?;

        if !agent.skills_path.exists() {
            std::fs::create_dir_all(&agent.skills_path)?;
        }

        Ok(())
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agent_skill_link_path() {
        let agent = Agent {
            id: "test".to_string(),
            name: "Test Agent".to_string(),
            skills_path: PathBuf::from("/test/skills"),
            workspace_path: Some(".test/skills".into()),
            detected: false,
        };

        let link_path = agent.skill_link_path("weather");
        assert!(link_path.ends_with("test/skills/weather/SKILL.md"));
    }
}
```

- [ ] **Step 2: 更新 core/mod.rs**

更新 `src-tauri/src/core/mod.rs`：

```rust
pub mod agent;
pub mod config;
pub mod registry;
pub mod symlink;
```

- [ ] **Step 3: 运行测试**

```bash
cd src-tauri && cargo test agent::tests
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/core/agent.rs
git commit -m "feat(core): add agent management module

- Define Agent struct with id, name, paths
- Implement AgentManager with auto-detection
- Support Claude Code, Cursor, Kiro, Codex, OpenClaw
- Add custom agent support
- Add skill link path utilities"
```

---

## Task 7: Core - 安装器模块

**Files:**
- Create: `src-tauri/src/core/installer.rs`

---

### Task 7.1: 实现从本地路径安装

- [ ] **Step 1: 实现本地安装逻辑**

创建 `src-tauri/src/core/installer.rs`：

```rust
use crate::core::config::ConfigManager;
use crate::core::registry::{RegistryManager, Skill};
use crate::error::{Result, SkillForgeError};
use std::path::PathBuf;

/// 安装管理器
pub struct Installer {
    registry: RegistryManager,
}

impl Installer {
    /// 创建新的安装器
    pub fn new(config: &ConfigManager) -> Self {
        Self {
            registry: RegistryManager::new(config),
        }
    }

    /// 从本地目录安装 skill
    pub fn install_from_path(&self, source_path: &str) -> Result<Skill> {
        let source = PathBuf::from(source_path);

        if !source.exists() {
            return Err(SkillForgeError::InvalidSkillPath(
                "路径不存在".to_string()
            ));
        }

        // 查找 SKILL.md
        let md_path = if source.is_file() && source.extension().and_then(|s| s.to_str()) == Some("md") {
            source.clone()
        } else {
            let md = source.join("SKILL.md");
            if !md.exists() {
                // 尝试查找任何 .md 文件
                    let mut found_md = None;
                    if let Ok(entries) = std::fs::read_dir(&source) {
                        for entry in entries.flatten() {
                            let path = entry.path();
                            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                                found_md = Some(path);
                                break;
                            }
                        }
                    }
                    found_md.ok_or_else(|| SkillForgeError::SkillMdNotFound(
                        source.display().to_string()
                    ))?
            } else {
                md
            }
        };

        // 读取 SKILL.md 提取名称
        let content = std::fs::read_to_string(&md_path)?;
        let name = self.extract_name(&content, &source)?;

        // 创建 skill 目录
        let skill_dir = self.registry.create_skill_dir(&name)?;

        // 复制文件
        self.copy_skill_files(&source, &skill_dir)?;

        // 加载 skill 信息
        let skill = self.registry.load_skill_info(&name)?
            .ok_or_else(|| SkillForgeError::SkillNotFound(name))?;

        Ok(skill)
    }

    /// 从 SKILL.md 内容提取名称
    fn extract_name(&self, content: &str, source_path: &PathBuf) -> Result<String> {
        // 首先尝试从 frontmatter 提取 name
        for line in content.lines().take(30) {
            let line = line.trim();
            if let Some(rest) = line.strip_prefix("name:") {
                let name = rest.trim().trim_matches('"').trim_matches('\'');
                if !name.is_empty() {
                    return Ok(name.to_string());
                }
            }
        }

        // 如果没有 name 字段，使用目录名
        if let Some(dir_name) = source_path.file_name().and_then(|n| n.to_str()) {
            if dir_name != "SKILL.md" {
                return Ok(dir_name.to_string());
            }
        }

        // 最后尝试从 h1 标题提取
        for line in content.lines().take(20) {
            let line = line.trim();
            if let Some(title) = line.strip_prefix("# ") {
                return Ok(title.trim().to_lowercase().replace(' ', "-"));
            }
        }

        Err(SkillForgeError::InvalidSkillPath(
            "无法确定 Skill 名称".to_string()
        ))
    }

    /// 复制 skill 文件到 registry
    fn copy_skill_files(&self, source: &PathBuf, target: &PathBuf) -> Result<()> {
        let md_target = target.join("SKILL.md");

        // 如果 source 是文件，直接复制
        if source.is_file() {
            std::fs::copy(source, &md_target)?;
        } else {
            // 复制 SKILL.md
            let md_source = source.join("SKILL.md");
            if !md_source.exists() {
                return Err(SkillForgeError::SkillMdNotFound(
                    source.display().to_string()
                ));
            }
            std::fs::copy(&md_source, &md_target)?;

            // 可选：复制辅助文件（images 等）
            if let Ok(entries) = std::fs::read_dir(source) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
                        continue; // 已复制 SKILL.md
                    }

                    // 复制其他文件（如 images）
                    if let Some(file_name) = path.file_name() {
                        let target_path = target.join(file_name);
                        if path.is_file() {
                            std::fs::copy(&path, &target_path).ok();
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// 卸载 skill
    pub fn uninstall(&self, name: &str) -> Result<()> {
        self.registry.delete_skill(name)
    }

    /// 获取 registry manager 引用
    pub fn registry(&self) -> &RegistryManager {
        &self.registry
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_name_from_frontmatter() {
        let content = r#"
---
name: test-skill
description: A test skill
tags: [test]
---
Content here
"#;

        let config = ConfigManager::new().unwrap();
        let installer = Installer::new(&config);

        // 创建临时目录
        let temp = std::env::temp_dir().join("test_extract");
        std::fs::create_dir_all(&temp).ok();

        let result = installer.extract_name(content, &temp);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test-skill");

        // 清理
        std::fs::remove_dir_all(&temp).ok();
    }
}
```

- [ ] **Step 2: 更新 core/mod.rs**

更新 `src-tauri/src/core/mod.rs`：

```rust
pub mod agent;
pub mod config;
pub mod installer;
pub mod registry;
pub mod symlink;
```

- [ ] **Step 3: 运行测试**

```bash
cd src-tauri && cargo test installer::tests
```

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/core/installer.rs
git commit -m "feat(core): add installer module

- Implement install_from_path for local skills
- Extract skill name from frontmatter or filename
- Copy SKILL.md and auxiliary files to registry
- Add uninstall method
- Handle both file and directory sources"
```

---

## Task 8: Core - 本地搜索模块

**Files:**
- Create: `src-tauri/src/core/search.rs`

---

### Task 8.1: 实现本地全文搜索

- [ ] **Step 1: 实现搜索逻辑**

创建 `src-tauri/src/core/search.rs`：

```rust
use crate::core::config::ConfigManager;
use crate::core::registry::RegistryManager;
use crate::error::Result;
use grep_regex::RegexMatcher;
use grep_searcher::{sinks, Searcher, SearcherBuilder};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub skill_name: String,
    pub matched_field: String,
    pub matched_text: String,
    pub relevance: f32,
}

/// 搜索管理器
pub struct SearchManager {
    registry: RegistryManager,
}

impl SearchManager {
    /// 创建新的搜索管理器
    pub fn new(config: &ConfigManager) -> Self {
        Self {
            registry: RegistryManager::new(config),
        }
    }

    /// 本地搜索 skills
    pub fn search_local(&self, query: &str) -> Result<Vec<SearchResult>> {
        if query.is_empty() {
            return Ok(Vec::new());
        }

        let skills = self.registry.list_skills()?;
        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        for skill in skills {
            // 搜索名称
            if skill.name.to_lowercase().contains(&query_lower) {
                results.push(SearchResult {
                    skill_name: skill.name.clone(),
                    matched_field: "name".to_string(),
                    matched_text: skill.name.clone(),
                    relevance: 1.0,
                });
            }

            // 搜索描述
            if skill.description.to_lowercase().contains(&query_lower) {
                results.push(SearchResult {
                    skill_name: skill.name.clone(),
                    matched_field: "description".to_string(),
                    matched_text: skill.description.clone(),
                    relevance: 0.8,
                });
            }

            // 搜索标签
            for tag in &skill.tags {
                if tag.to_lowercase().contains(&query_lower) {
                    results.push(SearchResult {
                        skill_name: skill.name.clone(),
                        matched_field: "tag".to_string(),
                        matched_text: tag.clone(),
                        relevance: 0.6,
                    });
                }
            }
        }

        // 按相关性排序
        results.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap());

        Ok(results)
    }

    /// 在 SKILL.md 内容中搜索
    pub fn search_content(&self, query: &str) -> Result<Vec<SearchResult>> {
        if query.is_empty() {
            return Ok(Vec::new());
        }

        let skills = self.registry.list_skills()?;
        let mut results = Vec::new();

        for skill in skills {
            let md_path = skill.path.join("SKILL.md");
            if !md_path.exists() {
                continue;
            }

            // 读取文件内容
            if let Ok(content) = std::fs::read_to_string(&md_path) {
                // 逐行搜索
                for (line_num, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&query.to_lowercase()) {
                        let snippet = if line.len() > 100 {
                            format!("{}...", &line[..100])
                        } else {
                            line.to_string()
                        };

                        results.push(SearchResult {
                            skill_name: skill.name.clone(),
                            matched_field: format!("content:{}", line_num + 1),
                            matched_text: snippet,
                            relevance: 0.5,
                        });

                        // 每个 skill 只返回第一个匹配
                        break;
                    }
                }
            }
        }

        results.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap());

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_empty_query() {
        let config = ConfigManager::new().unwrap();
        let search = SearchManager::new(&config);

        let result = search.search_local("");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}
```

- [ ] **Step 2: 移除 grep 依赖（简化）**

更新 `src-tauri/Cargo.toml`，移除 grep 相关依赖：
```toml
# 移除这些行
grep-regex = "0.1"
grep-searcher = "0.1"
```

- [ ] **Step 3: 更新 core/mod.rs**

更新 `src-tauri/src/core/mod.rs`：

```rust
pub mod agent;
pub mod config;
pub mod installer;
pub mod registry;
pub mod search;
pub mod symlink;
```

- [ ] **Step 4: 运行测试**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/core/search.rs src-tauri/Cargo.toml
git commit -m "feat(core): add local search module

- Implement search_local for name, description, tags
- Implement search_content for full-text in SKILL.md
- Return relevance-sorted results
- Add matched field and text in results"
```

---

## Task 9: Tauri Commands - 配置和 Skill 命令

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/config_cmd.rs`
- Create: `src-tauri/src/commands/skill_cmd.rs`

---

### Task 9.1: 实现 Commands 模块结构

- [ ] **Step 1: 创建 commands/mod.rs**

创建 `src-tauri/src/commands/mod.rs`：

```rust
pub mod config_cmd;
pub mod skill_cmd;

// 公共类型
use serde::{Deserialize, Serialize};

/// Skill 过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillFilter {
    pub enabled_only: Option<bool>,
    pub agent_id: Option<String>,
}
```

- [ ] **Step 2: 实现配置命令**

创建 `src-tauri/src/commands/config_cmd.rs`：

```rust
use crate::commands::super::*;
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
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

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
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    manager.update_config(config)?;
    Ok(())
}
```

- [ ] **Step 3: 实现 Skill 命令**

创建 `src-tauri/src/commands/skill_cmd.rs`：

```rust
use crate::commands::super::*;
use crate::core::config::ConfigManager;
use crate::core::installer::Installer;
use crate::core::registry::{RegistryManager, Skill, SkillDetail};
use crate::error::Result;
use std::sync::Mutex;
use tauri::State;

use super::config_cmd::AppState;

/// 列出所有 skills
#[tauri::command]
pub async fn list_skills(
    state: State<'_, AppState>,
    filter: Option<SkillFilter>,
) -> Result<Vec<Skill>> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let registry = RegistryManager::new(&manager);
    let skills = registry.list_skills()?;

    // 应用过滤器
    let filtered = if let Some(f) = filter {
        if f.enabled_only.unwrap_or(false) {
            // TODO: 实现启用状态过滤
            skills
        } else {
            skills
        }
    } else {
        skills
    };

    Ok(filtered)
}

/// 获取 skill 详情
#[tauri::command]
pub async fn get_skill_detail(
    state: State<'_, AppState>,
    name: String,
) -> Result<SkillDetail> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let registry = RegistryManager::new(&manager);
    let detail = registry.get_skill_detail(&name)?;
    Ok(detail)
}

/// 从本地路径安装
#[tauri::command]
pub async fn install_skill_from_path(
    state: State<'_, AppState>,
    path: String,
) -> Result<Skill> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let installer = Installer::new(&manager);
    let skill = installer.install_from_path(&path)?;
    Ok(skill)
}

/// 卸载 skill
#[tauri::command]
pub async fn uninstall_skill(
    state: State<'_, AppState>,
    name: String,
) -> Result<()> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let installer = Installer::new(&manager);
    installer.uninstall(&name)?;
    Ok(())
}

/// 更新 SKILL.md
#[tauri::command]
pub async fn update_skill_md(
    state: State<'_, AppState>,
    name: String,
    content: String,
) -> Result<()> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let registry = RegistryManager::new(&manager);
    registry.update_skill_md(&name, &content)?;
    Ok(())
}
```

- [ ] **Step 4: 更新 main.rs 注册 commands**

更新 `src-tauri/src/main.rs`：

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod lib;

use commands::config_cmd::*;
use commands::skill_cmd::*;
use std::sync::Mutex;

fn main() {
    let config_manager = core::config::ConfigManager::new()
        .expect("Failed to initialize config manager");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(commands::config_cmd::AppState {
            config_manager: Mutex::new(config_manager),
        })
        .invoke_handler(tauri::generate_handler![
            // Config commands
            get_config,
            update_config,
            // Skill commands
            list_skills,
            get_skill_detail,
            install_skill_from_path,
            uninstall_skill,
            update_skill_md,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: 更新 lib.rs**

更新 `src-tauri/src/lib.rs`：

```rust
mod commands;
mod core;
mod error;

pub use error::{Result, SkillForgeError};
```

- [ ] **Step 6: 验证编译**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 7: 提交**

```bash
git add src-tauri/src/commands/ src-tauri/src/main.rs src-tauri/src/lib.rs
git commit -m "feat(commands): add config and skill commands

- Implement get_config, update_config
- Implement list_skills, get_skill_detail
- Implement install_skill_from_path, uninstall_skill
- Implement update_skill_md
- Set up global state with ConfigManager"
```

---

## Task 10: Tauri Commands - Agent 和 Link 命令

**Files:**
- Create: `src-tauri/src/commands/agent_cmd.rs`
- Create: `src-tauri/src/commands/link_cmd.rs`

---

### Task 10.1: 实现 Agent 管理命令

- [ ] **Step 1: 实现 agent 命令**

创建 `src-tauri/src/commands/agent_cmd.rs`：

```rust
use crate::core::agent::{Agent, AgentManager};
use crate::core::config::ConfigManager;
use crate::error::Result;
use std::sync::Mutex;
use tauri::State;

use super::config_cmd::AppState;

/// 自动检测 agents
#[tauri::command]
pub async fn detect_agents(state: State<'_, AppState>) -> Result<Vec<Agent>> {
    let mut manager = AgentManager::new();
    let agents = manager.detect_agents()?;
    Ok(agents)
}

/// 列出所有 agents
#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>> {
    // 实际应用中应该缓存 agent 列表
    let mut manager = AgentManager::new();
    let agents = manager.detect_agents()?;
    Ok(agents)
}

/// 添加自定义 agent
#[tauri::command]
pub async fn add_custom_agent(
    state: State<'_, AppState>,
    agent: Agent,
) -> Result<Agent> {
    let mut manager = AgentManager::new();
    manager.add_agent(agent.clone())?;
    Ok(agent)
}

/// 移除 agent
#[tauri::command]
pub async fn remove_agent(
    state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    let mut manager = AgentManager::new();
    manager.remove_agent(&id)?;
    Ok(())
}
```

- [ ] **Step 2: 实现 link 命令**

创建 `src-tauri/src/commands/link_cmd.rs`：

```rust
use crate::core::agent::{Agent, AgentManager};
use crate::core::config::ConfigManager;
use crate::core::registry::RegistryManager;
use crate::core::symlink;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

use super::config_cmd::AppState;

/// Skill 链接状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillLink {
    pub skill_name: String,
    pub agent_id: String,
    pub link_path: PathBuf,
    pub is_enabled: bool,
}

/// 启用 skill 到 agent
#[tauri::command]
pub async fn enable_skill(
    state: State<'_, AppState>,
    skill_name: String,
    agent_id: String,
) -> Result<()> {
    let config_manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let registry = RegistryManager::new(&config_manager);
    let skill = registry.get_skill_detail(&skill_name)?;

    let mut agent_manager = AgentManager::new();
    agent_manager.detect_agents()?;

    let agent = agent_manager.get_agent(&agent_id)
        .ok_or_else(|| crate::error::SkillForgeError::AgentNotFound(agent_id.clone()))?;

    // 确保目录存在
    agent_manager.ensure_agent_dir(&agent_id)?;

    // 创建 symlink
    let source = &skill.skill.path;
    let target = &agent.skills_path.join(&skill_name);

    symlink::create_skill_link(source, target)?;

    Ok(())
}

/// 禁用 skill
#[tauri::command]
pub async fn disable_skill(
    state: State<'_, AppState>,
    skill_name: String,
    agent_id: String,
) -> Result<()> {
    let config_manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let agent_manager = AgentManager::new();
    agent_manager.detect_agents()?;

    let agent = agent_manager.get_agent(&agent_id)
        .ok_or_else(|| crate::error::SkillForgeError::AgentNotFound(agent_id.clone()))?;

    let target = &agent.skills_path.join(&skill_name);

    symlink::remove_skill_link(target)?;

    Ok(())
}

/// 批量启用
#[tauri::command]
pub async fn batch_enable(
    state: State<'_, AppState>,
    skill_names: Vec<String>,
    agent_ids: Vec<String>,
) -> Result<()> {
    for skill_name in &skill_names {
        for agent_id in &agent_ids {
            enable_skill(state.clone(), skill_name.clone(), agent_id.clone()).await?;
        }
    }
    Ok(())
}

/// 获取 skill 的所有链接状态
#[tauri::command]
pub async fn get_skill_links(
    state: State<'_, AppState>,
    skill_name: String,
) -> Result<Vec<SkillLink>> {
    let agent_manager = AgentManager::new();
    let agents = agent_manager.detect_agents()?;

    let mut links = Vec::new();

    for agent in agents {
        let link_path = agent.skills_path.join(&skill_name);
        let is_enabled = symlink::is_skill_link(&link_path);

        links.push(SkillLink {
            skill_name: skill_name.clone(),
            agent_id: agent.id.clone(),
            link_path,
            is_enabled,
        });
    }

    Ok(links)
}
```

- [ ] **Step 3: 更新 commands/mod.rs**

更新 `src-tauri/src/commands/mod.rs`：

```rust
pub mod agent_cmd;
pub mod config_cmd;
pub mod link_cmd;
pub mod skill_cmd;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillFilter {
    pub enabled_only: Option<bool>,
    pub agent_id: Option<String>,
}
```

- [ ] **Step 4: 更新 main.rs 注册新命令**

更新 `src-tauri/src/main.rs`：

```rust
use commands::agent_cmd::*;
use commands::link_cmd::*;
// ... 其他 imports

// 在 invoke_handler 中添加
        .invoke_handler(tauri::generate_handler![
            // Config commands
            get_config,
            update_config,
            // Skill commands
            list_skills,
            get_skill_detail,
            install_skill_from_path,
            uninstall_skill,
            update_skill_md,
            // Agent commands
            detect_agents,
            list_agents,
            add_custom_agent,
            remove_agent,
            // Link commands
            enable_skill,
            disable_skill,
            batch_enable,
            get_skill_links,
        ])
```

- [ ] **Step 5: 验证编译**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 6: 提交**

```bash
git add src-tauri/src/commands/ src-tauri/src/main.rs
git commit -m "feat(commands): add agent and link commands

- Agent: detect_agents, list_agents, add_custom_agent, remove_agent
- Link: enable_skill, disable_skill, batch_enable, get_skill_links
- Implement symlink creation/removal through agent skills paths"
```

---

## Task 11: Tauri Commands - 搜索命令

**Files:**
- Create: `src-tauri/src/commands/search_cmd.rs`

---

### Task 11.1: 实现搜索命令

- [ ] **Step 1: 实现本地搜索命令**

创建 `src-tauri/src/commands/search_cmd.rs`：

```rust
use crate::core::config::ConfigManager;
use crate::core::search::{SearchManager, SearchResult};
use crate::error::Result;
use std::sync::Mutex;
use tauri::State;

use super::config_cmd::AppState;

/// 本地搜索
#[tauri::command]
pub async fn search_local(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResult>> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let search = SearchManager::new(&manager);
    let results = search.search_local(&query)?;
    Ok(results)
}

/// 搜索 SKILL.md 内容
#[tauri::command]
pub async fn search_content(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<SearchResult>> {
    let manager = state.config_manager.lock()
        .map_err(|e| crate::error::SkillForgeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string()
        )))?;

    let search = SearchManager::new(&manager);
    let results = search.search_content(&query)?;
    Ok(results)
}
```

- [ ] **Step 2: 更新 commands/mod.rs**

更新 `src-tauri/src/commands/mod.rs`：

```rust
pub mod agent_cmd;
pub mod config_cmd;
pub mod link_cmd;
pub mod search_cmd;
pub mod skill_cmd;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillFilter {
    pub enabled_only: Option<bool>,
    pub agent_id: Option<String>,
}
```

- [ ] **Step 3: 更新 main.rs**

更新 `src-tauri/src/main.rs`：

```rust
use commands::search_cmd::*;
// ... 其他 imports

// 在 invoke_handler 中添加
            // Search commands
            search_local,
            search_content,
```

- [ ] **Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/commands/ src-tauri/src/main.rs
git commit -m "feat(commands): add search commands

- Add search_local for name/description/tag search
- Add search_content for full-text SKILL.md search
- Return relevance-sorted results"
```

---

## Task 12: 前端 - 类型定义和工具函数

**Files:**
- Create: `src/types/index.ts`
- Create: `src/hooks/useInvoke.ts`
- Create: `src/utils/markdown.ts`

---

### Task 12.1: 定义 TypeScript 类型

- [ ] **Step 1: 创建类型定义**

创建 `src/types/index.ts`：

```typescript
// Skill 类型
export interface Skill {
  name: string;
  description: string;
  tags: string[];
  path: string;
  installed_at: string;
}

// Skill 详情
export interface SkillDetail {
  skill: Skill;
  content: string;
}

// Agent 类型
export interface Agent {
  id: string;
  name: string;
  skills_path: string;
  workspace_path: string | null;
  detected: boolean;
}

// Skill 链接状态
export interface SkillLink {
  skill_name: string;
  agent_id: string;
  link_path: string;
  is_enabled: boolean;
}

// 搜索结果
export interface SearchResult {
  skill_name: string;
  matched_field: string;
  matched_text: string;
  relevance: number;
}

// 配置
export interface AppConfig {
  registry_path: string;
  cache_path: string;
  agentskills_api_key: string | null;
  external_editor: string | null;
  auto_detect_agents: boolean;
}

// 过滤器
export interface SkillFilter {
  enabled_only?: boolean;
  agent_id?: string;
}
```

- [ ] **Step 2: 创建 Tauri invoke hook**

创建 `src/hooks/useInvoke.ts`：

```typescript
import { invoke } from '@tauri-apps/api/core';

export type InvokeResult<T> = Promise<Result<T, string>>;

// 配置命令
export const useConfig = () => ({
  getConfig: () => invoke<AppConfig>('get_config'),
  updateConfig: (config: AppConfig) => invoke('update_config', { config }),
});

// Skill 命令
export const useSkills = () => ({
  listSkills: (filter?: SkillFilter) =>
    invoke<Skill[]>('list_skills', { filter }),
  getSkillDetail: (name: string) =>
    invoke<SkillDetail>('get_skill_detail', { name }),
  installFromPath: (path: string) =>
    invoke<Skill>('install_skill_from_path', { path }),
  uninstallSkill: (name: string) =>
    invoke('uninstall_skill', { name }),
  updateSkillMd: (name: string, content: string) =>
    invoke('update_skill_md', { name, content }),
});

// Agent 命令
export const useAgents = () => ({
  detectAgents: () => invoke<Agent[]>('detect_agents'),
  listAgents: () => invoke<Agent[]>('list_agents'),
  addCustomAgent: (agent: Agent) =>
    invoke<Agent>('add_custom_agent', { agent }),
  removeAgent: (id: string) =>
    invoke('remove_agent', { id }),
});

// Link 命令
export const useLinks = () => ({
  enableSkill: (skillName: string, agentId: string) =>
    invoke('enable_skill', { skillName, agentId }),
  disableSkill: (skillName: string, agentId: string) =>
    invoke('disable_skill', { skillName, agentId }),
  batchEnable: (skillNames: string[], agentIds: string[]) =>
    invoke('batch_enable', { skillNames, agentIds }),
  getSkillLinks: (skillName: string) =>
    invoke<SkillLink[]>('get_skill_links', { skillName }),
});

// 搜索命令
export const useSearch = () => ({
  searchLocal: (query: string) =>
    invoke<SearchResult[]>('search_local', { query }),
  searchContent: (query: string) =>
    invoke<SearchResult[]>('search_content', { query }),
});
```

- [ ] **Step 3: 创建 Markdown 渲染工具**

创建 `src/utils/markdown.ts`：

```typescript
import { invoke } from '@tauri-apps/api/core';

// 使用 Tauri 后端渲染 Markdown
export async function renderMarkdown(content: string): Promise<string> {
  // 简单的 HTML 转义
  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  // 简单的 Markdown 转 HTML
  let html = escapeHtml(content);

  // 标题
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // 代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>');
  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

  // 链接
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

  // 列表
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

  // 段落
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;

  return html;
}
```

- [ ] **Step 4: 提交**

```bash
git add src/types/ src/hooks/ src/utils/
git commit -m "feat(frontend): add types, hooks, and utilities

- Define TypeScript types matching Rust structs
- Create useInvoke hook with Tauri invoke wrappers
- Add basic Markdown rendering utility"
```

---

## Task 13: 前端 - Zustand 状态管理

**Files:**
- Create: `src/stores/useAppStore.ts`

---

### Task 13.1: 创建全局状态 store

- [ ] **Step 1: 创建 Zustand store**

创建 `src/stores/useAppStore.ts`：

```typescript
import { create } from 'zustand';
import type {
  Agent, AppConfig, Skill, SkillDetail, SkillLink,
  SearchResult, SkillFilter
} from '../types';
import {
  useConfig, useSkills, useAgents, useLinks, useSearch
} from '../hooks/useInvoke';

interface AppState {
  // Data
  skills: Skill[];
  selectedSkill: string | null;
  skillDetail: SkillDetail | null;
  skillFilter: 'all' | 'enabled' | 'disabled';
  searchQuery: string;
  searchResults: SearchResult[];
  agents: Agent[];
  agentLinks: Map<string, SkillLink[]>;
  config: AppConfig | null;

  // UI state
  view: 'list' | 'detail' | 'search' | 'settings' | 'agents';
  sidebarOpen: boolean;

  // Actions
  loadSkills: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadConfig: () => Promise<void>;
  selectSkill: (name: string) => Promise<void>;
  enableSkill: (skillName: string, agentId: string) => Promise<void>;
  disableSkill: (skillName: string, agentId: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  installFromPath: (path: string) => Promise<void>;
  uninstallSkill: (name: string) => Promise<void>;
  setView: (view: AppState['view']) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  skills: [],
  selectedSkill: null,
  skillDetail: null,
  skillFilter: 'all',
  searchQuery: '',
  searchResults: [],
  agents: [],
  agentLinks: new Map(),
  config: null,
  view: 'list',
  sidebarOpen: true,

  // Actions
  loadSkills: async () => {
    const { listSkills } = useSkills();
    try {
      const skills = await listSkills();
      set({ skills });
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  },

  loadAgents: async () => {
    const { detectAgents } = useAgents();
    try {
      const agents = await detectAgents();
      set({ agents });
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  },

  loadConfig: async () => {
    const { getConfig } = useConfig();
    try {
      const config = await getConfig();
      set({ config });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },

  selectSkill: async (name: string) => {
    const { getSkillDetail } = useSkills();
    const { getSkillLinks } = useLinks();

    try {
      const [detail, links] = await Promise.all([
        getSkillDetail(name),
        getSkillLinks(name),
      ]);

      set({
        selectedSkill: name,
        skillDetail: detail,
        agentLinks: new Map([[name, links]]),
        view: 'detail',
      });
    } catch (error) {
      console.error('Failed to load skill detail:', error);
    }
  },

  enableSkill: async (skillName: string, agentId: string) => {
    const { enableSkill: enable } = useLinks();
    try {
      await enable(skillName, agentId);

      // Refresh links
      const { getSkillLinks } = useLinks();
      const links = await getSkillLinks(skillName);

      set(state => ({
        agentLinks: new Map(state.agentLinks).set(skillName, links),
      }));
    } catch (error) {
      console.error('Failed to enable skill:', error);
      throw error;
    }
  },

  disableSkill: async (skillName: string, agentId: string) => {
    const { disableSkill: disable } = useLinks();
    try {
      await disable(skillName, agentId);

      // Refresh links
      const { getSkillLinks } = useLinks();
      const links = await getSkillLinks(skillName);

      set(state => ({
        agentLinks: new Map(state.agentLinks).set(skillName, links),
      }));
    } catch (error) {
      console.error('Failed to disable skill:', error);
      throw error;
    }
  },

  search: async (query: string) => {
    const { searchLocal, searchContent } = useSearch();

    set({ searchQuery: query });

    if (!query.trim()) {
      set({ searchResults: [], view: 'list' });
      return;
    }

    try {
      const [localResults, contentResults] = await Promise.all([
        searchLocal(query),
        searchContent(query),
      ]);

      // 合并去重
      const allResults = [...localResults, ...contentResults];
      const seen = new Set<string>();
      const uniqueResults = allResults.filter(r => {
        const key = `${r.skill_name}-${r.matched_field}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      set({ searchResults: uniqueResults, view: 'search' });
    } catch (error) {
      console.error('Search failed:', error);
    }
  },

  installFromPath: async (path: string) => {
    const { installFromPath: install } = useSkills();
    try {
      await install(path);
      await get().loadSkills();
    } catch (error) {
      console.error('Failed to install skill:', error);
      throw error;
    }
  },

  uninstallSkill: async (name: string) => {
    const { uninstallSkill: uninstall } = useSkills();
    try {
      await uninstall(name);

      set({
        selectedSkill: null,
        skillDetail: null,
        view: 'list',
      });

      await get().loadSkills();
    } catch (error) {
      console.error('Failed to uninstall skill:', error);
      throw error;
    }
  },

  setView: (view: AppState['view']) => set({ view }),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
}));
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/
git commit -m "feat(frontend): add Zustand global state store

- Manage skills, agents, config, search results
- Actions for loading, selecting, enabling/disabling
- Search with local and content results
- UI state for view and sidebar"
```

---

## Task 14: 前端 - 主布局组件

**Files:**
- Create: `src/components/layout/MainLayout.tsx`
- Create: `src/components/layout/AgentBar.tsx`

---

### Task 14.1: 创建主布局

- [ ] **Step 1: 创建主布局组件**

创建 `src/components/layout/MainLayout.tsx`：

```typescript
import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import AgentBar from './AgentBar';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function MainLayout({ children, sidebar }: MainLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? 'w-80' : 'w-0'}
          transition-all duration-300
          border-r border-gray-700
          overflow-hidden
        `}
      >
        <div className="w-80 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">SkillForge</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              ◀
            </button>
          </div>

          {sidebar}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-gray-700 flex items-center px-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-4 p-1 hover:bg-gray-700 rounded"
            >
              ▶
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* Agent bar */}
        <AgentBar />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 创建 Agent 栏组件**

创建 `src/components/layout/AgentBar.tsx`：

```typescript
import React, { useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';

export default function AgentBar() {
  const { agents, loadAgents } = useAppStore();

  useEffect(() => {
    loadAgents();
  }, []);

  if (agents.length === 0) {
    return null;
  }

  return (
    <div className="h-12 border-t border-gray-700 flex items-center px-4 gap-4 bg-gray-800">
      <span className="text-sm text-gray-400">Agents:</span>
      {agents.map(agent => (
        <div
          key={agent.id}
          className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-sm"
          title={agent.name}
        >
          <span className="text-gray-300">{agent.name}</span>
          <span className="text-gray-500">({agent.id})</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/
git commit -m "feat(frontend): add main layout components

- Add MainLayout with collapsible sidebar
- Add AgentBar showing detected agents
- Dark theme with gray-900/700 colors"
```

---

## Task 15: 前端 - Skills 列表组件

**Files:**
- Create: `src/components/skills/SkillList.tsx`
- Create: `src/components/skills/SkillListItem.tsx`

---

### Task 15.1: 创建 Skills 列表

- [ ] **Step 1: 创建列表项组件**

创建 `src/components/skills/SkillListItem.tsx`：

```typescript
import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

interface SkillListItemProps {
  name: string;
  description: string;
  tags: string[];
}

export default function SkillListItem({ name, description, tags }: SkillListItemProps) {
  const { selectSkill, selectedSkill, agentLinks } = useAppStore();

  const links = agentLinks.get(name) || [];
  const enabledCount = links.filter(l => l.is_enabled).length;

  const statusColor = enabledCount === 0 ? 'bg-gray-500' :
                     enabledCount === links.length ? 'bg-green-500' :
                     'bg-yellow-500';

  const handleClick = () => {
    selectSkill(name);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        p-3 mb-2 rounded cursor-pointer
        hover:bg-gray-700
        ${selectedSkill === name ? 'bg-gray-700' : ''}
        transition-colors
      `}
    >
      <div className="flex items-start gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColor} mt-1.5`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white truncate">{name}</div>
          <div className="text-sm text-gray-400 truncate">{description}</div>
          {tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建列表组件**

创建 `src/components/skills/SkillList.tsx`：

```typescript
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import SkillListItem from './SkillListItem';

export default function SkillList() {
  const { skills, searchQuery, searchResults, loadSkills } = useAppStore();
  const [filter, setFilter] = React.useState<'all' | 'enabled' | 'disabled'>('all');

  useEffect(() => {
    loadSkills();
  }, []);

  const displaySkills = searchQuery
    ? searchResults.map(r => ({ name: r.skill_name, description: r.matched_text, tags: [] }))
    : skills;

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'enabled', 'disabled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1 rounded text-sm
              ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}
            `}
          >
            {f === 'all' ? '全部' : f === 'enabled' ? '已启用' : '未启用'}
          </button>
        ))}
      </div>

      {/* Skills */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {displaySkills.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery ? '无搜索结果' : '暂无 Skills'}
          </div>
        ) : (
          displaySkills.map(skill => (
            <SkillListItem
              key={skill.name}
              name={skill.name}
              description={skill.description}
              tags={skill.tags}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/skills/
git commit -m "feat(frontend): add skill list components

- SkillListItem with status indicator
- SkillList with filter buttons
- Show enabled/disabled state colors
- Handle empty states"
```

---

## Task 16: 前端 - Skill 详情组件

**Files:**
- Create: `src/components/skills/SkillDetail.tsx`

---

### Task 16.1: 创建详情面板

- [ ] **Step 1: 创建详情组件**

创建 `src/components/skills/SkillDetail.tsx`：

```typescript
import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { renderMarkdown } from '../../utils/markdown';

export default function SkillDetail() {
  const {
    skillDetail,
    agentLinks,
    agents,
    enableSkill,
    disableSkill,
    uninstallSkill,
    selectSkill
  } = useAppStore();

  if (!skillDetail) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        选择一个 Skill 查看详情
      </div>
    );
  }

  const { skill, content } = skillDetail;
  const links = agentLinks.get(skill.name) || [];

  const handleToggle = async (agentId: string) => {
    const link = links.find(l => l.agent_id === agentId);
    if (link?.is_enabled) {
      await disableSkill(skill.name, agentId);
    } else {
      await enableSkill(skill.name, agentId);
    }
  };

  const handleUninstall = async () => {
    if (confirm(`确定要卸载 "${skill.name}" 吗？`)) {
      await uninstallSkill(skill.name);
    }
  };

  const [html, setHtml] = React.useState('');

  React.useEffect(() => {
    renderMarkdown(content).then(setHtml);
  }, [content]);

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{skill.name}</h2>
          <p className="text-gray-400">{skill.description}</p>
          {skill.tags.length > 0 && (
            <div className="flex gap-2 mt-2">
              {skill.tags.map(tag => (
                <span key={tag} className="text-sm px-2 py-1 bg-gray-700 text-gray-300 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleUninstall}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
        >
          卸载
        </button>
      </div>

      {/* Agent toggles */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">启用状态</h3>
        <div className="grid grid-cols-2 gap-3">
          {agents.map(agent => {
            const link = links.find(l => l.agent_id === agent.id);
            const isEnabled = link?.is_enabled ?? false;

            return (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded"
              >
                <span className="text-gray-300">{agent.name}</span>
                <button
                  onClick={() => handleToggle(agent.id)}
                  className={`
                    px-4 py-1 rounded text-sm
                    ${isEnabled
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    }
                  `}
                >
                  {isEnabled ? '已启用' : '未启用'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Markdown content */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">SKILL.md</h3>
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/skills/SkillDetail.tsx
git commit -m "feat(frontend): add skill detail panel

- Show skill info, tags, agent toggles
- Markdown rendered content
- Uninstall button with confirmation
- Enable/disable per agent"
```

---

## Task 17: 前端 - 搜索组件

**Files:**
- Create: `src/components/search/SearchBar.tsx`
- Create: `src/components/search/SearchResults.tsx`

---

### Task 17.1: 创建搜索栏和结果

- [ ] **Step 1: 创建搜索栏**

创建 `src/components/search/SearchBar.tsx`：

```typescript
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/useAppStore';

export default function SearchBar() {
  const { searchQuery, search, setView } = useAppStore();
  const [input, setInput] = useState(searchQuery);

  useEffect(() => {
    setInput(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(input);
  };

  const handleClear = () => {
    setInput('');
    search('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="搜索 Skills..."
        className="w-full px-4 py-2 pl-10 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
      />
      <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
      {input && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-2 text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 2: 创建搜索结果组件**

创建 `src/components/search/SearchResults.tsx`：

```typescript
import React from 'react';
import { useAppStore } from '../../stores/useAppStore';

export default function SearchResults() {
  const { searchResults, selectSkill } = useAppStore();

  if (searchResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        无搜索结果
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">
        搜索结果 ({searchResults.length})
      </h2>
      <div className="space-y-2">
        {searchResults.map((result, idx) => (
          <div
            key={`${result.skill_name}-${result.matched_field}-${idx}`}
            onClick={() => selectSkill(result.skill_name)}
            className="p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
          >
            <div className="font-medium text-white">{result.skill_name}</div>
            <div className="text-sm text-gray-400">
              {result.matched_field}: {result.matched_text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/search/
git commit -m "feat(frontend): add search components

- SearchBar with input and clear button
- SearchResults displaying matches
- Click to view skill detail"
```

---

## Task 18: 前端 - 设置对话框

**Files:**
- Create: `src/components/settings/Settings.tsx`

---

### Task 18.1: 创建设置面板

- [ ] **Step 1: 创建设置组件**

创建 `src/components/settings/Settings.tsx`：

```typescript
import React, { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useConfig } from '../../hooks/useInvoke';

export default function Settings() {
  const { config, loadConfig } = useAppStore();
  const { updateConfig } = useConfig();
  const [localConfig, setLocalConfig] = useState(config);

  React.useEffect(() => {
    loadConfig();
  }, []);

  React.useEffect(() => {
    if (config) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  const handleSave = async () => {
    if (localConfig) {
      try {
        await updateConfig(localConfig);
        alert('配置已保存');
      } catch (error) {
        alert(`保存失败: ${error}`);
      }
    }
  };

  if (!localConfig) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">设置</h2>

      <div className="space-y-6">
        {/* Paths */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">路径</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                中央仓库路径
              </label>
              <input
                type="text"
                value={localConfig.registry_path}
                onChange={e => setLocalConfig({
                  ...localConfig,
                  registry_path: e.target.value
                })}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                缓存路径
              </label>
              <input
                type="text"
                value={localConfig.cache_path}
                onChange={e => setLocalConfig({
                  ...localConfig,
                  cache_path: e.target.value
                })}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
                disabled
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">API Keys</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              AgentSkills.io API Key
            </label>
            <input
              type="password"
              value={localConfig.agentskills_api_key || ''}
              onChange={e => setLocalConfig({
                ...localConfig,
                agentskills_api_key: e.target.value || null
              })}
              placeholder="可选"
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
            />
          </div>
        </div>

        {/* Editor */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">编辑器</h3>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              外部编辑器路径
            </label>
            <input
              type="text"
              value={localConfig.external_editor || ''}
              onChange={e => setLocalConfig({
                ...localConfig,
                external_editor: e.target.value || null
              })}
              placeholder="例如: code, vim, nano"
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
            />
          </div>
        </div>

        {/* Options */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">选项</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.auto_detect_agents}
              onChange={e => setLocalConfig({
                ...localConfig,
                auto_detect_agents: e.target.checked
              })}
              className="w-4 h-4"
            />
            <span className="text-gray-300">启动时自动检测 Agents</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/settings/
git commit -m "feat(frontend): add settings dialog

- Show registry and cache paths (read-only)
- API key input for AgentSkills.io
- External editor path setting
- Auto-detect agents toggle"
```

---

## Task 19: 前端 - Agent 管理面板

**Files:**
- Create: `src/components/agents/AgentPanel.tsx`

---

### Task 19.1: 创建 Agent 管理组件

- [ ] **Step 1: 创建 Agent 面板**

创建 `src/components/agents/AgentPanel.tsx`：

```typescript
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useAgents } from '../../hooks/useInvoke';

export default function AgentPanel() {
  const { agents, loadAgents } = useAppStore();
  const { addCustomAgent, removeAgent } = useAgents();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    id: '',
    name: '',
    skills_path: '',
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const handleAdd = async () => {
    if (!newAgent.id || !newAgent.name || !newAgent.skills_path) {
      alert('请填写所有字段');
      return;
    }

    try {
      await addCustomAgent({
        id: newAgent.id,
        name: newAgent.name,
        skills_path: newAgent.skills_path,
        workspace_path: null,
        detected: false,
      });
      setShowAddForm(false);
      setNewAgent({ id: '', name: '', skills_path: '' });
      loadAgents();
    } catch (error) {
      alert(`添加失败: ${error}`);
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm('确定要移除此 Agent 吗？')) {
      try {
        await removeAgent(id);
        loadAgents();
      } catch (error) {
        alert(`移除失败: ${error}`);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Agent 管理</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          + 添加 Agent
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <h3 className="text-lg font-semibold text-white mb-3">添加自定义 Agent</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="ID (例如: my-agent)"
              value={newAgent.id}
              onChange={e => setNewAgent({ ...newAgent, id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
            <input
              type="text"
              placeholder="显示名称"
              value={newAgent.name}
              onChange={e => setNewAgent({ ...newAgent, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
            <input
              type="text"
              placeholder="Skills 路径 (例如: ~/.my-agent/skills)"
              value={newAgent.skills_path}
              onChange={e => setNewAgent({ ...newAgent, skills_path: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                添加
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {agents.map(agent => (
          <div
            key={agent.id}
            className="p-4 bg-gray-800 rounded flex items-center justify-between"
          >
            <div>
              <div className="font-medium text-white">{agent.name}</div>
              <div className="text-sm text-gray-400">
                ID: {agent.id} | {agent.detected ? '自动检测' : '自定义'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {agent.skills_path}
              </div>
            </div>
            {!agent.detected && (
              <button
                onClick={() => handleRemove(agent.id)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                移除
              </button>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          未检测到任何 Agent
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/agents/
git commit -m "feat(frontend): add agent management panel

- List detected and custom agents
- Add custom agent form
- Remove custom agent action
- Show agent paths and detection status"
```

---

## Task 20: 前端 - 主应用整合

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

---

### Task 20.1: 整合所有组件

- [ ] **Step 1: 更新 App.tsx**

替换 `src/App.tsx`：

```typescript
import React, { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import MainLayout from './components/layout/MainLayout';
import SkillList from './components/skills/SkillList';
import SkillDetail from './components/skills/SkillDetail';
import SearchBar from './components/search/SearchBar';
import SearchResults from './components/search/SearchResults';
import Settings from './components/settings/Settings';
import AgentPanel from './components/agents/AgentPanel';

function App() {
  const { view, loadSkills, loadAgents, loadConfig } = useAppStore();

  useEffect(() => {
    loadConfig();
    loadAgents();
    loadSkills();
  }, []);

  const renderContent = () => {
    switch (view) {
      case 'detail':
        return <SkillDetail />;
      case 'search':
        return <SearchResults />;
      case 'settings':
        return <Settings />;
      case 'agents':
        return <AgentPanel />;
      default:
        return <div className="p-6 text-gray-500">选择一个 Skill 开始</div>;
    }
  };

  return (
    <MainLayout
      sidebar={
        <>
          <SearchBar />
          <div className="mt-4">
            <SkillList />
          </div>
        </>
      }
    >
      <div className="flex">
        {/* Nav */}
        <div className="w-48 border-r border-gray-700 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => useAppStore.getState().setView('list')}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
            >
              Skills 列表
            </button>
            <button
              onClick={() => useAppStore.getState().setView('agents')}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
            >
              Agent 管理
            </button>
            <button
              onClick={() => useAppStore.getState().setView('settings')}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
            >
              设置
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
```

- [ ] **Step 2: 更新 main.tsx**

更新 `src/main.tsx`：

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: 更新 index.css**

确保 `src/index.css` 包含 Tailwind 指令和基础样式：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1f2937;
}

::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Markdown prose */
.prose {
  color: #d1d5db;
}

.prose h1, .prose h2, .prose h3 {
  color: #f9fafb;
}

.prose code {
  background: #374151;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.prose pre {
  background: #1f2937;
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
}

.prose a {
  color: #60a5fa;
}

.prose a:hover {
  color: #3b82f6;
}
```

- [ ] **Step 4: 运行和测试**

```bash
npm run tauri dev
```

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx src/main.tsx src/index.css
git commit -m "feat(frontend): integrate all components in App

- Wire up MainLayout with sidebar and content
- Add navigation sidebar
- Route views: list, detail, search, settings, agents
- Add custom scrollbar and prose styles"
```

---

## Task 21: 最终验证和文档

**Files:**
- Update: `README.md`
- Update: `.gitignore`

---

### Task 21.1: 更新文档和验证功能

- [ ] **Step 1: 创建 README**

创建 `README.md`：

```markdown
# SkillForge

跨平台桌面应用，用于统一管理多个 AI IDE/Agent 的 Skills。

## 功能

- 🔍 统一管理 Claude Code、Cursor、Kiro、Codex、OpenClaw 等 Agent 的 Skills
- 📦 一处安装，多处生效（通过 symlink/junction）
- 🔗 启用/禁用 Skill 到指定 Agent
- 📝 查看 SKILL.md 内容（Markdown 渲染）
- 🔍 本地全文搜索
- ⚙️ 自定义 Agent 配置

## 技术栈

- **后端**: Rust + Tauri 2
- **前端**: React 18 + TypeScript + TailwindCSS
- **状态管理**: Zustand

## 开发

\`\`\`bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建
npm run tauri build
\`\`\`

## 路径结构

- 中央仓库: `~/.skillforge/registry/`
- 配置文件: `~/.skillforge/config.json`
- 缓存: `~/.skillforge/cache/`

## Windows Symlink 说明

在 Windows 上，应用会自动尝试创建 symlink。如果失败（未启用开发者模式），会自动 fallback 到 Junction。

建议启用开发者模式以获得最佳体验。
```

- [ ] **Step 2: 验证 P0 功能**

测试清单：
- [ ] 应用启动正常
- [ ] 自动检测已安装的 Agents
- [ ] 可以安装本地 Skill
- [ ] 可以查看 Skill 详情
- [ ] 可以启用/禁用 Skill 到 Agent
- [ ] 搜索功能正常
- [ ] Agent 管理正常
- [ ] 设置保存正常

- [ ] **Step 3: 提交**

```bash
git add README.md
git commit -m "docs: add README with features and setup

- Document all P0 features
- Add tech stack overview
- Include development commands
- Explain Windows symlink behavior"
```

---

## 计划总结

本计划实现了 SkillForge 的 P0 阶段全部功能：

### 已完成模块
1. ✅ Tauri 项目脚手架
2. ✅ Core: 配置管理
3. ✅ Core: 中央仓库管理
4. ✅ Core: 跨平台 symlink（含 Windows junction fallback）
5. ✅ Core: Agent 检测和管理
6. ✅ Core: 安装/卸载逻辑
7. ✅ Core: 本地搜索
8. ✅ Commands: 完整 API
9. ✅ 前端: 类型定义和工具
10. ✅ 前端: Zustand 状态管理
11. ✅ 前端: 主布局
12. ✅ 前端: Skills 列表和详情
13. ✅ 前端: 搜索功能
14. ✅ 前端: Agent 管理面板
15. ✅ 前端: 设置对话框
16. ✅ 前端: 应用整合

### 后续阶段 (P1/P2)
- P1: Git 安装、在线搜索、内置编辑器、批量操作
- P2: 自定义路径、版本管理、导入现有 skills

### 文件总数
- Rust 源文件: ~15 个
- React 组件: ~15 个
- 配置文件: ~5 个

---

**计划完成。** 保存位置: `docs/superpowers/plans/2026-04-05-skillforge-p0.md`
