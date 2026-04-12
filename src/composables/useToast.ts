import { reactive } from 'vue'

const toast = reactive({ show: false, message: '' })
let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  const showToast = (msg: string) => {
    toast.message = msg
    toast.show = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { toast.show = false }, 3000)
  }

  return { toast, showToast }
}
