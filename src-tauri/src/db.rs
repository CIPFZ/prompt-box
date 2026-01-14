use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// 数据结构 (对应前端接口)
#[derive(Debug, Serialize, Deserialize)]
pub struct Prompt {
    pub id: i64,
    pub title: String,
    pub positive_prompt: Option<String>,
    pub negative_prompt: Option<String>,
    pub tags: Option<String>, // 查出来是 "tag1,tag2" 字符串，前端无需修改
    pub image_path: String,
    pub created_at: String,
}

// 初始化数据库 (自动建三张表)
pub fn init_db(app: &AppHandle) -> Result<(), String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_path.exists() {
        fs::create_dir_all(&app_path).map_err(|e| e.to_string())?;
    }
    let image_dir = app_path.join("images");
    if !image_dir.exists() {
        fs::create_dir_all(&image_dir).map_err(|e| e.to_string())?;
    }
    let db_path = app_path.join("promptbox.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. 图片主表 (移除了 tags 文本列，改用关联表)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            positive_prompt TEXT,
            negative_prompt TEXT,
            image_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 2. 标签字典表 (存储唯一的标签名)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 3. 关联表 (多对多关系)
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

    Ok(())
}

// 插入新记录 (使用事务处理多表插入)
pub fn add_prompt(app: &AppHandle, title: &str, pos: &str, neg: &str, tags_str: &str, filename: &str) -> Result<i64, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_path.join("promptbox.db");
    let mut conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 开启事务：要么全成功，要么全失败
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. 插入图片基本信息
    tx.execute(
        "INSERT INTO prompts (title, positive_prompt, negative_prompt, image_path) VALUES (?1, ?2, ?3, ?4)",
        params![title, pos, neg, filename],
    ).map_err(|e| e.to_string())?;

    let prompt_id = tx.last_insert_rowid();

    // 2. 处理标签字符串 (分割 -> 存入库 -> 建立关联)
    let tags: Vec<&str> = tags_str.split(',')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .collect();

    for tag in tags {
        // A. 尝试插入标签 (如果已存在则忽略)
        tx.execute(
            "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
            params![tag],
        ).map_err(|e| e.to_string())?;

        // B. 获取该标签的 ID
        let tag_id: i64 = tx.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            params![tag],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        // C. 插入关联
        tx.execute(
            "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?1, ?2)",
            params![prompt_id, tag_id],
        ).map_err(|e| e.to_string())?;
    }

    // 提交事务
    tx.commit().map_err(|e| e.to_string())?;

    Ok(prompt_id)
}

// 获取所有记录 (联表查询，自动拼装 Tags 字符串)
pub fn get_all_prompts(app: &AppHandle) -> Result<Vec<Prompt>, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_path.join("promptbox.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 核心 SQL：联表 + GROUP_CONCAT
    let sql = "
        SELECT
            p.id,
            p.title,
            p.positive_prompt,
            p.negative_prompt,
            p.image_path,
            p.created_at,
            GROUP_CONCAT(t.name, ',') as tags_str
        FROM prompts p
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        GROUP BY p.id
        ORDER BY p.id DESC
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let prompt_iter = stmt.query_map([], |row| {
        Ok(Prompt {
            id: row.get(0)?,
            title: row.get(1)?,
            positive_prompt: row.get(2)?,
            negative_prompt: row.get(3)?,
            image_path: row.get(4)?,
            created_at: row.get(5)?,
            tags: row.get(6)?, // 这里拿到的已经是逗号分隔的字符串了
        })
    }).map_err(|e| e.to_string())?;

    let mut prompts = Vec::new();
    for prompt in prompt_iter {
        prompts.push(prompt.map_err(|e| e.to_string())?);
    }

    Ok(prompts)
}

// --- 新增功能：获取所有标签库 (供前端联想使用) ---
pub fn get_all_tags(app: &AppHandle) -> Result<Vec<String>, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_path.join("promptbox.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT name FROM tags ORDER BY name ASC").map_err(|e| e.to_string())?;

    let tag_iter = stmt.query_map([], |row| {
        row.get(0)
    }).map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for tag in tag_iter {
        tags.push(tag.map_err(|e| e.to_string())?);
    }

    Ok(tags)
}

// 删除功能
pub fn delete_prompt(app: &AppHandle, id: i64) -> Result<(), String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_path.join("promptbox.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 手动开启外键支持，确保删了 prompt 自动删关联
    conn.execute("PRAGMA foreign_keys = ON;", []).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM prompts WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_path.join("images"))
}