<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: string]
  'change': []
}>()

function changeDay(days: number) {
  const d = new Date(props.modelValue)
  if (isNaN(d.getTime())) return
  d.setDate(d.getDate() + days)
  emit('update:modelValue', d.toISOString().split('T')[0])
  emit('change')
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  emit('update:modelValue', val)
  emit('change')
}
</script>

<template>
  <div class="date-nav" style="margin-right:0; flex:1;">
    <div class="date-nav-btn" @click="changeDay(-1)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      前一天
    </div>
    <div class="date-picker-wrap" style="flex:1">
      <input class="hidden-picker" type="date" :value="modelValue" @change="onInput">
      <div class="date-display" style="width:100%">{{ modelValue }}</div>
    </div>
    <div class="date-nav-btn" @click="changeDay(1)">
      后一天
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </div>
</template>
