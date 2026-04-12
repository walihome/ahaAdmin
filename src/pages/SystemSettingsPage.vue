<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'

const { supabase } = useSupabase()
const { tableName } = useSettings()
const { showToast } = useToast()

const subTab = ref('params')
const loading = reactive({ pipelineParams: false, displayMetrics: false, fetchRules: false })

const pipelineParams = ref<any[]>([])
const displayMetricsConfigs = ref<any[]>([])
const contentFetchRules = ref<any[]>([])

const ppModal = reactive({ show: false, isNew: true, valueStr: '', form: { key: '', value: null as any, description: '' } })
const dmModal = reactive({ show: false, isNew: true, metricsJson: '[]', jsonError: '', form: { id: null as any, content_type: '', metrics: [] as any[] } })
const frModal = reactive({ show: false, isNew: true, form: { id: null as any, rule_type: 'skip_domain', value: '', enabled: true } })

async function loadPipelineParams() {
  loading.pipelineParams = true
  try { const { data, error } = await supabase.value.from(tableName('pipeline_params')).select('*').order('key'); if (error) throw error; pipelineParams.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.pipelineParams = false }
}

async function loadDisplayMetrics() {
  loading.displayMetrics = true
  try { const { data, error } = await supabase.value.from(tableName('display_metrics_configs')).select('*').order('content_type'); if (error) throw error; displayMetricsConfigs.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.displayMetrics = false }
}

async function loadFetchRules() {
  loading.fetchRules = true
  try { const { data, error } = await supabase.value.from(tableName('content_fetch_rules')).select('*').order('rule_type').order('value'); if (error) throw error; contentFetchRules.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.fetchRules = false }
}

function createPP() { ppModal.isNew = true; ppModal.form = { key: '', value: null, description: '' }; ppModal.valueStr = ''; ppModal.show = true }
function editPP(pp: any) { ppModal.isNew = false; ppModal.form = { ...pp }; ppModal.valueStr = JSON.stringify(pp.value); ppModal.show = true }
async function savePP() {
  let value; try { value = JSON.parse(ppModal.valueStr) } catch { value = ppModal.valueStr }
  const payload = { key: ppModal.form.key, value, description: ppModal.form.description }
  try {
    if (ppModal.isNew) { const { error } = await supabase.value.from(tableName('pipeline_params')).insert([payload]); if (error) throw error; showToast('参数已创建') }
    else { const { error } = await supabase.value.from(tableName('pipeline_params')).update({ value, description: payload.description }).eq('key', payload.key); if (error) throw error; showToast('参数已更新') }
    ppModal.show = false; await loadPipelineParams()
  } catch (e: any) { showToast(e.message) }
}
async function deletePP(pp: any) {
  if (!confirm(`确定要删除参数 "${pp.key}" 吗？`)) return
  try { const { error } = await supabase.value.from(tableName('pipeline_params')).delete().eq('key', pp.key); if (error) throw error; showToast('已删除'); await loadPipelineParams() } catch (e: any) { showToast(e.message) }
}

function createDM() { dmModal.isNew = true; dmModal.form = { id: null, content_type: '', metrics: [] }; dmModal.metricsJson = '[\n  { "label": "", "key": "", "format": "number" }\n]'; dmModal.jsonError = ''; dmModal.show = true }
function editDM(dm: any) { dmModal.isNew = false; dmModal.form = { ...dm }; dmModal.metricsJson = JSON.stringify(dm.metrics || [], null, 2); dmModal.jsonError = ''; dmModal.show = true }
async function saveDM() {
  let metrics; try { metrics = JSON.parse(dmModal.metricsJson); dmModal.jsonError = '' } catch (e: any) { dmModal.jsonError = 'JSON 格式错误: ' + e.message; return }
  const payload = { content_type: dmModal.form.content_type, metrics }
  try {
    if (dmModal.isNew) { const { error } = await supabase.value.from(tableName('display_metrics_configs')).insert([payload]); if (error) throw error; showToast('已创建') }
    else { const { error } = await supabase.value.from(tableName('display_metrics_configs')).update(payload).eq('id', dmModal.form.id); if (error) throw error; showToast('已更新') }
    dmModal.show = false; await loadDisplayMetrics()
  } catch (e: any) { showToast(e.message) }
}
async function deleteDM(dm: any) {
  if (!confirm(`确定要删除 "${dm.content_type}" 的展示指标吗？`)) return
  try { const { error } = await supabase.value.from(tableName('display_metrics_configs')).delete().eq('id', dm.id); if (error) throw error; showToast('已删除'); await loadDisplayMetrics() } catch (e: any) { showToast(e.message) }
}

