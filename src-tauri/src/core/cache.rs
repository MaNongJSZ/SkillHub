use crate::core::source::RemoteSkill;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// 缓存条目
#[derive(Debug, Serialize, Deserialize)]
struct CacheEntry {
    query: String,
    timestamp: u64,
    results: Vec<RemoteSkill>,
}

/// 搜索缓存管理器
pub struct SearchCache {
    cache_dir: PathBuf,
    ttl_minutes: u64,
}

impl SearchCache {
    pub fn new(cache_dir: PathBuf, ttl_minutes: u64) -> Self {
        Self {
            cache_dir,
            ttl_minutes,
        }
    }

    /// 确保缓存目录存在
    fn ensure_dir(&self) -> Result<()> {
        let search_dir = self.cache_dir.join("search");
        if !search_dir.exists() {
            std::fs::create_dir_all(&search_dir)?;
        }
        Ok(())
    }

    /// 生成缓存文件路径
    fn cache_path(&self, query: &str) -> PathBuf {
        let mut hasher = DefaultHasher::new();
        query.to_lowercase().hash(&mut hasher);
        let hash = hasher.finish();
        self.cache_dir.join("search").join(format!("{:016x}.json", hash))
    }

    /// 读取缓存
    pub fn get(&self, query: &str) -> Option<Vec<RemoteSkill>> {
        let path = self.cache_path(query);

        if !path.exists() {
            return None;
        }

        let content = std::fs::read_to_string(&path).ok()?;
        let entry: CacheEntry = serde_json::from_str(&content).ok()?;

        // 检查是否过期
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let ttl_seconds = self.ttl_minutes * 60;
        if now.saturating_sub(entry.timestamp) > ttl_seconds {
            // 过期，删除缓存文件
            let _ = std::fs::remove_file(&path);
            return None;
        }

        Some(entry.results)
    }

    /// 写入缓存
    pub fn set(&self, query: &str, results: Vec<RemoteSkill>) -> Result<()> {
        self.ensure_dir()?;

        let path = self.cache_path(query);

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let entry = CacheEntry {
            query: query.to_string(),
            timestamp: now,
            results,
        };

        let content = serde_json::to_string_pretty(&entry)?;
        std::fs::write(&path, content)?;

        Ok(())
    }
}
