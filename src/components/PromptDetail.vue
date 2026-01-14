<script setup lang="ts">
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import ImageLoader from './ImageLoader.vue';

// 定义接收的数据类型
interface Prompt {
  id: number;
  title: string;
  image_path: string;
  tags?: string;
  positive_prompt?: string;
  negative_prompt?: string;
  created_at?: string;
}

const props = defineProps<{
  item: Prompt | null;
  isOpen: boolean;
}>();

// 新增 'search' 事件，用于点击标签时通知父组件
const emit = defineEmits(['close', 'delete', 'search']);

const isDeleting = ref(false);
// 用于记录当前哪个按钮显示“已复制”状态 ('positive' | 'negative' | null)
const copyFeedback = ref<string | null>(null);

// 优化后的复制功能
async function copyText(text: string | undefined, type: 'positive' | 'negative') {
  if (!text) return;
  try {
    await writeText(text);
    // 设置反馈状态
    copyFeedback.value = type;
    // 2秒后恢复原状
    setTimeout(() => {
      copyFeedback.value = null;
    }, 2000);
  } catch (err) {
    console.error('复制失败:', err);
    // 降级策略：如果插件失败，尝试浏览器原生 API
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback.value = type;
      setTimeout(() => copyFeedback.value = null, 2000);
    } catch (e) {
      alert('复制失败，请检查权限');
    }
  }
}

// 删除功能
async function handleDelete() {
  if (!props.item) return;
  // 这里的 confirm 比较原生，如果想要更美观可以后续封装一个 Dialog 组件
  if (!confirm('确定要彻底删除这条记录吗？图片也会被删除且无法恢复。')) return;

  isDeleting.value = true;
  try {
    await invoke('delete_prompt', {
      id: props.item.id,
      filename: props.item.image_path
    });
    emit('delete', props.item.id);
    emit('close');
  } catch (e) {
    alert('删除失败: ' + e);
  } finally {
    isDeleting.value = false;
  }
}

// 点击标签处理
function handleTagClick(tag: string) {
  emit('search', tag); // 通知父组件去搜索这个 tag
}

const isDownloading = ref(false);

async function handleDownload() {
  if (!props.item) return;

  try {
    // 1. 获取原图后缀 (例如 png)
    const ext = props.item.image_path.split('.').pop() || 'png';

    // 2. 打开系统保存文件对话框
    const filePath = await save({
      defaultPath: `${props.item.title}.${ext}`, // 默认文件名
      filters: [{
        name: 'Image',
        extensions: [ext] // 限制只能保存为原格式
      }]
    });

    if (!filePath) return; // 用户取消了

    isDownloading.value = true;

    // 3. 调用后端导出
    await invoke('export_image', {
      filename: props.item.image_path,
      targetPath: filePath
    });

    alert('图片已成功保存到本地！');

  } catch (e) {
    console.error(e);
    alert('下载失败: ' + e);
  } finally {
    isDownloading.value = false;
  }
}

</script>

<template>
  <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
  >
    <div v-if="isOpen && item" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="emit('close')">

      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative">

        <div class="md:w-1/2 bg-gray-100 flex items-center justify-center relative p-4 border-r border-gray-100">
          <div class="w-full h-full relative flex items-center justify-center">
            <ImageLoader :filename="item.image_path" class="max-w-full max-h-full object-contain drop-shadow-md" />
          </div>
          <button @click="emit('close')" class="absolute top-4 left-4 md:hidden bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="md:w-1/2 flex flex-col h-full bg-white">

          <div class="p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 leading-tight">{{ item.title }}</h2>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                    v-for="tag in (item.tags?.split(',') || [])"
                    :key="tag"
                    @click="handleTagClick(tag)"
                    class="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors select-none"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <button @click="emit('close')" class="hidden md:block text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

            <div class="group relative">
              <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Positive Prompt</label>
                <button
                    @click="copyText(item.positive_prompt, 'positive')"
                    class="text-xs px-2 py-1 rounded transition-all flex items-center gap-1"
                    :class="copyFeedback === 'positive' ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600'"
                >
                  <span v-if="copyFeedback === 'positive'">✓ 已复制</span>
                  <span v-else>复制</span>
                </button>
              </div>
              <div class="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 font-mono leading-relaxed border border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50/30 transition-all break-words whitespace-pre-wrap">
                {{ item.positive_prompt || '无内容' }}
              </div>
            </div>

            <div class="group relative">
              <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Negative Prompt</label>
                <button
                    @click="copyText(item.negative_prompt, 'negative')"
                    class="text-xs px-2 py-1 rounded transition-all flex items-center gap-1"
                    :class="copyFeedback === 'negative' ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600'"
                >
                  <span v-if="copyFeedback === 'negative'">✓ 已复制</span>
                  <span v-else>复制</span>
                </button>
              </div>
              <div class="p-4 bg-gray-50 rounded-xl text-sm text-gray-700 font-mono leading-relaxed border border-gray-200 group-hover:border-red-300 group-hover:bg-red-50/30 transition-all break-words whitespace-pre-wrap">
                {{ item.negative_prompt || '无内容' }}
              </div>
            </div>

          </div>

          <div class="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50">
            <span class="text-xs text-gray-400 font-mono">{{ item.created_at }}</span>

            <div class="flex gap-3">
              <button
                  @click="handleDownload"
                  :disabled="isDownloading"
                  class="text-gray-600 hover:text-blue-600 text-sm font-medium px-4 py-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>{{ isDownloading ? '下载中...' : '下载原图' }}</span>
              </button>

              <button
                  @click="handleDelete"
                  :disabled="isDeleting"
                  class="text-red-500 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="isDeleting" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                <span>{{ isDeleting ? '删除中...' : '删除' }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 自定义滚动条样式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #d1d5db;
}
</style>