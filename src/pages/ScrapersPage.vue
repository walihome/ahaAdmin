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

const scraperConfigs = ref<any[]>([])
const loading = ref(false)
const scraperTypeOptions = ['github_trending', 'github_search', 'hackernews', 'rss', 'twitter_twscrape', 'twitter_nitter', 'ai_blog', 'community_v2ex', 'community_linuxdo']

const modal = reactive({
  show: false, isNew: true, configJson: '{}', configError: '',
  form: { id: null as any, name: '', scraper_type: '', enabled: true, priority: 10, config: {} as any }
})

const scraperConfigHints: Record<string, string> = {
  github_trending: '{ source_type, content_type, timeout }',
  github_search: '{ source_type, content_type, queries:[{q,label}], per_page, fetch_window_days }',
  hackernews: '{ source_type, content_type, new_n, min_score, cutoff_hours }',
  rss: '{ source_type, content_type, url, max_items, source_tag }',
  twitter_twscrape: '{ source_type, content_type, watch_accounts, tracked_keywords }',
  twitter_nitter: '{ source_type, content_type, twitter_user, source_tag }',
  ai_blog: '{ source_type, content_type, base_url, news_url }',
  community_v2ex: '{ source_type, content_type, top_n }',
  community_linuxdo: '{ source_type, content_type, top_n }'
}

async function loadItems() {
  loading.value = true
  try {
    const { data, error } = await supabase.value.from(tableName('scraper_configs')).select('*').order('priority', { ascending: true })
    if (error) throw error
    scraperConfigs.value = data || []
  } catch (e: any) { showToast(e.message) }
  finally { loading.value = false }
}

function create() {
  modal.isNew = true
  modal.form = { id: null, name: '', scraper_type: '', enabled: true, priority: 10, config: {} }
  modal.configJson = '{\n  "source_type": "",\n  "content_type": ""\n}'
  modal.configError = ''; modal.show = true
}

function edit(sc: any) {
  modal.isNew = false
  modal.form = { ...sc }
  modal.configJson = JSON.stringify(sc.config || {}, null, 2)
  modal.configError = ''; modal.show = true
}

async function save() {
  let config
  try { config = JSON.parse(modal.configJson); modal.configError = '' }
  catch (e: any) { modal.configError = 'JSON 格式错误: ' + e.message; return }
  const payload = { name: modal.form.name, scraper_type: modal.form.scraper_type, enabled: modal.form.enabled, priority: modal.form.priority, config }
  try {
    if (modal.isNew) { const { error } = await supabase.value.from(tableName('scraper_configs')).insert([payload]); if (error) throw error; showToast('数据源已创建') }
    else { const { error } = await supabase.value.from(tableName('scraper_configs')).update(payload).eq('id', modal.form.id); if (error) throw error; showToast('数据源已更新') }
    modal.show = false; await loadItems()
  } catch (e: any) { showToast(e.message) }
}

async function toggleEnabled(sc: any) {
  try {
    const { error } = await supabase.value.from(tableName('scraper_configs')).update({ enabled: !sc.enabled }).eq('id', sc.id)
    if (error) throw error; sc.enabled = !sc.enabled
  } catch (e: any) { showToast(e.message) }
}

async function confirmDelete(sc: any) {
  if (!confirm(`确定要删除数据源 "${sc.name}" 吗？`)) return
  try {
    const { error } = await supabase.value.from(tableName('scraper_configs')).delete().eq('id', sc.id)
    if (error) throw error; showToast('已删除'); await loadItems()
  } catch (e: any) { showToast(e.message) }
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="flex items-center justify-between px-7 py-5 border-b border-border bg-surface">
        <div>
          <h2 class="text-xl font-extrabold text-text tracking-tight">数据源管理</h2>
          <p class="text-xs text-text-dim mt-1 font-mono">Scraper Configs — 每行代表一个抓取引擎+参数组合</p>
        </div>
        <button class="btn-new" @click="create">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增数据源
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loading" class="flex items-center justify-center py-20 text-text-muted">加载中...</div>
        <table v-else class="w-full text-sm" style="border-collapse:separate; border-spacing:0 6px;">
          <thead>
            <tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono">
              <th class="px-4 pb-2">名称</th><th class="px-4 pb-2">引擎类型</th><th class="px-4 pb-2">启用</th><th class="px-4 pb-2">优先级</th><th class="px-4 pb-2">更新时间</th><th class="px-4 pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sc in scraperConfigs" :key="sc.id" class="bg-surface border border-border rounded-xl">
              <td class="px-4 py-3 font-semibold text-text">{{ sc.name }}</td>
              <td class="px-4 py-3"><span class="card-tag tag-done">{{ sc.scraper_type }}</span></td>
              <td class="px-4 py-3"><ToggleSwitch :model-value="sc.enabled" @update:model-value="toggleEnabled(sc)" /></td>
              <td class="px-4 py-3 font-mono text-text-muted">{{ sc.priority }}</td>
              <td class="px-4 py-3 font-mono text-text-dim text-xs">{{ sc.updated_at ? new Date(sc.updated_at).toLocaleString() : '-' }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button class="btn-secondary text-xs py-1 px-3" @click="edit(sc)">编辑</button>
                  <button class="btn-danger text-xs py-1 px-3" @click="confirmDelete(sc)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && scraperConfigs.length === 0" class="flex flex-col items-center justify-center py-20 text-text-dim">
          <div class="text-sm font-bold">暂无数据源配置</div>
          <div class="text-xs mt-1 opacity-50">点击"新增数据源"开始</div>
        </div>
      </div>
    </div>

    <ModalWrapper :show="modal.show" width="640px" @close="modal.show = false">
      <h2 class="text-xl font-extrabold mb-6 text-text tracking-tighter">{{ modal.isNew ? '新增数据源' : '编辑数据源' }}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">名称 *</label>
          <input v-model="modal.form.name" type="text" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none" placeholder="如 GitHub Trending">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">引擎类型 *</label>
            <select v-model="modal.form.scraper_type" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none">
              <option value="">选择引擎类型</option>
              <option v-for="t in scraperTypeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">优先级 *</label>
            <input v-model.number="modal.form.priority" type="number" class="w-full bg-surface2 border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:border-accent outline-none">
          </div>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-[10px] font-bold text-text-dim uppercase tracking-widest">启用</label>
          <ToggleSwitch v-model="modal.form.enabled" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">Config (JSON) *</label>
          <div v-if="modal.form.scraper_type" class="text-[10px] text-text-dim mb-2 font-mono">Schema: {{ scraperConfigHints[modal.form.scraper_type] || '{}' }}</div>
          <textarea v-model="modal.configJson" rows="12" class="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs font-mono text-text focus:border-accent outline-none resize-y"></textarea>
          <div v-if="modal.configError" class="text-red text-xs mt-1">{{ modal.configError }}</div>
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
        <button @click="modal.show = false" class="btn-secondary">取消</button>
        <button @click="save" class="btn-primary">{{ modal.isNew ? '创建' : '保存' }}</button>
      </div>
    </ModalWrapper>
  </div>
</template>
