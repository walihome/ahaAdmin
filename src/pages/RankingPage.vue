<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'

const { supabase } = useSupabase()
const { showToast } = useToast()

const subTab = ref('groups')
const loading = reactive({ rankGroups: false, tagSlots: false })

const rankGroupConfigs = ref<any[]>([])
const tagSlotConfigs = ref<any[]>([])
const scraperConfigs = ref<any[]>([])

const sortedRankGroups = computed(() => [...rankGroupConfigs.value].sort((a, b) => a.sort_order - b.sort_order))
const availableSourceNames = computed(() => scraperConfigs.value.map(s => s.name).filter(n => !(rgModal.form.source_names || []).includes(n)))

const groupStats = computed(() => ({
  total: rankGroupConfigs.value.length,
  enabled: rankGroupConfigs.value.filter(g => g.enabled).length,
  totalLimit: rankGroupConfigs.value.reduce((sum, g) => sum + (g.limit || 0), 0),
}))

const tagStats = computed(() => ({
  total: tagSlotConfigs.value.length,
  enabled: tagSlotConfigs.value.filter(t => t.enabled).length,
  totalSlots: tagSlotConfigs.value.reduce((sum, t) => sum + (t.max_slots || 0), 0),
}))

const rgModal = reactive({
  show: false, isNew: true,
  form: { id: null as any, group_name: '', source_names: [] as string[], limit: 5, must_include: false, sort_order: 10, enabled: true }
})

const tsModal = reactive({
  show: false, isNew: true,
  form: { id: null as any, tag_name: '', max_slots: 1, min_score: 0, enabled: true }
})

async function loadRankGroups() {
  loading.rankGroups = true
  try { const { data, error } = await supabase.value.from('rank_group_configs').select('*').order('sort_order'); if (error) throw error; rankGroupConfigs.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.rankGroups = false }
}

async function loadTagSlots() {
  loading.tagSlots = true
  try { const { data, error } = await supabase.value.from('tag_slot_configs').select('*').order('tag_name'); if (error) throw error; tagSlotConfigs.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.tagSlots = false }
}

async function loadScrapers() {
  try { const { data } = await supabase.value.from('scraper_configs').select('name').order('name'); scraperConfigs.value = data || [] } catch (_) {}
}

function createRG() { rgModal.isNew = true; rgModal.form = { id: null, group_name: '', source_names: [], limit: 5, must_include: false, sort_order: 10, enabled: true }; rgModal.show = true }
function editRG(rg: any) { rgModal.isNew = false; rgModal.form = { ...rg, source_names: [...(rg.source_names || [])] }; rgModal.show = true }

function addSourceName(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (val && !rgModal.form.source_names.includes(val)) rgModal.form.source_names.push(val)
  ;(e.target as HTMLSelectElement).value = ''
}
function removeSourceName(sn: string) { rgModal.form.source_names = rgModal.form.source_names.filter(s => s !== sn) }

async function saveRG() {
  const f = rgModal.form
  const payload = { group_name: f.group_name, source_names: f.source_names, limit: f.limit, must_include: f.must_include, sort_order: f.sort_order, enabled: f.enabled }
  try {
    if (rgModal.isNew) { const { error } = await supabase.value.from('rank_group_configs').insert([payload]); if (error) throw error; showToast('分组已创建') }
    else { const { error } = await supabase.value.from('rank_group_configs').update(payload).eq('id', f.id); if (error) throw error; showToast('分组已更新') }
    rgModal.show = false; await loadRankGroups()
  } catch (e: any) { showToast(e.message) }
}

async function toggleRGEnabled(rg: any) {
  try { const { error } = await supabase.value.from('rank_group_configs').update({ enabled: !rg.enabled }).eq('id', rg.id); if (error) throw error; rg.enabled = !rg.enabled } catch (e: any) { showToast(e.message) }
}

async function confirmDeleteRG(rg: any) {
  if (!confirm(`确定要删除分组 "${rg.group_name}" 吗？`)) return
  try { const { error } = await supabase.value.from('rank_group_configs').delete().eq('id', rg.id); if (error) throw error; showToast('已删除'); await loadRankGroups() } catch (e: any) { showToast(e.message) }
}

function createTS() { tsModal.isNew = true; tsModal.form = { id: null, tag_name: '', max_slots: 1, min_score: 0, enabled: true }; tsModal.show = true }
function editTS(ts: any) { tsModal.isNew = false; tsModal.form = { ...ts }; tsModal.show = true }

