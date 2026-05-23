use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::models::*;

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_path.exists() {
        fs::create_dir_all(&app_path).map_err(|e| e.to_string())?;
    }
    Ok(app_path.join("promptbox.db"))
}

pub fn init_db(app: &AppHandle) -> Result<(), String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_path.exists() {
        fs::create_dir_all(&app_path).map_err(|e| e.to_string())?;
    }

    let image_dir = app_path.join("images");
    if !image_dir.exists() {
        fs::create_dir_all(&image_dir).map_err(|e| e.to_string())?;
    }

    let thumb_dir = app_path.join("thumbnails");
    if !thumb_dir.exists() {
        fs::create_dir_all(&thumb_dir).map_err(|e| e.to_string())?;
    }

    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
    conn.execute("PRAGMA foreign_keys = ON;", []).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            positive_prompt TEXT,
            negative_prompt TEXT,
            image_path TEXT NOT NULL,
            thumbnail_path TEXT NOT NULL DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS prompt_tags (
            prompt_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (prompt_id, tag_id),
            FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
            FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS api_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            api_type TEXT NOT NULL CHECK(api_type IN ('comfyui', 'openai', 'custom')),
            base_url TEXT NOT NULL,
            endpoint TEXT NOT NULL DEFAULT '',
            api_key TEXT DEFAULT '',
            extra_params TEXT DEFAULT '{}',
            is_active INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Insert defaults if missing
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('proxy_enabled', 'false')",
        [],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('proxy_url', '')",
        [],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('theme', 'light')",
        [],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('default_api_config_id', '')",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_path.join("images"))
}

pub fn get_thumbnails_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_path.join("thumbnails"))
}

// ---- Prompt CRUD ----

pub fn create_prompt(
    app: &AppHandle,
    title: &str,
    positive: &str,
    negative: &str,
    tags_str: &str,
    image_filename: &str,
    thumbnail_filename: &str,
) -> Result<i64, String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO prompts (title, positive_prompt, negative_prompt, image_path, thumbnail_path) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![title, positive, negative, image_filename, thumbnail_filename],
    ).map_err(|e| e.to_string())?;

    let prompt_id = tx.last_insert_rowid();

    let tags: Vec<&str> = tags_str.split(',')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .collect();

    for tag in tags {
        tx.execute(
            "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
            params![tag],
        ).map_err(|e| e.to_string())?;

        let tag_id: i64 = tx.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            params![tag],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?1, ?2)",
            params![prompt_id, tag_id],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(prompt_id)
}

