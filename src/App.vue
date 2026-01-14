<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import Macy from "macy";
// 引入组件
import ImageLoader from "./components/ImageLoader.vue";
import PromptDetail from "./components/PromptDetail.vue";
import TagInput from "./components/TagInput.vue"; // 确保此组件已创建

// --- 数据类型定义 ---
interface Prompt {
  id: number;
  title: string;
  image_path: string;
  tags?: string; // 数据库返回的依然是 "tag1,tag2" 字符串
  positive_prompt?: string;
  negative_prompt?: string;
  created_at?: string;
}

// --- 状态管理 ---
const view = ref<"list" | "create">("list");
const promptList = ref<Prompt[]>([]);
const isLoading = ref(false);
const isSaving = ref(false);
const macyInstance = ref<any | null>(null);

// 标签池 (用于联想)
const allTagsPool = ref<string[]>([]);

// 搜索状态
const searchQuery = ref("");      // 标题模糊搜索
const searchTags = ref<string[]>([]); // 标签精确筛选

// 详情页状态
const isDetailOpen = ref(false);
const selectedPrompt = ref<Prompt | null>(null);

// 表单数据
const form = ref({
  title: "",
  tags: [] as string[], // 改为数组，配合 TagInput 使用
  positive: "",
  negative: "",
  filePath: "",
  previewUrl: ""
});

// --- 核心逻辑 ---

// 1. 加载所有记录
// 1. 找到 loadPrompts 函数
async function loadPrompts() {
  isLoading.value = true;
  try {
    const prompts = await invoke<Prompt[]>("get_prompts");
    promptList.value = prompts;

    // --- 修改开始 ---
    // 旧代码：手动遍历 prompts 算标签
    // 新代码：直接请求后端获取所有标签库，性能更好
    try {
      const tags = await invoke<string[]>("get_all_tags");
      allTagsPool.value = tags;
    } catch (e) {
      console.error("加载标签库失败:", e);
    }
    // --- 修改结束 ---

    initOrUpdateMacy();
  } catch (error) {
    console.error("加载列表失败:", error);
  } finally {
    isLoading.value = false;
  }
}

// 计算属性：根据 标题(SearchQuery) 和 标签(SearchTags) 共同过滤
const filteredList = computed(() => {
  const titleQuery = searchQuery.value.toLowerCase().trim();
  const targetTags = searchTags.value;

  // 如果没搜标题也没选标签，返回全部
  if (!titleQuery && targetTags.length === 0) return promptList.value;

  return promptList.value.filter(item => {
    // 1. 标题模糊匹配
    const matchTitle = !titleQuery || item.title.toLowerCase().includes(titleQuery);

    // 2. 标签精确匹配 (且关系：选中的标签必须全部包含)
    let matchTags = true;
    if (targetTags.length > 0) {
      if (!item.tags) {
        matchTags = false; // 没标签肯定不匹配
      } else {
        const itemTagList = item.tags.split(',').map(t => t.trim());
        matchTags = targetTags.every(target => itemTagList.includes(target));
      }
    }

    return matchTitle && matchTags;
  });
});

// 监听过滤结果长度变化，刷新 Macy 布局
watch(() => filteredList.value.length, () => {
  initOrUpdateMacy();
});

