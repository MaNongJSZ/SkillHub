// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod core;
mod error;

use commands::agent_cmd::*;
use commands::config_cmd::*;
use commands::link_cmd::*;
use commands::search_cmd::*;
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
            // Search commands
            search_local,
            search_content,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