pub fn get_prompts(
    app: &AppHandle,
    page: i64,
    page_size: i64,
    title_query: &str,
    filter_tags: &str,
) -> Result<PaginatedPrompts, String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;

    let tag_list: Vec<&str> = filter_tags.split(',')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .collect();

    let mut where_clauses = vec!["1=1".to_string()];
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if !title_query.is_empty() {
        where_clauses.push(format!("p.title LIKE ?{}", params_vec.len() + 1));
        params_vec.push(Box::new(format!("%{}%", title_query)));
    }

    // Count total
    let count_sql = if tag_list.is_empty() {
        format!("SELECT COUNT(*) FROM prompts p WHERE {}", where_clauses.join(" AND "))
    } else {
        format!(
            "SELECT COUNT(DISTINCT p.id) FROM prompts p
             JOIN prompt_tags pt ON p.id = pt.prompt_id
             JOIN tags t ON pt.tag_id = t.id
             WHERE {} AND t.name IN ({})",
            where_clauses.join(" AND "),
            tag_list.iter().enumerate().map(|(i, _)| format!("?{}", params_vec.len() + i + 1)).collect::<Vec<_>>().join(",")
        )
    };

    let mut stmt = conn.prepare(&count_sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut tag_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for tag in &tag_list {
        tag_params.push(Box::new(tag.to_string()));
    }
    let all_params: Vec<&dyn rusqlite::types::ToSql> = if tag_list.is_empty() {
        param_refs.clone()
    } else {
        let mut combined = param_refs.clone();
        for tp in &tag_params {
            combined.push(tp.as_ref());
        }
        combined
    };

    let total: i64 = stmt.query_row(
        rusqlite::params_from_iter(all_params.iter().map(|p| *p)),
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Fetch page
    let offset = (page - 1) * page_size;

    let data_sql = if tag_list.is_empty() {
        format!(
            "SELECT p.id, p.title, p.positive_prompt, p.negative_prompt, p.image_path, p.thumbnail_path, p.created_at,
                    GROUP_CONCAT(t.name, ',') as tags_str
             FROM prompts p
             LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
             LEFT JOIN tags t ON pt.tag_id = t.id
             WHERE {}
             GROUP BY p.id
             ORDER BY p.id DESC
             LIMIT ?{} OFFSET ?{}",
            where_clauses.join(" AND "),
            params_vec.len() + tag_list.len() + 1,
            params_vec.len() + tag_list.len() + 2
        )
    } else {
        format!(
            "SELECT p.id, p.title, p.positive_prompt, p.negative_prompt, p.image_path, p.thumbnail_path, p.created_at,
                    GROUP_CONCAT(t.name, ',') as tags_str
             FROM prompts p
             JOIN prompt_tags pt ON p.id = pt.prompt_id
             JOIN tags t ON pt.tag_id = t.id
             WHERE {} AND t.name IN ({})
             GROUP BY p.id
             HAVING COUNT(DISTINCT t.name) = {}
             ORDER BY p.id DESC
             LIMIT ?{} OFFSET ?{}",
            where_clauses.join(" AND "),
            tag_list.iter().enumerate().map(|(i, _)| format!("?{}", params_vec.len() + i + 1)).collect::<Vec<_>>().join(","),
            tag_list.len(),
            params_vec.len() + tag_list.len() + 1,
            params_vec.len() + tag_list.len() + 2,
        )
    };

    // Build all params for data query
    let mut data_params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    for p in params_vec {
        data_params.push(p);
    }
    for tag in &tag_list {
        data_params.push(Box::new(tag.to_string()));
    }
    data_params.push(Box::new(page_size));
    data_params.push(Box::new(offset));

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
    let data_refs: Vec<&dyn rusqlite::types::ToSql> = data_params.iter().map(|p| p.as_ref()).collect();

    let prompt_iter = stmt.query_map(
        rusqlite::params_from_iter(data_refs.iter().map(|p| *p)),
        |row| {
            Ok(Prompt {
                id: row.get(0)?,
                title: row.get(1)?,
                positive_prompt: row.get(2)?,
                negative_prompt: row.get(3)?,
                image_path: row.get(4)?,
                tags: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for prompt in prompt_iter {
        items.push(prompt.map_err(|e| e.to_string())?);
    }

    Ok(PaginatedPrompts { items, total, page, page_size })
}

pub fn get_prompt_by_id(app: &AppHandle, id: i64) -> Result<Prompt, String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT p.id, p.title, p.positive_prompt, p.negative_prompt, p.image_path, p.created_at,
                GROUP_CONCAT(t.name, ',') as tags_str
         FROM prompts p
         LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
         LEFT JOIN tags t ON pt.tag_id = t.id
         WHERE p.id = ?1
         GROUP BY p.id",
        params![id],
        |row| {
            Ok(Prompt {
                id: row.get(0)?,
                title: row.get(1)?,
                positive_prompt: row.get(2)?,
                negative_prompt: row.get(3)?,
                image_path: row.get(4)?,
                tags: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    ).map_err(|e| e.to_string())
}

pub fn update_prompt(
    app: &AppHandle,
    id: i64,
    title: &str,
    positive: &str,
    negative: &str,
    tags_str: &str,
) -> Result<(), String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE prompts SET title = ?1, positive_prompt = ?2, negative_prompt = ?3 WHERE id = ?4",
        params![title, positive, negative, id],
    ).map_err(|e| e.to_string())?;

    // Rebuild tags
    tx.execute("DELETE FROM prompt_tags WHERE prompt_id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let tags: Vec<&str> = tags_str.split(',')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .collect();

    for tag in tags {
        tx.execute(
            "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
            params![tag],
        ).map_err(|e| e.to_string())?;

        let tag_id: i64 = tx.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            params![tag],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?1, ?2)",
            params![id, tag_id],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())
}

pub fn delete_prompt(app: &AppHandle, id: i64) -> Result<(String, String), String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;
    conn.execute("PRAGMA foreign_keys = ON;", []).map_err(|e| e.to_string())?;

    let (image_path, thumbnail_path): (String, String) = conn.query_row(
        "SELECT image_path, thumbnail_path FROM prompts WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM prompts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok((image_path, thumbnail_path))
}

pub fn get_all_tags(app: &AppHandle) -> Result<Vec<String>, String> {
    let conn = Connection::open(db_path(app)?).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT name FROM tags ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let tag_iter = stmt.query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for tag in tag_iter {
        tags.push(tag.map_err(|e| e.to_string())?);
    }
    Ok(tags)
}