// 点击标签进行搜索 (添加到筛选列表)
function searchTag(tag: string) {
  if (!searchTags.value.includes(tag)) {
    searchTags.value.push(tag);
  }
  view.value = 'list';
  isDetailOpen.value = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 初始化或更新 Macy 布局
function initOrUpdateMacy() {
  nextTick(() => {
    if (view.value !== 'list') return;

    if (macyInstance.value) {
      macyInstance.value.recalculate(true);
    } else {
      macyInstance.value = new Macy({
        container: '#macy-container',
        trueOrder: false,
        waitForImages: false,
        margin: 16,
        columns: 4,
        breakAt: { 1024: 3, 768: 2, 480: 1 }
      });
    }
  });
}

onMounted(() => {
  loadPrompts();
});

// 切换视图
function switchView(target: "list" | "create") {
  view.value = target;
  if (target === 'create') {
    // 重置表单，tags 重置为空数组
    form.value = { title: "", tags: [], positive: "", negative: "", filePath: "", previewUrl: "" };
  } else {
    initOrUpdateMacy();
  }
}

// 2. 打开详情页
function openDetail(item: Prompt) {
  selectedPrompt.value = item;
  isDetailOpen.value = true;
}

// 3. 处理删除回调
function handleDeleted(id: number) {
  promptList.value = promptList.value.filter(p => p.id !== id);
}

// 4. 选择图片
async function selectImage() {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (file) {
    const path = file as string;
    form.value.filePath = path;
    try {
      const bytes = await invoke<number[]>("read_absolute_image", { path });
      const blob = new Blob([new Uint8Array(bytes)]);
      if (form.value.previewUrl) URL.revokeObjectURL(form.value.previewUrl);
      form.value.previewUrl = URL.createObjectURL(blob);
    } catch (e) {
      alert("读取图片失败：" + e);
    }
  }
}

// 5. 保存并返回
async function savePrompt() {
  if (!form.value.filePath || !form.value.title) return alert("请补全标题和图片");
  isSaving.value = true;
  try {
    await invoke("create_prompt", {
      title: form.value.title,
      positivePrompt: form.value.positive,
      negativePrompt: form.value.negative,
      // 关键：将数组转回字符串传给 Rust
      tags: form.value.tags.join(','),
      sourcePath: form.value.filePath
    });
    alert("保存成功");

    // 清空搜索以便看到新记录
    searchQuery.value = "";
    searchTags.value = [];

    switchView("list");
    loadPrompts();
  } catch (e) {
    alert("保存失败: " + e);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 font-sans text-gray-800">

    <header class="bg-white shadow-sm sticky top-0 z-20 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">

      <div class="flex items-center gap-2 cursor-pointer flex-shrink-0" @click="switchView('list')">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
        <h1 class="text-xl font-bold tracking-tight hidden md:block">PromptBox</h1>
      </div>

      <div class="flex-1 w-full max-w-3xl flex gap-2" v-if="view === 'list'">
        <div class="relative flex-1 group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索标题..."
              class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          />
        </div>

        <div class="flex-1 max-w-[50%]">
          <TagInput
              v-model="searchTags"
              :allTags="allTagsPool"
              :allowCreate="false"
              placeholder="筛选标签..."
          />
        </div>
      </div>

      <div class="flex gap-2 flex-shrink-0">
        <button
            v-if="view === 'list'"
            @click="switchView('create')"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md active:scale-95 whitespace-nowrap"
        >
          + 新增记录
        </button>
        <button
            v-else
            @click="switchView('list')"
            class="text-gray-500 hover:text-gray-700 px-4 py-2 font-medium whitespace-nowrap"
        >
          取消返回
        </button>
      </div>
    </header>

    <main class="p-6 max-w-7xl mx-auto">

      <div v-show="view === 'list'">

        <div v-if="filteredList.length === 0 && (searchQuery || searchTags.length > 0)" class="text-center py-20 text-gray-400">
          <p>没有找到相关记录</p>
          <button
              @click="searchQuery = ''; searchTags = []"
              class="mt-2 text-blue-500 hover:underline"
          >
            清除所有筛选
          </button>
        </div>

        <div id="macy-container" class="w-full">
          <div v-for="item in filteredList" :key="item.id" class="mb-4 break-inside-avoid">
            <div
                @click="openDetail(item)"
                class="bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer border border-gray-100 overflow-hidden group"
            >
              <div class="aspect-auto min-h-[150px] relative bg-gray-50">
                <ImageLoader :filename="item.image_path" />
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
              </div>

              <div class="p-3">
                <h3 class="font-bold text-gray-800 truncate" :title="item.title">{{ item.title }}</h3>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                      v-for="tag in (item.tags?.split(',') || [])"
                      :key="tag"
                      @click.stop="searchTag(tag)"
                      class="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="promptList.length === 0 && !isLoading" class="text-center py-20 text-gray-400">
          <p>还没有记录，点击右上角添加一张吧！</p>
        </div>
      </div>

      <div v-show="view === 'create'" class="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row h-[600px]">
        <div class="md:w-1/2 bg-gray-50 p-6 flex flex-col items-center justify-center border-r border-gray-100 relative">
          <div v-if="!form.previewUrl" @click="selectImage" class="cursor-pointer flex flex-col items-center text-gray-400 hover:text-blue-500 transition-colors">
            <span class="text-5xl mb-2">+</span>
            <span>点击上传参考图</span>
          </div>
          <img v-else :src="form.previewUrl" class="max-w-full max-h-full object-contain shadow-md rounded-lg" />
          <button v-if="form.previewUrl" @click="selectImage" class="absolute bottom-4 bg-white/80 hover:bg-white px-3 py-1 rounded-full text-sm shadow text-gray-600">更换图片</button>
        </div>

        <div class="md:w-1/2 p-6 overflow-y-auto space-y-4">
          <div>
            <label class="text-xs font-bold text-gray-500 uppercase">标题</label>
            <input v-model="form.title" class="w-full p-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors" />
          </div>

          <div>
            <label class="text-xs font-bold text-gray-500 uppercase mb-1 block">标签 (回车添加)</label>
            <TagInput
                v-model="form.tags"
                :allTags="allTagsPool"
                :allowCreate="true"
            />
          </div>

          <div><label class="text-xs font-bold text-gray-500 uppercase">正向提示词</label><textarea v-model="form.positive" rows="5" class="w-full p-3 mt-1 border rounded-lg bg-gray-50 text-sm font-mono resize-none"></textarea></div>
          <div><label class="text-xs font-bold text-gray-500 uppercase">负向提示词</label><textarea v-model="form.negative" rows="3" class="w-full p-3 mt-1 border rounded-lg bg-gray-50 text-sm font-mono resize-none"></textarea></div>
          <button @click="savePrompt" :disabled="isSaving" class="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg mt-4 disabled:bg-gray-400">{{ isSaving ? '保存中...' : '保存记录' }}</button>
        </div>
      </div>

    </main>

    <PromptDetail
        :isOpen="isDetailOpen"
        :item="selectedPrompt"
        @close="isDetailOpen = false"
        @delete="handleDeleted"
        @search="searchTag"
    />

  </div>
</template>