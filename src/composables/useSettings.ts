import { reactive } from 'vue'

const settings = reactive({
  supabaseUrl: 'https://wyhpcfjtmtitorinkevj.supabase.co',
  supabaseKey: '',
  kimiKey: '',
  tableSuffix: '',
  isTest: false
})

export function useSettings() {
  const loadSettings = () => {
    const saved = localStorage.getItem('ai_admin_settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      settings.kimiKey = parsed.kimiKey || ''
      settings.tableSuffix = parsed.tableSuffix || ''
      settings.isTest = parsed.isTest || false
    }
  }

  const saveSettings = () => {
    localStorage.setItem('ai_admin_settings', JSON.stringify(settings))
  }

  const setEnv = (isTest: boolean) => {
    settings.isTest = isTest
    settings.tableSuffix = isTest ? '_test' : ''
    saveSettings()
  }

  const tableName = (base: string) => `${base}${settings.tableSuffix}`

  return { settings, loadSettings, saveSettings, setEnv, tableName }
}
