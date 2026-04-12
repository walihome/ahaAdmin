<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'

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

const { authLoading, isLoggedIn, handleAuthSession, setupAuthListener, reinit } = useSupabase()
const { settings, loadSettings, saveSettings } = useSettings()
const { showToast } = useToast()

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

const rawItems = ref<any[]>([])
const processedItems = ref<any[]>([])
const displayItems = ref<any[]>([])
const scraperConfigs = ref<any[]>([])
const promptTemplates = ref<any[]>([])

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
      :raw-count="0"
      :processed-count="0"
      :display-count="0"
      :scraper-count="0"
      :prompt-count="0"
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
