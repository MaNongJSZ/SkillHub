# SkillForge — Skills Desktop Manager PRD

## 1. 产品概述

**SkillForge** 是一个 Rust/GTK4 桌面应用，用于统一管理多种 AI IDE 和 Agent 的 Skills（指令包）。通过 symlink 机制实现 skills 在不同 agent 间的共享、启用/禁用、安装/卸载。

### 目标用户
同时使用多个 AI 编程工具的开发者（Claude Code、Cursor、Kiro、OpenAI Codex 等）。

### 核心价值
- 一处安装，多处生效
- 统一界面管理分散在各地的 skills
- 通过 symlink 保证修改同步

---

## 2. 支持的 Agent 及 Skills 路径

| Agent | 全局 Skills 路径 | 工作区 Skills 路径 | 格式 |
|-------|-----------------|------------------|------|
| OpenClaw | `~/clawd/skills/<name>/SKILL.md` | N/A (workspace 级) | SKILL.md |
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | `<project>/.claude/skills/<name>/SKILL.md` | SKILL.md |
| OpenAI Codex | `~/.codex/skills/<name>/SKILL.md` | `<project>/.codex/skills/<name>/SKILL.md` | SKILL.md |
| Cursor | `~/.cursor/skills/<name>/SKILL.md` | `<project>/.cursor/skills/<name>/SKILL.md` | SKILL.md |
| Kiro | `~/.kiro/skills/<name>/SKILL.md` | `<project>/.kiro/skills/<name>/SKILL.md` | SKILL.md |

### Skills 存储仓库
所有 skills 的"真实"文件存储在一个中央仓库：`~/.skillforge/registry/<name>/`
- 每个 skill 是一个目录，包含 `SKILL.md`（必需）和其他辅助文件
- 各 agent 的 skills 目录中的 skill 通过 symlink 指向中央仓库

---

## 3. 功能需求

### 3.1 Skills 列表（主界面）
- 显示所有已安装 skills（从 registry 读取）
- 每个 skill 显示：名称、描述（从 SKILL.md 提取）、标签、版本
- 按名称/标签搜索和过滤
- 支持按启用状态过滤（全部 / 已启用 / 未启用）

### 3.2 Skill 详情面板
- 显示 SKILL.md 完整内容（Markdown 渲染）
- 显示 skill 关联的 agent 列表（哪些 agent 启用了此 skill）
- 编辑 SKILL.md（内置文本编辑器或调用系统编辑器）

### 3.3 启用/禁用
- 选择一个 skill → 选择目标 agent → 创建/删除 symlink
- 支持批量操作：选中多个 skills → 启用到所有 agent
- 禁用时不删除 registry 中的文件，只删除 symlink
- 操作前确认（尤其是删除操作）

