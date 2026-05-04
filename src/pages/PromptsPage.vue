<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'
import EmptyState from '@/components/EmptyState.vue'

const { supabase } = useSupabase()
const { showToast } = useToast()

const templates = ref<any[]>([])
const selected = ref<any>(null)
const search = ref('')
const stageFilter = ref('all')

const modal = reactive({
  show: false, isNew: true,
  form: { id: null as any, name: '', stage: 'process', template: '', model: 'kimi-k2.5', model_base_url: 'https://api.moonshot.cn/v1', temperature: 0.3, max_retries: 3, request_interval: 0.5, enabled: true, version: 1 }
})

const stageColorMap: Record<string, string> = {
  process: 'stage-process',
  rank: 'stage-rank',
  archive: 'stage-archive',
}

const stageLabels: Record<string, string> = {
  process: '处理',
  rank: '排序',
  archive: '归档',
}

const filtered = computed(() => {
  let list = templates.value
  if (stageFilter.value !== 'all') list = list.filter(p => p.stage === stageFilter.value)
  if (search.value) list = list.filter(p => p.name.toLowerCase().includes(search.value.toLowerCase()) || p.template.toLowerCase().includes(search.value.toLowerCase()))
  return list
})

const stageCounts = computed(() => {
  const counts: Record<string, number> = { all: templates.value.length }
  for (const t of templates.value) {
    counts[t.stage] = (counts[t.stage] || 0) + 1
  }
  return counts
})

async function loadItems() {
  try {
    const { data, error } = await supabase.value.from('prompt_templates').select('*').order('stage').order('name')
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
    if (modal.isNew) { const { error } = await supabase.value.from('prompt_templates').insert([payload]); if (error) throw error; showToast('Prompt 已创建') }
    else { const { error } = await supabase.value.from('prompt_templates').update(payload).eq('id', f.id); if (error) throw error; showToast('Prompt 已更新') }
    modal.show = false; await loadItems()
    if (selected.value?.id === f.id) selected.value = { ...f, ...payload }
  } catch (e: any) { showToast(e.message) }
}

async function confirmDelete() {
  if (!selected.value?.id) return
  if (!confirm(`确定要删除 "${selected.value.name}" 吗？`)) return
  try {
    const { error } = await supabase.value.from('prompt_templates').delete().eq('id', selected.value.id)
    if (error) throw error; showToast('已删除'); selected.value = null; await loadItems()
  } catch (e: any) { showToast(e.message) }
}

function estimateTokens(text: string) {
  if (!text) return 0
  return Math.round(text.length / 3.5)
}

