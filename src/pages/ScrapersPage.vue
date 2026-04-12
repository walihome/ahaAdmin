<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import ModalWrapper from '@/components/ModalWrapper.vue'

const { supabase } = useSupabase()
const { showToast } = useToast()

const scraperConfigs = ref<any[]>([])
const loading = ref(false)
const search = ref('')
const typeFilter = ref('all')
const scraperTypeOptions = ['github_trending', 'github_search', 'hackernews', 'rss', 'twitter_twscrape', 'twitter_nitter', 'ai_blog', 'community_v2ex', 'community_linuxdo']

const typeColorMap: Record<string, string> = {
  github_trending: 'type-github',
  github_search: 'type-github',
  hackernews: 'type-hn',
  rss: 'type-rss',
  twitter_twscrape: 'type-twitter',
  twitter_nitter: 'type-twitter',
  ai_blog: 'type-ai',
  community_v2ex: 'type-community',
  community_linuxdo: 'type-community',
}

const typeLabels: Record<string, string> = {
  github_trending: 'GitHub Trending',
  github_search: 'GitHub Search',
  hackernews: 'HackerNews',
  rss: 'RSS',
  twitter_twscrape: 'Twitter',
  twitter_nitter: 'Twitter (Nitter)',
  ai_blog: 'AI Blog',
  community_v2ex: 'V2EX',
  community_linuxdo: 'LinuxDo',
}

const uniqueTypes = computed(() => {
  const types = new Set(scraperConfigs.value.map(s => s.scraper_type))
  return Array.from(types).sort()
})

const filtered = computed(() => {
  let list = scraperConfigs.value
  if (typeFilter.value !== 'all') list = list.filter(s => s.scraper_type === typeFilter.value)
  if (search.value) list = list.filter(s => s.name.toLowerCase().includes(search.value.toLowerCase()) || s.scraper_type.toLowerCase().includes(search.value.toLowerCase()))
  return list
})

const grouped = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const s of filtered.value) {
    const type = s.scraper_type
    if (!groups[type]) groups[type] = []
    groups[type].push(s)
  }
  return groups
})

const stats = computed(() => ({
  total: scraperConfigs.value.length,
  enabled: scraperConfigs.value.filter(s => s.enabled).length,
  types: new Set(scraperConfigs.value.map(s => s.scraper_type)).size,
}))

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
    const { data, error } = await supabase.value.from('scraper_configs').select('*').order('priority', { ascending: true })
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
    if (modal.isNew) { const { error } = await supabase.value.from('scraper_configs').insert([payload]); if (error) throw error; showToast('数据源已创建') }
    else { const { error } = await supabase.value.from('scraper_configs').update(payload).eq('id', modal.form.id); if (error) throw error; showToast('数据源已更新') }
    modal.show = false; await loadItems()
  } catch (e: any) { showToast(e.message) }
}

async function toggleEnabled(sc: any) {
  try {
    const { error } = await supabase.value.from('scraper_configs').update({ enabled: !sc.enabled }).eq('id', sc.id)
    if (error) throw error; sc.enabled = !sc.enabled
  } catch (e: any) { showToast(e.message) }
}

async function confirmDelete(sc: any) {
  if (!confirm(`确定要删除数据源 "${sc.name}" 吗？`)) return
  try {
    const { error } = await supabase.value.from('scraper_configs').delete().eq('id', sc.id)
    if (error) throw error; showToast('已删除'); await loadItems()
  } catch (e: any) { showToast(e.message) }
}

