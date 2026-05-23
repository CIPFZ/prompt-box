export interface Prompt {
  id: number;
  title: string;
  positive_prompt: string | null;
  negative_prompt: string | null;
  tags: string | null;
  image_path: string;
  created_at: string;
}

export interface PaginatedPrompts {
  items: Prompt[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiConfig {
  id: number;
  name: string;
  api_type: "comfyui" | "openai" | "custom";
  base_url: string;
  endpoint: string;
  api_key: string | null;
  extra_params: string;
  is_active: boolean;
  created_at: string;
}

export interface AppSettings {
  proxy_enabled: boolean;
  proxy_url: string;
  theme: "light" | "dark";
  default_api_config_id: number | null;
}

export type { };
