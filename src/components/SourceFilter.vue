<script setup lang="ts">
defineProps<{
  sources: Array<{ name: string; count: number; pass?: number; fail?: number }>
  activeSources: string[]
  showPassFail?: boolean
}>()

const emit = defineEmits<{
  toggle: [name: string]
  toggleAll: []
}>()
</script>

<template>
  <div class="source-tags-container" v-if="sources.length > 0">
    <div class="source-tags-label">
      <span>来源过滤 (当前列表)</span>
      <span @click="emit('toggleAll')" class="cursor-pointer hover:text-accent transition-colors">全选/取消</span>
    </div>
    <div class="source-tags-list">
      <div
        v-for="s in sources"
        :key="s.name"
        :class="['source-tag', activeSources.includes(s.name) ? 'active' : '']"
        @click="emit('toggle', s.name)"
      >
        {{ s.name }}
        <span v-if="showPassFail" class="ml-1 opacity-60 font-normal">
          ({{ s.count }} | <span style="color: var(--green)">{{ s.pass }}</span>/<span style="color: var(--red)">{{ s.fail }}</span>)
        </span>
        <span v-else class="ml-1 opacity-60 font-normal">({{ s.count }})</span>
      </div>
    </div>
  </div>
</template>
