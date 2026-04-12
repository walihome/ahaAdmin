export function getDuration(start: string, end: string) {
  if (!start || !end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return ms + 'ms'
  const secs = Math.round(ms / 1000)
  if (secs < 60) return secs + 's'
  const mins = Math.floor(secs / 60)
  return mins + 'm ' + (secs % 60) + 's'
}

export function getRankActionLabel(action: string) {
  const labels: Record<string, string> = {
    'selected': '入选',
    'filtered_by_limit': '截断',
    'filtered_by_ai': 'AI淘汰',
    'filtered_by_link': '链接失效',
    'filtered_by_dedup': '重复'
  }
  return labels[action] || action
}

export function getRankActionClass(action: string) {
  const classes: Record<string, string> = {
    'selected': 'tag-selected',
    'filtered_by_limit': 'tag-limit',
    'filtered_by_ai': 'tag-ai-fail',
    'filtered_by_link': 'tag-link-fail',
    'filtered_by_dedup': 'tag-dedup'
  }
  return classes[action] || ''
}

export function getRankDetailLabel(key: string) {
  const labels: Record<string, string> = {
    'actionability': '可操作性',
    'tech_depth': '技术深度',
    'impact': '影响力',
    'scarcity': '稀缺性',
    'audience_fit': '受众匹配',
    'marketing_penalty': '营销惩罚',
    'duplicate_penalty': '重复惩罚',
    'sort_by': '排序依据'
  }
  return labels[key] || key
}

export function filteredRankDetail(detail: Record<string, any> | null) {
  if (!detail) return {}
  const { comment, ...rest } = detail
  return rest
}

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function changeDate(filter: { date: string }, days: number) {
  const d = new Date(filter.date)
  if (isNaN(d.getTime())) return
  d.setDate(d.getDate() + days)
  filter.date = d.toISOString().split('T')[0]
}
