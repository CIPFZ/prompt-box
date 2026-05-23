mod commands;
mod db;
mod models;
mod thumbnail;

use std::path::Path;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            match db::init_db(app.handle()) {
                Ok(_) => println!("数据库初始化完毕"),
                Err(e) => panic!("初始化失败: {}", e),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::prompts::create_prompt,
            commands::prompts::update_prompt,
            commands::prompts::get_prompts,
            commands::prompts::get_prompt_by_id,
            commands::prompts::delete_prompt,
            commands::prompts::get_all_tags,
            commands::images::read_absolute_image,
            commands::images::read_project_image,
            commands::images::read_thumbnail,
            commands::images::export_image,
            commands::images::replace_image,
            commands::settings::get_api_configs,
            commands::settings::save_api_config,
            commands::settings::delete_api_config,
            commands::settings::test_api_connection,
            commands::settings::get_settings,
            commands::settings::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