async function saveTS() {
  const f = tsModal.form
  const payload = { tag_name: f.tag_name, max_slots: f.max_slots, min_score: f.min_score, enabled: f.enabled }
  try {
    if (tsModal.isNew) { const { error } = await supabase.value.from('tag_slot_configs').insert([payload]); if (error) throw error; showToast('标签已创建') }
    else { const { error } = await supabase.value.from('tag_slot_configs').update(payload).eq('id', f.id); if (error) throw error; showToast('标签已更新') }
    tsModal.show = false; await loadTagSlots()
  } catch (e: any) { showToast(e.message) }
}

async function toggleTSEnabled(ts: any) {
  try { const { error } = await supabase.value.from('tag_slot_configs').update({ enabled: !ts.enabled }).eq('id', ts.id); if (error) throw error; ts.enabled = !ts.enabled } catch (e: any) { showToast(e.message) }
}

async function confirmDeleteTS(ts: any) {
  if (!confirm(`确定要删除标签 "${ts.tag_name}" 吗？`)) return
  try { const { error } = await supabase.value.from('tag_slot_configs').delete().eq('id', ts.id); if (error) throw error; showToast('已删除'); await loadTagSlots() } catch (e: any) { showToast(e.message) }
}

async function loadItems() { await Promise.all([loadRankGroups(), loadTagSlots(), loadScrapers()]) }

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="rk-header">
        <div class="flex items-center gap-5">
          <div>
            <h2 class="text-xl font-extrabold text-text tracking-tight">排序规则</h2>
            <p class="text-xs text-text-dim mt-1 font-mono">精排分组 + 特殊标签名额</p>
          </div>
        </div>
        <div class="rk-tab-bar">
          <div :class="['rk-tab', subTab === 'groups' ? 'active' : '']" @click="subTab = 'groups'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            分组管理
          </div>
          <div :class="['rk-tab', subTab === 'tags' ? 'active' : '']" @click="subTab = 'tags'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            标签名额
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <!-- Rank groups -->
        <div v-if="subTab === 'groups'">
          <div class="rk-stats-bar">
            <div class="rk-stat">
              <span class="rk-stat-val">{{ groupStats.total }}</span>
              <span class="rk-stat-label">分组总数</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat-val rk-green">{{ groupStats.enabled }}</span>
              <span class="rk-stat-label">已启用</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat-val rk-accent">{{ groupStats.totalLimit }}</span>
              <span class="rk-stat-label">总名额上限</span>
            </div>
            <div style="flex:1"></div>
            <button class="btn-new" @click="createRG">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增分组
            </button>
          </div>
          <div v-if="loading.rankGroups" class="flex items-center justify-center py-16"><div class="dot-flashing"></div></div>
          <div v-else class="rk-group-list">
            <div v-for="(rg, idx) in sortedRankGroups" :key="rg.id" :class="['rk-group-card', !rg.enabled ? 'disabled' : '']">
              <div class="rk-group-rank">
                <span class="rk-rank-num">{{ idx + 1 }}</span>
              </div>
              <div class="rk-group-main">
                <div class="rk-group-top">
                  <div class="rk-group-name">{{ rg.group_name }}</div>
                  <div class="flex items-center gap-3">
                    <span v-if="rg.must_include" class="rk-must-badge">必选</span>
                    <ToggleSwitch :model-value="rg.enabled" @update:model-value="toggleRGEnabled(rg)" />
                  </div>
                </div>
                <div class="rk-sources-wrap">
                  <span v-for="sn in (rg.source_names || [])" :key="sn" class="rk-source-tag">{{ sn }}</span>
                  <span v-if="!rg.source_names?.length" class="rk-no-source">未配置来源</span>
                </div>
                <div class="rk-group-footer">
                  <div class="rk-group-metrics">
                    <div class="rk-metric">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      上限 <strong>{{ rg.limit }}</strong>
                    </div>
                    <div class="rk-metric">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                      排序 <strong>{{ rg.sort_order }}</strong>
                    </div>
                    <div class="rk-metric">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                      来源 <strong>{{ (rg.source_names || []).length }}</strong>
                    </div>
                  </div>
                  <div class="rk-group-actions">
                    <button class="rk-act-btn" @click="editRG(rg)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="rk-act-btn rk-act-danger" @click="confirmDeleteRG(rg)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tag slots -->
        <div v-if="subTab === 'tags'">
          <div class="rk-stats-bar">
            <div class="rk-stat">
              <span class="rk-stat-val">{{ tagStats.total }}</span>
              <span class="rk-stat-label">标签总数</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat-val rk-green">{{ tagStats.enabled }}</span>
              <span class="rk-stat-label">已启用</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat-val rk-accent">{{ tagStats.totalSlots }}</span>
              <span class="rk-stat-label">总名额</span>
            </div>
            <div style="flex:1"></div>
            <button class="btn-new" @click="createTS">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增标签
            </button>
          </div>
          <div v-if="loading.tagSlots" class="flex items-center justify-center py-16"><div class="dot-flashing"></div></div>
          <div v-else class="rk-tag-grid">
            <div v-for="ts in tagSlotConfigs" :key="ts.id" :class="['rk-tag-card', !ts.enabled ? 'disabled' : '']">
              <div class="rk-tag-top">
                <div class="rk-tag-name">{{ ts.tag_name }}</div>
                <ToggleSwitch :model-value="ts.enabled" @update:model-value="toggleTSEnabled(ts)" />
              </div>
              <div class="rk-tag-metrics">
                <div class="rk-tag-metric">
                  <span class="rk-tag-metric-val">{{ ts.max_slots }}</span>
                  <span class="rk-tag-metric-label">每日上限</span>
                </div>
                <div class="rk-tag-divider"></div>
                <div class="rk-tag-metric">
                  <span class="rk-tag-metric-val">{{ ts.min_score }}</span>
                  <span class="rk-tag-metric-label">最低分数</span>
                </div>
              </div>
              <div class="rk-tag-actions">
                <button class="rk-act-btn" @click="editTS(ts)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  编辑
                </button>
                <button class="rk-act-btn rk-act-danger" @click="confirmDeleteTS(ts)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rank Group Modal -->
    <ModalWrapper :show="rgModal.show" width="520px" @close="rgModal.show = false">
      <div class="modal-title">{{ rgModal.isNew ? '新增分组' : '编辑分组' }}</div>
      <div class="modal-form">
        <div class="form-group">
          <label class="form-label">分组名称</label>
          <input v-model="rgModal.form.group_name" type="text" class="form-input" placeholder="如 官方动态">
        </div>
        <div class="form-group">
          <label class="form-label">数据来源</label>
          <div v-if="rgModal.form.source_names.length" class="form-chip-list" style="margin-bottom:8px">
            <span v-for="sn in rgModal.form.source_names" :key="sn" class="form-chip">
              {{ sn }}
              <span class="form-chip-remove" @click="removeSourceName(sn)">&times;</span>
            </span>
          </div>
          <select @change="addSourceName($event)" class="form-select">
            <option value="">添加来源...</option>
            <option v-for="sn in availableSourceNames" :key="sn" :value="sn">{{ sn }}</option>
          </select>
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">上限</label>
            <input v-model.number="rgModal.form.limit" type="number" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">排列顺序</label>
            <input v-model.number="rgModal.form.sort_order" type="number" class="form-input">
          </div>
        </div>
        <div class="form-toggle-row" style="gap:20px">
          <div class="form-toggle-row">
            <span class="form-toggle-label">必须展示</span>
            <ToggleSwitch v-model="rgModal.form.must_include" />
          </div>
          <div class="form-toggle-row">
            <span class="form-toggle-label">启用</span>
            <ToggleSwitch v-model="rgModal.form.enabled" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="rgModal.show = false" class="btn-secondary">取消</button>
        <button @click="saveRG" class="btn-primary">{{ rgModal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>

    <!-- Tag Slot Modal -->
    <ModalWrapper :show="tsModal.show" width="420px" @close="tsModal.show = false">
      <div class="modal-title">{{ tsModal.isNew ? '新增标签' : '编辑标签' }}</div>
      <div class="modal-form">
        <div class="form-group">
          <label class="form-label">标签名</label>
          <input v-model="tsModal.form.tag_name" type="text" class="form-input" placeholder="如 AI">
        </div>
        <div class="form-row form-row-2">
          <div class="form-group">
            <label class="form-label">每日上限</label>
            <input v-model.number="tsModal.form.max_slots" type="number" class="form-input">
          </div>
          <div class="form-group">
            <label class="form-label">最低分数</label>
            <input v-model.number="tsModal.form.min_score" type="number" step="0.1" class="form-input">
          </div>
        </div>
        <div class="form-toggle-row">
          <span class="form-toggle-label">启用</span>
          <ToggleSwitch v-model="tsModal.form.enabled" />
        </div>
      </div>
      <div class="modal-footer">
        <button @click="tsModal.show = false" class="btn-secondary">取消</button>
        <button @click="saveTS" class="btn-primary">{{ tsModal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>
  </div>
</template>

<style scoped>
.rk-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 28px; border-bottom: 1px solid var(--border); background: var(--surface);
}
.rk-tab-bar {
  display: flex; gap: 4px; background: var(--surface2); padding: 3px; border-radius: 10px; border: 1px solid var(--border);
}
.rk-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px; font-size: 12px; font-weight: 600;
  color: var(--text-muted); border-radius: 7px; cursor: pointer; transition: all 0.15s;
}
.rk-tab:hover { color: var(--text); background: var(--surface3); }
.rk-tab.active { color: var(--text); background: var(--surface3); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }

.rk-stats-bar {
  display: flex; align-items: center; gap: 16px; margin-bottom: 20px;
  padding: 14px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
}
.rk-stat { display: flex; flex-direction: column; gap: 2px; }
.rk-stat-val { font-size: 18px; font-weight: 800; color: var(--text); font-family: system-ui, -apple-system, sans-serif; line-height: 1; }
.rk-stat-label { font-size: 10px; color: var(--text-dim); font-family: var(--mono); }
.rk-green { color: var(--green); }
.rk-accent { color: var(--accent); }

.rk-group-list { display: flex; flex-direction: column; gap: 8px; }
.rk-group-card {
  display: flex; gap: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden; transition: all 0.2s;
}
.rk-group-card:hover { border-color: var(--border-bright); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.rk-group-card.disabled { opacity: 0.5; }

.rk-group-rank {
  width: 48px; min-width: 48px; display: flex; align-items: center; justify-content: center;
  background: var(--surface2); border-right: 1px solid var(--border);
}
.rk-rank-num {
  font-size: 16px; font-weight: 800; color: var(--text-dim);
  font-family: system-ui, -apple-system, sans-serif;
}

.rk-group-main { flex: 1; padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
.rk-group-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rk-group-name { font-size: 14px; font-weight: 700; color: var(--text); }

.rk-must-badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
  background: rgba(245, 166, 35, 0.1); border: 1px solid rgba(245, 166, 35, 0.25); color: var(--orange);
}

.rk-sources-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
.rk-source-tag {
  font-size: 10px; font-family: var(--mono); font-weight: 500;
  padding: 3px 8px; border-radius: 6px;
  background: var(--surface2); border: 1px solid var(--border); color: var(--text-muted);
  transition: all 0.15s;
}
.rk-no-source { font-size: 11px; color: var(--text-dim); font-style: italic; }

.rk-group-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 10px; border-top: 1px solid var(--border);
}
.rk-group-metrics { display: flex; gap: 16px; }
.rk-metric {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--text-dim); font-family: var(--mono);
}
.rk-metric strong { color: var(--text-muted); font-weight: 700; }

.rk-group-actions { display: flex; gap: 4px; }
.rk-act-btn {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  cursor: pointer; color: var(--text-muted); transition: all 0.15s;
  font-size: 11px; font-weight: 600; font-family: var(--sans); gap: 4px;
}
.rk-act-btn:hover { border-color: var(--border-bright); color: var(--text); background: var(--surface3); }
.rk-act-danger:hover { border-color: rgba(232, 88, 88, 0.3); color: var(--red); background: var(--red-glow); }

.rk-tag-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px;
}
.rk-tag-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px 18px; transition: all 0.2s;
  display: flex; flex-direction: column; gap: 12px;
}
.rk-tag-card:hover { border-color: var(--border-bright); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.rk-tag-card.disabled { opacity: 0.5; }

.rk-tag-top { display: flex; align-items: center; justify-content: space-between; }
.rk-tag-name { font-size: 14px; font-weight: 700; color: var(--text); }

.rk-tag-metrics {
  display: flex; align-items: center; gap: 0;
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
}
.rk-tag-metric {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px;
}
.rk-tag-metric-val {
  font-size: 20px; font-weight: 800; color: var(--text);
  font-family: system-ui, -apple-system, sans-serif; line-height: 1;
}
.rk-tag-metric-label { font-size: 10px; color: var(--text-dim); font-family: var(--mono); }
.rk-tag-divider { width: 1px; height: 32px; background: var(--border); }

.rk-tag-actions {
  display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid var(--border);
}
.rk-tag-actions .rk-act-btn {
  width: auto; height: auto; padding: 5px 10px; gap: 4px;
}
</style>
