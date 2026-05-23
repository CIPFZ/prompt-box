use std::path::Path;
use tauri::AppHandle;
use uuid::Uuid;

use crate::db;
use crate::thumbnail;

#[tauri::command]
pub fn read_absolute_image(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("读取失败: {}", e))
}

#[tauri::command]
pub fn read_project_image(app: AppHandle, filename: String) -> Result<Vec<u8>, String> {
    let images_dir = db::get_images_dir(&app)?;
    let target_path = images_dir.join(filename);
    std::fs::read(&target_path).map_err(|e| format!("读取失败: {}", e))
}

#[tauri::command]
pub fn read_thumbnail(app: AppHandle, filename: String) -> Result<Vec<u8>, String> {
    let thumbnails_dir = db::get_thumbnails_dir(&app)?;
    let target_path = thumbnails_dir.join(filename);
    std::fs::read(&target_path).map_err(|e| format!("读取缩略图失败: {}", e))
}

#[tauri::command]
pub fn export_image(app: AppHandle, filename: String, target_path: String) -> Result<(), String> {
    let images_dir = db::get_images_dir(&app)?;
    let source_path = images_dir.join(&filename);

    if !source_path.exists() {
        return Err("源文件丢失，无法导出".to_string());
    }

    std::fs::copy(&source_path, &target_path)
        .map_err(|e| format!("导出失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn replace_image(
    app: AppHandle,
    id: i64,
    source_path: String,
) -> Result<String, String> {
    // Generate new filenames
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

    // Copy and generate
    std::fs::copy(&source_path, &target_path)
        .map_err(|e| format!("拷贝文件失败: {}", e))?;
    thumbnail::generate_thumbnail(&target_path, &thumb_target_path, 300, 70)?;

    // Update DB record
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_path.join("promptbox.db");
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let (old_image, old_thumb): (String, String) = conn.query_row(
        "SELECT image_path, thumbnail_path FROM prompts WHERE id = ?1",
        rusqlite::params![id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE prompts SET image_path = ?1, thumbnail_path = ?2 WHERE id = ?3",
        rusqlite::params![new_filename, thumb_filename, id],
    ).map_err(|e| e.to_string())?;

    // Clean up old files
    let _ = std::fs::remove_file(images_dir.join(&old_image));
    let _ = std::fs::remove_file(thumbnails_dir.join(&old_thumb));

    Ok(new_filename)
}
