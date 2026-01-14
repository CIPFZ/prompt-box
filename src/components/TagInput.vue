<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: string[]; // 已选中的标签数组
  allTags: string[];    // 所有可用的标签库（用于联想）
  placeholder?: string;
  allowCreate?: boolean; // 是否允许创建新标签
}>();

const emit = defineEmits(['update:modelValue', 'create']);

const inputValue = ref('');
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

// 过滤下拉建议
const suggestions = computed(() => {
  const query = inputValue.value.toLowerCase().trim();
  return props.allTags.filter(tag =>
      !props.modelValue.includes(tag) &&
      tag.toLowerCase().includes(query)
  );
});

// --- 修复点：监听输入内容变化 ---
// 只要用户在打字，无论之前是否关闭了下拉框，都要重新打开
watch(inputValue, () => {
  showDropdown.value = true;
});

// 添加标签
function addTag(tag: string) {
  const newTags = [...props.modelValue, tag];
  emit('update:modelValue', newTags);
  inputValue.value = '';
  // 选中后关闭下拉框
  showDropdown.value = false;
  // 保持焦点以便继续输入
  inputRef.value?.focus();
}

// 移除标签
function removeTag(index: number) {
  const newTags = [...props.modelValue];
  newTags.splice(index, 1);
  emit('update:modelValue', newTags);
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  // 回车：添加
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = inputValue.value.trim();
    if (!val) return;

    // 优先匹配下拉列表里的第一项 (如果用户没选具体哪个，默认选第一个匹配的)
    // 或者完全匹配的
    const exactMatch = suggestions.value.find(t => t.toLowerCase() === val.toLowerCase());

    if (exactMatch) {
      addTag(exactMatch);
    } else if (props.allowCreate) {
      addTag(val);
      emit('create', val);
    }
  }
  // Backspace：删除前一个
  if (e.key === 'Backspace' && inputValue.value === '') {
    if (props.modelValue.length > 0) {
      removeTag(props.modelValue.length - 1);
    }
  }
}

// 点击外部关闭下拉
function handleClickOutside(e: MouseEvent) {
  if (
      dropdownRef.value && !dropdownRef.value.contains(e.target as Node) &&
      inputRef.value && !inputRef.value.contains(e.target as Node)
  ) {
    showDropdown.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
  <div class="relative w-full">
    <div
        class="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all min-h-[42px]"
        @click="inputRef?.focus()"
    >
      <span
          v-for="(tag, index) in modelValue"
          :key="tag"
          class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-sm font-medium flex items-center gap-1 select-none"
      >
        {{ tag }}
        <button @click.stop="removeTag(index)" class="hover:text-blue-800 text-blue-400">×</button>
      </span>

      <input
          ref="inputRef"
          v-model="inputValue"
          type="text"
          :placeholder="modelValue.length === 0 ? (placeholder || '输入标签...') : ''"
          class="flex-1 min-w-[60px] outline-none text-sm bg-transparent"
          @focus="showDropdown = true"
          @keydown="handleKeydown"
      />
    </div>

    <div
        v-if="showDropdown && (suggestions.length > 0 || (inputValue && allowCreate))"
        ref="dropdownRef"
        class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
    >
      <div
          v-for="tag in suggestions"
          :key="tag"
          @click="addTag(tag)"
          class="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
      >
        {{ tag }}
      </div>

      <div
          v-if="inputValue && !suggestions.includes(inputValue) && allowCreate"
          @click="addTag(inputValue); emit('create', inputValue)"
          class="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-t border-gray-100 font-medium"
      >
        + 创建新标签 "{{ inputValue }}"
      </div>
    </div>
  </div>
</template>