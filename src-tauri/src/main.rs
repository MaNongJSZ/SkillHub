// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod error;

use commands::agent_cmd::*;
use commands::config_cmd::*;
use commands::link_cmd::*;
use commands::online_cmd::*;
use commands::search_cmd::*;
use commands::skill_cmd::*;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, State};

/// 检查 GitHub 最新 Release 版本
#[tauri::command]
async fn check_update(state: State<'_, AppState>) -> Result<Option<String>, String> {
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct GithubRelease {
        tag_name: String,
    }

    // 读取用户配置的 GitHub Token 以提升 API 限额
    let token = state
        .config_manager
        .lock()
        .map_err(|e| e.to_string())
        .ok()
        .and_then(|m| m.get_config().github_token.clone());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let mut request = client
        .get("https://api.github.com/repos/MaNongJSZ/SkillHub/releases/latest")
        .header("User-Agent", "SkillHub");

    if let Some(ref t) = token {
        request = request.header("Authorization", format!("Bearer {t}"));
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {e}"))?;

    let status = response.status();
    if status.as_u16() == 404 {
        return Err("暂无已发布的版本".to_string());
    }
    if !status.is_success() {
        return Err(format!("GitHub API 返回错误: {status}"));
    }

    let resp: GithubRelease = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {e}"))?;

    let latest = resp.tag_name.trim_start_matches('v');
    let current = env!("CARGO_PKG_VERSION");

    if latest != current {
        Ok(Some(latest.to_string()))
    } else {
        Ok(None)
    }
}

fn main() {
    let config_manager = core::config::ConfigManager::new()
        .expect("Failed to initialize config manager");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(commands::config_cmd::AppState {
            config_manager: Mutex::new(config_manager),
        })
        .setup(|app| {
            // 创建托盘菜单
            let show_item =
                MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 创建托盘图标
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("SkillHub")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // 关闭窗口时隐藏到托盘而非退出
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
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
            // Agent commands
            detect_agents,
            list_agents,
            add_custom_agent,
            remove_agent,
            // Link commands
            enable_skill,
            disable_skill,
            batch_enable,
            batch_disable,
            get_skill_links,
            // Search commands
            search_local,
            search_content,
            // Online commands
            search_online,
            get_remote_skill_detail,
            install_from_online,
            install_from_git,
            // Update
            check_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
