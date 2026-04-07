use crate::core::source::InstallResult;
use crate::error::{Result, SkillHubError};
use std::path::Path;

/// 通用的 git clone 到 registry 逻辑
pub async fn git_clone_to_registry(
    git_url: &str,
    registry_path: &Path,
    overwrite: bool,
) -> Result<InstallResult> {
    let name = extract_repo_name(git_url)?;
    let skill_path = registry_path.join(&name);

    // 检查是否已存在
    if skill_path.exists() {
        if !overwrite {
            return Ok(InstallResult::AlreadyExists {
                path: skill_path.to_string_lossy().to_string(),
            });
        }
        std::fs::remove_dir_all(&skill_path)?;
    }

    // 执行 git clone --depth 1
    let output = std::process::Command::new("git")
        .args(["clone", "--depth", "1", git_url, &skill_path.to_string_lossy()])
        .output()
        .map_err(|e| SkillHubError::GitCloneFailed(format!("无法执行 git clone: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if skill_path.exists() {
            let _ = std::fs::remove_dir_all(&skill_path);
        }
        return Ok(InstallResult::Failed {
            reason: format!("git clone 失败: {}", stderr),
        });
    }

    // 验证 SKILL.md 存在
    if !skill_path.join("SKILL.md").exists() {
        if let Some(sub_path) = find_skill_md_in_subdirs(&skill_path) {
            return Ok(InstallResult::Installed { path: sub_path });
        }
        log::warn!("克隆的仓库不包含 SKILL.md: {}", git_url);
    }

    Ok(InstallResult::Installed {
        path: skill_path.to_string_lossy().to_string(),
    })
}

/// 从 Git URL 提取仓库名称
fn extract_repo_name(url: &str) -> Result<String> {
    let url = url.trim_end_matches('/').trim_end_matches(".git");

    let name = if url.starts_with("https://") || url.starts_with("http://") {
        url.split('/').next_back().unwrap_or("")
    } else if url.starts_with("git@") {
        url.split('/')
            .next_back()
            .unwrap_or("")
    } else {
        url.split('/').next_back().unwrap_or("")
    };

    if name.is_empty() {
        return Err(SkillHubError::InvalidSkillPath(format!(
            "无法从 URL 提取仓库名: {}",
            url
        )));
    }

    Ok(name.to_string())
}

/// 在子目录中查找 SKILL.md
fn find_skill_md_in_subdirs(dir: &Path) -> Option<String> {
    for entry in std::fs::read_dir(dir).ok()? {
        let entry = entry.ok()?;
        let path = entry.path();
        if path.is_dir() && path.join("SKILL.md").exists() {
            return Some(path.to_string_lossy().to_string());
        }
    }
    None
}
