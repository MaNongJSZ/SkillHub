# 在线发现与安装 — 设计文档

**日期**: 2026-04-07
**子系统**: 在线 Skill 发现与安装
**优先级**: P1（三个子项目中的第一个）
**设计者**: 基于 SkillHub PRD 和现有架构分析

---

## 1. 背景与目标

### 痛点
用户目前只能从本地路径导入 skill。发现新 skill 的唯一方式是手动去 GitHub 搜索、clone、再导入到 registry。发现成本高、流程断裂。

### 目标
- 用户在 SkillHub 内直接搜索和浏览在线 skill
- 一键预览和安装远程 skill 到本地 registry
- 支持两个数据源：AgentSkills.io（主）+ GitHub（辅）
- 离线时降级到缓存结果

### 成功标准
- 用户能在 10 秒内完成「搜索 → 预览 → 安装」流程
- 网络不可用时仍能显示上次搜索结果
- 安装后的 skill 与手动导入的 skill 完全一致（走同一套 symlink 机制）

---

## 2. 数据源抽象层

### 统一接口

```rust
/// 远程 skill 来源类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceType {
    AgentSkills,
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
    pub content: String,       // SKILL.md 内容
    pub file_count: u32,       // 包含文件数
    pub last_updated: String,  // 最后更新时间
}

/// 安装结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallResult {
    Installed { path: String },
    AlreadyExists { path: String },  // 需要前端确认覆盖
    Failed { reason: String },
}
```

### 数据源实现

**AgentSkills.io 客户端** (`core/agent_skills.rs`)：
- API endpoint: `https://agentskills.io/api/v1/skills?q={query}`
- 获取详情: `https://agentskills.io/api/v1/skills/{id}`
- 安装方式: clone 返回的 Git URL
- 认证: 可选 API Key（配置中 `agentskills_api_key`）

**GitHub 数据源** (`core/github_source.rs`)：
- 搜索: GitHub Search API `https://api.github.com/search/repositories?q={query}+topic:agent-skill`
- 安装方式: clone 仓库到 registry
- 认证: 可选 GitHub Token（配置中 `github_token`），提升频率限制从 10次/分 到 5000次/小时

---

## 3. Tauri 后端命令

新增 4 个命令：

```rust
/// 在线搜索（合并 AgentSkills.io 和 GitHub 结果）
#[tauri::command]
async fn search_online(query: String) -> Result<Vec<RemoteSkill>, AppError>

/// 获取远程 skill 详情（预览用，不安装）
#[tauri::command]
async fn get_remote_skill_detail(
    source: SkillSourceType,
    id: String,
) -> Result<RemoteSkillDetail, AppError>

/// 从在线源安装 skill（clone 到 registry）
#[tauri::command]
async fn install_from_online(
    source: SkillSourceType,
    id: String,
    url: String,
    overwrite: bool,
) -> Result<InstallResult, AppError>

/// 从 Git URL 直接安装（InstallDialog 中使用）
#[tauri::command]
async fn install_from_git(
    url: String,
    overwrite: bool,
) -> Result<InstallResult, AppError>
```

### 后端模块结构

```
src-tauri/src/
├── core/
│   ├── source.rs           ← 新增：SkillSource trait 定义
│   ├── agent_skills.rs     ← 新增：AgentSkills.io API 客户端
│   ├── github_source.rs    ← 新增：GitHub 搜索 + clone
│   ├── installer.rs        ← 修改：增加在线安装逻辑
│   └── ...existing modules
├── commands/
│   └── online.rs           ← 新增：4 个在线命令
└── main.rs                 ← 修改：注册新命令
```

### 错误处理

| 场景 | 行为 |
|------|------|
| AgentSkills.io 不可达 | 降级到 GitHub 搜索，Toast "AgentSkills.io 暂不可用" |
| GitHub 搜索失败 | 显示错误，提示检查网络 |
| Git clone 失败 | 保留半安装状态目录，Toast 提示重试 |
| Registry 已有同名 skill | 返回 `AlreadyExists`，前端弹确认覆盖 |
| 网络完全不可用 | 读取搜索缓存，Toast "显示缓存结果" |

---

## 4. 前端交互设计

### SearchBar 改造

在现有 SearchBar 中增加"本地/在线"tab 切换：

```
┌─────────────────────────────────┐
│ 🔍 搜索 Skills...               │
│ [本地] [在线]                    │  ← 新增 tab
└─────────────────────────────────┘
```

- 本地模式：现有行为不变
- 在线模式：调用 `search_online` 命令，显示远程结果

### SearchResults 扩展

在线搜索结果项布局：

