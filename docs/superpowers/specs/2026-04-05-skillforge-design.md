# SkillForge 设计文档

**日期**: 2026-04-05
**状态**: 已批准
**阶段**: 全功能分阶段交付，第一阶段 P0

---

## 1. 概述

SkillForge 是一个跨平台桌面应用，用于统一管理多个 AI IDE/Agent 的 Skills（指令包）。通过 symlink/junction 机制实现 skills 在不同 agent 间的共享、启用/禁用、安装/卸载。

### 目标用户
同时使用多个 AI 编程工具的开发者（Claude Code、Cursor、Kiro、OpenAI Codex、OpenClaw 等）。

### 核心价值
- 一处安装，多处生效
- 统一界面管理分散在各地的 skills
- 通过 symlink 保证修改同步

### 目标平台
- Windows 10/11（开发者模式或 junction fallback）
- macOS 12+
- Linux（主流发行版）

---

## 2. 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| 框架 | Tauri 2 | 跨平台桌面应用 |
| 前端 | React 18 + TypeScript | UI |
| 状态管理 | Zustand | 全局状态 |
| 样式 | TailwindCSS | 快速样式 |
| 构建 | Vite | 前端构建 |
| 后端 | Rust | 系统操作、核心逻辑 |
| Markdown | comrak | SKILL.md 渲染为 HTML |
| Git | git2 | 从仓库安装 |
| HTTP | reqwest | 在线搜索 |
| 配置 | serde_json | JSON 读写 |

---

## 3. 架构设计（方案 A：Tauri 标准分层）

```
┌─────────────────────────────────┐
│  React 前端 (TypeScript)         │
│  - UI 组件 + Zustand 状态管理    │
│  - 通过 Tauri invoke 调用后端    │
├─────────────────────────────────┤
│  Tauri Commands (Rust)           │
│  - 薄命令层，参数校验 + 转发      │
├─────────────────────────────────┤
│  Core 模块 (Rust)                │
│  - registry / symlink / agent    │
│  - installer / search / config   │
└─────────────────────────────────┘
```

### 项目结构

```
skillforge/
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs             # Tauri 入口
│   │   ├── lib.rs              # 模块导出
│   │   ├── commands/           # Tauri 命令层
│   │   │   ├── mod.rs
│   │   │   ├── skill_cmd.rs    # skill CRUD 命令
│   │   │   ├── agent_cmd.rs    # agent 管理
│   │   │   ├── search_cmd.rs   # 搜索命令
│   │   │   └── config_cmd.rs   # 配置命令
│   │   └── core/               # 核心业务逻辑
│   │       ├── mod.rs
│   │       ├── registry.rs     # 中央仓库管理
│   │       ├── symlink.rs      # 跨平台 symlink
│   │       ├── agent.rs        # Agent 检测/管理
│   │       ├── installer.rs    # 安装/卸载
│   │       ├── search.rs       # 本地搜索
│   │       ├── online.rs       # 在线搜索
│   │       └── config.rs       # 配置管理
│   └── Cargo.toml
├── src/                        # React 前端
│   ├── App.tsx
│   ├── components/
│   │   ├── SkillList.tsx       # Skills 列表
│   │   ├── SkillDetail.tsx     # Skill 详情
│   │   ├── AgentPanel.tsx      # Agent 管理
│   │   ├── SearchBar.tsx       # 搜索栏
│   │   └── Settings.tsx        # 设置
│   ├── stores/
│   │   └── useAppStore.ts      # Zustand 状态管理
│   ├── hooks/
│   │   └── useInvoke.ts        # Tauri invoke 封装
│   └── types/
│       └── index.ts            # 类型定义
├── package.json
└── tauri.conf.json
```

---

## 4. 核心数据模型

### Rust 数据结构

```rust
/// 中央仓库中的 Skill
struct Skill {
    name: String,
    description: String,       // 从 SKILL.md frontmatter 提取
    tags: Vec<String>,
    path: PathBuf,             // ~/.skillforge/registry/<name>/
    installed_at: DateTime<Utc>,
}

/// Agent 配置
struct Agent {
    id: String,                // "claude-code", "cursor" 等
    name: String,
    skills_path: PathBuf,      // 全局 skills 路径
    workspace_path: PathBuf,   // 工作区 skills 路径（可选）
    detected: bool,            // 是否自动检测到
}

/// Skill 在 Agent 中的启用状态
struct SkillLink {
    skill_name: String,
    agent_id: String,
    link_path: PathBuf,
    is_enabled: bool,
}
```

### 存储结构

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

---

## 5. 跨平台 Symlink 策略

| 平台 | 目录 Symlink | 文件 Symlink | Fallback |
|---|---|---|---|
| Linux | `std::os::unix::fs::symlink` | 同左 | 无需 |
| macOS | `std::os::unix::fs::symlink` | 同左 | 无需 |
| Windows | `std::os::windows::fs::symlink_dir` | `symlink_file` | Junction |

### Windows 策略
1. 先尝试创建 symlink（需要开发者模式或管理员权限）
2. 如果失败，自动 fallback 到 Junction（目录级软链接，无需特殊权限）
3. 首次启动时检测权限，提示用户开启开发者模式

```rust
fn create_skill_link(source: &Path, target: &Path) -> Result<()> {
    #[cfg(unix)]
    std::os::unix::fs::symlink(source, target)?;

    #[cfg(windows)]
    {
        if let Err(_) = std::os::windows::fs::symlink_dir(source, target) {
            create_junction(source, target)?;
        }
    }
    Ok(())
}
```

