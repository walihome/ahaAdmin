import { ref, computed, type Ref } from 'vue'

export function useSourceFilter<T extends Record<string, any>>(
  items: Ref<T[]>,
  sourceField: string = 'source_name'
) {
  const activeSources = ref<string[]>([])

  const dynamicSourceOptions = computed(() => {
    const counts: Record<string, number> = {}
    items.value.forEach(item => {
      const s = (item as any)[sourceField] || '未知'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  })

  const filteredItems = computed(() => {
    if (activeSources.value.length === 0) return items.value
    return items.value.filter(item => activeSources.value.includes((item as any)[sourceField] || '未知'))
  })

  const toggleSource = (source: string) => {
    const index = activeSources.value.indexOf(source)
    if (index > -1) activeSources.value.splice(index, 1)
    else activeSources.value.push(source)
  }

  const toggleAllSources = () => {
    if (activeSources.value.length === dynamicSourceOptions.value.length) {
      activeSources.value = []
    } else {
      activeSources.value = dynamicSourceOptions.value.map(s => s.name)
    }
  }

  const syncSources = () => {
    activeSources.value = dynamicSourceOptions.value.map(s => s.name)
  }

  return {
    activeSources,
    dynamicSourceOptions,
    filteredItems,
    toggleSource,
    toggleAllSources,
    syncSources
  }
}
