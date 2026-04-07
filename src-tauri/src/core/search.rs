use crate::core::config::AppConfig;
use crate::core::registry::RegistryManager;
use serde::{Deserialize, Serialize};

/// 搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// Skill 名称
    pub skill_name: String,

    /// 匹配的字段
    pub matched_field: MatchedField,

    /// 匹配的文本片段
    pub matched_text: String,

    /// 相关性分数 (0.0 - 1.0)
    pub relevance: f64,
}

/// 匹配的字段类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MatchedField {
    /// 名称匹配
    Name,
    /// 描述匹配
    Description,
    /// 标签匹配
    Tag,
    /// 内容匹配
    Content,
}

/// 搜索管理器
pub struct SearchManager {
    /// 注册表管理器
    pub registry: RegistryManager,
}

impl SearchManager {
    /// 创建新的搜索管理器
    pub fn new(config: &AppConfig) -> Self {
        Self {
            registry: RegistryManager::new(config),
        }
    }

    /// 在 skill 名称、描述、标签中搜索
    pub fn search_local(&self, query: &str) -> Vec<SearchResult> {
        // 空查询返回空结果
        let query = query.trim();
        if query.is_empty() {
            return Vec::new();
        }

        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        // 获取所有 skills
        let skills = match self.registry.list_skills() {
            Ok(skills) => skills,
            Err(_) => return Vec::new(), // 错误时返回空结果（优雅降级）
        };

        for skill in skills {
            // 搜索名称（相关性 1.0）
            if skill.name.to_lowercase().contains(&query_lower) {
                results.push(SearchResult {
                    skill_name: skill.name.clone(),
                    matched_field: MatchedField::Name,
                    matched_text: skill.name.clone(),
                    relevance: 1.0,
                });
            }

            // 搜索描述（相关性 0.8）
            if skill.description.to_lowercase().contains(&query_lower) {
                // 找到匹配的上下文
                let matched_text = self.extract_match_context(&skill.description, query, 100);

                results.push(SearchResult {
                    skill_name: skill.name.clone(),
                    matched_field: MatchedField::Description,
                    matched_text,
                    relevance: 0.8,
                });
            }

            // 搜索标签（相关性 0.6）
            for tag in &skill.tags {
                if tag.to_lowercase().contains(&query_lower) {
                    results.push(SearchResult {
                        skill_name: skill.name.clone(),
                        matched_field: MatchedField::Tag,
                        matched_text: tag.clone(),
                        relevance: 0.6,
                    });
                }
            }
        }

        // 按相关性降序排序
        results.sort_by(|a, b| {
            b.relevance
                .partial_cmp(&a.relevance)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results
    }

    /// 在 SKILL.md 内容中搜索
    pub fn search_content(&self, query: &str) -> Vec<SearchResult> {
        // 空查询返回空结果
        let query = query.trim();
        if query.is_empty() {
            return Vec::new();
        }

        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        // 获取所有 skills
        let skills = match self.registry.list_skills() {
            Ok(skills) => skills,
            Err(_) => return Vec::new(), // 错误时返回空结果（优雅降级）
        };

        for skill in skills {
            // 获取 skill 详情（包含完整内容）
            let detail = match self.registry.get_skill_detail(&skill.name) {
                Ok(detail) => detail,
                Err(_) => continue, // 跳过无法读取的 skill
            };

            // 逐行搜索内容
            for line in detail.content.lines() {
                if line.to_lowercase().contains(&query_lower) {
                    // 提取匹配片段（最多 100 个字符）
                    let matched_text = self.extract_match_context(line, query, 100);

                    results.push(SearchResult {
                        skill_name: skill.name.clone(),
                        matched_field: MatchedField::Content,
                        matched_text,
                        relevance: 0.5,
                    });

                    // 每个技能只返回第一个匹配
                    break;
                }
            }
        }

        // 按相关性降序排序
        results.sort_by(|a, b| {
            b.relevance
                .partial_cmp(&a.relevance)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        results
    }

    /// 提取匹配上下文
    fn extract_match_context(&self, text: &str, query: &str, max_length: usize) -> String {
        let query_lower = query.to_lowercase();
        let text_lower = text.to_lowercase();

        // 找到匹配位置
        if let Some(pos) = text_lower.find(&query_lower) {
            let text_len = text.len();
            let query_len = query.len();

            // 计算起始位置
            let start = if pos > max_length / 2 {
                pos - max_length / 2
            } else {
                0
            };

            // 计算结束位置
            let end = std::cmp::min(pos + query_len + max_length / 2, text_len);

            // 提取片段
            let mut snippet = String::new();
            if start > 0 {
                snippet.push_str("...");
            }
            snippet.push_str(&text[start..end]);
            if end < text_len {
                snippet.push_str("...");
            }

            snippet
        } else {
            // 如果没有找到，返回前 max_length 个字符
            if text.len() > max_length {
                format!("{}...", &text[..max_length])
            } else {
                text.to_string()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_search_manager() -> (TempDir, SearchManager) {
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

        let manager = SearchManager::new(&config);

        // 创建测试 skills
        let skill1_path = manager.registry.registry_path.join("test-skill");
        fs::create_dir_all(&skill1_path).unwrap();
        fs::write(
            skill1_path.join("SKILL.md"),
            r#"---
description: A test skill for searching
tags: [test, search, demo]
---
# Test Skill

This is a test skill content for searching.
"#,
        )
        .unwrap();

        let skill2_path = manager.registry.registry_path.join("another-skill");
        fs::create_dir_all(&skill2_path).unwrap();
        fs::write(
            skill2_path.join("SKILL.md"),
            r#"---
description: Another skill
tags: [example]
---
# Another Skill

Different content here.
"#,
        )
        .unwrap();

        (temp_dir, manager)
    }

    #[test]
    fn test_search_empty_query() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results = manager.search_local("");
        assert!(results.is_empty());

        let results = manager.search_local("   ");
        assert!(results.is_empty());

        let results = manager.search_content("");
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_local_by_name() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results = manager.search_local("test-skill");

        assert!(!results.is_empty());
        assert_eq!(results[0].skill_name, "test-skill");
        assert!(matches!(results[0].matched_field, MatchedField::Name));
        assert_eq!(results[0].relevance, 1.0);
    }

    #[test]
    fn test_search_local_by_description() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results = manager.search_local("searching");

        assert!(!results.is_empty());
        assert_eq!(results[0].skill_name, "test-skill");
        assert!(matches!(
            results[0].matched_field,
            MatchedField::Description
        ));
        assert_eq!(results[0].relevance, 0.8);
    }

    #[test]
    fn test_search_local_by_tag() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results = manager.search_local("demo");

        assert!(!results.is_empty());
        assert_eq!(results[0].skill_name, "test-skill");
        assert!(matches!(results[0].matched_field, MatchedField::Tag));
        assert_eq!(results[0].relevance, 0.6);
    }

    #[test]
    fn test_search_content() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results = manager.search_content("content");

        assert!(!results.is_empty());
        assert!(matches!(results[0].matched_field, MatchedField::Content));
        assert_eq!(results[0].relevance, 0.5);
        assert!(results[0].matched_text.contains("content"));
    }

    #[test]
    fn test_search_relevance_sorting() {
        let (_temp_dir, manager) = create_test_search_manager();

        // 创建一个在多个字段都匹配的 skill
        let skill3_path = manager.registry.registry_path.join("multi-match");
        fs::create_dir_all(&skill3_path).unwrap();
        fs::write(
            skill3_path.join("SKILL.md"),
            r#"---
description: multi-match description
tags: [multi-match]
---
# Multi-Match

Content with multi-match keyword.
"#,
        )
        .unwrap();

        let results = manager.search_local("multi-match");

        assert!(!results.is_empty());

        // 验证按相关性排序（名称 > 描述 > 标签）
        let mut prev_relevance = 1.0;
        for result in &results {
            assert!(result.relevance <= prev_relevance);
            prev_relevance = result.relevance;
        }
    }

    #[test]
    fn test_extract_match_context() {
        let (_temp_dir, manager) = create_test_search_manager();

        let text = "This is a long text with a search term in the middle of it";
        let context = manager.extract_match_context(text, "search term", 50);

        assert!(context.contains("search term"));
        // "..." prefix/suffix may push length slightly beyond max_length
        assert!(context.len() <= 60);
    }

    #[test]
    fn test_search_case_insensitive() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results_lower = manager.search_local("test");
        let results_upper = manager.search_local("TEST");
        let results_mixed = manager.search_local("TeSt");

        assert_eq!(results_lower.len(), results_upper.len());
        assert_eq!(results_lower.len(), results_mixed.len());
    }

    #[test]
    fn test_search_no_results() {
        let (_temp_dir, manager) = create_test_search_manager();

        let results = manager.search_local("nonexistent");

        assert!(results.is_empty());

        let results = manager.search_content("nonexistent");

        assert!(results.is_empty());
    }
}