function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="flex items-center justify-between px-7 py-5 border-b border-border bg-surface">
        <div class="flex items-center gap-5">
          <div>
            <h2 class="text-xl font-extrabold text-text tracking-tight">数据源管理</h2>
            <p class="text-xs text-text-dim mt-1 font-mono">Scraper Configs</p>
          </div>
          <div class="flex gap-3 ml-4">
            <div class="sc-stat-pill">
              <span class="sc-stat-num">{{ stats.total }}</span>
              <span class="sc-stat-label">总数</span>
            </div>
            <div class="sc-stat-pill">
              <span class="sc-stat-num text-green">{{ stats.enabled }}</span>
              <span class="sc-stat-label">启用</span>
            </div>
            <div class="sc-stat-pill">
              <span class="sc-stat-num text-accent">{{ stats.types }}</span>
              <span class="sc-stat-label">类型</span>
            </div>
          </div>
        </div>
        <button class="btn-new" @click="create">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增数据源
        </button>
      </div>

      <div class="sc-toolbar">
        <div class="sc-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" type="text" placeholder="搜索数据源..." class="sc-search-input">
        </div>
        <div class="sc-type-filters">
          <div :class="['sc-type-chip', typeFilter === 'all' ? 'active' : '']" @click="typeFilter = 'all'">
            全部 <span class="sc-chip-count">{{ scraperConfigs.length }}</span>
          </div>
          <div v-for="t in uniqueTypes" :key="t"
            :class="['sc-type-chip', typeFilter === t ? 'active' : '', typeColorMap[t]]"
            @click="typeFilter = t">
            {{ typeLabels[t] || t }}
            <span class="sc-chip-count">{{ scraperConfigs.filter(s => s.scraper_type === t).length }}</span>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loading" class="flex items-center justify-center py-20 text-text-muted">
          <div class="dot-flashing"></div>
        </div>

        <template v-else-if="filtered.length > 0">
          <div v-for="(items, type) in grouped" :key="type" class="sc-group">
            <div class="sc-group-header">
              <div class="flex items-center gap-2">
                <div :class="['sc-type-dot', typeColorMap[type as string]]"></div>
                <span class="sc-group-name">{{ typeLabels[type as string] || type }}</span>
                <span class="sc-group-count">{{ items.length }}</span>
              </div>
            </div>
            <div class="sc-card-grid">
              <div v-for="sc in items" :key="sc.id" :class="['sc-card', !sc.enabled ? 'disabled' : '']">
                <div class="sc-card-top">
                  <div class="sc-card-name">{{ sc.name }}</div>
                  <ToggleSwitch :model-value="sc.enabled" @update:model-value="toggleEnabled(sc)" />
                </div>
                <div class="sc-card-badges">
                  <span :class="['sc-badge', typeColorMap[sc.scraper_type]]">{{ sc.scraper_type }}</span>
                  <span class="sc-badge sc-badge-priority">P{{ sc.priority }}</span>
                </div>
                <div class="sc-card-meta">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {{ formatTime(sc.updated_at) }}
                </div>
                <div class="sc-card-actions">
                  <button class="sc-action-btn" @click="edit(sc)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    编辑
                  </button>
                  <button class="sc-action-btn sc-action-danger" @click="confirmDelete(sc)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-else-if="!loading && scraperConfigs.length === 0" class="flex flex-col items-center justify-center py-20 text-text-dim">
          <div class="empty-icon mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div class="text-sm font-bold">暂无数据源配置</div>
          <div class="text-xs mt-1 opacity-50">点击"新增数据源"开始</div>
        </div>

        <div v-else-if="!loading && filtered.length === 0" class="flex flex-col items-center justify-center py-20 text-text-dim">
          <div class="text-sm font-bold">未找到匹配的数据源</div>
          <div class="text-xs mt-1 opacity-50">尝试调整搜索条件</div>
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

<style scoped>
.text-green { color: var(--green); }
.text-accent { color: var(--accent); }

.sc-stat-pill {
  display: flex; align-items: center; gap: 5px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; padding: 4px 10px;
}
.sc-stat-num { font-size: 14px; font-weight: 800; color: var(--text); font-family: system-ui, -apple-system, sans-serif; }
.sc-stat-label { font-size: 10px; color: var(--text-dim); font-family: var(--mono); }

