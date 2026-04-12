<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'

const { supabase } = useSupabase()
const { showToast } = useToast()

const subTab = ref('params')
const loading = reactive({ pipelineParams: false, displayMetrics: false, fetchRules: false })

const pipelineParams = ref<any[]>([])
const displayMetricsConfigs = ref<any[]>([])
const contentFetchRules = ref<any[]>([])

const ppModal = reactive({ show: false, isNew: true, valueStr: '', form: { key: '', value: null as any, description: '' } })
const dmModal = reactive({ show: false, isNew: true, metricsJson: '[]', jsonError: '', form: { id: null as any, content_type: '', metrics: [] as any[] } })
const frModal = reactive({ show: false, isNew: true, form: { id: null as any, rule_type: 'skip_domain', value: '', enabled: true } })

const ruleTypeLabels: Record<string, string> = {
  skip_domain: '跳过域名',
  fetch_fulltext_tag: '全文抓取',
}

const frGrouped = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const fr of contentFetchRules.value) {
    if (!groups[fr.rule_type]) groups[fr.rule_type] = []
    groups[fr.rule_type].push(fr)
  }
  return groups
})

async function loadPipelineParams() {
  loading.pipelineParams = true
  try { const { data, error } = await supabase.value.from('pipeline_params').select('*').order('key'); if (error) throw error; pipelineParams.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.pipelineParams = false }
}

async function loadDisplayMetrics() {
  loading.displayMetrics = true
  try { const { data, error } = await supabase.value.from('display_metrics_configs').select('*').order('content_type'); if (error) throw error; displayMetricsConfigs.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.displayMetrics = false }
}

async function loadFetchRules() {
  loading.fetchRules = true
  try { const { data, error } = await supabase.value.from('content_fetch_rules').select('*').order('rule_type').order('value'); if (error) throw error; contentFetchRules.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.fetchRules = false }
}

function createPP() { ppModal.isNew = true; ppModal.form = { key: '', value: null, description: '' }; ppModal.valueStr = ''; ppModal.show = true }
function editPP(pp: any) { ppModal.isNew = false; ppModal.form = { ...pp }; ppModal.valueStr = JSON.stringify(pp.value); ppModal.show = true }
async function savePP() {
  let value; try { value = JSON.parse(ppModal.valueStr) } catch { value = ppModal.valueStr }
  const payload = { key: ppModal.form.key, value, description: ppModal.form.description }
  try {
    if (ppModal.isNew) { const { error } = await supabase.value.from('pipeline_params').insert([payload]); if (error) throw error; showToast('参数已创建') }
    else { const { error } = await supabase.value.from('pipeline_params').update({ value, description: payload.description }).eq('key', payload.key); if (error) throw error; showToast('参数已更新') }
    ppModal.show = false; await loadPipelineParams()
  } catch (e: any) { showToast(e.message) }
}
async function deletePP(pp: any) {
  if (!confirm(`确定要删除参数 "${pp.key}" 吗？`)) return
  try { const { error } = await supabase.value.from('pipeline_params').delete().eq('key', pp.key); if (error) throw error; showToast('已删除'); await loadPipelineParams() } catch (e: any) { showToast(e.message) }
}

