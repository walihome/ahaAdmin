<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'

const { supabase } = useSupabase()
const { tableName } = useSettings()
const { showToast } = useToast()

const subTab = ref('groups')
const loading = reactive({ rankGroups: false, tagSlots: false })

const rankGroupConfigs = ref<any[]>([])
const tagSlotConfigs = ref<any[]>([])
const scraperConfigs = ref<any[]>([])

const sortedRankGroups = computed(() => [...rankGroupConfigs.value].sort((a, b) => a.sort_order - b.sort_order))
const availableSourceNames = computed(() => scraperConfigs.value.map(s => s.name).filter(n => !(rgModal.form.source_names || []).includes(n)))

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
  try { const { data, error } = await supabase.value.from(tableName('rank_group_configs')).select('*').order('sort_order'); if (error) throw error; rankGroupConfigs.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.rankGroups = false }
}

async function loadTagSlots() {
  loading.tagSlots = true
  try { const { data, error } = await supabase.value.from(tableName('tag_slot_configs')).select('*').order('tag_name'); if (error) throw error; tagSlotConfigs.value = data || [] }
  catch (e: any) { showToast(e.message) } finally { loading.tagSlots = false }
}

async function loadScrapers() {
  try { const { data } = await supabase.value.from(tableName('scraper_configs')).select('name').order('name'); scraperConfigs.value = data || [] } catch (_) {}
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
    if (rgModal.isNew) { const { error } = await supabase.value.from(tableName('rank_group_configs')).insert([payload]); if (error) throw error; showToast('分组已创建') }
    else { const { error } = await supabase.value.from(tableName('rank_group_configs')).update(payload).eq('id', f.id); if (error) throw error; showToast('分组已更新') }
    rgModal.show = false; await loadRankGroups()
  } catch (e: any) { showToast(e.message) }
}

async function toggleRGEnabled(rg: any) {
  try { const { error } = await supabase.value.from(tableName('rank_group_configs')).update({ enabled: !rg.enabled }).eq('id', rg.id); if (error) throw error; rg.enabled = !rg.enabled } catch (e: any) { showToast(e.message) }
}

async function confirmDeleteRG(rg: any) {
  if (!confirm(`确定要删除分组 "${rg.group_name}" 吗？`)) return
  try { const { error } = await supabase.value.from(tableName('rank_group_configs')).delete().eq('id', rg.id); if (error) throw error; showToast('已删除'); await loadRankGroups() } catch (e: any) { showToast(e.message) }
}

function createTS() { tsModal.isNew = true; tsModal.form = { id: null, tag_name: '', max_slots: 1, min_score: 0, enabled: true }; tsModal.show = true }
function editTS(ts: any) { tsModal.isNew = false; tsModal.form = { ...ts }; tsModal.show = true }

async function saveTS() {
  const f = tsModal.form
  const payload = { tag_name: f.tag_name, max_slots: f.max_slots, min_score: f.min_score, enabled: f.enabled }
  try {
    if (tsModal.isNew) { const { error } = await supabase.value.from(tableName('tag_slot_configs')).insert([payload]); if (error) throw error; showToast('标签已创建') }
    else { const { error } = await supabase.value.from(tableName('tag_slot_configs')).update(payload).eq('id', f.id); if (error) throw error; showToast('标签已更新') }
    tsModal.show = false; await loadTagSlots()
  } catch (e: any) { showToast(e.message) }
}

async function toggleTSEnabled(ts: any) {
  try { const { error } = await supabase.value.from(tableName('tag_slot_configs')).update({ enabled: !ts.enabled }).eq('id', ts.id); if (error) throw error; ts.enabled = !ts.enabled } catch (e: any) { showToast(e.message) }
}

async function confirmDeleteTS(ts: any) {
  if (!confirm(`确定要删除标签 "${ts.tag_name}" 吗？`)) return
  try { const { error } = await supabase.value.from(tableName('tag_slot_configs')).delete().eq('id', ts.id); if (error) throw error; showToast('已删除'); await loadTagSlots() } catch (e: any) { showToast(e.message) }
}

