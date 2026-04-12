<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import { useSourceFilter } from '@/composables/useSourceFilter'
import { todayStr, getRankActionLabel, getRankActionClass, getRankDetailLabel, filteredRankDetail } from '@/composables/useHelpers'
import DateNavigator from '@/components/DateNavigator.vue'
import SourceFilter from '@/components/SourceFilter.vue'
import EmptyState from '@/components/EmptyState.vue'
import { marked } from 'marked'

const { supabase } = useSupabase()
const { settings } = useSettings()
const { showToast } = useToast()

const items = ref<any[]>([])
const selectedItem = ref<any>(null)
const selectedRawItem = ref<any>(null)
const loading = ref(false)
const qaRunning = ref(false)
const date = ref(todayStr())

const { activeSources, dynamicSourceOptions, filteredItems, toggleSource, toggleAllSources, syncSources } = useSourceFilter(items)

watch(selectedItem, async (newVal) => {
  if (!newVal) { selectedRawItem.value = null; return }
  try {
    const { data, error } = await supabase.value
      .from(`raw_items${settings.tableSuffix}`)
      .select('*').eq('id', newVal.item_id).single()
    if (error) throw error
    selectedRawItem.value = data
  } catch (e) {
    selectedRawItem.value = null
  }
})

const rawContentHtml = computed(() => {
  if (!selectedRawItem.value) return ''
  const text = selectedRawItem.value.body_text || selectedRawItem.value.content || ''
  return marked.parse(text) as string
})

async function loadItems() {
  loading.value = true
  try {
    let query = supabase.value
      .from(`processed_items${settings.tableSuffix}`)
      .select('*').order('generated_at', { ascending: false })
    if (date.value) query = query.eq('snapshot_date', date.value)
    const { data, error } = await query
    if (error) throw error
    items.value = data || []
    selectedItem.value = items.value.length > 0 ? items.value[0] : null
    syncSources()
  } catch (e: any) {
    showToast(e.message)
  } finally {
    loading.value = false
  }
}

