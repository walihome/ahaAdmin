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
    <Transition name="modal">
      <div
        v-if="show"
        class="modal-overlay"
        @click.self="emit('close')"
      >
        <div class="modal-container" :style="{ width: width || '540px' }">
          <button class="modal-close" @click="emit('close')" aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(8, 9, 12, 0.82);
  backdrop-filter: blur(12px) saturate(1.2);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  padding: 24px;
}

.modal-container {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px;
  max-height: calc(85vh);
  overflow-y: auto;
  box-shadow:
    0 0 0 1px rgba(124, 106, 247, 0.06),
    0 8px 40px rgba(0, 0, 0, 0.5),
    0 0 80px rgba(124, 106, 247, 0.05);
}

.modal-close {
  position: absolute; top: 16px; right: 16px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; cursor: pointer;
  color: var(--text-dim); transition: all 0.15s;
  z-index: 1;
}
.modal-close:hover {
  background: var(--surface3); border-color: var(--border-bright);
  color: var(--text);
}

/* Transition */
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-enter-from .modal-container { transform: scale(0.95) translateY(8px); opacity: 0; }
.modal-leave-to { opacity: 0; }
.modal-leave-to .modal-container { transform: scale(0.97) translateY(4px); opacity: 0; }
.modal-enter-active .modal-container { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-leave-active .modal-container { transition: all 0.15s ease-in; }
</style>
