<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
}>()
</script>

<template>
  <div
    @click="emit('update:modelValue', !modelValue)"
    class="w-9 h-5 rounded-full cursor-pointer transition-all relative"
    :style="{ background: modelValue ? 'var(--green)' : 'var(--surface3)' }"
  >
    <div
      class="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
      :style="{ left: modelValue ? '18px' : '2px' }"
    />
  </div>
</template>
