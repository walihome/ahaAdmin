<script setup lang="ts">
import { useSupabase } from '@/composables/useSupabase'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  currentTab: string
  rawCount: number
  processedCount: number
  displayCount: number
  scraperCount: number
  promptCount: number
  qaCount?: number
}>()

const emit = defineEmits<{
  'update:currentTab': [tab: string]
  'envChange': [isTest: boolean]
  'openSettings': []
}>()

const { authUser, logout: doLogout } = useSupabase()
const { settings, setEnv: doSetEnv } = useSettings()
const { showToast } = useToast()

const tabs = [
  { section: '内容管理', items: [
    { key: 'raw', label: '原始内容', icon: 'doc', countProp: 'rawCount' },
    { key: 'processed', label: '加工内容', icon: 'radio', countProp: 'processedCount' },
    { key: 'display', label: '展示内容', icon: 'book', countProp: 'displayCount' },
    { key: 'qa', label: 'AI 质检', icon: 'check', countProp: 'qaCount' },
  ]},
  { section: '配置管理', items: [
    { key: 'scrapers', label: '数据源管理', icon: 'globe', countProp: 'scraperCount' },
    { key: 'prompts', label: 'Prompt 管理', icon: 'grid', countProp: 'promptCount' },
    { key: 'ranking', label: '排序规则', icon: 'hash' },
    { key: 'cfgsettings', label: '系统设置', icon: 'gear' },
  ]},
  { section: '执行监控', items: [
    { key: 'runs', label: 'Pipeline 运行', icon: 'pulse' },
  ]},
  { section: '数据分析', items: [
    { key: 'analytics', label: '每日爆点分析', icon: 'chart' },
  ]}
]

function getCount(prop?: string) {
  if (!prop) return 0
  return (props as any)[prop] || 0
}

function handleSetEnv(isTest: boolean) {
  doSetEnv(isTest)
  emit('envChange', isTest)
  showToast(`已切换至${isTest ? '测试' : '生产'}环境`)
}

async function handleLogout() {
  await doLogout()
  showToast('已退出登录')
}
</script>

<template>
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon">A</div>
      <div>
        <div class="logo-text">AHA Index</div>
        <div class="logo-sub">Admin Console</div>
      </div>
    </div>

    <div v-for="section in tabs" :key="section.section" class="nav-section">
      <div class="nav-label">{{ section.section }}</div>
      <a
        v-for="item in section.items"
        :key="item.key"
        :class="['nav-item', currentTab === item.key ? 'active' : '']"
        @click="$emit('update:currentTab', item.key)"
      >
        <div class="nav-icon">
          <!-- doc -->
          <svg v-if="item.icon === 'doc'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <!-- radio -->
          <svg v-else-if="item.icon === 'radio'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          <!-- book -->
          <svg v-else-if="item.icon === 'book'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <!-- check -->
          <svg v-else-if="item.icon === 'check'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <!-- globe -->
          <svg v-else-if="item.icon === 'globe'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/></svg>
          <!-- grid -->
          <svg v-else-if="item.icon === 'grid'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <!-- hash -->
          <svg v-else-if="item.icon === 'hash'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
          <!-- gear -->
          <svg v-else-if="item.icon === 'gear'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <!-- pulse -->
          <svg v-else-if="item.icon === 'pulse'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <!-- chart -->
          <svg v-else-if="item.icon === 'chart'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
        {{ item.label }}
        <span class="nav-badge" v-if="item.countProp && getCount(item.countProp)">{{ getCount(item.countProp) }}</span>
      </a>
    </div>

    <div class="sidebar-bottom">
      <div class="env-toggle">
        <div :class="['env-btn', 'prod', !settings.isTest ? 'active' : '']" @click="handleSetEnv(false)">生产</div>
        <div :class="['env-btn', 'test', settings.isTest ? 'active' : '']" @click="handleSetEnv(true)">测试</div>
      </div>
      <div class="user-card" @click="$emit('openSettings')">
        <img v-if="authUser?.avatar_url" :src="authUser.avatar_url" class="w-7 h-7 rounded-full flex-shrink-0" style="object-fit:cover;">
        <div v-else class="avatar">{{ (authUser?.name || 'A').charAt(0).toUpperCase() }}</div>
        <div style="flex:1; min-width:0;">
          <div class="user-name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ authUser?.name || authUser?.login || 'Admin' }}</div>
          <div class="user-role">{{ authUser?.login || 'admin' }}</div>
        </div>
        <div @click.stop="handleLogout" class="icon-btn" title="退出登录" style="width:24px; height:24px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </div>
      </div>
    </div>
  </aside>
</template>
