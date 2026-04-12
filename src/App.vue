<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { todayStr } from '@/composables/useHelpers'

import AppSidebar from '@/components/AppSidebar.vue'
import AppToast from '@/components/AppToast.vue'
import LoginScreen from '@/components/LoginScreen.vue'
import SettingsModal from '@/components/SettingsModal.vue'

import RawItemsPage from '@/pages/RawItemsPage.vue'
import ProcessedItemsPage from '@/pages/ProcessedItemsPage.vue'
import DisplayItemsPage from '@/pages/DisplayItemsPage.vue'
import QaPage from '@/pages/QaPage.vue'
import ScrapersPage from '@/pages/ScrapersPage.vue'
import PromptsPage from '@/pages/PromptsPage.vue'
import RankingPage from '@/pages/RankingPage.vue'
import SystemSettingsPage from '@/pages/SystemSettingsPage.vue'
import PipelineRunsPage from '@/pages/PipelineRunsPage.vue'
import AnalyticsPage from '@/pages/AnalyticsPage.vue'

const { authLoading, isLoggedIn, handleAuthSession, setupAuthListener, reinit, supabase } = useSupabase()
const { loadSettings, saveSettings, tableName } = useSettings()

const currentTab = ref('raw')
const showSettings = ref(false)

const rawPage = ref<InstanceType<typeof RawItemsPage>>()
const processedPage = ref<InstanceType<typeof ProcessedItemsPage>>()
const displayPage = ref<InstanceType<typeof DisplayItemsPage>>()
const qaPage = ref<InstanceType<typeof QaPage>>()
const scrapersPage = ref<InstanceType<typeof ScrapersPage>>()
const promptsPage = ref<InstanceType<typeof PromptsPage>>()
const rankingPage = ref<InstanceType<typeof RankingPage>>()
const systemSettingsPage = ref<InstanceType<typeof SystemSettingsPage>>()
const pipelineRunsPage = ref<InstanceType<typeof PipelineRunsPage>>()
const analyticsPage = ref<InstanceType<typeof AnalyticsPage>>()

const sidebarCounts = reactive({ raw: 0, processed: 0, display: 0, scrapers: 0, prompts: 0, qa: 0 })

async function refreshSidebarCounts() {
  if (!isLoggedIn.value) return
  const tn = tableName
  const today = todayStr()
  const head = (table: string, chain?: (q: any) => any) => {
    let q = supabase.value.from(table).select('*', { count: 'exact', head: true })
    if (chain) q = chain(q)
    return q
  }
  try {
    const [rawRes, procRes, dispRes, scRes, prRes, qaRes] = await Promise.all([
      head(tn('raw_items')),
      head(tn('processed_items')),
      head(tn('display_items')),
      head(tn('scraper_configs')),
      head(tn('prompt_templates')),
      head(tn('qa_results'), (q: any) => q.gte('created_at', `${today}T00:00:00Z`)),
    ])
    const pick = (r: { count: number | null; error: any }) => (r.error ? 0 : (r.count ?? 0))
    sidebarCounts.raw = pick(rawRes)
    sidebarCounts.processed = pick(procRes)
    sidebarCounts.display = pick(dispRes)
    sidebarCounts.scrapers = pick(scRes)
    sidebarCounts.prompts = pick(prRes)
    sidebarCounts.qa = pick(qaRes)
  } catch (e: any) {
    console.error('refreshSidebarCounts', e)
  }
}

function reloadCurrentTab() {
  const loaders: Record<string, () => void> = {
    raw: () => rawPage.value?.loadItems(),
    processed: () => processedPage.value?.loadItems(),
    display: () => displayPage.value?.loadItems(),
    qa: () => qaPage.value?.loadItems(),
    scrapers: () => scrapersPage.value?.loadItems(),
    prompts: () => promptsPage.value?.loadItems(),
    ranking: () => rankingPage.value?.loadItems(),
    cfgsettings: () => systemSettingsPage.value?.loadItems(),
    runs: () => pipelineRunsPage.value?.loadItems(),
    analytics: () => analyticsPage.value?.loadItems(),
  }
  loaders[currentTab.value]?.()
  void refreshSidebarCounts()
}

function handleEnvChange() {
  reloadCurrentTab()
}

function handleSaveSettings() {
  saveSettings()
  reinit()
  showSettings.value = false
  reloadCurrentTab()
}

watch(currentTab, () => {
  if (isLoggedIn.value) void refreshSidebarCounts()
})

onMounted(async () => {
  await handleAuthSession()
  loadSettings()

  setupAuthListener(() => {
    reloadCurrentTab()
  })

  if (isLoggedIn.value) {
    reloadCurrentTab()
  }
})
</script>

<template>
  <!-- Auth Loading -->
  <div v-if="authLoading" class="login-loading">
    <svg class="animate-spin h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    验证登录状态...
  </div>

  <!-- Login Screen -->
  <LoginScreen v-else-if="!isLoggedIn" />

  <!-- Main App -->
  <div v-else class="flex h-screen w-full overflow-hidden" style="background: var(--bg); color: var(--text); font-family: var(--sans);">
    <AppSidebar
      v-model:current-tab="currentTab"
      :raw-count="sidebarCounts.raw"
      :processed-count="sidebarCounts.processed"
      :display-count="sidebarCounts.display"
      :scraper-count="sidebarCounts.scrapers"
      :prompt-count="sidebarCounts.prompts"
      :qa-count="sidebarCounts.qa"
      @env-change="handleEnvChange"
      @open-settings="showSettings = true"
    />

    <div class="main">
      <RawItemsPage v-if="currentTab === 'raw'" ref="rawPage" />
      <ProcessedItemsPage v-if="currentTab === 'processed'" ref="processedPage" />
      <DisplayItemsPage v-if="currentTab === 'display'" ref="displayPage" />
      <QaPage v-if="currentTab === 'qa'" ref="qaPage" />
      <ScrapersPage v-if="currentTab === 'scrapers'" ref="scrapersPage" />
      <PromptsPage v-if="currentTab === 'prompts'" ref="promptsPage" />
      <RankingPage v-if="currentTab === 'ranking'" ref="rankingPage" />
      <SystemSettingsPage v-if="currentTab === 'cfgsettings'" ref="systemSettingsPage" />
      <PipelineRunsPage v-if="currentTab === 'runs'" ref="pipelineRunsPage" />
      <AnalyticsPage v-if="currentTab === 'analytics'" ref="analyticsPage" />
    </div>

    <SettingsModal :show="showSettings" @close="showSettings = false" @save="handleSaveSettings" />
  </div>

  <AppToast />
</template>
