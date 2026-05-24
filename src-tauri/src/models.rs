use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: i64,
    pub title: String,
    pub positive_prompt: Option<String>,
    pub negative_prompt: Option<String>,
    pub tags: Option<String>,
    pub image_path: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginatedPrompts {
    pub items: Vec<Prompt>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiConfig {
    pub id: i64,
    pub name: String,
    pub api_type: String,
    pub base_url: String,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub extra_params: String,
    pub is_active: bool,
    pub proxy_enabled: bool,
    pub proxy_url: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub proxy_enabled: bool,
    pub proxy_url: String,
    pub theme: String,
    pub default_api_config_id: Option<i64>,
}
