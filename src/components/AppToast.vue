<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toast } = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-10 left-1/2 -translate-x-1/2 bg-accent text-white px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(124,106,247,0.4)] z-[100] text-sm font-bold tracking-tight border border-white/20"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>
