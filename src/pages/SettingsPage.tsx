import { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useI18nStore } from "../stores/i18nStore";
import TopBar from "../components/TopBar";

type Tab = "api" | "proxy";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("api");
  const { settings, apiConfigs, testResult, testing, saveSettings, saveApiConfig, deleteApiConfig, testConnection, clearTestResult } = useSettingsStore();
  const { tt } = useI18nStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [apiName, setApiName] = useState("");
  const [apiType, setApiType] = useState("comfyui");
  const [apiUrl, setApiUrl] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiExtra, setApiExtra] = useState("{}");

  const tabs: { key: Tab; label: string }[] = [
    { key: "api", label: tt("apiConfig") },
    { key: "proxy", label: tt("proxy") },
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{tt("settings")}</h1>

          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-8">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "api" && (
            <div>
              {apiConfigs.map((cfg) => (
                <div key={cfg.id} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 mb-3">
                  <div className={`w-2 h-2 rounded-full ${cfg.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">{cfg.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {cfg.api_type} &middot; {cfg.base_url}{cfg.endpoint}
                    </div>
                  </div>
                  <button onClick={() => startEdit(cfg)} className="text-xs px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">{tt("edit")}</button>
                  <button onClick={async () => { await deleteApiConfig(cfg.id); if (editingId === cfg.id) resetApiForm(); }} className="text-xs px-3 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">{tt("delete")}</button>
                  <button onClick={() => { clearTestResult(); testConnection(cfg.id); }} disabled={testing} className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors disabled:opacity-50">
                    {testing ? tt("testing") : tt("test")}
                  </button>
                </div>
              ))}

              {testResult && (
                <div className={`p-3 rounded-lg text-sm mb-3 ${testResult.includes("成功") || testResult.includes("success") ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>
                  {testResult}
                </div>
              )}

              {!showForm && (
                <button onClick={() => setShowForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-sm font-medium transition-colors">
                  {tt("addApi")}
                </button>
              )}

              {showForm && (
                <div className="mt-4 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">{tt("name")}</label>
                      <input value={apiName} onChange={(e) => setApiName(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200" placeholder={tt("myApi")} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">{tt("type")}</label>
                      <select value={apiType} onChange={(e) => setApiType(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200">
                        <option value="comfyui">ComfyUI</option>
                        <option value="openai">OpenAI Compatible</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">{tt("baseUrl")}</label>
                    <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-gray-800 dark:text-gray-200" placeholder="http://127.0.0.1:8188" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">{tt("endpoint")}</label>
                    <input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-gray-800 dark:text-gray-200" placeholder="/prompt" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">{tt("apiKey")}</label>
                    <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200" placeholder="sk-..." />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">{tt("extraParams")}</label>
                    <textarea value={apiExtra} onChange={(e) => setApiExtra(e.target.value)} rows={3} className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-gray-800 dark:text-gray-200" />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button onClick={resetApiForm} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">{tt("cancel")}</button>
                    <button onClick={handleSaveApi} className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">{tt("save")}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "proxy" && settings && (
            <div className="space-y-6">
              <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">{tt("proxyEnabled")}</h3>
                    <p className="text-xs text-gray-400 mt-1">{tt("proxyDesc")}</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ ...settings, proxy_enabled: !settings.proxy_enabled })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.proxy_enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.proxy_enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {settings.proxy_enabled && (
                  <div className="mt-4">
                    <input
                      value={settings.proxy_url}
                      onChange={(e) => saveSettings({ ...settings, proxy_url: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-gray-200"
                      placeholder="http://127.0.0.1:7890"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