.sc-toolbar {
  padding: 12px 24px; border-bottom: 1px solid var(--border);
  background: var(--surface); display: flex; align-items: center; gap: 16px;
}
.sc-search-wrap {
  position: relative; flex-shrink: 0;
}
.sc-search-wrap svg {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-dim); pointer-events: none;
}
.sc-search-input {
  width: 220px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; padding: 7px 12px 7px 32px;
  color: var(--text); font-size: 12px; font-family: var(--mono); outline: none; transition: border 0.15s;
}
.sc-search-input:focus { border-color: var(--accent); }
.sc-search-input::placeholder { color: var(--text-dim); }

.sc-type-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.sc-type-chip {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  padding: 5px 10px; border-radius: 6px; cursor: pointer;
  background: var(--surface2); border: 1px solid var(--border);
  transition: all 0.15s; white-space: nowrap;
}
.sc-type-chip:hover { border-color: var(--border-bright); color: var(--text); }
.sc-type-chip.active { border-color: var(--accent); color: var(--accent-bright); background: var(--accent-glow); }
.sc-chip-count { font-size: 10px; font-family: var(--mono); opacity: 0.6; }

.sc-group { margin-bottom: 24px; }
.sc-group-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; padding: 0 2px;
}
.sc-group-name { font-size: 13px; font-weight: 700; color: var(--text-muted); }
.sc-group-count {
  font-size: 10px; font-family: var(--mono); color: var(--text-dim);
  background: var(--surface2); border: 1px solid var(--border);
  padding: 1px 6px; border-radius: 10px;
}

.sc-type-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: var(--text-dim);
}
.sc-type-dot.type-github { background: #238636; }
.sc-type-dot.type-hn { background: #ff6600; }
.sc-type-dot.type-rss { background: #ee802f; }
.sc-type-dot.type-twitter { background: #1d9bf0; }
.sc-type-dot.type-ai { background: var(--accent); }
.sc-type-dot.type-community { background: var(--green); }

.sc-card-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;
}

.sc-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px 18px;
  transition: all 0.2s; position: relative; overflow: hidden;
}
.sc-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--green); border-radius: 3px 0 0 3px; transition: all 0.2s;
}
.sc-card.disabled { opacity: 0.55; }
.sc-card.disabled::before { background: var(--text-dim); }
.sc-card:hover { border-color: var(--border-bright); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

.sc-card-top {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-bottom: 10px;
}
.sc-card-name { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; }

.sc-card-badges { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
.sc-badge {
  font-family: var(--mono); font-size: 10px; padding: 2px 8px;
  border-radius: 20px; background: var(--surface3); border: 1px solid var(--border);
  color: var(--text-muted); white-space: nowrap;
}
.sc-badge.type-github { background: rgba(35, 134, 54, 0.12); border-color: rgba(35, 134, 54, 0.25); color: #3fb950; }
.sc-badge.type-hn { background: rgba(255, 102, 0, 0.1); border-color: rgba(255, 102, 0, 0.25); color: #ff6600; }
.sc-badge.type-rss { background: rgba(238, 128, 47, 0.1); border-color: rgba(238, 128, 47, 0.25); color: #ee802f; }
.sc-badge.type-twitter { background: rgba(29, 155, 240, 0.1); border-color: rgba(29, 155, 240, 0.25); color: #1d9bf0; }
.sc-badge.type-ai { background: var(--accent-glow); border-color: rgba(124, 106, 247, 0.25); color: var(--accent-bright); }
.sc-badge.type-community { background: var(--green-glow); border-color: rgba(62, 207, 142, 0.25); color: var(--green); }
.sc-badge-priority { background: var(--surface3); color: var(--text-dim); }

.sc-card-meta {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: var(--text-dim); font-family: var(--mono);
  margin-bottom: 12px;
}

.sc-card-actions {
  display: flex; gap: 6px; padding-top: 10px; border-top: 1px solid var(--border);
}
.sc-action-btn {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; padding: 5px 10px; cursor: pointer; transition: all 0.15s;
  font-family: var(--sans);
}
.sc-action-btn:hover { border-color: var(--border-bright); color: var(--text); background: var(--surface3); }
.sc-action-danger:hover { border-color: rgba(232, 88, 88, 0.3); color: var(--red); background: var(--red-glow); }
</style>
