use crate::core::git_clone::git_clone_to_registry;
use crate::core::source::{
    InstallResult, RemoteSkill, RemoteSkillDetail, SkillSource, SkillSourceType,
};
use crate::error::{Result, SkillHubError};
use serde::Deserialize;
use std::path::Path;

const GITHUB_API_BASE: &str = "https://api.github.com";

/// GitHub 搜索结果中的仓库条目
#[derive(Debug, Deserialize)]
struct GhRepo {
    full_name: String,
    name: String,
    description: Option<String>,
    clone_url: String,
    owner: Option<GhOwner>,
    topics: Option<Vec<String>>,
    pushed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GhOwner {
    login: String,
}

/// GitHub 搜索响应
#[derive(Debug, Deserialize)]
struct GhSearchResponse {
    items: Option<Vec<GhRepo>>,
}

pub struct GitHubSource {
    client: reqwest::Client,
    token: Option<String>,
}

impl GitHubSource {
    pub fn new(token: Option<String>) -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        Self { client, token }
    }

    fn build_request(&self, url: &str) -> reqwest::RequestBuilder {
        let mut req = self.client.get(url);
        req = req.header("Accept", "application/vnd.github.v3+json");
        req = req.header("User-Agent", "SkillHub/0.1.0");
        if let Some(ref token) = self.token {
            req = req.header("Authorization", format!("Bearer {}", token));
        }
        req
    }
}

impl SkillSource for GitHubSource {
    async fn search(&self, query: &str) -> Result<Vec<RemoteSkill>> {
        // 多 topic 搜索：覆盖常见 skill 相关标签，按星数排序
        let q = format!(
            "{}+in:name,description+(topic:agent-skill+OR+topic:claude-skill+OR+topic:ai-skill+OR+topic:skill)",
            urlencoding::encode(query)
        );
        let url = format!("{}/search/repositories?q={}&sort=stars&per_page=20", GITHUB_API_BASE, q);

        let resp = self.build_request(&url).send().await?;

        if !resp.status().is_success() {
            return Err(SkillHubError::OnlineSearchFailed(format!(
                "GitHub API 返回状态码: {}",
                resp.status()
            )));
        }

        let body: GhSearchResponse = resp.json().await?;

        let results = body
            .items
            .unwrap_or_default()
            .into_iter()
            .map(|r| RemoteSkill {
                id: r.full_name,
                name: r.name,
                description: r.description.unwrap_or_default(),
                source: SkillSourceType::GitHub,
                install_url: r.clone_url,
                author: r.owner.map(|o| o.login).unwrap_or_default(),
                tags: r.topics.unwrap_or_default(),
            })
            .collect();

        Ok(results)
    }

    async fn get_detail(&self, id: &str) -> Result<RemoteSkillDetail> {
        // id 是 full_name，如 "user/repo"
        let url = format!("{}/repos/{}", GITHUB_API_BASE, id);

        let resp = self.build_request(&url).send().await?;

        if !resp.status().is_success() {
            return Err(SkillHubError::OnlineSearchFailed(format!(
                "GitHub API 返回状态码: {}",
                resp.status()
            )));
        }

        let repo: GhRepo = resp.json().await?;

        // 尝试获取 SKILL.md 内容
        let content = self.fetch_skill_md(id).await.unwrap_or_default();

        Ok(RemoteSkillDetail {
            skill: RemoteSkill {
                id: repo.full_name,
                name: repo.name,
                description: repo.description.unwrap_or_default(),
                source: SkillSourceType::GitHub,
                install_url: repo.clone_url,
                author: repo.owner.map(|o| o.login).unwrap_or_default(),
                tags: repo.topics.unwrap_or_default(),
            },
            content,
            file_count: 0,
            last_updated: repo.pushed_at.unwrap_or_default(),
        })
    }

    async fn install(
        &self,
        _id: &str,
        url: &str,
        registry_path: &Path,
        overwrite: bool,
    ) -> Result<InstallResult> {
        git_clone_to_registry(url, registry_path, overwrite).await
    }
}

impl GitHubSource {
    /// 从 GitHub 仓库获取 SKILL.md 内容
    async fn fetch_skill_md(&self, full_name: &str) -> Result<String> {
        let url = format!(
            "https://raw.githubusercontent.com/{}/main/SKILL.md",
            full_name
        );

        let resp = self.client.get(&url).send().await;

        match resp {
            Ok(r) if r.status().is_success() => Ok(r.text().await?),
            _ => {
                // 尝试 master 分支
                let url_master = format!(
                    "https://raw.githubusercontent.com/{}/master/SKILL.md",
                    full_name
                );
                let resp2 = self.client.get(&url_master).send().await?;
                if resp2.status().is_success() {
                    Ok(resp2.text().await?)
                } else {
                    Ok(String::new())
                }
            }
        }
    }
}

/// URL 编码辅助
mod urlencoding {
    pub fn encode(s: &str) -> String {
        s.chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' || c == '~' {
                    c.to_string()
                } else {
                    format!("%{:02X}", c as u8)
                }
            })
            .collect()
    }
}