function createDM() { dmModal.isNew = true; dmModal.form = { id: null, content_type: '', metrics: [] }; dmModal.metricsJson = '[\n  { "label": "", "key": "", "format": "number" }\n]'; dmModal.jsonError = ''; dmModal.show = true }
function editDM(dm: any) { dmModal.isNew = false; dmModal.form = { ...dm }; dmModal.metricsJson = JSON.stringify(dm.metrics || [], null, 2); dmModal.jsonError = ''; dmModal.show = true }
async function saveDM() {
  let metrics; try { metrics = JSON.parse(dmModal.metricsJson); dmModal.jsonError = '' } catch (e: any) { dmModal.jsonError = 'JSON 格式错误: ' + e.message; return }
  const payload = { content_type: dmModal.form.content_type, metrics }
  try {
    if (dmModal.isNew) { const { error } = await supabase.value.from('display_metrics_configs').insert([payload]); if (error) throw error; showToast('已创建') }
    else { const { error } = await supabase.value.from('display_metrics_configs').update(payload).eq('id', dmModal.form.id); if (error) throw error; showToast('已更新') }
    dmModal.show = false; await loadDisplayMetrics()
  } catch (e: any) { showToast(e.message) }
}
async function deleteDM(dm: any) {
  if (!confirm(`确定要删除 "${dm.content_type}" 的展示指标吗？`)) return
  try { const { error } = await supabase.value.from('display_metrics_configs').delete().eq('id', dm.id); if (error) throw error; showToast('已删除'); await loadDisplayMetrics() } catch (e: any) { showToast(e.message) }
}

function createFR() { frModal.isNew = true; frModal.form = { id: null, rule_type: 'skip_domain', value: '', enabled: true }; frModal.show = true }
function editFR(fr: any) { frModal.isNew = false; frModal.form = { ...fr }; frModal.show = true }
async function saveFR() {
  const f = frModal.form; const payload = { rule_type: f.rule_type, value: f.value, enabled: f.enabled }
  try {
    if (frModal.isNew) { const { error } = await supabase.value.from('content_fetch_rules').insert([payload]); if (error) throw error; showToast('规则已创建') }
    else { const { error } = await supabase.value.from('content_fetch_rules').update(payload).eq('id', f.id); if (error) throw error; showToast('规则已更新') }
    frModal.show = false; await loadFetchRules()
  } catch (e: any) { showToast(e.message) }
}
async function toggleFREnabled(fr: any) {
  try { const { error } = await supabase.value.from('content_fetch_rules').update({ enabled: !fr.enabled }).eq('id', fr.id); if (error) throw error; fr.enabled = !fr.enabled } catch (e: any) { showToast(e.message) }
}
async function deleteFR(fr: any) {
  if (!confirm(`确定要删除规则 "${fr.value}" 吗？`)) return
  try { const { error } = await supabase.value.from('content_fetch_rules').delete().eq('id', fr.id); if (error) throw error; showToast('已删除'); await loadFetchRules() } catch (e: any) { showToast(e.message) }
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function isNumeric(val: any): boolean {
  return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))
}

