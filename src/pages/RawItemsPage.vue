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

const rawItems = ref<any[]>([])
const selectedItem = ref<any>(null)
const loading = ref(false)
const date = ref(todayStr())

const { activeSources, dynamicSourceOptions, filteredItems, toggleSource, toggleAllSources, syncSources } = useSourceFilter(rawItems)

const rawContentHtml = computed(() => {
  if (!selectedItem.value) return ''
  const text = selectedItem.value.body_text || selectedItem.value.content || ''
  return marked.parse(text) as string
})

const filteredMetadata = computed(() => {
  if (!selectedItem.value) return null
  const { title, body_text, content, ...rest } = selectedItem.value
  return rest
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
    let query = supabase.value
      .from(`raw_items${settings.tableSuffix}`)
      .select('*')
      .order('created_at', { ascending: false })

    if (date.value) {
      // Pipeline 用北京时间 (UTC+8) 写入，但 created_at 存的是 UTC
      // 需要把北京时间 00:00~24:00 转换为对应的 UTC 范围
      const start = new Date(date.value + 'T00:00:00+08:00')
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
        query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
      }
    }

    const { data, error } = await query
    if (error) throw error

    if (data && data.length > 0) {
      const ids = data.map((d: any) => d.id)
      const { data: pData } = await supabase.value
        .from(`processed_items${settings.tableSuffix}`)
        .select('item_id')
        .in('item_id', ids)
      const pSet = new Set(pData?.map((p: any) => p.item_id) || [])
      data.forEach((d: any) => { d._processed = pSet.has(d.id) })
    }

    rawItems.value = data || []
    selectedItem.value = rawItems.value.length > 0 ? rawItems.value[0] : null
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
            :key="item.id"
            :class="['content-card', selectedItem?.id === item.id ? 'active' : '']"
            @click="selectedItem = item"
          >
            <div class="card-top">
              <div class="card-title">{{ item.title }}</div>
              <span :class="['card-tag', item._processed ? 'tag-done' : 'tag-pending']">
                {{ item._processed ? '已完成' : '待处理' }}
              </span>
            </div>
            <div class="card-preview">{{ item.content }}</div>
            <div class="card-meta">
              <div class="meta-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ new Date(item.created_at).toLocaleDateString() }}
              </div>
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
          <div class="mini-stat">分类 <span class="mini-stat-val">{{ selectedItem.category || 'N/A' }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">采集时间 <span class="mini-stat-val">{{ new Date(selectedItem.created_at).toLocaleString() }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selectedItem.title }}</div>
            <span :class="['card-tag', selectedItem._processed ? 'tag-done' : 'tag-pending']">
              {{ selectedItem._processed ? '已完成' : '待处理' }}
            </span>
          </div>
          <div class="detail-actions">
            <a v-if="selectedItem.original_url" :href="selectedItem.original_url" target="_blank" class="btn-secondary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              查看原文
            </a>
            <button class="btn-primary">发送加工</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="content-block">
            <div class="block-label">正文</div>
            <div class="block-text prose prose-invert max-w-none" style="font-family: system-ui, -apple-system, sans-serif;" v-html="rawContentHtml"></div>
          </div>
          <div class="content-block">
            <div class="block-label">元数据</div>
            <pre class="json-viewer" v-html="syntaxHighlightJson(filteredMetadata)"></pre>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条原始内容" subtitle="从左侧列表选择一条内容查看详情" />
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
