import type { DayRun, MenuItem, MenuCategory, AutoDecide, Recipe } from './types'

let _idCounter = 0

export function generateId(): string {
  _idCounter++
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${ts}-${rand}-${_idCounter}`
}

export function formatCurrency(amount: number): string {
  return `${Math.round(amount).toLocaleString()}`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDayNumber(): number {
  const start = new Date(2026, 0, 1)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

export function shortName(name: string): string {
  return name
    .replace(/[?？\s]/g, '')
    .replace(/[^a-zA-Z0-9ก-๙]/g, '')
    .slice(0, 10)
}

export function generateSaleId(dayNumber: number, date: string, index: number, autoDecide: string, name: string, profile: string): string {
  const sn = shortName(name) || 'NA'
  const ad = autoDecide === 'ice' ? 'I' : autoDecide === 'hot' ? 'H' : 'NA'
  return `${dayNumber}-${date.replace(/-/g, '')}-${index}-${ad}-${sn}-${profile}`
}

export function totalSales(run: DayRun): number {
  return run.sales.reduce((sum, s) => sum + s.total, 0)
}

export function servingsCount(run: DayRun): number {
  return run.sales.reduce((sum, s) => sum + s.items.reduce((si, i) => si + i.quantity, 0), 0)
}

export function salesByCategory(run: DayRun): Record<string, number> {
  const map: Record<string, number> = {}
  for (const sale of run.sales) {
    for (const item of sale.items) {
      map[item.menuItemName] = (map[item.menuItemName] || 0) + item.quantity
    }
  }
  return map
}

export function mostPopularItem(run: DayRun): { name: string; count: number } | null {
  const byName = salesByCategory(run)
  const entries = Object.entries(byName)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  return { name: entries[0][0], count: entries[0][1] }
}

export function exportToCSV(run: DayRun): string {
  const rows: string[][] = []
  if (run.difficultyLogs?.length || run.resistLogs?.length || run.darkEventLogs?.length) {
    rows.push(['--- Operation Intel ---', '', '', '', '', '', ''])
    if (run.difficultyLogs?.length) {
      rows.push(['Type', 'Value', 'Note', 'Time', '', '', ''])
      run.difficultyLogs.forEach(l => rows.push(['Difficulty', String(l.value), l.note || '', formatTime(l.timestamp), '', '', '']))
    }
    if (run.resistLogs?.length) {
      if (!run.difficultyLogs?.length) rows.push(['Type', 'Value', 'Note', 'Time', '', '', ''])
      run.resistLogs.forEach(l => rows.push(['Resist', String(l.value), l.note || '', formatTime(l.timestamp), '', '', '']))
    }
    if (run.darkEventLogs?.length) {
      if (!run.difficultyLogs?.length && !run.resistLogs?.length) rows.push(['Type', 'Value', 'Note', 'Time', '', '', ''])
      run.darkEventLogs.forEach(l => rows.push(['Dark Event', '', l.note, formatTime(l.timestamp), '', '', '']))
    }
    rows.push(['', '', '', '', '', '', ''])
  }
  rows.push(['ID', 'Time', 'Items', 'Total', 'Profile', 'Nationality', 'Note'])
  for (const sale of run.sales) {
    rows.push([
      sale.id,
      formatTime(sale.timestamp),
      sale.items.map(i => `${i.menuItemName}x${i.quantity}`).join('; '),
      String(sale.total),
      sale.customerProfile || '',
      sale.nationality || '',
      sale.note || '',
    ])
  }
  return rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
}

export interface MenuImportResult {
  valid: MenuItem[]
  errors: { index: number; message: string }[]
}

export function parseMenuImportJSON(jsonString: string): MenuImportResult {
  const valid: MenuItem[] = []
  const errors: { index: number; message: string }[] = []
  let parsed: unknown[]

  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { valid: [], errors: [{ index: -1, message: 'Invalid JSON syntax' }] }
  }

  if (!Array.isArray(parsed)) {
    return { valid: [], errors: [{ index: -1, message: 'JSON must be an array' }] }
  }

  const validCategories: MenuCategory[] = ['Iced Coffee Drinks', 'Espresso Drinks', 'Brewed/Filter Coffee', 'Other']
  const validAutoDecides: AutoDecide[] = ['hot', 'ice', 'decided']

  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i] as Record<string, unknown> | null
    const itemErrors: string[] = []

    if (!entry || typeof entry !== 'object') {
      errors.push({ index: i, message: 'Not an object' })
      continue
    }

    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    if (!name) itemErrors.push('Missing name')

    const price = typeof entry.price === 'number' ? entry.price : Number(entry.price)
    if (isNaN(price) || price < 0) itemErrors.push('Invalid price')

    const category = entry.category as string
    if (!validCategories.includes(category as MenuCategory)) itemErrors.push('Invalid category')

    const autoDecide = entry.autoDecide as string
    if (!validAutoDecides.includes(autoDecide as AutoDecide)) itemErrors.push('Invalid autoDecide')

    if (itemErrors.length > 0) {
      errors.push({ index: i, message: itemErrors.join('; ') })
      continue
    }

    valid.push({
      id: generateId(),
      name,
      price,
      category: category as MenuCategory,
      autoDecide: autoDecide as AutoDecide,
      beanId: typeof entry.beanId === 'string' ? entry.beanId : undefined,
      active: entry.active !== false,
      recipe: entry.recipe as Recipe | undefined,
      createdAt: new Date().toISOString(),
    })
  }

  return { valid, errors }
}
