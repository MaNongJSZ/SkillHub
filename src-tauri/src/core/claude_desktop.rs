use crate::error::{Result, SkillHubError};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// manifest.json 中的单条 skill 记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManifestSkill {
    pub skill_id: String,
    pub name: String,
    pub description: String,
    pub creator_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_managed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    pub enabled: bool,
}

/// Claude Desktop skills-plugin 的 manifest.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    pub last_updated: u64,
    pub skills: Vec<ManifestSkill>,
}

impl Manifest {
    /// 从包含 manifest.json 的目录读取
    pub fn read(manifest_dir: &Path) -> Result<Self> {
        let path = manifest_dir.join("manifest.json");
        let content = fs::read_to_string(&path).map_err(|e| {
            SkillHubError::ManifestError(format!("读取 manifest.json 失败: {}", e))
        })?;
        let manifest: Manifest =
            serde_json::from_str(&content).map_err(|e| {
                SkillHubError::ManifestError(format!("解析 manifest.json 失败: {}", e))
            })?;
        Ok(manifest)
    }

    /// 写回 manifest.json
    pub fn write(&self, manifest_dir: &Path) -> Result<()> {
        let path = manifest_dir.join("manifest.json");
        let content = serde_json::to_string_pretty(self).map_err(|e| {
            SkillHubError::ManifestError(format!("序列化 manifest.json 失败: {}", e))
        })?;
        fs::write(&path, content).map_err(|e| {
            SkillHubError::ManifestError(format!("写入 manifest.json 失败: {}", e))
        })?;
        Ok(())
    }

    /// 添加 skill 条目并写回磁盘（幂等，已存在则跳过）
    pub fn add_skill(
        manifest_dir: &Path,
        skill_name: &str,
        description: &str,
    ) -> Result<()> {
        let mut manifest = Self::read(manifest_dir).unwrap_or(Manifest {
            last_updated: now_millis(),
            skills: Vec::new(),
        });

        // 已存在则跳过
        if manifest.skills.iter().any(|s| s.skill_id == skill_name) {
            return Ok(());
        }

        manifest.skills.push(ManifestSkill {
            skill_id: skill_name.to_string(),
            name: skill_name.to_string(),
            description: description.to_string(),
            creator_type: "user".to_string(),
            sync_managed: Some(false),
            updated_at: Some(now_iso()),
            enabled: true,
        });

        manifest.last_updated = now_millis();
        manifest.write(manifest_dir)
    }

    /// 移除 skill 条目并写回磁盘
    pub fn remove_skill(manifest_dir: &Path, skill_name: &str) -> Result<()> {
        let mut manifest = match Self::read(manifest_dir) {
            Ok(m) => m,
            Err(_) => return Ok(()),
        };

        let before = manifest.skills.len();
        manifest.skills.retain(|s| s.skill_id != skill_name);

        if manifest.skills.len() != before {
            manifest.last_updated = now_millis();
            manifest.write(manifest_dir)?;
        }

        Ok(())
    }
}

/// 当前时间的毫秒时间戳
fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// 简易 ISO 8601 时间字符串（无需 chrono 依赖）
fn now_iso() -> String {
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    // 精度到秒即可
    let secs = millis / 1000;
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // 从 epoch 算日期（简化版，适用于 1970-2100）
    let (year, month, day) = days_to_ymd(days_since_epoch as i64);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}

/// 将自 epoch 以来的天数转换为年月日
fn days_to_ymd(mut days: i64) -> (i64, i64, i64) {
    let mut year = 1970;
    loop {
        let days_in_year = if is_leap(year) { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    let leap = is_leap(year);
    let month_days = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];

    let mut month = 1;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }

    (year, month, days + 1)
}

fn is_leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_manifest_add_and_remove() {
        let dir = TempDir::new().unwrap();
        let manifest_dir = dir.path();

        // 初始写入
        Manifest::add_skill(manifest_dir, "test-skill", "A test skill").unwrap();

        let m = Manifest::read(manifest_dir).unwrap();
        assert_eq!(m.skills.len(), 1);
        assert_eq!(m.skills[0].skill_id, "test-skill");
        assert_eq!(m.skills[0].creator_type, "user");

        // 幂等：重复添加不报错
        Manifest::add_skill(manifest_dir, "test-skill", "Updated").unwrap();
        let m = Manifest::read(manifest_dir).unwrap();
        assert_eq!(m.skills.len(), 1);

        // 移除
        Manifest::remove_skill(manifest_dir, "test-skill").unwrap();
        let m = Manifest::read(manifest_dir).unwrap();
        assert!(m.skills.is_empty());
    }

    #[test]
    fn test_now_iso_format() {
        let iso = now_iso();
        // 应匹配 YYYY-MM-DDTHH:MM:SSZ
        assert!(iso.contains('T'));
        assert!(iso.ends_with('Z'));
        assert_eq!(iso.len(), 20);
    }
}