function renderMarkdown(text: string) {
  if (!text) return ''
  return marked.parse(text, { breaks: true }) as string
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="two-pane">
      <div class="list-pane">
        <div class="list-pane-header">
          <div>
            <div class="list-pane-title">Prompt 模板</div>
            <div class="pt-stage-summary">
              <span v-for="s in ['process', 'rank', 'archive']" :key="s" class="pt-stage-dot-wrap">
                <span :class="['pt-stage-indicator', stageColorMap[s]]"></span>
                {{ stageCounts[s] || 0 }}
              </span>
            </div>
          </div>
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
        <div class="pt-stage-tabs">
          <div v-for="s in ['all', 'process', 'rank', 'archive']" :key="s"
            :class="['pt-tab', stageFilter === s ? 'active' : '', s !== 'all' ? stageColorMap[s] : '']"
            @click="stageFilter = s">
            {{ s === 'all' ? '全部' : stageLabels[s] }}
            <span class="pt-tab-count">{{ stageCounts[s] || 0 }}</span>
          </div>
        </div>
        <div class="item-list">
          <div v-for="pt in filtered" :key="pt.id" @click="selected = { ...pt }" :class="['prompt-card', selected?.id === pt.id ? 'active' : '']">
            <div class="card-top">
              <div class="card-title">{{ pt.name }}</div>
              <span :class="['pt-stage-badge', stageColorMap[pt.stage]]">{{ stageLabels[pt.stage] || pt.stage }}</span>
            </div>
            <div class="card-preview">{{ pt.template }}</div>
            <div class="card-meta">
              <div class="meta-pill">v{{ pt.version }}</div>
              <div class="meta-pill">{{ pt.model }}</div>
              <div class="meta-pill">~{{ estimateTokens(pt.template) }} tokens</div>
              <div v-if="pt.enabled" class="meta-pill"><div class="dot-live"></div>启用</div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-pane" v-if="selected">
        <div class="detail-topbar">
          <div class="pt-detail-stage">
            <span :class="['pt-stage-indicator', stageColorMap[selected.stage]]"></span>
            {{ stageLabels[selected.stage] || selected.stage }}
          </div>
          <div class="divider-v"></div>
          <div class="mini-stat">模型 <span class="mini-stat-val">{{ selected.model }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">温度 <span class="mini-stat-val">{{ selected.temperature }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">版本 <span class="mini-stat-val">v{{ selected.version }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">≈ Tokens <span class="mini-stat-val">{{ estimateTokens(selected.template) }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selected.name }}</div>
            <div v-if="selected.enabled" class="status-badge"><div class="dot-live"></div> 启用中</div>
            <div v-else class="pt-status-disabled">已禁用</div>
          </div>
          <div class="detail-actions">
            <button @click="edit(selected)" class="btn-secondary">编辑</button>
            <button v-if="selected.id" @click="confirmDelete" class="btn-danger">删除</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="content-block">
            <div class="block-label">模板参数</div>
            <div class="pt-params-grid">
              <div class="pt-param-card">
                <span class="pt-param-label">Model</span>
                <span class="pt-param-value">{{ selected.model }}</span>
              </div>
              <div class="pt-param-card">
                <span class="pt-param-label">Base URL</span>
                <span class="pt-param-value pt-param-mono">{{ selected.model_base_url }}</span>
              </div>
              <div class="pt-param-card">
                <span class="pt-param-label">Temperature</span>
                <span class="pt-param-value pt-param-big">{{ selected.temperature }}</span>
              </div>
              <div class="pt-param-card">
                <span class="pt-param-label">Max Retries</span>
                <span class="pt-param-value pt-param-big">{{ selected.max_retries }}</span>
              </div>
              <div class="pt-param-card">
                <span class="pt-param-label">Interval</span>
                <span class="pt-param-value pt-param-big">{{ selected.request_interval }}s</span>
              </div>
            </div>
          </div>
          <div class="content-block">
            <div class="flex items-center justify-between mb-3">
              <div class="block-label" style="margin-bottom:0">Prompt 模板内容</div>
              <span class="pt-token-badge">≈ {{ estimateTokens(selected.template) }} tokens</span>
            </div>
            <div class="markdown-body max-h-[60vh] overflow-y-auto" v-html="renderMarkdown(selected.template)"></div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条 Prompt 模板">
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </template>
      </EmptyState>
    </div>

    <ModalWrapper :show="modal.show" width="640px" @close="modal.show = false">
      <div class="modal-title">{{ modal.isNew ? '新建 Prompt' : '编辑 Prompt' }}</div>
      <div class="modal-form">
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">名称</label>
            <input v-model="modal.form.name" type="text" class="form-input" placeholder="Prompt 名称">
          </div>
          <div class="form-group">
            <label class="form-label">阶段</label>
            <select v-model="modal.form.stage" class="form-select">
              <option value="process">process</option>
              <option value="rank">rank</option>
              <option value="archive">archive</option>
            </select>
          </div>
        </div>
        <div class="form-row form-row-3">
          <div class="form-group">
            <label class="form-label">模型</label>
            <input v-model="modal.form.model" type="text" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">Temperature</label>
            <input v-model.number="modal.form.temperature" type="number" step="0.1" min="0" max="2" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">版本</label>
            <input v-model.number="modal.form.version" type="number" class="form-input">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Model Base URL</label>
          <input v-model="modal.form.model_base_url" type="text" class="form-input" style="font-family:var(--mono); font-size:12px">
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">Max Retries</label>
            <input v-model.number="modal.form.max_retries" type="number" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">Request Interval (s)</label>
            <input v-model.number="modal.form.request_interval" type="number" step="0.1" class="form-input">
          </div>
        </div>
        <div class="form-toggle-row">
          <span class="form-toggle-label">启用</span>
          <ToggleSwitch v-model="modal.form.enabled" />
        </div>
        <div class="modal-divider"></div>
        <div class="form-group">
          <label class="form-label">Prompt 模板文本</label>
          <textarea v-model="modal.form.template" rows="16" class="form-textarea" style="line-height:1.8"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="modal.show = false" class="btn-secondary">取消</button>
        <button @click="save" class="btn-primary">{{ modal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>
  </div>
</template>

<style scoped>
.pt-stage-summary {
  display: flex; align-items: center; gap: 10px; margin-top: 4px;
}
.pt-stage-dot-wrap {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-family: var(--mono); color: var(--text-dim);
}
.pt-stage-indicator {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.pt-stage-indicator.stage-process { background: var(--blue); box-shadow: 0 0 6px rgba(78, 168, 232, 0.4); }
.pt-stage-indicator.stage-rank { background: var(--orange); box-shadow: 0 0 6px rgba(245, 166, 35, 0.4); }
.pt-stage-indicator.stage-archive { background: var(--green); box-shadow: 0 0 6px rgba(62, 207, 142, 0.4); }

.pt-stage-tabs {
  display: flex; gap: 2px; padding: 8px 12px; border-bottom: 1px solid var(--border);
}
.pt-tab {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 12px; font-size: 11px; font-weight: 600;
  color: var(--text-muted); border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.pt-tab:hover { background: var(--surface2); color: var(--text); }
.pt-tab.active { color: var(--accent-bright); background: var(--accent-glow); }
.pt-tab.active.stage-process { color: var(--blue); background: rgba(78, 168, 232, 0.1); }
.pt-tab.active.stage-rank { color: var(--orange); background: rgba(245, 166, 35, 0.1); }
.pt-tab.active.stage-archive { color: var(--green); background: rgba(62, 207, 142, 0.1); }
.pt-tab-count { font-size: 10px; font-family: var(--mono); opacity: 0.5; }

.pt-stage-badge {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
  font-family: var(--mono); white-space: nowrap;
}
.pt-stage-badge.stage-process { background: rgba(78, 168, 232, 0.1); border: 1px solid rgba(78, 168, 232, 0.25); color: var(--blue); }
.pt-stage-badge.stage-rank { background: rgba(245, 166, 35, 0.1); border: 1px solid rgba(245, 166, 35, 0.25); color: var(--orange); }
.pt-stage-badge.stage-archive { background: rgba(62, 207, 142, 0.1); border: 1px solid rgba(62, 207, 142, 0.25); color: var(--green); }

.pt-detail-stage {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--text-muted);
}

.pt-status-disabled {
  font-size: 10px; font-family: var(--mono); color: var(--text-dim);
  background: var(--surface2); border: 1px solid var(--border);
  padding: 3px 9px; border-radius: 20px;
}

.pt-params-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;
}
.pt-param-card {
  display: flex; flex-direction: column; gap: 4px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 12px;
}
.pt-param-label { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--mono); }
.pt-param-value { font-size: 13px; font-weight: 600; color: var(--text); word-break: break-all; }
.pt-param-mono { font-family: var(--mono); font-size: 11px; color: var(--text-muted); }
.pt-param-big { font-size: 18px; font-weight: 800; font-family: system-ui, -apple-system, sans-serif; }

.pt-token-badge {
  font-size: 10px; font-family: var(--mono); color: var(--text-dim);
  background: var(--surface2); border: 1px solid var(--border);
  padding: 2px 8px; border-radius: 10px;
}

.markdown-body {
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text);
  background: var(--bg);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-weight: 700;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  color: var(--text);
}
.markdown-body :deep(h1) { font-size: 1.4em; }
.markdown-body :deep(h2) { font-size: 1.2em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
.markdown-body :deep(p) {
  margin-bottom: 0.75em;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin-bottom: 0.75em;
}
.markdown-body :deep(li) {
  margin-bottom: 0.25em;
}
.markdown-body :deep(code) {
  font-family: var(--mono);
  font-size: 12px;
  background: var(--surface2);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--accent-bright);
}
.markdown-body :deep(pre) {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 14px;
  margin: 0.75em 0;
  color: var(--text-muted);
}
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75em;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
  font-size: 12px;
}
.markdown-body :deep(th) {
  background: var(--surface2);
  font-weight: 600;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1em 0;
}
.markdown-body :deep(a) {
  color: var(--accent-bright);
  text-decoration: none;
}
.markdown-body :deep(a:hover) {
  text-decoration: underline;
}
.markdown-body :deep(strong) {
  font-weight: 700;
  color: var(--text);
}
</style>
