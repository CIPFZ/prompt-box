use std::path::Path;
use tauri::AppHandle;
use uuid::Uuid;

use crate::db;
use crate::models::*;
use crate::thumbnail;

#[tauri::command]
pub fn create_prompt(
    app: AppHandle,
    title: String,
    positive_prompt: String,
    negative_prompt: String,
    tags: String,
    source_path: String,
) -> Result<String, String> {
    let path_obj = Path::new(&source_path);
    let ext = path_obj.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    let new_filename = format!("{}.{}", Uuid::new_v4(), ext);
    let thumb_filename = format!("{}_thumb.jpg", Uuid::new_v4());

    let images_dir = db::get_images_dir(&app)?;
    let thumbnails_dir = db::get_thumbnails_dir(&app)?;

    let target_path = images_dir.join(&new_filename);
    let thumb_target_path = thumbnails_dir.join(&thumb_filename);

    // Copy original
    std::fs::copy(&source_path, &target_path)
        .map_err(|e| format!("拷贝文件失败: {}", e))?;

    // Generate thumbnail (300px, quality 70)
    thumbnail::generate_thumbnail(&target_path, &thumb_target_path, 300, 70)?;

    db::create_prompt(&app, &title, &positive_prompt, &negative_prompt, &tags, &new_filename, &thumb_filename)?;

    Ok("创建成功".to_string())
}

#[tauri::command]
pub fn update_prompt(
    app: AppHandle,
    id: i64,
    title: String,
    positive_prompt: String,
    negative_prompt: String,
    tags: String,
) -> Result<String, String> {
    db::update_prompt(&app, id, &title, &positive_prompt, &negative_prompt, &tags)?;
    Ok("更新成功".to_string())
}

#[tauri::command]
pub fn get_prompts(
    app: AppHandle,
    page: i64,
    page_size: i64,
    title_query: Option<String>,
    filter_tags: Option<String>,
) -> Result<PaginatedPrompts, String> {
    db::get_prompts(
        &app,
        page,
        page_size,
        &title_query.unwrap_or_default(),
        &filter_tags.unwrap_or_default(),
    )
}

#[tauri::command]
pub fn get_prompt_by_id(app: AppHandle, id: i64) -> Result<Prompt, String> {
    db::get_prompt_by_id(&app, id)
}

#[tauri::command]
pub fn delete_prompt(app: AppHandle, id: i64) -> Result<(), String> {
    let (image_path, thumbnail_path) = db::delete_prompt(&app, id)?;

    let images_dir = db::get_images_dir(&app)?;
    let thumbnails_dir = db::get_thumbnails_dir(&app)?;

    let img_path = images_dir.join(&image_path);
    if img_path.exists() {
        let _ = std::fs::remove_file(&img_path);
    }

    let thumb_path = thumbnails_dir.join(&thumbnail_path);
    if thumb_path.exists() {
        let _ = std::fs::remove_file(&thumb_path);
    }

    Ok(())
}

#[tauri::command]
pub fn get_all_tags(app: AppHandle) -> Result<Vec<String>, String> {
    db::get_all_tags(&app)
}