async function loadItems() { await Promise.all([loadRankGroups(), loadTagSlots(), loadScrapers()]) }

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="flex items-center justify-between px-7 py-5 border-b border-border bg-surface">
        <div>
          <h2 class="text-xl font-extrabold text-text tracking-tight">排序规则</h2>
          <p class="text-xs text-text-dim mt-1 font-mono">精排分组 + 特殊标签名额管理</p>
        </div>
        <div class="flex gap-2">
          <div :class="['tab', subTab === 'groups' ? 'active' : '']" @click="subTab = 'groups'" style="cursor:pointer">分组管理</div>
          <div :class="['tab', subTab === 'tags' ? 'active' : '']" @click="subTab = 'tags'" style="cursor:pointer">标签名额</div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Rank groups -->
        <div v-if="subTab === 'groups'">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-bold text-text">精排分组 (rank_group_configs)</div>
            <button class="btn-new" @click="createRG"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增分组</button>
          </div>
          <div v-if="loading.rankGroups" class="text-center py-10 text-text-muted">加载中...</div>
          <table v-else class="w-full text-sm" style="border-collapse:separate; border-spacing:0 6px;">
            <thead><tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono"><th class="px-4 pb-2">排序</th><th class="px-4 pb-2">分组名称</th><th class="px-4 pb-2">Source Names</th><th class="px-4 pb-2">上限</th><th class="px-4 pb-2">必须展示</th><th class="px-4 pb-2">启用</th><th class="px-4 pb-2">操作</th></tr></thead>
            <tbody>
              <tr v-for="rg in sortedRankGroups" :key="rg.id" class="bg-surface border border-border rounded-xl">
                <td class="px-4 py-3 font-mono text-text-muted">{{ rg.sort_order }}</td>
                <td class="px-4 py-3 font-semibold text-text">{{ rg.group_name }}</td>
                <td class="px-4 py-3"><div class="flex flex-wrap gap-1"><span v-for="sn in (rg.source_names || [])" :key="sn" class="card-tag text-[10px]">{{ sn }}</span></div></td>
                <td class="px-4 py-3 font-mono">{{ rg.limit }}</td>
                <td class="px-4 py-3"><span :class="['card-tag', rg.must_include ? 'tag-done' : 'tag-pending']">{{ rg.must_include ? '是' : '否' }}</span></td>
                <td class="px-4 py-3"><ToggleSwitch :model-value="rg.enabled" @update:model-value="toggleRGEnabled(rg)" /></td>
                <td class="px-4 py-3"><div class="flex gap-2"><button class="btn-secondary text-xs py-1 px-3" @click="editRG(rg)">编辑</button><button class="btn-danger text-xs py-1 px-3" @click="confirmDeleteRG(rg)">删除</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Tag slots -->
        <div v-if="subTab === 'tags'">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-bold text-text">特殊标签名额 (tag_slot_configs)</div>
            <button class="btn-new" @click="createTS"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新增标签</button>
          </div>
          <div v-if="loading.tagSlots" class="text-center py-10 text-text-muted">加载中...</div>
          <table v-else class="w-full text-sm" style="border-collapse:separate; border-spacing:0 6px;">
            <thead><tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono"><th class="px-4 pb-2">标签名</th><th class="px-4 pb-2">每日上限</th><th class="px-4 pb-2">最低分数</th><th class="px-4 pb-2">启用</th><th class="px-4 pb-2">操作</th></tr></thead>
            <tbody>
              <tr v-for="ts in tagSlotConfigs" :key="ts.id" class="bg-surface border border-border rounded-xl">
                <td class="px-4 py-3 font-semibold text-text">{{ ts.tag_name }}</td>
                <td class="px-4 py-3 font-mono">{{ ts.max_slots }}</td>
                <td class="px-4 py-3 font-mono">{{ ts.min_score }}</td>
                <td class="px-4 py-3"><ToggleSwitch :model-value="ts.enabled" @update:model-value="toggleTSEnabled(ts)" /></td>
                <td class="px-4 py-3"><div class="flex gap-2"><button class="btn-secondary text-xs py-1 px-3" @click="editTS(ts)">编辑</button><button class="btn-danger text-xs py-1 px-3" @click="confirmDeleteTS(ts)">删除</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Rank Group Modal -->
    <ModalWrapper :show="rgModal.show" width="540px" @close="rgModal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ rgModal.isNew ? '新增分组' : '编辑分组' }}</h2>
      <div class="space-y-4">
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">分组名称 *</label><input v-model="rgModal.form.group_name" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div>
          <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Source Names</label>
          <div class="flex flex-wrap gap-2 mb-2"><span v-for="sn in rgModal.form.source_names" :key="sn" class="card-tag tag-done flex items-center gap-1">{{ sn }} <span @click="removeSourceName(sn)" class="cursor-pointer text-red ml-1">&times;</span></span></div>
          <select @change="addSourceName($event)" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"><option value="">添加来源...</option><option v-for="sn in availableSourceNames" :key="sn" :value="sn">{{ sn }}</option></select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">上限 *</label><input v-model.number="rgModal.form.limit" type="number" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
          <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">排列顺序 *</label><input v-model.number="rgModal.form.sort_order" type="number" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        </div>
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2"><label class="text-[10px] font-bold text-text-dim uppercase tracking-widest">必须展示</label><ToggleSwitch v-model="rgModal.form.must_include" /></div>
          <div class="flex items-center gap-2"><label class="text-[10px] font-bold text-text-dim uppercase tracking-widest">启用</label><ToggleSwitch v-model="rgModal.form.enabled" /></div>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3"><button @click="rgModal.show = false" class="btn-secondary">取消</button><button @click="saveRG" class="btn-primary">{{ rgModal.isNew ? '创建' : '保存' }}</button></div>
    </ModalWrapper>

    <!-- Tag Slot Modal -->
    <ModalWrapper :show="tsModal.show" width="440px" @close="tsModal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ tsModal.isNew ? '新增标签' : '编辑标签' }}</h2>
      <div class="space-y-4">
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">标签名 *</label><input v-model="tsModal.form.tag_name" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">每日上限 *</label><input v-model.number="tsModal.form.max_slots" type="number" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div><label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">最低分数 *</label><input v-model.number="tsModal.form.min_score" type="number" step="0.1" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none"></div>
        <div class="flex items-center gap-3"><label class="text-[10px] font-bold text-text-dim uppercase tracking-widest">启用</label><ToggleSwitch v-model="tsModal.form.enabled" /></div>
      </div>
      <div class="mt-6 flex justify-end gap-3"><button @click="tsModal.show = false" class="btn-secondary">取消</button><button @click="saveTS" class="btn-primary">{{ tsModal.isNew ? '创建' : '保存' }}</button></div>
    </ModalWrapper>
  </div>
</template>
