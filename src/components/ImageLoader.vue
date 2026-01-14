<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';

const props = defineProps<{
  filename: string;
}>();

const imageUrl = ref<string>('');
const loading = ref(true);
const error = ref(false);

async function loadImage() {
  if (!props.filename) return;

  loading.value = true;
  error.value = false;

  try {
    // 调用 Rust 读取项目内部存储的图片
    const bytes = await invoke<number[]>('read_project_image', {
      filename: props.filename
    });

    const blob = new Blob([new Uint8Array(bytes)]);
    imageUrl.value = URL.createObjectURL(blob);
  } catch (e) {
    console.error(`图片加载失败 [${props.filename}]:`, e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadImage);
// 如果 filename 变化了（虽然列表里一般不变），重新加载
watch(() => props.filename, loadImage);
</script>

<template>
  <div class="w-full h-full flex items-center justify-center bg-gray-200 overflow-hidden relative">
    <span v-if="loading" class="text-xs text-gray-400 animate-pulse">Loading...</span>

    <span v-else-if="error" class="text-xs text-red-400">Error</span>

    <img
        v-else
        :src="imageUrl"
        class="w-full h-full object-cover transition-opacity duration-300"
        :class="loading ? 'opacity-0' : 'opacity-100'"
        loading="lazy"
    />
  </div>
</template>