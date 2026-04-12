<script setup lang="ts">
import { useSettings } from '@/composables/useSettings'
import ModalWrapper from './ModalWrapper.vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  save: []
}>()

const { settings } = useSettings()
</script>

<template>
  <ModalWrapper :show="show" width="440px" @close="emit('close')">
    <h2 class="text-2xl font-extrabold mb-8 text-text tracking-tighter">系统配置</h2>
    <div class="space-y-6">
      <div>
        <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2">Kimi API Key</label>
        <input v-model="settings.kimiKey" type="password" class="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:border-accent outline-none transition-all">
      </div>
      <div>
        <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2">Table Suffix</label>
        <input v-model="settings.tableSuffix" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:border-accent outline-none transition-all" placeholder="留空为生产, _test 为测试">
      </div>
      <div class="border border-border rounded-xl p-4 bg-surface2">
        <div class="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2">Supabase 连接</div>
        <div class="text-xs text-text-muted font-mono truncate">{{ settings.supabaseUrl }}</div>
        <div class="text-[10px] text-green mt-1 flex items-center gap-1"><div class="dot-live"></div> 已通过 GitHub 认证连接</div>
      </div>
    </div>
    <div class="mt-10 flex justify-end gap-4">
      <button @click="emit('close')" class="btn-secondary">取消</button>
      <button @click="emit('save')" class="btn-primary">保存配置</button>
    </div>
  </ModalWrapper>
</template>