### 3.4 安装/卸载
**安装来源：**
- **本地路径**：从指定目录导入 skill 到 registry
- **Git 仓库**：从 GitHub/GitLab URL 克隆
- **搜索安装**：集成 [AgentSkills.io](https://agentskills.io) / [ClawHub](https://clawhub.ai) API 搜索和安装

**卸载：**
- 从 registry 删除
- 同时清理所有 agent 中的对应 symlink

### 3.5 搜索
- 本地搜索：名称、描述、SKILL.md 内容全文搜索
- 在线搜索：从 AgentSkills.io 和 ClawHub 搜索公开 skills
- 搜索结果显示名称、描述、来源、下载/安装按钮

### 3.6 Agent 管理
- 自动检测本地已安装的 agent（检查各自配置目录是否存在）
- 支持手动添加/移除 agent
- 每个 agent 显示：名称、skills 路径、已启用 skill 数量、路径是否存在
- 支持自定义 skills 路径（非默认路径）

### 3.7 设置
- 中央仓库路径配置（默认 `~/.skillforge/registry/`）
- 搜索源配置（AgentSkills.io API key 等）
- 外部编辑器配置（用于编辑 SKILL.md）
- 启动时自动检测 agent 变化

---

## 4. 技术方案

### 技术栈
- **语言**：Rust
- **GUI 框架**：GTK4 + libadwaita（现代 GNOME 风格，跨平台）
- **Markdown 渲染**：`comrak`（纯 Rust Markdown 库）
- **Symlink 管理**：Rust std::os::unix::fs::symlink
- **Git 操作**：`git2` crate
- **HTTP 请求**：`reqwest`
- **配置存储**：JSON（`~/.skillforge/config.json`）
- **打包**：cargo-bundle / flatpak

### 核心数据结构

```rust
// 中央仓库中的 skill
struct Skill {
    name: String,
    description: String,
    tags: Vec<String>,
    path: PathBuf,           // ~/.skillforge/registry/<name>/
    installed_at: DateTime,
}

// Agent 配置
struct Agent {
    id: String,              // "claude-code", "cursor", "kiro", "codex", "openclaw"
    name: String,            // 显示名称
    skills_path: PathBuf,    // 全局 skills 路径
    detected: bool,          // 是否自动检测到
}

// Skill 在 Agent 中的启用状态
struct SkillLink {
    skill_name: String,
    agent_id: String,
    link_path: PathBuf,      // symlink 路径
    is_enabled: bool,        // symlink 是否存在
}
```

### 架构

```
skillforge/
├── src/
│   ├── main.rs              # 入口
│   ├── app.rs               # Application 状态
│   ├── ui/
│   │   ├── mod.rs
│   │   ├── window.rs        # 主窗口
│   │   ├── skill_list.rs    # Skills 列表面板
│   │   ├── skill_detail.rs  # Skill 详情面板
│   │   ├── agent_panel.rs   # Agent 管理面板
│   │   ├── search.rs        # 搜索面板
│   │   └── settings.rs      # 设置面板
│   ├── core/
│   │   ├── mod.rs
│   │   ├── registry.rs      # 中央仓库管理
│   │   ├── symlink.rs       # Symlink 操作
│   │   ├── agent.rs         # Agent 检测和管理
│   │   ├── installer.rs     # 安装/卸载逻辑
│   │   └── search.rs        # 搜索逻辑（本地+在线）
│   └── config.rs            # 配置管理
├── Cargo.toml
└── README.md
```

---

## 5. UI 设计

### 主布局
```
┌──────────────────────────────────────────────────────────────┐
│  🔍 搜索...                            ⚙️ 设置               │
├────────────────────┬─────────────────────────────────────────┤
│                    │                                         │
│  Skills 列表        │  Skill 详情                             │
│                    │                                         │
│  ☑ skill-a    🟢   │  名称: weather                         │
│  ☑ skill-b    🟢   │  描述: 查天气...                        │
│  ☐ skill-c    ⚪   │  标签: utility, api                     │
│  ☑ skill-d    🟡   │                                         │
│                    │  Agent 启用状态:                         │
│                    │  ☑ Claude Code   ☑ Cursor               │
│                    │  ☐ Kiro          ☑ Codex                │
│                    │  ☐ OpenClaw                             │
│                    │                                         │
│                    │  [编辑 SKILL.md] [卸载]                  │
│                    │                                         │
├────────────────────┴─────────────────────────────────────────┤
│  📦 Claude Code (8)  📦 Cursor (5)  📦 Kiro (0)  ...       │
└──────────────────────────────────────────────────────────────┘
```

### 颜色状态指示
- 🟢 绿色：已在所有检测到的 agent 中启用
- 🟡 黄色：部分启用
- ⚪ 灰色：未启用

---

## 6. 实现优先级

### P0 - MVP
1. 中央仓库管理（创建/读取/删除）
2. Symlink 启用/禁用到各 agent
3. Skills 列表 + 搜索过滤
4. Skill 详情查看
5. 自动检测已安装 agent

### P1 - 增强
6. 从 Git 仓库安装 skill
7. 在线搜索（AgentSkills.io）
8. SKILL.md 编辑器
9. 批量操作

### P2 - 高级
10. ClawHub 集成搜索
11. 自定义 agent skills 路径
12. Skill 版本管理
13. 导入现有 skills（扫描已有目录，迁移到 registry）

---

## 7. 项目结构

```
~/.skillforge/
├── config.json              # 应用配置
├── registry/                # Skills 中央仓库
│   ├── weather/
│   │   └── SKILL.md
│   ├── code-review/
│   │   └── SKILL.md
│   └── ...
└── cache/                   # 搜索缓存等
```
