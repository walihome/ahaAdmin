<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import { useSourceFilter } from '@/composables/useSourceFilter'
import DateNavigator from '@/components/DateNavigator.vue'
import SourceFilter from '@/components/SourceFilter.vue'
import EmptyState from '@/components/EmptyState.vue'

const { supabase } = useSupabase()
const { settings } = useSettings()
const { showToast } = useToast()

const items = ref<any[]>([])
const selectedItem = ref<any>(null)
const loading = ref(false)
const date = ref('')

const { activeSources, dynamicSourceOptions, filteredItems, toggleSource, toggleAllSources, syncSources } = useSourceFilter(items)

async function loadItems() {
  loading.value = true
  try {
    if (!date.value) {
      const { data: latest } = await supabase.value
        .from(`display_items${settings.tableSuffix}`)
        .select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1)
      if (latest?.length) date.value = latest[0].snapshot_date
    }
    let query = supabase.value
      .from(`display_items${settings.tableSuffix}`)
      .select('*').order('rank', { ascending: true })
    if (date.value) query = query.eq('snapshot_date', date.value)
    const { data, error } = await query
    if (error) throw error

    if (data && data.length > 0) {
      const itemIds = data.map((item: any) => item.processed_item_id)
      const { data: eventData, error: eventError } = await supabase.value
        .from(`user_events${settings.tableSuffix}`)
        .select('item_id, event_type')
        .in('item_id', itemIds)
        .eq('snapshot_date', date.value)
      if (!eventError && eventData) {
        const counts: Record<string, any> = {}
        eventData.forEach((event: any) => {
          if (!counts[event.item_id]) counts[event.item_id] = { impression: 0, click: 0, click_original: 0 }
          counts[event.item_id][event.event_type]++
        })
        data.forEach((item: any) => {
          const c = counts[item.processed_item_id] || { impression: 0, click: 0, click_original: 0 }
          item.impressions = c.impression; item.clicks = c.click; item.clicks_original = c.click_original
        })
      }
    }

    items.value = data || []
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
            :key="item.id"
            :class="['content-card', selectedItem?.id === item.id ? 'active' : '']"
            @click="selectedItem = item"
          >
            <div class="card-top">
              <div class="card-title">{{ item.processed_title }}</div>
              <span class="card-tag tag-done">Rank {{ item.rank }}</span>
            </div>
            <div class="card-preview">{{ item.summary }}</div>
            <div class="card-meta">
              <div class="meta-pill"><div class="dot-live"></div><span class="live-label">线上</span></div>
              <div class="meta-pill">AHA {{ item.aha_index }}</div>
              <div class="meta-pill" title="曝光">👁 {{ item.impressions || 0 }}</div>
              <div class="meta-pill" title="点击">🖱 {{ item.clicks || 0 }}</div>
            </div>
          </div>
          <div v-if="filteredItems.length === 0 && !loading" class="p-10 text-center text-text-dim text-xs">暂无匹配内容</div>
        </div>
        <SourceFilter :sources="dynamicSourceOptions" :active-sources="activeSources" @toggle="toggleSource" @toggle-all="toggleAllSources" />
      </div>

      <div class="detail-pane" v-if="selectedItem">
        <div class="detail-topbar">
          <div class="mini-stat">Rank <span class="mini-stat-val">{{ selectedItem.rank }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">AHA <span class="mini-stat-val" style="color:var(--green)">{{ selectedItem.aha_index }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">日期 <span class="mini-stat-val">{{ selectedItem.snapshot_date }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selectedItem.processed_title }}</div>
            <span class="card-tag tag-done">展示中</span>
          </div>
          <div class="detail-actions">
            <button class="btn-secondary">调整排序</button>
            <button class="btn-primary">查看原文</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="content-block">
            <div class="block-label">实时数据</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
              <div class="qa-score-card">
                <div class="score-label">曝光 (Impression)</div>
                <div class="score-val" style="color:var(--text)">{{ selectedItem.impressions || 0 }}</div>
              </div>
              <div class="qa-score-card">
                <div class="score-label">点击 (Click)</div>
                <div class="score-val" style="color:var(--text)">{{ selectedItem.clicks || 0 }}</div>
              </div>
              <div class="qa-score-card">
                <div class="score-label">点击原文 (Original)</div>
                <div class="score-val" style="color:var(--text)">{{ selectedItem.clicks_original || 0 }}</div>
              </div>
            </div>
          </div>
          <div class="content-block">
            <div class="block-label">专家洞察</div>
            <div class="block-text italic text-text-dim">"{{ selectedItem.expert_insight || '暂无专家洞察' }}"</div>
          </div>
          <div class="content-block">
            <div class="block-label">摘要</div>
            <div class="block-text">{{ selectedItem.summary }}</div>
          </div>
          <div class="content-block">
            <div class="block-label">标签 & 关键词</div>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in selectedItem.tags" :key="tag" class="version-tag">{{ tag }}</span>
              <span v-for="kw in selectedItem.keywords" :key="kw" class="version-tag" style="border-color:var(--accent-dim)">{{ kw }}</span>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条展示内容" subtitle="从左侧列表选择一条内容查看详情">
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </template>
      </EmptyState>
    </div>
  </div>
</template>
