<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'
import EmptyState from '@/components/EmptyState.vue'

const { supabase } = useSupabase()
const { tableName } = useSettings()
const { showToast } = useToast()

const templates = ref<any[]>([])
const selected = ref<any>(null)
const search = ref('')
const stageFilter = ref('all')

const modal = reactive({
  show: false, isNew: true,
  form: { id: null as any, name: '', stage: 'process', template: '', model: 'kimi-k2.5', model_base_url: 'https://api.moonshot.cn/v1', temperature: 0.3, max_retries: 3, request_interval: 0.5, enabled: true, version: 1 }
})

const filtered = computed(() => {
  let list = templates.value
  if (stageFilter.value !== 'all') list = list.filter(p => p.stage === stageFilter.value)
  if (search.value) list = list.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()) || p.template.toLowerCase().includes(search.value.toLowerCase()))
  return list
})

async function loadItems() {
  try {
    const { data, error } = await supabase.value.from(tableName('prompt_templates')).select('*').order('stage').order('name')
    if (error) throw error
    templates.value = data || []
    if (templates.value.length > 0 && !selected.value) selected.value = templates.value[0]
  } catch (e: any) { showToast(e.message) }
}

function create() {
  modal.isNew = true
  modal.form = { id: null, name: '', stage: 'process', template: '', model: 'kimi-k2.5', model_base_url: 'https://api.moonshot.cn/v1', temperature: 0.3, max_retries: 3, request_interval: 0.5, enabled: true, version: 1 }
  modal.show = true
}

function edit(pt: any) { modal.isNew = false; modal.form = { ...pt }; modal.show = true }

async function save() {
  const f = modal.form
  const payload = { name: f.name, stage: f.stage, template: f.template, model: f.model, model_base_url: f.model_base_url, temperature: f.temperature, max_retries: f.max_retries, request_interval: f.request_interval, enabled: f.enabled, version: f.version }
  try {
    if (modal.isNew) { const { error } = await supabase.value.from(tableName('prompt_templates')).insert([payload]); if (error) throw error; showToast('Prompt 已创建') }
    else { const { error } = await supabase.value.from(tableName('prompt_templates')).update(payload).eq('id', f.id); if (error) throw error; showToast('Prompt 已更新') }
    modal.show = false; await loadItems()
    if (selected.value?.id === f.id) selected.value = { ...f, ...payload }
  } catch (e: any) { showToast(e.message) }
}

async function confirmDelete() {
  if (!selected.value?.id) return
  if (!confirm(`确定要删除 "${selected.value.name}" 吗？`)) return
  try {
    const { error } = await supabase.value.from(tableName('prompt_templates')).delete().eq('id', selected.value.id)
    if (error) throw error; showToast('已删除'); selected.value = null; await loadItems()
  } catch (e: any) { showToast(e.message) }
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="two-pane">
      <div class="list-pane">
        <div class="list-pane-header">
          <div class="list-pane-title">Prompt 模板</div>
          <button class="btn-new" @click="create">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建
          </button>
        </div>
        <div class="list-search">
          <div class="search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" class="search-input" type="text" placeholder="搜索 Prompt...">
          </div>
        </div>
        <div class="flex gap-1 px-3 py-2 border-b border-border">
          <div v-for="s in ['all', 'process', 'rank', 'archive']" :key="s" :class="['tab', stageFilter === s ? 'active' : '']" @click="stageFilter = s" style="padding:4px 10px; font-size:11px;">
            {{ s === 'all' ? '全部' : s }}
          </div>
        </div>
        <div class="item-list">
          <div v-for="pt in filtered" :key="pt.id" @click="selected = { ...pt }" :class="['prompt-card', selected?.id === pt.id ? 'active' : '']">
            <div class="card-top">
              <div class="card-title">{{ pt.name }}</div>
              <span class="card-tag" :class="pt.enabled ? 'tag-done' : 'tag-pending'">{{ pt.stage }}</span>
            </div>
            <div class="card-preview">{{ pt.template }}</div>
            <div class="card-meta">
              <div class="meta-pill">v{{ pt.version }}</div>
              <div class="meta-pill">{{ pt.model }}</div>
              <div v-if="pt.enabled" class="meta-pill"><div class="dot-live"></div>启用</div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-pane" v-if="selected">
        <div class="detail-topbar">
          <div class="mini-stat">阶段 <span class="mini-stat-val">{{ selected.stage }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">模型 <span class="mini-stat-val">{{ selected.model }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">温度 <span class="mini-stat-val">{{ selected.temperature }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">版本 <span class="mini-stat-val">v{{ selected.version }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selected.name }}</div>
            <div v-if="selected.enabled" class="status-badge"><div class="dot-live"></div> 启用中</div>
          </div>
          <div class="detail-actions">
            <button @click="edit(selected)" class="btn-secondary">编辑</button>
            <button v-if="selected.id" @click="confirmDelete" class="btn-danger">删除</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="content-block">
            <div class="block-label">模板参数</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div class="flex flex-col"><span class="text-[10px] text-text-dim uppercase tracking-wider">Model</span><span class="text-sm font-bold text-text">{{ selected.model }}</span></div>
              <div class="flex flex-col"><span class="text-[10px] text-text-dim uppercase tracking-wider">Base URL</span><span class="text-xs font-mono text-text-muted truncate">{{ selected.model_base_url }}</span></div>
              <div class="flex flex-col"><span class="text-[10px] text-text-dim uppercase tracking-wider">Temperature</span><span class="text-sm font-bold text-text">{{ selected.temperature }}</span></div>
              <div class="flex flex-col"><span class="text-[10px] text-text-dim uppercase tracking-wider">Max Retries</span><span class="text-sm font-bold text-text">{{ selected.max_retries }}</span></div>
            </div>
          </div>
          <div class="content-block">
            <div class="block-label">Prompt 模板内容</div>
            <div class="whitespace-pre-wrap font-mono text-[12px] text-text-muted leading-relaxed bg-bg p-5 rounded-lg border border-border max-h-[60vh] overflow-y-auto">{{ selected.template }}</div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条 Prompt 模板">
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </template>
      </EmptyState>
    </div>

    <ModalWrapper :show="modal.show" width="700px" @close="modal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ modal.isNew ? '新建 Prompt' : '编辑 Prompt' }}</h2>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">名称 *</label><input v-model="modal.form.name" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">阶段 *</label><select v-model="modal.form.stage" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"><option value="process">process</option><option value="rank">rank</option><option value="archive">archive</option></select></div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">模型 *</label><input v-model="modal.form.model" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Temperature *</label><input v-model.number="modal.form.temperature" type="number" step="0.1" min="0" max="2" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">版本 *</label><input v-model.number="modal.form.version" type="number" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        </div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Model Base URL *</label><input v-model="modal.form.model_base_url" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Max Retries</label><input v-model.number="modal.form.max_retries" type="number" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Request Interval (s)</label><input v-model.number="modal.form.request_interval" type="number" step="0.1" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        </div>
        <div class="flex items-center gap-3"><label class="text-[10px] font-bold text-text-dim uppercase tracking-widest">启用</label><ToggleSwitch v-model="modal.form.enabled" /></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Template (Prompt 文本) *</label><textarea v-model="modal.form.template" rows="16" class="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs font-mono text-text focus:border-accent outline-none resize-y leading-relaxed"></textarea></div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button @click="modal.show = false" class="btn-secondary">取消</button>
        <button @click="save" class="btn-primary">{{ modal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>
  </div>
</template>
