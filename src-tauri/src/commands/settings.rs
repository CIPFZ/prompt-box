use rusqlite::{params, Connection};
use tauri::AppHandle;

use crate::db;
use crate::models::*;

fn settings_db(app: &AppHandle) -> Result<Connection, String> {
    let app_path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_path.join("promptbox.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

// ---- API Configs ----

#[tauri::command]
pub fn get_api_configs(app: AppHandle) -> Result<Vec<ApiConfig>, String> {
    let conn = settings_db(&app)?;
    let mut stmt = conn.prepare(
        "SELECT id, name, api_type, base_url, endpoint, api_key, extra_params, is_active, created_at
         FROM api_configs ORDER BY id ASC"
    ).map_err(|e| e.to_string())?;

    let configs = stmt.query_map([], |row| {
        Ok(ApiConfig {
            id: row.get(0)?,
            name: row.get(1)?,
            api_type: row.get(2)?,
            base_url: row.get(3)?,
            endpoint: row.get(4)?,
            api_key: row.get(5)?,
            extra_params: row.get::<_, String>(6).unwrap_or_default(),
            is_active: row.get::<_, i32>(7).unwrap_or(0) != 0,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for c in configs {
        result.push(c.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_api_config(
    app: AppHandle,
    id: Option<i64>,
    name: String,
    api_type: String,
    base_url: String,
    endpoint: String,
    api_key: Option<String>,
    extra_params: Option<String>,
    is_active: bool,
) -> Result<String, String> {
    let conn = settings_db(&app)?;

    if is_active {
        // Deactivate all others first
        conn.execute("UPDATE api_configs SET is_active = 0", [])
            .map_err(|e| e.to_string())?;
    }

    if let Some(config_id) = id {
        conn.execute(
            "UPDATE api_configs SET name=?1, api_type=?2, base_url=?3, endpoint=?4, api_key=?5, extra_params=?6, is_active=?7 WHERE id=?8",
            params![name, api_type, base_url, endpoint, api_key.unwrap_or_default(), extra_params.unwrap_or_default(), is_active as i32, config_id],
        ).map_err(|e| e.to_string())?;
        Ok("更新成功".to_string())
    } else {
        conn.execute(
            "INSERT INTO api_configs (name, api_type, base_url, endpoint, api_key, extra_params, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![name, api_type, base_url, endpoint, api_key.unwrap_or_default(), extra_params.unwrap_or_default(), is_active as i32],
        ).map_err(|e| e.to_string())?;
        Ok("创建成功".to_string())
    }
}

#[tauri::command]
pub fn delete_api_config(app: AppHandle, id: i64) -> Result<(), String> {
    let conn = settings_db(&app)?;
    conn.execute("DELETE FROM api_configs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- API Test ----

#[tauri::command]
pub async fn test_api_connection(app: AppHandle, config_id: i64) -> Result<String, String> {
    let conn = settings_db(&app)?;

    let (api_type, base_url, endpoint, api_key, extra_params): (String, String, String, Option<String>, String) = conn.query_row(
        "SELECT api_type, base_url, endpoint, api_key, extra_params FROM api_configs WHERE id = ?1",
        params![config_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get::<_, String>(4).unwrap_or_default())),
    ).map_err(|e| e.to_string())?;

    // Read proxy settings
    let proxy_enabled: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'proxy_enabled'",
        [],
        |row| row.get(0),
    ).unwrap_or_default();

    let proxy_url: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'proxy_url'",
        [],
        |row| row.get(0),
    ).unwrap_or_default();

    let mut client_builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10));

    if proxy_enabled == "true" && !proxy_url.is_empty() {
        let proxy = reqwest::Proxy::all(&proxy_url)
            .map_err(|e| format!("代理配置错误: {}", e))?;
        client_builder = client_builder.proxy(proxy);
    }

    let client = client_builder.build().map_err(|e| format!("构建客户端失败: {}", e))?;

    let url = format!("{}{}", base_url.trim_end_matches('/'), endpoint);

    let result = match api_type.as_str() {
        "comfyui" => {
            client.get(&format!("{}/system_stats", base_url.trim_end_matches('/')))
                .send().await
        }
        "openai" => {
            client.get(&url)
                .header("Authorization", format!("Bearer {}", api_key.unwrap_or_default()))
                .send().await
        }
        _ => {
            // custom: simple GET health check
            client.get(&url)
                .header("Authorization", format!("Bearer {}", api_key.unwrap_or_default()))
                .send().await
        }
    };

    match result {
        Ok(resp) => {
            let status = resp.status();
            let elapsed = resp.elapsed();
            Ok(format!(
                "连接成功! HTTP {} (延迟: {}ms)",
                status.as_u16(),
                elapsed.as_millis()
            ))
        }
        Err(e) => Err(format!("连接失败: {}", e)),
    }
}

// ---- Settings ----

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let conn = settings_db(&app)?;

    let proxy_enabled: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key='proxy_enabled'", [],
        |row| row.get(0),
    ).unwrap_or_else(|_| "false".into());

    let proxy_url: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key='proxy_url'", [],
        |row| row.get(0),
    ).unwrap_or_default();

    let theme: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key='theme'", [],
        |row| row.get(0),
    ).unwrap_or_else(|_| "light".into());

    let default_api: String = conn.query_row(
        "SELECT value FROM app_settings WHERE key='default_api_config_id'", [],
        |row| row.get(0),
    ).unwrap_or_default();

    let default_api_config_id = if default_api.is_empty() {
        None
    } else {
        default_api.parse::<i64>().ok()
    };

    Ok(AppSettings {
        proxy_enabled: proxy_enabled == "true",
        proxy_url,
        theme,
        default_api_config_id,
    })
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let conn = settings_db(&app)?;

    let pairs = vec![
        ("proxy_enabled", settings.proxy_enabled.to_string()),
        ("proxy_url", settings.proxy_url),
        ("theme", settings.theme),
        ("default_api_config_id", settings.default_api_config_id.map(|v| v.to_string()).unwrap_or_default()),
    ];

    for (key, value) in pairs {
        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}