---

## 6. Tauri Commands API

### Skill 管理

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `list_skills` | `filter?: SkillFilter` | `Vec<Skill>` | 列出所有 skills |
| `get_skill_detail` | `name: String` | `SkillDetail` | 获取详情 |
| `install_skill_from_path` | `path: String` | `Skill` | 从本地路径安装 |
| `install_skill_from_git` | `url: String` | `Skill` | 从 Git 仓库安装 |
| `uninstall_skill` | `name: String` | `()` | 卸载 skill |
| `update_skill_md` | `name, content` | `()` | 更新 SKILL.md |

### Agent 管理

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `detect_agents` | - | `Vec<Agent>` | 自动检测已安装 agents |
| `list_agents` | - | `Vec<Agent>` | 列出所有 agents |
| `add_custom_agent` | `AgentConfig` | `Agent` | 添加自定义 agent |
| `remove_agent` | `id: String` | `()` | 移除 agent |

### 启用/禁用

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `enable_skill` | `skill_name, agent_id` | `()` | 启用 skill 到 agent |
| `disable_skill` | `skill_name, agent_id` | `()` | 禁用 skill |
| `batch_enable` | `skill_names[], agent_ids[]` | `()` | 批量启用 |
| `get_skill_links` | `skill_name` | `Vec<SkillLink>` | 获取启用状态 |

### 搜索

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `search_local` | `query: String` | `Vec<SearchResult>` | 本地搜索 |
| `search_online` | `query, source` | `Vec<OnlineResult>` | 在线搜索 |
| `install_from_online` | `source, skill_id` | `Skill` | 从在线源安装 |

### 配置

| 命令 | 参数 | 返回 | 说明 |
|---|---|---|---|
| `get_config` | - | `AppConfig` | 获取配置 |
| `update_config` | `AppConfig` | `()` | 更新配置 |

---

## 7. 前端 UI 设计

### 主布局（三栏式）

```
┌──────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │             │  │                                  │  │
│  │  Skills     │  │  Skill 详情 / 搜索结果           │  │
│  │  列表       │  │                                  │  │
│  │  (侧边栏)   │  │  - Markdown 渲染                 │  │
│  │             │  │  - Agent 启用开关                 │  │
│  │  搜索过滤   │  │  - 编辑/卸载按钮                 │  │
│  │             │  │                                  │  │
│  │  ● skill-a  │  │                                  │  │
│  │  ● skill-b  │  │                                  │  │
│  │  ○ skill-c  │  │                                  │  │
│  │             │  │                                  │  │
│  └─────────────┘  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Agent 栏: Claude(8) | Cursor(5) | Kiro(0) ...   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 状态指示
- 绿色：已在所有检测到的 agent 中启用
- 黄色：部分启用
- 灰色：未启用

### 前端状态管理（Zustand）

```typescript
interface AppState {
  skills: Skill[];
  selectedSkill: string | null;
  skillFilter: 'all' | 'enabled' | 'disabled';
  searchQuery: string;
  agents: Agent[];
  agentLinks: Map<string, SkillLink[]>;
  view: 'list' | 'detail' | 'search' | 'settings' | 'agents';

  loadSkills(): Promise<void>;
  loadAgents(): Promise<void>;
  enableSkill(skill: string, agent: string): Promise<void>;
}
```

---

## 8. 在线搜索集成

### 搜索源

- **AgentSkills.io**：REST API，需 API Key（设置中配置）
- **ClawHub**：公共 API，无需认证

### 搜索流程
1. 用户输入查询
2. 并行调用 `search_local()` + `search_agent_skills()` + `search_clawhub()`
3. 合并去重，按相关性排序
4. 前端分 Tab 展示：全部 | 本地 | AgentSkills | ClawHub

---

## 9. 错误处理策略

| 场景 | 处理方式 |
|---|---|
| Symlink 创建失败 | 自动 fallback（Windows junction），记录日志 |
| Agent 目录不存在 | 提示用户，自动创建目录 |
| 在线搜索超时 | 显示超时提示，返回本地结果 |
| Git 克隆失败 | 显示具体错误（网络/权限/URL 无效） |
| SKILL.md 格式错误 | 降级显示原始文本 |
| 配置文件损坏 | 使用默认配置，提示用户 |

---

## 10. 测试策略

- **Core 层**：Rust 单元测试，覆盖 symlink 创建/删除、registry CRUD、agent 检测
- **Commands 层**：集成测试，验证 Tauri 命令正确性
- **前端**：组件测试（React Testing Library），关键交互的 E2E 测试

---

## 11. 实现优先级

### P0 — 第一阶段（MVP）
1. Tauri 项目脚手架搭建
2. Core 层：registry 管理（创建/读取/删除）
3. Core 层：跨平台 symlink 启用/禁用
4. Core 层：Agent 自动检测
5. Commands 层：完整 API
6. 前端：Skills 列表 + 搜索过滤
7. 前端：Skill 详情面板 + Agent 启用开关
8. 前端：Agent 管理面板
9. 配置管理

### P1 — 第二阶段
10. 从 Git 仓库安装 skill
11. 在线搜索（AgentSkills.io + ClawHub）
12. SKILL.md 内置编辑器
13. 批量操作

### P2 — 第三阶段
14. 自定义 agent skills 路径
15. Skill 版本管理
16. 导入现有 skills
17. 搜索缓存优化
