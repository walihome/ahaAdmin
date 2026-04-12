<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import { todayStr } from '@/composables/useHelpers'
import DateNavigator from '@/components/DateNavigator.vue'

const { supabase } = useSupabase()
const { settings } = useSettings()
const { showToast } = useToast()

const loading = ref(false)
const date = ref(todayStr())
const data = reactive({ hasData: false, leaderboard: [] as any[], leaderboardType: 'impression' })

const sortedLeaderboard = computed(() => {
  if (!data.leaderboard.length) return []
  const sorted = [...data.leaderboard]
  const key = data.leaderboardType
  if (key === 'impression') sorted.sort((a, b) => b.impressions - a.impressions)
  else if (key === 'click') sorted.sort((a, b) => b.clicks - a.clicks)
  else if (key === 'ctr') sorted.sort((a, b) => b.ctr - a.ctr)
  else if (key === 'original_click') sorted.sort((a, b) => b.original_clicks - a.original_clicks)
  else if (key === 'octr') sorted.sort((a, b) => b.octr - a.octr)
  return sorted.slice(0, 10)
})

async function loadItems() {
  loading.value = true; data.hasData = false; data.leaderboard = []
  try {
    const { data: events, error } = await supabase.value
      .from(`user_events${settings.tableSuffix}`)
      .select('item_id, event_type')
      .eq('snapshot_date', date.value)
    if (error) throw error
    if (!events || events.length === 0) { loading.value = false; return }

    const statsMap: Record<string, any> = {}
    events.forEach((e: any) => {
      if (!statsMap[e.item_id]) statsMap[e.item_id] = { item_id: e.item_id, impressions: 0, clicks: 0, original_clicks: 0 }
      if (e.event_type === 'impression') statsMap[e.item_id].impressions++
      else if (e.event_type === 'click') statsMap[e.item_id].clicks++
      else if (e.event_type === 'click_original') statsMap[e.item_id].original_clicks++
    })

    const statsArray = Object.values(statsMap).map((s: any) => {
      s.ctr = s.impressions > 0 ? s.clicks / s.impressions : 0
      s.octr = s.impressions > 0 ? s.original_clicks / s.impressions : 0
      return s
    })

    const uniqueIds = [...new Set(statsArray.map((s: any) => s.item_id))]
    let itemDetails: Record<string, any> = {}
    if (uniqueIds.length > 0) {
      const { data: items } = await supabase.value
        .from(`display_items${settings.tableSuffix}`)
        .select('processed_item_id, processed_title, source_name')
        .in('processed_item_id', uniqueIds)
      if (items) items.forEach((item: any) => { itemDetails[item.processed_item_id] = item })
    }

    data.leaderboard = statsArray.map((stat: any) => {
      const detail = itemDetails[stat.item_id] || { processed_title: '未知内容', source_name: '未知' }
      return { ...stat, title: detail.processed_title, source_name: detail.source_name }
    })
    data.hasData = true
  } catch (e: any) {
    showToast('加载数据分析失败: ' + e.message)
  } finally { loading.value = false }
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="flex items-center justify-between px-7 py-5 border-b border-border bg-surface">
        <div>
          <h2 class="text-xl font-extrabold text-text tracking-tight">每日爆点数据分析</h2>
          <p class="text-xs text-text-dim mt-1 font-mono">Daily Highlights Analytics</p>
        </div>
        <DateNavigator v-model="date" @change="loadItems" />
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loading" class="flex items-center justify-center py-20 text-text-muted">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          加载中...
        </div>

        <div v-else-if="!data.hasData" class="flex flex-col items-center justify-center py-20 text-text-dim">
          <div class="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-muted"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <div class="text-sm font-bold">当日暂无数据</div>
          <div class="text-xs mt-1 opacity-50">请选择其他日期查看</div>
        </div>

        <div v-else class="space-y-6">
          <div class="analytics-leaderboard" v-if="data.leaderboard.length > 0">
            <div class="leaderboard-header">
              <h3 class="leaderboard-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                今日排行榜
              </h3>
              <div class="leaderboard-tabs">
                <button :class="['lb-tab', data.leaderboardType === 'impression' ? 'active' : '']" @click="data.leaderboardType = 'impression'">曝光</button>
                <button :class="['lb-tab', data.leaderboardType === 'click' ? 'active' : '']" @click="data.leaderboardType = 'click'">点击</button>
                <button :class="['lb-tab', data.leaderboardType === 'ctr' ? 'active' : '']" @click="data.leaderboardType = 'ctr'">点击率</button>
                <button :class="['lb-tab', data.leaderboardType === 'original_click' ? 'active' : '']" @click="data.leaderboardType = 'original_click'">原文点击</button>
                <button :class="['lb-tab', data.leaderboardType === 'octr' ? 'active' : '']" @click="data.leaderboardType = 'octr'">原文率</button>
              </div>
            </div>
            <div class="leaderboard-list">
              <div v-for="(item, index) in sortedLeaderboard" :key="item.item_id" class="leaderboard-item">
                <div :class="['lb-rank', index < 3 ? 'top-' + (index + 1) : '']">{{ index + 1 }}</div>
                <div class="lb-content">
                  <div class="lb-title">{{ item.title }}</div>
                  <div class="lb-meta"><span class="lb-source">{{ item.source_name }}</span></div>
                </div>
                <div class="lb-stats">
                  <div class="lb-stat-item"><span class="lb-stat-value">{{ item.impressions }}</span><span class="lb-stat-label">曝光</span></div>
                  <div class="lb-stat-item"><span class="lb-stat-value">{{ item.clicks }}</span><span class="lb-stat-label">点击</span></div>
                  <div class="lb-stat-item"><span class="lb-stat-value" :style="{ color: item.ctr > 0.1 ? 'var(--green)' : 'var(--text)' }">{{ (item.ctr * 100).toFixed(1) }}%</span><span class="lb-stat-label">CTR</span></div>
                  <div class="lb-stat-item"><span class="lb-stat-value">{{ item.original_clicks }}</span><span class="lb-stat-label">原文点击</span></div>
                  <div class="lb-stat-item"><span class="lb-stat-value" :style="{ color: item.octr > 0.1 ? 'var(--orange)' : 'var(--text)' }">{{ (item.octr * 100).toFixed(1) }}%</span><span class="lb-stat-label">原文率</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