```
┌─────────────────────────────────────┐
│ 📦 skill-name                       │
│ 简短描述文字...                      │
│ 来源: AgentSkills.io  作者: @author  │
│ 标签: tdd, testing, rust            │
│                     [预览] [安装]    │
├─────────────────────────────────────┤
│ 📦 another-skill                    │
│ ...                                 │
└─────────────────────────────────────┘
```

### 安装流程

1. 用户点击"安装"按钮
2. 前端调用 `install_from_online` / `install_from_git`
3. 如果返回 `AlreadyExists`，弹出确认对话框"该 Skill 已存在，是否覆盖？"
4. 安装成功后：
   - Toast 提示"✅ skill-name 安装成功"
   - 自动刷新左侧 Skill 列表
   - 可选：弹出"是否启用到 Agent？"引导

### 预览

- 点击"预览"按钮
- 右侧详情面板显示 SKILL.md 渲染内容（只读）
- 复用现有 `SkillDetail` 组件的 Markdown 渲染

### InstallDialog 扩展

新增"Git URL"安装方式：

```
┌─ 安装 Skill ─────────────────┐
│                               │
│ 从本地路径: [________] [浏览] │
│ 从 Git URL: [______________]  │  ← 新增
│                               │
│              [取消] [安装]     │
└───────────────────────────────┘
```

---

## 5. 状态管理

### useAppStore 新增

```typescript
// 新增状态
onlineSearchResults: RemoteSkill[]
onlineSearchLoading: boolean
remoteSkillDetail: RemoteSkillDetail | null

// 新增方法
searchOnline: (query: string) => Promise<void>
getRemoteDetail: (source: SkillSourceType, id: string) => Promise<void>
installFromOnline: (source: SkillSourceType, id: string, url: string) => Promise<void>
installFromGit: (url: string) => Promise<void>
```

### TypeScript 新增类型

```typescript
export type SkillSourceType = 'agent_skills' | 'github'

export interface RemoteSkill {
  id: string
  name: string
  description: string
  source: SkillSourceType
  install_url: string
  author: string
  tags: string[]
}

export interface RemoteSkillDetail {
  skill: RemoteSkill
  content: string
  file_count: number
  last_updated: string
}

export type InstallResult =
  | { installed: { path: string } }
  | { already_exists: { path: string } }
  | { failed: { reason: string } }
```

---

## 6. 缓存策略

### 搜索缓存

- 路径: `~/.skillhub/cache/search/<query_hash>.json`
- 有效期: 默认 60 分钟（可通过 `cache_ttl_minutes` 配置）
- 缓存结构:

```json
{
  "query": "tdd",
  "timestamp": 1712457600,
  "results": [...]
}
```

### 依赖项

| 用途 | 依赖 | 备注 |
|------|------|------|
| HTTP 请求 | `reqwest` | 已在项目中 |
| Git clone | `std::process::Command` 调用系统 git | 避免 git2 重量级依赖 |
| JSON 序列化 | `serde` + `serde_json` | 已在项目中 |
| 哈希缓存键 | 标准库 `std::collections::hash_map::DefaultHasher` | 无新依赖 |

---

## 7. 配置扩展

AppConfig 新增字段：

```rust
pub struct AppConfig {
    // ...existing fields...
    pub github_token: Option<String>,       // GitHub API token
    pub cache_ttl_minutes: u64,             // 搜索缓存有效期（默认 60）
}
```

Settings 页面新增：
- GitHub Token 输入框（可选，提示"提升 GitHub 搜索频率限制"）
- 缓存有效期配置（滑块，10-240 分钟）

---

## 8. 测试策略

| 层级 | 内容 |
|------|------|
| 单元测试 | `agent_skills.rs` 响应解析、`github_source.rs` 搜索结果映射、缓存读写 |
| 集成测试 | Mock server 模拟 API 响应 → 搜索 → 安装完整流程 |
| E2E 测试 | 真实 clone 一个公开 skill 仓库，验证 registry 文件完整性 |
| 错误场景 | 网络超时、API 限流、无效 URL、磁盘空间不足 |

---

## 9. 范围与约束

### 本次包含
- AgentSkills.io API 搜索和安装
- GitHub 仓库搜索和安装
- Git URL 直接安装
- 搜索结果缓存
- 预览远程 skill

### 本次不包含
- Skill 版本管理（下一个子项目）
- Skill 冲突检测（再下一个子项目）
- 在线评分/评论系统
- 自动更新检查

---

## 10. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| AgentSkills.io API 不稳定 | 搜索体验差 | 自动降级到 GitHub |
| GitHub API 频率限制 | 搜索被限流 | 支持配置 token，缓存结果 |
| Git clone 超时 | 安装失败 | 显示进度，支持重试 |
| 远程仓库不含 SKILL.md | 安装后无内容 | 安装前校验 SKILL.md 存在性 |