async function loadItems() { await Promise.all([loadPipelineParams(), loadDisplayMetrics(), loadFetchRules()]) }
defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="ss-header">
        <div>
          <h2 class="text-xl font-extrabold text-text tracking-tight">系统设置</h2>
          <p class="text-xs text-text-dim mt-1 font-mono">Pipeline 参数 / 展示指标 / 正文规则</p>
        </div>
        <div class="ss-tab-bar">
          <div :class="['ss-tab', subTab === 'params' ? 'active' : '']" @click="subTab = 'params'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            全局参数
            <span class="ss-tab-badge">{{ pipelineParams.length }}</span>
          </div>
          <div :class="['ss-tab', subTab === 'metrics' ? 'active' : '']" @click="subTab = 'metrics'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            展示指标
            <span class="ss-tab-badge">{{ displayMetricsConfigs.length }}</span>
          </div>
          <div :class="['ss-tab', subTab === 'fetchrules' ? 'active' : '']" @click="subTab = 'fetchrules'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            正文规则
            <span class="ss-tab-badge">{{ contentFetchRules.length }}</span>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <!-- Pipeline Params -->
        <div v-if="subTab === 'params'">
          <div class="ss-section-bar">
            <div class="ss-section-info">
              <span class="ss-section-title">全局参数</span>
              <span class="ss-section-count">{{ pipelineParams.length }} 项</span>
            </div>
            <button class="btn-new" @click="createPP">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增参数
            </button>
          </div>
          <div v-if="loading.pipelineParams" class="flex items-center justify-center py-16"><div class="dot-flashing"></div></div>
          <div v-else class="ss-param-grid">
            <div v-for="pp in pipelineParams" :key="pp.key" class="ss-param-card">
              <div class="ss-param-top">
                <div class="ss-param-key">{{ pp.key }}</div>
                <div class="ss-param-actions">
                  <button class="ss-act-btn" @click="editPP(pp)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="ss-act-btn ss-act-danger" @click="deletePP(pp)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div :class="['ss-param-value', isNumeric(pp.value) ? 'ss-param-numeric' : '']">
                {{ formatValue(pp.value) }}
              </div>
              <div v-if="pp.description" class="ss-param-desc">{{ pp.description }}</div>
              <div class="ss-param-time">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ pp.updated_at ? new Date(pp.updated_at).toLocaleString('zh-CN') : '-' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Display Metrics -->
        <div v-if="subTab === 'metrics'">
          <div class="ss-section-bar">
            <div class="ss-section-info">
              <span class="ss-section-title">展示指标配置</span>
              <span class="ss-section-count">{{ displayMetricsConfigs.length }} 项</span>
            </div>
            <button class="btn-new" @click="createDM">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增
            </button>
          </div>
          <div v-if="loading.displayMetrics" class="flex items-center justify-center py-16"><div class="dot-flashing"></div></div>
          <div v-else class="ss-metrics-list">
            <div v-for="dm in displayMetricsConfigs" :key="dm.id" class="ss-metric-card">
              <div class="ss-metric-header">
                <div class="ss-metric-type">{{ dm.content_type }}</div>
                <div class="ss-metric-badge">{{ (dm.metrics || []).length }} 指标</div>
                <div style="flex:1"></div>
                <button class="ss-act-btn" @click="editDM(dm)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="ss-act-btn ss-act-danger" @click="deleteDM(dm)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
              <div class="ss-metric-items">
                <div v-for="m in (dm.metrics || [])" :key="m.key" class="ss-metric-item">
                  <div class="ss-mi-label">{{ m.label }}</div>
                  <div class="ss-mi-meta">
                    <span class="ss-mi-key">{{ m.key }}</span>
                    <span class="ss-mi-format">{{ m.format }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Fetch Rules -->
        <div v-if="subTab === 'fetchrules'">
          <div class="ss-section-bar">
            <div class="ss-section-info">
              <span class="ss-section-title">正文补全规则</span>
              <span class="ss-section-count">{{ contentFetchRules.length }} 项</span>
            </div>
            <button class="btn-new" @click="createFR">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增规则
            </button>
          </div>
          <div v-if="loading.fetchRules" class="flex items-center justify-center py-16"><div class="dot-flashing"></div></div>
          <template v-else>
            <div v-for="(rules, ruleType) in frGrouped" :key="ruleType" class="ss-fr-group">
              <div class="ss-fr-group-header">
                <span :class="['ss-fr-type-badge', ruleType === 'skip_domain' ? 'ss-fr-skip' : 'ss-fr-fetch']">
                  {{ ruleTypeLabels[ruleType as string] || ruleType }}
                </span>
                <span class="ss-fr-group-count">{{ rules.length }}</span>
              </div>
              <div class="ss-fr-grid">
                <div v-for="fr in rules" :key="fr.id" :class="['ss-fr-card', !fr.enabled ? 'disabled' : '']">
                  <div class="ss-fr-top">
                    <div class="ss-fr-value">{{ fr.value }}</div>
                    <ToggleSwitch :model-value="fr.enabled" @update:model-value="toggleFREnabled(fr)" />
                  </div>
                  <div class="ss-fr-actions">
                    <button class="ss-act-btn" @click="editFR(fr)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="ss-act-btn ss-act-danger" @click="deleteFR(fr)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Pipeline Param Modal -->
    <ModalWrapper :show="ppModal.show" width="440px" @close="ppModal.show = false">
      <div class="modal-title">{{ ppModal.isNew ? '新增参数' : '编辑参数' }}</div>
      <div class="modal-form">
        <div class="form-group">
          <label class="form-label">Key</label>
          <input v-model="ppModal.form.key" type="text" :disabled="!ppModal.isNew" class="form-input" style="font-family:var(--mono)" placeholder="参数键名">
        </div>
        <div class="form-group">
          <label class="form-label">Value (JSON)</label>
          <input v-model="ppModal.valueStr" type="text" class="form-input" style="font-family:var(--mono)">
        </div>
        <div class="form-group">
          <label class="form-label">描述</label>
          <input v-model="ppModal.form.description" type="text" class="form-input" placeholder="可选的说明文字">
        </div>
      </div>
      <div class="modal-footer">
        <button @click="ppModal.show = false" class="btn-secondary">取消</button>
        <button @click="savePP" class="btn-primary">{{ ppModal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>

    <!-- Display Metric Modal -->
    <ModalWrapper :show="dmModal.show" width="520px" @close="dmModal.show = false">
      <div class="modal-title">{{ dmModal.isNew ? '新增展示指标' : '编辑展示指标' }}</div>
      <div class="modal-form">
        <div class="form-group">
          <label class="form-label">Content Type</label>
          <input v-model="dmModal.form.content_type" type="text" class="form-input" placeholder="如 article">
        </div>
        <div class="form-group">
          <label class="form-label">Metrics (JSON Array)</label>
          <textarea v-model="dmModal.metricsJson" rows="8" class="form-textarea"></textarea>
          <div v-if="dmModal.jsonError" class="form-error">{{ dmModal.jsonError }}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="dmModal.show = false" class="btn-secondary">取消</button>
        <button @click="saveDM" class="btn-primary">{{ dmModal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>

    <!-- Fetch Rule Modal -->
    <ModalWrapper :show="frModal.show" width="420px" @close="frModal.show = false">
      <div class="modal-title">{{ frModal.isNew ? '新增规则' : '编辑规则' }}</div>
      <div class="modal-form">
        <div class="form-group">
          <label class="form-label">规则类型</label>
          <select v-model="frModal.form.rule_type" class="form-select">
            <option value="skip_domain">skip_domain</option>
            <option value="fetch_fulltext_tag">fetch_fulltext_tag</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">值</label>
          <input v-model="frModal.form.value" type="text" class="form-input" placeholder="如 example.com">
        </div>
        <div class="form-toggle-row">
          <span class="form-toggle-label">启用</span>
          <ToggleSwitch v-model="frModal.form.enabled" />
        </div>
      </div>
      <div class="modal-footer">
        <button @click="frModal.show = false" class="btn-secondary">取消</button>
        <button @click="saveFR" class="btn-primary">{{ frModal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>
  </div>
</template>

<style scoped>
.ss-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 28px; border-bottom: 1px solid var(--border); background: var(--surface);
}
.ss-tab-bar {
  display: flex; gap: 4px; background: var(--surface2); padding: 3px; border-radius: 10px; border: 1px solid var(--border);
}
.ss-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 12px; font-weight: 600;
  color: var(--text-muted); border-radius: 7px; cursor: pointer; transition: all 0.15s;
}
.ss-tab:hover { color: var(--text); background: var(--surface3); }
.ss-tab.active { color: var(--text); background: var(--surface3); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.ss-tab-badge {
  font-size: 10px; font-family: var(--mono); color: var(--text-dim);
  background: var(--surface3); padding: 1px 5px; border-radius: 10px;
}
.ss-tab.active .ss-tab-badge { background: var(--surface2); }

.ss-section-bar {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
}
.ss-section-info { display: flex; align-items: center; gap: 8px; }
.ss-section-title { font-size: 14px; font-weight: 700; color: var(--text); }
.ss-section-count { font-size: 11px; font-family: var(--mono); color: var(--text-dim); background: var(--surface2); border: 1px solid var(--border); padding: 2px 8px; border-radius: 10px; }

/* Pipeline Params */
.ss-param-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;
}
.ss-param-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px 18px; transition: all 0.2s;
  display: flex; flex-direction: column; gap: 8px;
}
.ss-param-card:hover { border-color: var(--border-bright); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }

.ss-param-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ss-param-key {
  font-size: 13px; font-weight: 700; color: var(--accent-bright); font-family: var(--mono);
  background: var(--accent-glow); padding: 2px 8px; border-radius: 6px;
}
.ss-param-actions { display: flex; gap: 4px; }

.ss-param-value {
  font-size: 13px; font-family: var(--mono); color: var(--text);
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 12px; word-break: break-all;
}
.ss-param-numeric { font-size: 22px; font-weight: 800; font-family: system-ui, -apple-system, sans-serif; text-align: center; }
.ss-param-desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
.ss-param-time {
  display: flex; align-items: center; gap: 4px;
  font-size: 10px; color: var(--text-dim); font-family: var(--mono);
}

.ss-act-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 6px;
  cursor: pointer; color: var(--text-muted); transition: all 0.15s;
}
.ss-act-btn:hover { border-color: var(--border-bright); color: var(--text); background: var(--surface3); }
.ss-act-danger:hover { border-color: rgba(232, 88, 88, 0.3); color: var(--red); background: var(--red-glow); }

/* Display Metrics */
.ss-metrics-list { display: flex; flex-direction: column; gap: 12px; }
.ss-metric-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden; transition: all 0.2s;
}
.ss-metric-card:hover { border-color: var(--border-bright); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.ss-metric-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px; border-bottom: 1px solid var(--border);
}
.ss-metric-type { font-size: 14px; font-weight: 700; color: var(--text); font-family: var(--mono); }
.ss-metric-badge {
  font-size: 10px; font-family: var(--mono); color: var(--accent-bright);
  background: var(--accent-glow); border: 1px solid rgba(124, 106, 247, 0.2);
  padding: 2px 8px; border-radius: 10px;
}
.ss-metric-items {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1px;
  background: var(--border);
}
.ss-metric-item {
  background: var(--surface); padding: 12px 18px;
  display: flex; flex-direction: column; gap: 4px;
}
.ss-mi-label { font-size: 13px; font-weight: 600; color: var(--text); }
.ss-mi-meta { display: flex; align-items: center; gap: 8px; }
.ss-mi-key { font-size: 10px; font-family: var(--mono); color: var(--text-dim); }
.ss-mi-format {
  font-size: 9px; font-family: var(--mono); color: var(--text-dim);
  background: var(--surface2); padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border);
}

/* Fetch Rules */
.ss-fr-group { margin-bottom: 20px; }
.ss-fr-group-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.ss-fr-type-badge {
  font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 8px;
}
.ss-fr-skip { background: rgba(245, 166, 35, 0.1); border: 1px solid rgba(245, 166, 35, 0.25); color: var(--orange); }
.ss-fr-fetch { background: var(--green-glow); border: 1px solid rgba(62, 207, 142, 0.25); color: var(--green); }
.ss-fr-group-count {
  font-size: 10px; font-family: var(--mono); color: var(--text-dim);
  background: var(--surface2); border: 1px solid var(--border); padding: 1px 6px; border-radius: 10px;
}

.ss-fr-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px;
}
.ss-fr-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 14px; transition: all 0.2s;
  display: flex; flex-direction: column; gap: 8px;
}
.ss-fr-card:hover { border-color: var(--border-bright); }
.ss-fr-card.disabled { opacity: 0.5; }
.ss-fr-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ss-fr-value { font-size: 13px; font-weight: 600; color: var(--text); font-family: var(--mono); word-break: break-all; }
.ss-fr-actions { display: flex; gap: 4px; }
</style>
