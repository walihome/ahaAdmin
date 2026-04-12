<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import SourceFilter from '@/components/SourceFilter.vue'
import EmptyState from '@/components/EmptyState.vue'

const { supabase } = useSupabase()
const { settings } = useSettings()
const { showToast } = useToast()

const qa = reactive({ running: false, current: 0, total: 0, results: [] as any[] })
const selectedResult = ref<any>(null)
const activeQaSources = ref<string[]>([])

const dynamicQaSourceOptions = computed(() => {
  const counts: Record<string, { count: number; pass: number; fail: number }> = {}
  qa.results.forEach((item: any) => {
    const s = item.source_name || '未知'
    if (!counts[s]) counts[s] = { count: 0, pass: 0, fail: 0 }
    counts[s].count++
    if (item.pass) counts[s].pass++; else counts[s].fail++
  })
  return Object.entries(counts)
    .map(([name, stats]) => ({ name, count: stats.count, pass: stats.pass, fail: stats.fail }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const filteredQaResults = computed(() => {
  if (activeQaSources.value.length === 0) return qa.results
  return qa.results.filter((item: any) => activeQaSources.value.includes(item.source_name || '未知'))
})

function toggleQaSource(source: string) {
  const i = activeQaSources.value.indexOf(source)
  if (i > -1) activeQaSources.value.splice(i, 1)
  else activeQaSources.value.push(source)
}

function toggleAllQaSources() {
  if (activeQaSources.value.length === dynamicQaSourceOptions.value.length) activeQaSources.value = []
  else activeQaSources.value = dynamicQaSourceOptions.value.map(s => s.name)
}

async function callKimi(promptText: string) {
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
  const text = data.choices[0].message.content
  return { parsed: JSON.parse(text), raw: text }
}

async function startQA() {
  qa.running = true; qa.results = []
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase.value.from(`processed_items${settings.tableSuffix}`).select('*').eq('snapshot_date', today)
    if (error) throw error
    if (!data || data.length === 0) { showToast('今日无处理数据'); qa.running = false; return }

    const { data: promptData } = await supabase.value.from(`prompts${settings.tableSuffix}`).select('*').eq('is_active', true).ilike('name', '%质检%').limit(1)
    let promptTemplate = `请作为资深内容编辑，对以下 AI 处理后的内容进行质检。\n原始内容标题: {original_title}\n处理后标题: {processed_title}\n摘要: {summary}\nAha Index: {aha_index}\n\n请返回 JSON 格式：\n{\n  "titleScore": 1-5,\n  "summaryScore": 1-5,\n  "ahaReasonable": "偏高" | "合理" | "偏低",\n  "push": true/false,\n  "reason": "一句话理由"\n}`
    if (promptData && promptData.length > 0) promptTemplate = promptData[0].content

    qa.total = data.length; qa.current = 0
    for (const item of data) {
      const variables: Record<string, string> = { original_title: item.raw_title || '', original_content: '', processed_title: item.processed_title || '', category: item.category || '', summary: item.summary || '', expert_insight: item.expert_insight || '', aha_index: item.aha_index || '' }
      const promptText = promptTemplate.replace(/\{(\w+)\}/g, (m: string, k: string) => variables[k] !== undefined ? variables[k] : m)
      try {
        const { parsed: res, raw: rawResponse } = await callKimi(promptText)
        const pass = res.titleScore >= 3 && res.summaryScore >= 3 && res.push
        const result = { id: item.item_id, title: item.processed_title, source_name: item.source_name, ...res, pass, date: new Date().toLocaleDateString(), prompt_text: promptText, llm_response: rawResponse }
        await supabase.value.from(`qa_results${settings.tableSuffix}`).upsert({ item_id: item.item_id, processed_title: item.processed_title, source_name: item.source_name, title_score: res.titleScore, summary_score: res.summaryScore, aha_reasonable: res.ahaReasonable, push: res.push, reason: res.reason, pass, prompt_text: promptText, llm_response: rawResponse, created_at: new Date().toISOString() }, { onConflict: 'item_id' })
        qa.results.push(result)
        if (!selectedResult.value) selectedResult.value = result
      } catch (e: any) {
        const result = { id: item.item_id, title: item.processed_title, source_name: item.source_name, titleScore: 0, summaryScore: 0, ahaReasonable: 'Error', push: false, reason: 'API 调用失败', pass: false, date: new Date().toLocaleDateString(), prompt_text: promptText, llm_response: String(e) }
        qa.results.push(result)
        if (!selectedResult.value) selectedResult.value = result
      }
      qa.current++
    }
    activeQaSources.value = dynamicQaSourceOptions.value.map(s => s.name)
  } catch (e: any) { showToast(e.message) } finally { qa.running = false }
}

function exportQA() {
  if (qa.results.length === 0) return
  const headers = ['ID', '标题', '标题得分', '摘要得分', 'Aha合理性', '是否推送', '理由', '是否合格']
  const csv = [headers.join(','), ...qa.results.map((r: any) => `"${r.id}","${r.title.replace(/"/g, '""')}","${r.titleScore}","${r.summaryScore}","${r.ahaReasonable}","${r.push ? 'Yes' : 'No'}","${r.reason.replace(/"/g, '""')}","${r.pass ? 'Yes' : 'No'}"`)].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob); link.download = `qa_results_${new Date().toISOString().split('T')[0]}.csv`; link.click()
}

async function loadQaResults() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase.value.from(`qa_results${settings.tableSuffix}`).select('*').gte('created_at', `${today}T00:00:00Z`).order('created_at', { ascending: false })
    if (error) throw error
    qa.results = (data || []).map((d: any) => ({ id: d.item_id, title: d.processed_title, source_name: d.source_name, titleScore: d.title_score, summaryScore: d.summary_score, ahaReasonable: d.aha_reasonable, push: d.push, reason: d.reason, pass: d.pass, date: new Date(d.created_at).toLocaleDateString(), prompt_text: d.prompt_text, llm_response: d.llm_response }))
    if (qa.results.length > 0 && !selectedResult.value) selectedResult.value = qa.results[0]
    activeQaSources.value = dynamicQaSourceOptions.value.map(s => s.name)
  } catch (e) { console.error('Failed to load QA results:', e) }
}

