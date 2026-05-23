import { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import TopBar from "../components/TopBar";

type Tab = "api" | "proxy" | "general";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("api");
  const { settings, apiConfigs, testResult, testing, saveSettings, saveApiConfig, deleteApiConfig, testConnection, clearTestResult } = useSettingsStore();

  // API form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiName, setApiName] = useState("");
  const [apiType, setApiType] = useState("comfyui");
  const [apiUrl, setApiUrl] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiExtra, setApiExtra] = useState("{}");

  const tabs: { key: Tab; label: string }[] = [
    { key: "api", label: "API Config" },
    { key: "proxy", label: "代理" },
    { key: "general", label: "通用" },
  ];

  function resetApiForm() {
    setEditingId(null);
    setApiName("");
    setApiType("comfyui");
    setApiUrl("");
    setApiEndpoint("");
    setApiKey("");
    setApiExtra("{}");
    setShowForm(false);
    clearTestResult();
  }

  function startEdit(config: (typeof apiConfigs)[number]) {
    setEditingId(config.id);
    setApiName(config.name);
    setApiType(config.api_type);
    setApiUrl(config.base_url);
    setApiEndpoint(config.endpoint);
    setApiKey(config.api_key || "");
    setApiExtra(config.extra_params || "{}");
    setShowForm(true);
    clearTestResult();
  }

  async function handleSaveApi() {
    await saveApiConfig({
      id: editingId || null,
      name: apiName || "Unnamed",
      api_type: apiType,
      base_url: apiUrl,
      endpoint: apiEndpoint,
      api_key: apiKey || null,
      extra_params: apiExtra || null,
      is_active: true,
    });
    resetApiForm();
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-8">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* API Config Tab */}
          {tab === "api" && (
            <div>
              {/* List */}
              {apiConfigs.map((cfg) => (
                <div
                  key={cfg.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 mb-3"
                >
                  <div className={`w-2 h-2 rounded-full ${cfg.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{cfg.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {cfg.api_type} &middot; {cfg.base_url}{cfg.endpoint}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(cfg)}
                    className="text-xs px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={async () => {
                      await deleteApiConfig(cfg.id);
                      if (editingId === cfg.id) resetApiForm();
                    }}
                    className="text-xs px-3 py-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    删除
                  </button>
                  <button
                    onClick={() => {
                      clearTestResult();
                      testConnection(cfg.id);
                    }}
                    disabled={testing}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testing ? "测试中..." : "测试"}
                  </button>
                </div>
              ))}

              {testResult && (
                <div className={`p-3 rounded-lg text-sm mb-3 ${testResult.includes("成功") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {testResult}
                </div>
              )}

              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 rounded-xl text-sm font-medium transition-colors"
                >
                  + 添加 API 配置
                </button>
              )}

              {/* Form */}
              {showForm && (
                <div className="mt-4 p-6 bg-white rounded-xl border border-gray-200 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Name</label>
                      <input value={apiName} onChange={(e) => setApiName(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="My API" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Type</label>
                      <select value={apiType} onChange={(e) => setApiType(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="comfyui">ComfyUI</option>
                        <option value="openai">OpenAI Compatible</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Base URL</label>
                    <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="http://127.0.0.1:8188" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Endpoint</label>
                    <input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="/prompt" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">API Key (optional)</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sk-..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Extra Params (JSON)</label>
                    <textarea value={apiExtra} onChange={(e) => setApiExtra(e.target.value)} rows={3} className="w-full p-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button onClick={resetApiForm} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                    <button onClick={handleSaveApi} className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">保存</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Proxy Tab */}
          {tab === "proxy" && settings && (
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">HTTP 代理</h3>
                    <p className="text-xs text-gray-400 mt-1">所有 API 请求通过此代理发送</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ ...settings, proxy_enabled: !settings.proxy_enabled })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.proxy_enabled ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.proxy_enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </button>
                </div>

                {settings.proxy_enabled && (
                  <div className="mt-4">
                    <input
                      value={settings.proxy_url}
                      onChange={(e) => saveSettings({ ...settings, proxy_url: e.target.value })}
                      className="w-full p-2 border rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="http://127.0.0.1:7890"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* General Tab */}
          {tab === "general" && settings && (
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-xl border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3">主题</h3>
                <select
                  value={settings.theme}
                  onChange={(e) => saveSettings({ ...settings, theme: e.target.value as "light" | "dark" })}
                  className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">浅色模式</option>
                  <option value="dark">暗色模式</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