async function submitSingleQA() {
  if (!selectedItem.value) return showToast('请先选择一条加工内容')
  qaRunning.value = true
  try {
    const { data: promptData } = await supabase.value
      .from(`prompts${settings.tableSuffix}`)
      .select('*').eq('is_active', true).ilike('name', '%质检%').limit(1)

    let promptTemplate = `请作为资深内容编辑，对以下 AI 处理后的内容进行质检。\n原始内容标题: {original_title}\n处理后标题: {processed_title}\n摘要: {summary}\nAha Index: {aha_index}\n\n请返回 JSON 格式：\n{\n  "titleScore": 1-5,\n  "summaryScore": 1-5,\n  "ahaReasonable": "偏高" | "合理" | "偏低",\n  "push": true/false,\n  "reason": "一句话理由"\n}`
    if (promptData && promptData.length > 0) promptTemplate = promptData[0].content

    const item = selectedItem.value
    const rawItem = selectedRawItem.value || {}
    const variables: Record<string, string> = {
      original_title: rawItem.title || item.raw_title || '',
      original_content: rawItem.content || rawItem.body_text || '',
      processed_title: item.processed_title || '',
      category: item.category || '',
      summary: item.summary || '',
      expert_insight: item.expert_insight || '',
      aha_index: item.aha_index || ''
    }
    const promptText = promptTemplate.replace(/\{(\w+)\}/g, (match: string, key: string) => variables[key] !== undefined ? variables[key] : match)

    if (!settings.kimiKey) throw new Error('未配置 Kimi API Key')
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.kimiKey}` },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: '你是一个资深内容编辑，请按要求进行质检并只返回 JSON 格式结果。' },
          { role: 'user', content: promptText }
        ],
        response_format: { type: 'json_object' }
      })
    })
    if (!res.ok) throw new Error(`Kimi API Error: ${res.status}`)
    const data = await res.json()
    const rawResponse = data.choices[0].message.content
    const parsed = JSON.parse(rawResponse)
    const pass = parsed.titleScore >= 3 && parsed.summaryScore >= 3 && parsed.push

    await supabase.value.from(`qa_results${settings.tableSuffix}`).upsert({
      item_id: item.item_id, processed_title: item.processed_title, source_name: item.source_name,
      title_score: parsed.titleScore, summary_score: parsed.summaryScore, aha_reasonable: parsed.ahaReasonable,
      push: parsed.push, reason: parsed.reason, pass, prompt_text: promptText, llm_response: rawResponse,
      created_at: new Date().toISOString()
    }, { onConflict: 'item_id' })

    showToast('质检完成！可在 AI 质检 tab 查看结果')
  } catch (e: any) {
    showToast('质检失败: ' + e.message)
  } finally {
    qaRunning.value = false
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
              <div class="card-title">{{ item.processed_title }}</div>
              <span
                v-if="item.rank_action && item.rank_action !== 'selected'"
                :class="['card-tag', getRankActionClass(item.rank_action)]"
              >{{ getRankActionLabel(item.rank_action) }}</span>
              <span v-else class="card-tag tag-done">已发布</span>
            </div>
            <div class="card-preview">{{ item.summary }}</div>
            <div class="card-meta">
              <div class="meta-pill"><div class="dot-live"></div><span class="live-label">线上</span></div>
              <div class="meta-pill">AHA {{ item.aha_index }}</div>
            </div>
          </div>
          <div v-if="filteredItems.length === 0 && !loading" class="p-10 text-center text-text-dim text-xs">暂无匹配内容</div>
        </div>
        <SourceFilter :sources="dynamicSourceOptions" :active-sources="activeSources" @toggle="toggleSource" @toggle-all="toggleAllSources" />
      </div>

      <div class="detail-pane" v-if="selectedItem">
        <div class="detail-topbar">
          <div class="mini-stat">AHA指数 <span class="mini-stat-val" style="color:var(--green)">{{ selectedItem.aha_index }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">分类 <span class="mini-stat-val">{{ selectedItem.category }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">来源 <span class="mini-stat-val">{{ selectedItem.source_name || '未知' }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">模型 <span class="mini-stat-val">{{ selectedItem.model }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">更新 <span class="mini-stat-val">{{ new Date(selectedItem.generated_at).toLocaleDateString() }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selectedItem.processed_title }}</div>
            <span class="card-tag tag-done">已发布</span>
          </div>
          <div class="detail-actions">
            <a v-if="selectedRawItem?.original_url" :href="selectedRawItem.original_url" target="_blank" class="btn-secondary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              查看原文
            </a>
            <button class="btn-secondary">下线</button>
            <button class="btn-green" @click="submitSingleQA" :disabled="qaRunning">{{ qaRunning ? '质检中...' : '提交质检' }}</button>
            <button class="btn-primary">发布</button>
          </div>
        </div>
        <div class="detail-body">
          <div v-if="selectedItem.rank_action || selectedItem.rank_score || selectedItem.rank_detail" class="content-block">
            <div class="block-label">精排审计 (Ranking Audit)</div>
            <div class="flex items-center gap-4 mb-4">
              <div class="mini-stat">动作 <span :class="['card-tag', getRankActionClass(selectedItem.rank_action)]">{{ getRankActionLabel(selectedItem.rank_action) || '已入选' }}</span></div>
              <div class="mini-stat">精排得分 <span class="mini-stat-val text-accent">{{ selectedItem.rank_score || '-' }}</span></div>
              <div class="mini-stat">分组 <span class="mini-stat-val">{{ selectedItem.rank_group || '-' }}</span></div>
            </div>
            <div v-if="selectedItem.rank_detail" class="bg-surface2 rounded-xl p-4 border border-border">
              <div v-if="selectedItem.rank_detail.comment" class="text-sm text-text mb-3 pb-3 border-border border-b italic">"{{ selectedItem.rank_detail.comment }}"</div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-for="(val, key) in filteredRankDetail(selectedItem.rank_detail)" :key="key" class="flex flex-col">
                  <span class="text-[10px] text-text-dim uppercase tracking-wider">{{ getRankDetailLabel(key as string) }}</span>
                  <span class="text-sm font-bold" :class="(val as number) < 0 ? 'text-red' : 'text-text'">{{ val }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="content-block">
            <div class="block-label">标题对比</div>
            <div class="mb-3">
              <div class="text-[11px] text-text-dim mb-1 font-mono uppercase tracking-wider">原始标题</div>
              <div class="text-text-muted text-sm" style="font-family: system-ui, -apple-system, sans-serif;">{{ selectedRawItem?.title || '无' }}</div>
            </div>
            <div>
              <div class="text-[11px] text-accent mb-1 font-mono uppercase tracking-wider">加工后标题</div>
              <div class="text-white text-base font-medium" style="font-family: system-ui, -apple-system, sans-serif;">{{ selectedItem.processed_title }}</div>
            </div>
          </div>
          <div class="content-block">
            <div class="block-label">核心信息</div>
            <div class="mb-4">
              <div class="text-[11px] text-text-muted mb-1 font-mono uppercase tracking-wider">摘要 (Summary)</div>
              <div class="block-text text-white" style="font-family: system-ui, -apple-system, sans-serif;">{{ selectedItem.summary }}</div>
            </div>
            <div v-if="selectedItem.expert_insight">
              <div class="text-[11px] text-text-muted mb-1 font-mono uppercase tracking-wider">专家洞察 (Expert Insight)</div>
              <div class="block-text italic text-text-muted" style="font-family: system-ui, -apple-system, sans-serif;">"{{ selectedItem.expert_insight }}"</div>
            </div>
          </div>
          <div class="content-block" v-if="selectedRawItem">
            <div class="block-label">加工前内容</div>
            <div class="block-text prose prose-invert prose-original max-w-none" style="font-family: system-ui, -apple-system, sans-serif;" v-html="rawContentHtml"></div>
          </div>
          <div class="content-block">
            <div class="block-label">加工后内容</div>
            <div class="block-text prose prose-invert prose-processed max-w-none" style="font-family: system-ui, -apple-system, sans-serif;" v-html="selectedItem.processed_content"></div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条加工内容" subtitle="从左侧列表选择一条内容查看详情">
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
        </template>
      </EmptyState>
    </div>
  </div>
</template>
