<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'
import { getDuration } from '@/composables/useHelpers'
import EmptyState from '@/components/EmptyState.vue'

const { supabase } = useSupabase()
const { showToast } = useToast()

const pipelineRuns = ref<any[]>([])
const selectedRun = ref<any>(null)
const scraperRuns = ref<any[]>([])
const loading = reactive({ runs: false, scraperRuns: false })

async function loadItems() {
  loading.runs = true
  try {
    const { data, error } = await supabase.value.from('pipeline_runs').select('*').order('started_at', { ascending: false }).limit(50)
    if (error) throw error; pipelineRuns.value = data || []
  } catch (e: any) { showToast(e.message) }
  finally { loading.runs = false }
}

async function selectRun(pr: any) {
  selectedRun.value = pr; loading.scraperRuns = true; scraperRuns.value = []
  try {
    const { data, error } = await supabase.value.from('scraper_runs').select('*').eq('pipeline_run_id', pr.id).order('started_at')
    if (error) throw error; scraperRuns.value = data || []
  } catch (e: any) { showToast(e.message) }
  finally { loading.scraperRuns = false }
}

defineExpose({ loadItems })
onMounted(loadItems)
</script>

<template>
  <div class="page active">
    <div class="flex flex-col h-full w-full bg-dark-bg overflow-hidden">
      <div class="flex items-center justify-between px-7 py-5 border-b border-border bg-surface">
        <div>
          <h2 class="text-xl font-extrabold text-text tracking-tight">Pipeline 运行监控</h2>
          <p class="text-xs text-text-dim mt-1 font-mono">pipeline_runs + scraper_runs (只读)</p>
        </div>
        <button class="btn-secondary" @click="loadItems">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          刷新
        </button>
      </div>
      <div class="flex flex-1 overflow-hidden">
        <div class="list-pane" style="width:420px; min-width:420px;">
          <div class="list-pane-header">
            <div class="list-pane-title">运行记录</div>
            <span class="nav-badge" v-if="pipelineRuns.length">{{ pipelineRuns.length }}</span>
          </div>
          <div class="item-list">
            <div v-if="loading.runs" class="text-center py-10 text-text-muted">加载中...</div>
            <div v-for="pr in pipelineRuns" :key="pr.id" :class="['content-card', selectedRun?.id === pr.id ? 'active' : '']" @click="selectRun(pr)">
              <div class="card-top">
                <div class="card-title flex items-center gap-2">
                  <span :class="['card-tag', pr.status === 'success' ? 'tag-done' : pr.status === 'failed' ? 'tag-fail' : 'tag-processing']">{{ pr.status }}</span>
                  <span class="card-tag">{{ pr.run_type }}</span>
                </div>
              </div>
              <div class="card-meta mt-1">
                <div class="meta-pill">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {{ new Date(pr.started_at).toLocaleString() }}
                </div>
                <div class="meta-pill" v-if="pr.finished_at">耗时 {{ getDuration(pr.started_at, pr.finished_at) }}</div>
                <div v-if="pr.table_suffix" class="meta-pill">suffix: {{ pr.table_suffix }}</div>
              </div>
              <div v-if="pr.stats" class="card-meta mt-1">
                <div class="meta-pill">抓取 {{ pr.stats.scraped || 0 }}</div>
                <div class="meta-pill">处理 {{ pr.stats.processed || 0 }}</div>
                <div class="meta-pill">精排 {{ pr.stats.ranked || 0 }}</div>
                <div class="meta-pill" v-if="pr.stats.errors">错误 <span class="text-red">{{ pr.stats.errors }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-pane" v-if="selectedRun">
          <div class="detail-topbar">
            <div class="mini-stat">状态 <span class="mini-stat-val" :style="{ color: selectedRun.status === 'success' ? 'var(--green)' : selectedRun.status === 'failed' ? 'var(--red)' : 'var(--blue)' }">{{ selectedRun.status }}</span></div>
            <div class="divider-v"></div>
            <div class="mini-stat">类型 <span class="mini-stat-val">{{ selectedRun.run_type }}</span></div>
            <div class="divider-v"></div>
            <div class="mini-stat">开始 <span class="mini-stat-val">{{ new Date(selectedRun.started_at).toLocaleString() }}</span></div>
            <div v-if="selectedRun.finished_at" class="divider-v"></div>
            <div v-if="selectedRun.finished_at" class="mini-stat">耗时 <span class="mini-stat-val">{{ getDuration(selectedRun.started_at, selectedRun.finished_at) }}</span></div>
          </div>
          <div class="detail-body">
            <div v-if="selectedRun.error" class="content-block" style="border-color: rgba(232,88,88,0.3);">
              <div class="block-label" style="color:var(--red)">错误信息</div>
              <div class="block-text font-mono text-xs text-red whitespace-pre-wrap">{{ selectedRun.error }}</div>
            </div>
            <div v-if="selectedRun.stats" class="content-block">
              <div class="block-label">统计数据</div>
              <div class="grid grid-cols-5 gap-3">
                <div v-for="(val, key) in selectedRun.stats" :key="key" class="qa-score-card">
                  <div class="score-label">{{ key }}</div>
                  <div class="score-val" style="font-size:24px; color:var(--text)">{{ val }}</div>
                </div>
              </div>
            </div>
            <div class="content-block">
              <div class="block-label">Scraper 运行明细 ({{ scraperRuns.length }})</div>
              <div v-if="loading.scraperRuns" class="text-center py-4 text-text-muted text-xs">加载中...</div>
              <table v-else-if="scraperRuns.length" class="w-full text-xs" style="border-collapse:separate; border-spacing:0 4px;">
                <thead><tr class="text-left text-text-dim text-[10px] uppercase tracking-wider font-mono"><th class="px-3 pb-1">Scraper</th><th class="px-3 pb-1">类型</th><th class="px-3 pb-1">状态</th><th class="px-3 pb-1">抓取</th><th class="px-3 pb-1">入库</th><th class="px-3 pb-1">耗时</th><th class="px-3 pb-1">错误</th></tr></thead>
                <tbody>
                  <tr v-for="sr in scraperRuns" :key="sr.id" class="bg-surface2 rounded-lg">
                    <td class="px-3 py-2 font-semibold text-text">{{ sr.scraper_name }}</td>
                    <td class="px-3 py-2"><span class="card-tag text-[9px]">{{ sr.scraper_type }}</span></td>
                    <td class="px-3 py-2"><span :class="['card-tag text-[9px]', sr.status === 'success' ? 'tag-done' : sr.status === 'failed' ? 'tag-fail' : sr.status === 'timeout' ? 'tag-pending' : 'tag-processing']">{{ sr.status }}</span></td>
                    <td class="px-3 py-2 font-mono">{{ sr.items_fetched ?? '-' }}</td>
                    <td class="px-3 py-2 font-mono">{{ sr.items_saved ?? '-' }}</td>
                    <td class="px-3 py-2 font-mono text-text-dim">{{ sr.finished_at ? getDuration(sr.started_at, sr.finished_at) : '-' }}</td>
                    <td class="px-3 py-2 text-red truncate max-w-[200px]" :title="sr.error">{{ sr.error || '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="text-text-dim text-xs py-4">无 scraper 运行记录</div>
            </div>
            <div v-if="selectedRun.config_snapshot" class="content-block">
              <div class="block-label">配置快照 (config_snapshot)</div>
              <div class="whitespace-pre-wrap font-mono text-[11px] text-text-muted bg-bg p-4 rounded-lg border border-border max-h-[400px] overflow-y-auto">{{ JSON.stringify(selectedRun.config_snapshot, null, 2) }}</div>
            </div>
          </div>
        </div>
        <EmptyState v-else title="选择一次运行查看详情">
          <template #icon>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </template>
        </EmptyState>
      </div>
    </div>
  </div>
</template>
