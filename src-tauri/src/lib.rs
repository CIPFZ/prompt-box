mod db;

use tauri::{AppHandle};
use std::fs;
use std::path::Path;
use uuid::Uuid;

// --- 命令定义区域 ---

// 1. 创建 Prompt
#[tauri::command]
fn create_prompt(
    app: AppHandle,
    title: String,
    positive_prompt: String,
    negative_prompt: String,
    tags: String, // 前端传来 "tag1, tag2"
    source_path: String
) -> Result<String, String> {
    let path_obj = Path::new(&source_path);
    let ext = path_obj.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    let new_filename = format!("{}.{}", Uuid::new_v4(), ext);
    let images_dir = db::get_images_dir(&app)?;
    let target_path = images_dir.join(&new_filename);

    fs::copy(&source_path, &target_path)
        .map_err(|e| format!("拷贝文件失败: {}", e))?;

    // 这里调用了更新后的 db::add_prompt，自动处理多表插入
    db::add_prompt(&app, &title, &positive_prompt, &negative_prompt, &tags, &new_filename)?;

    Ok("创建成功".to_string())
}

// 2. 获取所有 Prompts
#[tauri::command]
fn get_prompts(app: AppHandle) -> Result<Vec<db::Prompt>, String> {
    db::get_all_prompts(&app)
}

// 3. 获取所有标签库 (新增功能！)
#[tauri::command]
fn get_all_tags(app: AppHandle) -> Result<Vec<String>, String> {
    db::get_all_tags(&app)
}

// 4. 读取绝对路径图片 (预览用)
#[tauri::command]
fn read_absolute_image(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("读取失败: {}", e))
}

// 5. 读取项目图片 (列表展示用)
#[tauri::command]
fn read_project_image(app: AppHandle, filename: String) -> Result<Vec<u8>, String> {
    let images_dir = db::get_images_dir(&app)?;
    let target_path = images_dir.join(filename);
    fs::read(&target_path).map_err(|e| format!("读取失败: {}", e))
}

// 6. 删除记录
#[tauri::command]
fn delete_prompt(app: AppHandle, id: i64, filename: String) -> Result<(), String> {
    let images_dir = db::get_images_dir(&app)?;
    let target_path = images_dir.join(&filename);

    if target_path.exists() {
        let _ = fs::remove_file(&target_path);
    }
    db::delete_prompt(&app, id).map_err(|e| format!("删除数据库失败: {}", e))?;
    Ok(())
}

// --- 新增命令：导出图片 ---
#[tauri::command]
fn export_image(app: AppHandle, filename: String, target_path: String) -> Result<(), String> {
    // 1. 找到源文件路径
    let images_dir = db::get_images_dir(&app)?;
    let source_path = images_dir.join(&filename);

    if !source_path.exists() {
        return Err("源文件丢失，无法导出".to_string());
    }

    // 2. 复制到用户指定的目标路径
    // Rust 后端拥有完全的文件系统权限，可以直接复制
    fs::copy(&source_path, &target_path)
        .map_err(|e| format!("导出失败: {}", e))?;

    Ok(())
}

// --- 入口函数 ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init()) // 确保你之前装了这个插件
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
            create_prompt,
            get_prompts,
            get_all_tags,
            read_absolute_image,
            read_project_image,
            delete_prompt,
            export_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}