function createFR() { frModal.isNew = true; frModal.form = { id: null, rule_type: 'skip_domain', value: '', enabled: true }; frModal.show = true }
function editFR(fr: any) { frModal.isNew = false; frModal.form = { ...fr }; frModal.show = true }
async function saveFR() {
  const f = frModal.form; const payload = { rule_type: f.rule_type, value: f.value, enabled: f.enabled }
  try {
    if (frModal.isNew) { const { error } = await supabase.value.from(tableName('content_fetch_rules')).insert([payload]); if (error) throw error; showToast('规则已创建') }
    else { const { error } = await supabase.value.from(tableName('content_fetch_rules')).update(payload).eq('id', f.id); if (error) throw error; showToast('规则已更新') }
    frModal.show = false; await loadFetchRules()
  } catch (e: any) { showToast(e.message) }
}
async function toggleFREnabled(fr: any) {
  try { const { error } = await supabase.value.from(tableName('content_fetch_rules')).update({ enabled: !fr.enabled }).eq('id', fr.id); if (error) throw error; fr.enabled = !fr.enabled } catch (e: any) { showToast(e.message) }
}
async function deleteFR(fr: any) {
  if (!confirm(`确定要删除规则 "${fr.value}" 吗？`)) return
  try { const { error } = await supabase.value.from(tableName('content_fetch_rules')).delete().eq('id', fr.id); if (error) throw error; showToast('已删除'); await loadFetchRules() } catch (e: any) { showToast(e.message) }
}

