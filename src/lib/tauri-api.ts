import { invoke } from "@tauri-apps/api/core";
import type { Prompt, PaginatedPrompts, ApiConfig, AppSettings } from "../types";

// Prompt CRUD
export const createPrompt = (params: {
  title: string;
  positive_prompt: string;
  negative_prompt: string;
  tags: string;
  source_path: string;
}) => invoke<string>("create_prompt", params);

export const updatePrompt = (params: {
  id: number;
  title: string;
  positive_prompt: string;
  negative_prompt: string;
  tags: string;
}) => invoke<string>("update_prompt", params);

export const getPrompts = (params: {
  page: number;
  page_size: number;
  title_query?: string;
  filter_tags?: string;
}) => invoke<PaginatedPrompts>("get_prompts", params);

export const getPromptById = (id: number) =>
  invoke<Prompt>("get_prompt_by_id", { id });

export const deletePrompt = (id: number) =>
  invoke<void>("delete_prompt", { id });

export const getAllTags = () => invoke<string[]>("get_all_tags");

// Images
export const readAbsoluteImage = (path: string) =>
  invoke<number[]>("read_absolute_image", { path });

export const readProjectImage = (filename: string) =>
  invoke<number[]>("read_project_image", { filename });

export const readThumbnail = (filename: string) =>
  invoke<number[]>("read_thumbnail", { filename });

export const exportImage = (filename: string, targetPath: string) =>
  invoke<void>("export_image", { filename, targetPath });

export const replaceImage = (id: number, sourcePath: string) =>
  invoke<string>("replace_image", { id, sourcePath });

// API Configs
export const getApiConfigs = () => invoke<ApiConfig[]>("get_api_configs");

export const saveApiConfig = (config: {
  id?: number | null;
  name: string;
  api_type: string;
  base_url: string;
  endpoint: string;
  api_key?: string | null;
  extra_params?: string | null;
  is_active: boolean;
  proxy_enabled: boolean;
  proxy_url?: string | null;
}) => invoke<string>("save_api_config", config);

export const deleteApiConfig = (id: number) =>
  invoke<void>("delete_api_config", { id });

export const testApiConnection = (configId: number) =>
  invoke<string>("test_api_connection", { configId });

// Settings
export const getSettings = () => invoke<AppSettings>("get_settings");

export const saveSettings = (settings: AppSettings) =>
  invoke<void>("save_settings", { settings });
