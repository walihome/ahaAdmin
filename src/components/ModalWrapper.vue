<script setup lang="ts">
defineProps<{
  show: boolean
  width?: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-dark-bg/80 flex items-center justify-center z-50 backdrop-blur-md"
      @click.self="emit('close')"
    >
      <div
        class="bg-surface border border-border rounded-3xl p-8 max-h-[85vh] overflow-y-auto shadow-2xl"
        :style="{ width: width || '540px' }"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