defineExpose({ loadItems: loadQaResults })
onMounted(loadQaResults)
</script>

<template>
  <div class="page active">
    <div class="two-pane">
      <div class="list-pane">
        <div class="list-pane-header">
          <div class="list-pane-title">AI 质检</div>
          <button class="btn-new" @click="startQA" :disabled="qa.running">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {{ qa.running ? '运行中...' : '运行' }}
          </button>
        </div>
        <div class="item-list">
          <div v-for="res in filteredQaResults" :key="res.id" :class="['content-card', selectedResult?.id === res.id ? 'active' : '']" @click="selectedResult = res">
            <div class="card-top">
              <div class="card-title">{{ res.title }}</div>
              <span :class="['card-tag', res.pass ? 'tag-done' : 'tag-fail']">{{ res.pass ? '通过' : '失败' }}</span>
            </div>
            <div class="card-preview">标题: {{ res.titleScore }} · 摘要: {{ res.summaryScore }} · 推送: {{ res.push ? '✓' : '✗' }}</div>
            <div class="card-meta">
              <div class="meta-pill"><div class="dot-live"></div><span class="live-label">最新</span></div>
              <div class="meta-pill">{{ res.date }}</div>
            </div>
          </div>
          <div v-if="filteredQaResults.length === 0 && !qa.running" class="p-10 text-center text-text-dim text-xs">暂无匹配内容</div>
        </div>
        <SourceFilter :sources="dynamicQaSourceOptions" :active-sources="activeQaSources" :show-pass-fail="true" @toggle="toggleQaSource" @toggle-all="toggleAllQaSources" />
      </div>

      <div class="detail-pane" v-if="selectedResult">
        <div class="detail-topbar">
          <div class="mini-stat">综合评价 <span class="mini-stat-val" :style="{ color: selectedResult.pass ? 'var(--green)' : 'var(--red)' }">{{ selectedResult.pass ? '通过' : '失败' }}</span></div>
          <div class="divider-v"></div>
          <div class="mini-stat">检测时间 <span class="mini-stat-val">{{ selectedResult.date }}</span></div>
        </div>
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-title">{{ selectedResult.title }}</div>
            <span :class="['card-tag', selectedResult.pass ? 'tag-done' : 'tag-fail']">{{ selectedResult.pass ? '通过' : '失败' }}</span>
          </div>
          <div class="detail-actions">
            <button class="btn-secondary" @click="exportQA">导出结果</button>
            <button class="btn-primary">批准发布</button>
          </div>
        </div>
        <div class="detail-body">
          <div class="qa-grid">
            <div :class="['qa-score-card', selectedResult.titleScore >= 4 ? 'pass' : selectedResult.titleScore >= 3 ? 'warn' : 'fail']">
              <div class="score-label">标题评分</div>
              <div :class="['score-val', selectedResult.titleScore >= 4 ? 'pass' : selectedResult.titleScore >= 3 ? 'warn' : 'fail']">{{ selectedResult.titleScore }}/5</div>
              <div class="score-desc">针对处理后标题的吸引力和准确性评分</div>
            </div>
            <div :class="['qa-score-card', selectedResult.summaryScore >= 4 ? 'pass' : selectedResult.summaryScore >= 3 ? 'warn' : 'fail']">
              <div class="score-label">摘要评分</div>
              <div :class="['score-val', selectedResult.summaryScore >= 4 ? 'pass' : selectedResult.summaryScore >= 3 ? 'warn' : 'fail']">{{ selectedResult.summaryScore }}/5</div>
              <div class="score-desc">针对摘要的信息密度和逻辑性评分</div>
            </div>
            <div :class="['qa-score-card', selectedResult.push ? 'pass' : 'fail']">
              <div class="score-label">推送建议</div>
              <div :class="['score-val', selectedResult.push ? 'pass' : 'fail']">{{ selectedResult.push ? '建议推送' : '不建议' }}</div>
              <div class="score-desc">基于内容质量的自动化推送决策</div>
            </div>
            <div class="qa-score-card pass">
              <div class="score-label">AHA 合理性</div>
              <div class="score-val pass" style="font-size:26px">{{ selectedResult.ahaReasonable }}</div>
              <div class="score-desc">AI 评估 AHA 指数标注是否符合内容实际</div>
            </div>
          </div>
          <div class="content-block">
            <div class="block-label">质检理由</div>
            <div class="block-text">{{ selectedResult.reason }}</div>
          </div>
          <div class="content-block" v-if="selectedResult.prompt_text">
            <div class="block-label">发送给大模型的 Prompt</div>
            <div class="block-text font-mono text-xs whitespace-pre-wrap text-text-dim" style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">{{ selectedResult.prompt_text }}</div>
          </div>
          <div class="content-block" v-if="selectedResult.llm_response">
            <div class="block-label">大模型返回结果</div>
            <div class="block-text font-mono text-xs whitespace-pre-wrap text-text-dim" style="background: var(--surface); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">{{ selectedResult.llm_response }}</div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="选择一条质检记录" subtitle="从左侧列表选择一条记录查看详情">
        <template #icon>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </template>
      </EmptyState>
    </div>
  </div>
</template>
