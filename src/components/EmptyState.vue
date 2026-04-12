<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center text-text-dim bg-dark-bg">
    <div class="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4 text-text-muted">
      <slot name="icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </slot>
    </div>
    <div class="text-sm font-bold tracking-tight">{{ title }}</div>
    <div v-if="subtitle" class="text-xs mt-1 opacity-50">{{ subtitle }}</div>
  </div>
</template>
