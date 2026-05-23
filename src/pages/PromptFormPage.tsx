import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { createPrompt, updatePrompt, getPromptById, readAbsoluteImage } from "../lib/tauri-api";
import { usePromptStore } from "../stores/promptStore";
import { useTagStore } from "../stores/tagStore";
import type { Prompt } from "../types";
import TopBar from "../components/TopBar";
import TagInput from "../components/TagInput";

export default function PromptFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { refresh, loadTags } = usePromptStore();
  const { allTags, load: loadTagStore } = useTagStore();

  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [positive, setPositive] = useState("");
  const [negative, setNegative] = useState("");
  const [filePath, setFilePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    loadTagStore();
    if (isEdit && id) {
      setLoadingEdit(true);
      getPromptById(Number(id))
        .then((p: Prompt) => {
          setTitle(p.title);
          setPositive(p.positive_prompt || "");
          setNegative(p.negative_prompt || "");
          setTags(p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
        })
        .finally(() => setLoadingEdit(false));
    }
  }, [id, isEdit]);

  async function handleSelectImage() {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (file) {
      const path = file as string;
      setFilePath(path);
      try {
        const bytes = await readAbsoluteImage(path);
        const blob = new Blob([new Uint8Array(bytes)]);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (e) {
        alert("预览图片失败: " + e);
      }
    }
  }

  async function handleSave() {
    if (isEdit) {
      // Edit: only metadata
      if (!title) return alert("请输入标题");
      setSaving(true);
      try {
        await updatePrompt({
          id: Number(id),
          title,
          positive_prompt: positive,
          negative_prompt: negative,
          tags: tags.join(","),
        });
        navigate(`/detail/${id}`);
      } catch (e) {
        alert("保存失败: " + e);
      } finally {
        setSaving(false);
      }
    } else {
      // Create
      if (!filePath || !title) return alert("请补全标题和图片");
      setSaving(true);
      try {
        await createPrompt({
          title,
          positive_prompt: positive,
          negative_prompt: negative,
          tags: tags.join(","),
          source_path: filePath,
        });
        loadTags();
        refresh();
        navigate("/");
      } catch (e) {
        alert("保存失败: " + e);
      } finally {
        setSaving(false);
      }
    }
  }

  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">加载中...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Image picker */}
        <div className="w-1/2 bg-gray-50 p-8 flex flex-col items-center justify-center border-r border-gray-200">
          {!previewUrl ? (
            <button
              onClick={handleSelectImage}
              className="flex flex-col items-center gap-3 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer bg-white p-12 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400"
            >
              <span className="text-5xl">+</span>
              <span className="text-sm font-medium">{isEdit ? "更换图片（可选）" : "点击上传参考图"}</span>
            </button>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={previewUrl}
                className="max-w-full max-h-full object-contain shadow-lg rounded-xl"
              />
              <button
                onClick={handleSelectImage}
                className="absolute bottom-4 bg-white/90 hover:bg-white px-4 py-2 rounded-full text-sm shadow-md text-gray-600 font-medium transition-colors"
              >
                {isEdit ? "更换图片" : "重新选择"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="w-1/2 overflow-y-auto p-8 space-y-5">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            {isEdit ? "编辑记录" : "新建记录"}
          </h2>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题..."
              className="w-full mt-1 p-2 border-b border-gray-200 focus:border-blue-500 outline-none text-lg font-medium transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              标签
            </label>
            <TagInput
              value={tags}
              onChange={setTags}
              allTags={allTags}
              allowCreate
              placeholder="输入标签，回车添加..."
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Positive Prompt
            </label>
            <textarea
              value={positive}
              onChange={(e) => setPositive(e.target.value)}
              rows={6}
              className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="输入正向提示词..."
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Negative Prompt
            </label>
            <textarea
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
              rows={4}
              className="w-full mt-1 p-3 border rounded-lg bg-gray-50 text-sm font-mono resize-none focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all"
              placeholder="输入负向提示词（可选）..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-all active:scale-[0.98] disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : isEdit ? "更新记录" : "保存记录"}
          </button>
        </div>
      </div>
    </div>
  );
}