async function loadItems() { await Promise.all([loadPipelineParams(), loadDisplayMetrics(), loadFetchRules()]) }
defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="flex items-center justify-between px-7 py-5 border-b border-border bg-surface">
        <div>
          <h2 class="text-xl font-extrabold text-text tracking-tight">系统设置</h2>
          <p class="text-xs text-text-dim mt-1 font-mono">全局参数 / 展示指标 / 正文规则</p>
        </div>
        <div class="flex gap-2">
          <div :class="['tab', subTab === 'params' ? 'active' : '']" @click="subTab = 'params'" style="cursor:pointer">全局参数</div>
          <div :class="['tab', subTab === 'metrics' ? 'active' : '']" @click="subTab = 'metrics'" style="cursor:pointer">展示指标</div>
          <div :class="['tab', subTab === 'fetchrules' ? 'active' : '']" @click="subTab = 'fetchrules'" style="cursor:pointer">正文规则</div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Pipeline Params -->
        <div v-if="subTab === 'params'">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-bold text-text">全局参数 (pipeline_params)</div>
            <button class="btn-new" @click="createPP"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增参数</button>
          </div>
          <div v-if="loading.pipelineParams" class="text-center py-10 text-text-muted">加载中...</div>
          <table v-else class="w-full text-sm" style="border-collapse:separate; border-spacing:0 6px;">
            <thead><tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono"><th class="px-4 pb-2">Key</th><th class="px-4 pb-2">Value</th><th class="px-4 pb-2">Description</th><th class="px-4 pb-2">更新时间</th><th class="px-4 pb-2">操作</th></tr></thead>
            <tbody>
              <tr v-for="pp in pipelineParams" :key="pp.key" class="bg-surface border border-border rounded-xl">
                <td class="px-4 py-3 font-mono font-semibold text-accent">{{ pp.key }}</td>
                <td class="px-4 py-3 font-mono text-text">{{ JSON.stringify(pp.value) }}</td>
                <td class="px-4 py-3 text-text-muted text-xs">{{ pp.description || '-' }}</td>
                <td class="px-4 py-3 font-mono text-text-dim text-xs">{{ pp.updated_at ? new Date(pp.updated_at).toLocaleString() : '-' }}</td>
                <td class="px-4 py-3"><div class="flex gap-2"><button class="btn-secondary text-xs py-1 px-3" @click="editPP(pp)">编辑</button><button class="btn-danger text-xs py-1 px-3" @click="deletePP(pp)">删除</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Display Metrics -->
        <div v-if="subTab === 'metrics'">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-bold text-text">展示指标配置 (display_metrics_configs)</div>
            <button class="btn-new" @click="createDM"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增</button>
          </div>
          <div v-if="loading.displayMetrics" class="text-center py-10 text-text-muted">加载中...</div>
          <table v-else class="w-full text-sm" style="border-collapse:separate; border-spacing:0 6px;">
            <thead><tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono"><th class="px-4 pb-2">Content Type</th><th class="px-4 pb-2">Metrics</th><th class="px-4 pb-2">操作</th></tr></thead>
            <tbody>
              <tr v-for="dm in displayMetricsConfigs" :key="dm.id" class="bg-surface border border-border rounded-xl">
                <td class="px-4 py-3 font-mono font-semibold text-accent">{{ dm.content_type }}</td>
                <td class="px-4 py-3"><div class="flex flex-wrap gap-1"><span v-for="m in (dm.metrics || [])" :key="m.key" class="card-tag text-[10px]">{{ m.label }} ({{ m.format }})</span></div></td>
                <td class="px-4 py-3"><div class="flex gap-2"><button class="btn-secondary text-xs py-1 px-3" @click="editDM(dm)">编辑</button><button class="btn-danger text-xs py-1 px-3" @click="deleteDM(dm)">删除</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Content Fetch Rules -->
        <div v-if="subTab === 'fetchrules'">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-bold text-text">正文补全规则 (content_fetch_rules)</div>
            <button class="btn-new" @click="createFR"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增规则</button>
          </div>
          <div v-if="loading.fetchRules" class="text-center py-10 text-text-muted">加载中...</div>
          <table v-else class="w-full text-sm" style="border-collapse:separate; border-spacing:0 6px;">
            <thead><tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono"><th class="px-4 pb-2">规则类型</th><th class="px-4 pb-2">值</th><th class="px-4 pb-2">启用</th><th class="px-4 pb-2">操作</th></tr></thead>
            <tbody>
              <tr v-for="fr in contentFetchRules" :key="fr.id" class="bg-surface border border-border rounded-xl">
                <td class="px-4 py-3"><span class="card-tag" :class="fr.rule_type === 'skip_domain' ? 'tag-pending' : 'tag-done'">{{ fr.rule_type }}</span></td>
                <td class="px-4 py-3 font-mono text-text">{{ fr.value }}</td>
                <td class="px-4 py-3"><ToggleSwitch :model-value="fr.enabled" @update:model-value="toggleFREnabled(fr)" /></td>
                <td class="px-4 py-3"><div class="flex gap-2"><button class="btn-secondary text-xs py-1 px-3" @click="editFR(fr)">编辑</button><button class="btn-danger text-xs py-1 px-3" @click="deleteFR(fr)">删除</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pipeline Param Modal -->
    <ModalWrapper :show="ppModal.show" width="440px" @close="ppModal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ ppModal.isNew ? '新增参数' : '编辑参数' }}</h2>
      <div class="space-y-4">
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Key *</label><input v-model="ppModal.form.key" type="text" :disabled="!ppModal.isNew" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none disabled:opacity-50"></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Value (JSON) *</label><input v-model="ppModal.valueStr" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-text focus:border-accent outline-none"></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Description</label><input v-model="ppModal.form.description" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
      </div>
      <div class="mt-6 flex justify-end gap-3"><button @click="ppModal.show = false" class="btn-secondary">取消</button><button @click="savePP" class="btn-primary">{{ ppModal.isNew ? '创建' : '保存' }}</button></div>
    </ModalWrapper>

    <!-- Display Metric Modal -->
    <ModalWrapper :show="dmModal.show" width="540px" @close="dmModal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ dmModal.isNew ? '新增展示指标' : '编辑展示指标' }}</h2>
      <div class="space-y-4">
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Content Type *</label><input v-model="dmModal.form.content_type" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Metrics (JSON Array) *</label><textarea v-model="dmModal.metricsJson" rows="8" class="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs font-mono text-text focus:border-accent outline-none resize-y"></textarea><div v-if="dmModal.jsonError" class="text-red text-xs mt-1">{{ dmModal.jsonError }}</div></div>
      </div>
      <div class="mt-6 flex justify-end gap-3"><button @click="dmModal.show = false" class="btn-secondary">取消</button><button @click="saveDM" class="btn-primary">{{ dmModal.isNew ? '创建' : '保存' }}</button></div>
    </ModalWrapper>

    <!-- Fetch Rule Modal -->
    <ModalWrapper :show="frModal.show" width="440px" @close="frModal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ frModal.isNew ? '新增规则' : '编辑规则' }}</h2>
      <div class="space-y-4">
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">规则类型 *</label><select v-model="frModal.form.rule_type" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"><option value="skip_domain">skip_domain</option><option value="fetch_fulltext_tag">fetch_fulltext_tag</option></select></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">值 *</label><input v-model="frModal.form.value" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div class="flex items-center gap-3"><label class="text-[10px] font-bold text-text-dim uppercase tracking-widest">启用</label><ToggleSwitch v-model="frModal.form.enabled" /></div>
      </div>
      <div class="mt-6 flex justify-end gap-3"><button @click="frModal.show = false" class="btn-secondary">取消</button><button @click="saveFR" class="btn-primary">{{ frModal.isNew ? '创建' : '保存' }}</button></div>
    </ModalWrapper>
  </div>
</template>
