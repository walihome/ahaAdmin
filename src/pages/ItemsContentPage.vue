<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import { useSourceFilter } from '@/composables/useSourceFilter'
import { todayStr } from '@/composables/useHelpers'
import DateNavigator from '@/components/DateNavigator.vue'
import SourceFilter from '@/components/SourceFilter.vue'
import EmptyState from '@/components/EmptyState.vue'
import { marked } from 'marked'

const { supabase } = useSupabase()
const { settings } = useSettings()
const { showToast } = useToast()

const items = ref<any[]>([])
const selectedItem = ref<any>(null)
const loading = ref(false)
const date = ref(todayStr())

const { activeSources, dynamicSourceOptions, filteredItems, toggleSource, toggleAllSources, syncSources } = useSourceFilter(items, 'source_name')

const enrichedBodyHtml = computed(() => {
  if (!selectedItem.value?.enriched_body) return ''
  return marked.parse(selectedItem.value.enriched_body) as string
})

const rawBodyHtml = computed(() => {
  if (!selectedItem.value?.raw_body) return ''
  return marked.parse(selectedItem.value.raw_body) as string
})

function syntaxHighlightJson(obj: any): string {
  const json = JSON.stringify(obj, null, 2)
  return json.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'json-number'
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key'
      } else {
        cls = 'json-string'
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean'
    } else if (/null/.test(match)) {
      cls = 'json-null'
    }
    return `<span class="${cls}">${match}</span>`
  })
}

async function loadItems() {
  loading.value = true
  try {
    // 查询 items_content 并 join raw_items 获取元数据
    let query = supabase.value
      .from(`items_content${settings.tableSuffix}`)
      .select(`
        *,
        raw:raw_items!item_id(title, source_name, original_url, snapshot_date, created_at)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (date.value) {
      // 通过 raw_items.snapshot_date 过滤
      query = supabase.value
        .from(`items_content${settings.tableSuffix}`)
        .select(`
          *,
          raw:raw_items!item_id(title, source_name, original_url, snapshot_date, created_at)
        `)
        .gte('created_at', date.value + 'T00:00:00+08:00')
        .lt('created_at', date.value + 'T24:00:00+08:00')
        .order('created_at', { ascending: false })
        .limit(200)
    }

    const { data, error } = await query
    if (error) throw error

    // 将 raw_items 的字段提升到顶层方便模板使用
    const mapped = (data || []).map((d: any) => ({
      ...d,
      title: d.raw?.title || d.item_id,
      source_name: d.raw?.source_name || '',
      original_url: d.raw?.original_url || '',
      snapshot_date: d.raw?.snapshot_date || '',
    }))

    items.value = mapped
    selectedItem.value = items.value.length > 0 ? items.value[0] : null
    syncSources()
  } catch (e: any) {
    showToast(e.message)
  } finally {
    loading.value = false
  }
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="two-pane">
      <div class="list-pane">
        <div class="list-search">
          <DateNavigator v-model="date" @change="loadItems" />
        </div>
        <div class="item-list">
          <div
            v-for="item in filteredItems"
            :key="item.item_id"
            :class="['content-card', selectedItem?.item_id === item.item_id ? 'active' : '']"
            @click="selectedItem = item"
          >
            <div class="card-top">
              <div class="card-title">{{ item.title }}</div>
              <span v-if="item.enriched_source" class="card-tag tag-done">{{ item.enriched_source }}</span>
              <span v-else class="card-tag tag-pending">未富化</span>
            </div>
            <div class="card-preview">{{ (item.enriched_body || item.raw_body || '').slice(0, 100) }}</div>
            <div class="card-meta">
              <div class="meta-pill">{{ item.source_name || '未知来源' }}</div>
              <div class="meta-pill" v-if="item.fetch_attempts > 0">抓取 {{ item.fetch_attempts }}次</div>
            </div>
          </div>
          <div v-if="filteredItems.length === 0 && !loading" class="p-10 text-center text-text-dim text-xs">
            暂无匹配内容
          </div>
        </div>
        <SourceFilter
          :sources="dynamicSourceOptions"
          :active-sources="activeSources"
          @toggle="toggleSource"
          @toggle-all="toggleAllSources"
        />
      </div>

      <div class="detail-pane" v-if="selectedItem">
        <div class="detail-topbar">
          <div class="mini-stat">来源 <span class="mini-stat-val">{{ selectedItem.source_name || 'N/A' }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">富化来源 <span class="mini-stat-val">{{ selectedItem.enriched_source || '无' }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">富化质量 <span class="mini-stat-val">{{ selectedItem.enriched_quality ?? 'N/A' }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">抓取次数 <span class="mini-stat-val">{{ selectedItem.fetch_attempts }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selectedItem.title }}</div>
          </div>
          <div class="detail-actions">
            <a v-if="selectedItem.original_url" :href="selectedItem.original_url" target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              查看原文
            </a>
          </div>
        </div>
        <div class="detail-body">
          <div class="content-block" v-if="selectedItem.enriched_body">
            <div class="block-label">富化正文 ({{ selectedItem.enriched_source || 'unknown' }})</div>
            <div class="block-text prose prose-invert max-w-none" style="font-family: system-ui, -apple-system, sans-serif;" v-html="enrichedBodyHtml"></div>
          </div>
          <div class="content-block">
            <div class="block-label">原始正文 (raw_body)</div>
            <div class="block-text prose prose-invert max-w-none" style="font-family: system-ui, -apple-system, sans-serif;" v-html="rawBodyHtml"></div>
          </div>
          <div class="content-block" v-if="selectedItem.last_fetch_error">
            <div class="block-label" style="color: var(--red);">抓取错误</div>
            <div class="block-text text-red text-sm">{{ selectedItem.last_fetch_error }}</div>
          </div>
          <div class="content-block">
            <div class="block-label">元数据</div>
            <pre class="json-viewer" v-html="syntaxHighlightJson({
              item_id: selectedItem.item_id,
              enriched_source: selectedItem.enriched_source,
              enriched_quality: selectedItem.enriched_quality,
              enriched_at: selectedItem.enriched_at,
              fetch_attempts: selectedItem.fetch_attempts,
              created_at: selectedItem.created_at,
              updated_at: selectedItem.updated_at
            })"></pre>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条内容" subtitle="从左侧列表选择一条内容查看详情" />
    </div>
  </div>
</template>

<style scoped>
.json-viewer {
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.6;
  background: var(--bg);
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow-x: auto;
  max-height: 50vh;
  overflow-y: auto;
  white-space: pre;
  color: var(--text-muted);
}
.json-viewer :deep(.json-key) {
  color: #7dd3fc;
}
.json-viewer :deep(.json-string) {
  color: #a5d6a7;
}
.json-viewer :deep(.json-number) {
  color: #ffcc80;
}
.json-viewer :deep(.json-boolean) {
  color: #ce93d8;
}
.json-viewer :deep(.json-null) {
  color: #ef9a9a;
}
</style>
