import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { getPromptById, deletePrompt, exportImage } from "../lib/tauri-api";
import { usePromptStore } from "../stores/promptStore";
import type { Prompt } from "../types";
import TopBar from "../components/TopBar";
import FullImage from "../components/FullImage";
import ConfirmDialog from "../components/ConfirmDialog";

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteItem } = usePromptStore();
  const [item, setItem] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"positive" | "negative" | null>(null);

  useEffect(() => {
    if (!id) return;
    getPromptById(Number(id))
      .then(setItem)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCopy(text: string | null | undefined, type: "positive" | "negative") {
    if (!text) return;
    try {
      await writeText(text);
      setCopyFeedback(type);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopyFeedback(type);
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch {
        alert("复制失败");
      }
    }
  }

  async function handleDelete() {
    if (!item) return;
    await deletePrompt(item.id);
    deleteItem(item.id);
    navigate("/");
  }

  async function handleExport() {
    if (!item) return;
    const ext = item.image_path.split(".").pop() || "png";
    const filePath = await save({
      defaultPath: `${item.title}.${ext}`,
      filters: [{ name: "Image", extensions: [ext] }],
    });
    if (!filePath) return;

    setDownloading(true);
    try {
      await exportImage(item.image_path, filePath);
      alert("图片已导出！");
    } catch (e) {
      alert("导出失败: " + e);
    } finally {
      setDownloading(false);
    }
  }

  const tags = item?.tags
    ? item.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">加载中...</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">记录不存在</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image */}
        <div className="w-[55%] bg-gray-900 flex items-center justify-center p-8">
          <FullImage filename={item.image_path} className="max-w-full max-h-full" />
        </div>

        {/* Right: Info */}
        <div className="w-[45%] flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">{item.title}</h1>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => navigate(`/?tag=${encodeURIComponent(tag)}`)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Positive prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Positive Prompt
                </label>
                <button
                  onClick={() => handleCopy(item.positive_prompt, "positive")}
                  className={`text-xs px-3 py-1 rounded transition-all ${
                    copyFeedback === "positive"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600"
                  }`}
                >
                  {copyFeedback === "positive" ? "✓ 已复制" : "复制"}
                </button>
              </div>
              <pre className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-200 whitespace-pre-wrap font-sans">
                {item.positive_prompt || "无内容"}
              </pre>
            </div>

            {/* Negative prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Negative Prompt
                </label>
                <button
                  onClick={() => handleCopy(item.negative_prompt, "negative")}
                  className={`text-xs px-3 py-1 rounded transition-all ${
                    copyFeedback === "negative"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600"
                  }`}
                >
                  {copyFeedback === "negative" ? "✓ 已复制" : "复制"}
                </button>
              </div>
              <pre className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-200 whitespace-pre-wrap font-sans">
                {item.negative_prompt || "无内容"}
              </pre>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">{item.created_at}</span>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/edit/${item.id}`)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                编辑
              </button>
              <button
                onClick={handleExport}
                disabled={downloading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {downloading ? "导出中..." : "导出"}
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="确认删除"
        message="确定要删除这条记录吗？图片文件也会永久删除，不可恢复。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        confirmText="删除"
        destructive
      />
    </div>
  );
}
