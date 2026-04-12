import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ref, shallowRef } from 'vue'

const SUPABASE_URL = 'https://wyhpcfjtmtitorinkevj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Mhngg1gf4z4dkj-xh5TsMg_Pz3crwfo'
const ALLOWED_USERS: string[] = []

const supabaseRef = shallowRef<SupabaseClient>(createClient(SUPABASE_URL, SUPABASE_ANON_KEY))

const authLoading = ref(true)
const isLoggedIn = ref(false)
const authUser = ref<any>(null)
const authBusy = ref(false)
const authError = ref('')

function clearStaleAuth() {
  Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
}

;(function preCheck() {
  const hash = window.location.hash
  if (hash && hash.includes('access_token=')) {
    try {
      const params = new URLSearchParams(hash.substring(1))
      const expiresAt = parseInt(params.get('expires_at') || '', 10)
      if (expiresAt && Date.now() / 1000 > expiresAt) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    } catch (_) {}
  }
  const storageKey = 'sb-wyhpcfjtmtitorinkevj-auth-token'
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const stored = JSON.parse(raw)
      const expiresAt = stored?.expires_at || stored?.currentSession?.expires_at
      if (expiresAt && Date.now() / 1000 > expiresAt) {
        Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k))
      }
    }
  } catch (_) {}
})()

export function useSupabase() {
  const reinit = () => {
    supabaseRef.value = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  const loginWithGithub = async () => {
    authBusy.value = true
    authError.value = ''
    try {
      clearStaleAuth()
      reinit()
      const { data, error } = await supabaseRef.value.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin + window.location.pathname }
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (e: any) {
      authError.value = '登录失败: ' + e.message
      authBusy.value = false
    }
  }

  const logout = async () => {
    await supabaseRef.value.auth.signOut()
    clearStaleAuth()
    isLoggedIn.value = false
    authUser.value = null
  }

  const handleAuthSession = async () => {
    authLoading.value = true
    try {
      const { data: { session }, error } = await supabaseRef.value.auth.getSession()
      if (error) throw error
      if (session?.user) {
        const meta = session.user.user_metadata || {}
        const login = meta.user_name || meta.preferred_username || ''
        if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(login)) {
          authError.value = `用户 @${login} 无权访问此系统`
          await supabaseRef.value.auth.signOut()
          isLoggedIn.value = false
          authLoading.value = false
          return
        }
        authUser.value = {
          id: session.user.id,
          email: session.user.email,
          name: meta.full_name || meta.name || login,
          login,
          avatar_url: meta.avatar_url || ''
        }
        isLoggedIn.value = true
      }
    } catch (e) {
      console.error('Auth error:', e)
    } finally {
      authLoading.value = false
    }
  }

  const setupAuthListener = (onSignIn: () => void) => {
    supabaseRef.value.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const meta = session.user.user_metadata || {}
        const login = meta.user_name || meta.preferred_username || ''
        if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(login)) {
          authError.value = `用户 @${login} 无权访问此系统`
          supabaseRef.value.auth.signOut()
          isLoggedIn.value = false
          return
        }
        authUser.value = {
          id: session.user.id, email: session.user.email,
          name: meta.full_name || meta.name || login,
          login, avatar_url: meta.avatar_url || ''
        }
        isLoggedIn.value = true
        onSignIn()
      } else if (event === 'SIGNED_OUT') {
        isLoggedIn.value = false
        authUser.value = null
      }
    })
  }

  return {
    supabase: supabaseRef,
    authLoading,
    isLoggedIn,
    authUser,
    authBusy,
    authError,
    loginWithGithub,
    logout,
    handleAuthSession,
    setupAuthListener,
    reinit,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  }
}
