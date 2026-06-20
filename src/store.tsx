import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react'
import type { AppData, MenuItem, BeanInventory, DayRun, Sale, CustomerProfile, InventoryTransaction, BeanCostSummary, PosMode, WeatherLog, PurchaseOrder, FundingSource } from './types'
import type { TastingNotes } from './coffee-data'
import { generateId, todayISO, getDayNumber, generateSaleId } from './utils'
import { generateSeedData } from './seed-data'

const REAL_KEY = 'centrolstock.data'
const TEST_KEY = 'centrolstock.testData'
const KEY_FLAG = 'centrolstock.storeKey'

function getStoreKey(): string {
  try { return localStorage.getItem(KEY_FLAG) === TEST_KEY ? TEST_KEY : REAL_KEY } catch { return REAL_KEY }
}

const EMPTY_DATA: AppData = {
  menu: [],
  beans: [],
  runs: [],
  transactions: [],
  purchaseOrders: [],
  fundingSources: [],
  activeRunId: null,
  mode: 'operational',
}

function migrateBean(bean: BeanInventory): BeanInventory {
  const rl = bean.roastLevel as unknown
  if (typeof rl === 'string') {
    const map: Record<string, number> = { 'green': 5, 'cinnamon': 10, 'light': 20, 'light-medium': 33, 'medium': 48, 'medium-dark': 63, 'dark': 75, 'espresso': 85, 'french': 94, 'italian': 100 }
    bean.roastLevel = map[rl.toLowerCase().trim()] ?? 48
  }
  const tn = bean.tastingNotes as unknown
  if (Array.isArray(tn)) {
    const old = tn as string[]
    const notes: TastingNotes = { floral: [], fruity: [], sweet: [], nutty: [], spicy: [], fermented: [], other: [] }
    for (const n of old) {
      const colonIdx = n.indexOf(':')
      if (colonIdx > 0) {
        const cat = n.slice(0, colonIdx).toLowerCase()
        const val = n.slice(colonIdx + 1).trim()
        if (cat in notes) (notes[cat as keyof TastingNotes] as string[]).push(val)
        else notes.other.push(n)
      } else {
        notes.other.push(n)
      }
    }
    bean.tastingNotes = notes
  }
  return bean
}

function migrateRuns(runs: DayRun[]): DayRun[] {
  return runs.map(r => {
    const old = r as any
    if (!r.weatherLogs && old.weather !== undefined) {
      r.weatherLogs = old.weather ? [{ id: generateId(), timestamp: new Date().toISOString(), ...old.weather }] : []
    }
    if (!r.weatherLogs) r.weatherLogs = []
    if (!r.operatorState) r.operatorState = null
    if (!r.actionPoints) r.actionPoints = null
    if (!r.note) r.note = ''
    return r
  })
}

function loadData(key: string): AppData {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw) as AppData
      if (!data.transactions) data.transactions = []
      if (!data.fundingSources) data.fundingSources = []
      if (!data.purchaseOrders) data.purchaseOrders = []
      if (data.beans) data.beans = data.beans.map(migrateBean)
      if (data.runs) data.runs = migrateRuns(data.runs)
      if (data.fundingSources) {
        data.fundingSources = data.fundingSources.map(s => ({ ...s, categories: s.categories ?? [] }))
      }
      if (data.purchaseOrders) {
        data.purchaseOrders = data.purchaseOrders.map(o => ({
          ...o,
          items: o.items.map(i => {
            const old = i as any
            if (!i.itemName && old.beanName) {
              return {
                itemName: old.beanName || 'Unknown',
                category: 'Coffee Beans',
                quantity: old.quantityGrams ?? 0,
                unit: 'g',
                totalCost: old.totalCost ?? 0,
                note: old.note ?? '',
                purchaseDate: o.createdAt?.slice(0, 10) ?? '',
              }
            }
            return i
          }),
        }))
      }
    }
  } catch {}
  return { ...EMPTY_DATA, transactions: [] }
}

type Action =
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_MENU_ITEM'; payload: string }
  | { type: 'ADD_BEAN'; payload: BeanInventory }
  | { type: 'UPDATE_BEAN'; payload: BeanInventory }
  | { type: 'REMOVE_BEAN'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: InventoryTransaction }
  | { type: 'REMOVE_TRANSACTION'; payload: string }
  | { type: 'UPDATE_TRANSACTION'; payload: { transactionId: string; updates: Partial<InventoryTransaction> } }
  | { type: 'START_RUN'; payload: DayRun }
  | { type: 'SET_ACTIVE_RUN'; payload: string }
  | { type: 'PAUSE_RUN'; payload: string }
  | { type: 'END_RUN'; payload: string }
  | { type: 'RESUME_RUN'; payload: string }
  | { type: 'REMOVE_RUN'; payload: string }
  | { type: 'ADD_SALE'; payload: { runId: string; sale: Sale } }
  | { type: 'UPDATE_SALE'; payload: { runId: string; saleId: string; updates: Partial<Sale> } }
  | { type: 'REMOVE_SALE'; payload: { runId: string; saleId: string } }
  | { type: 'ADD_WEATHER_LOG'; payload: { runId: string; weatherLog: WeatherLog } }
  | { type: 'UPDATE_WEATHERS'; payload: { runId: string; weatherLogs: WeatherLog[] } }
  | { type: 'UPDATE_WEATHER_LOG'; payload: { runId: string; weatherLogId: string; updates: Partial<WeatherLog> } }
  | { type: 'UPDATE_OPERATOR'; payload: { runId: string; state: DayRun['operatorState'] } }
  | { type: 'UPDATE_POINTS'; payload: { runId: string; points: DayRun['actionPoints'] } }
  | { type: 'SET_MODE'; payload: PosMode }
  | { type: 'UPDATE_RUN'; payload: { runId: string; updates: Partial<DayRun> } }
  | { type: 'ADD_PURCHASE_ORDER'; payload: PurchaseOrder }
  | { type: 'UPDATE_PURCHASE_ORDER'; payload: { orderId: string; updates: Partial<PurchaseOrder> } }
  | { type: 'REMOVE_PURCHASE_ORDER'; payload: string }
  | { type: 'ADD_FUNDING_SOURCE'; payload: FundingSource }
  | { type: 'UPDATE_FUNDING_SOURCE'; payload: { sourceId: string; updates: Partial<FundingSource> } }
  | { type: 'REMOVE_FUNDING_SOURCE'; payload: string }
  | { type: 'LOAD_DATA'; payload: AppData }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'ADD_MENU_ITEM':
      return { ...state, menu: [...state.menu, action.payload] }
    case 'UPDATE_MENU_ITEM':
      return { ...state, menu: state.menu.map(m => m.id === action.payload.id ? action.payload : m) }
    case 'REMOVE_MENU_ITEM':
      return { ...state, menu: state.menu.filter(m => m.id !== action.payload) }
    case 'ADD_BEAN': {
      const newBean = { ...action.payload }
      return { ...state, beans: [...state.beans, newBean] }
    }
    case 'UPDATE_BEAN':
      return { ...state, beans: state.beans.map(b => b.id === action.payload.id ? action.payload : b) }
    case 'REMOVE_BEAN':
      return { ...state, beans: state.beans.filter(b => b.id !== action.payload) }
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] }
    case 'REMOVE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) }
    case 'UPDATE_TRANSACTION':
      return { ...state, transactions: state.transactions.map(t => t.id === action.payload.transactionId ? { ...t, ...action.payload.updates } : t) }
    case 'START_RUN':
      return { ...state, runs: [action.payload, ...state.runs], activeRunId: action.payload.id }
    case 'SET_ACTIVE_RUN':
      return { ...state, activeRunId: action.payload }
    case 'PAUSE_RUN': {
      const runs = state.runs.map(r =>
        r.id === action.payload ? { ...r, status: 'paused' as const } : r
      )
      return { ...state, runs }
    }
    case 'END_RUN': {
      const runs = state.runs.map(r =>
        r.id === action.payload ? { ...r, status: 'ended' as const } : r
      )
      return { ...state, runs, activeRunId: null }
    }
    case 'RESUME_RUN': {
      const runs = state.runs.map(r =>
        r.id === action.payload ? { ...r, status: 'active' as const } : r
      )
      return { ...state, runs, activeRunId: action.payload }
    }
    case 'REMOVE_RUN': {
      const runs = state.runs.filter(r => r.id !== action.payload)
      const activeRunId = state.activeRunId === action.payload ? null : state.activeRunId
      return { ...state, runs, activeRunId }
    }
    case 'ADD_SALE': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, sales: [...r.sales, action.payload.sale] }
      })
      return { ...state, runs }
    }
    case 'UPDATE_SALE': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, sales: r.sales.map(s => s.id === action.payload.saleId ? { ...s, ...action.payload.updates } : s) }
      })
      return { ...state, runs }
    }
    case 'REMOVE_SALE': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, sales: r.sales.filter(s => s.id !== action.payload.saleId) }
      })
      return { ...state, runs }
    }
    case 'ADD_WEATHER_LOG': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, weatherLogs: [...r.weatherLogs, action.payload.weatherLog] }
      })
      return { ...state, runs }
    }
    case 'UPDATE_WEATHERS': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, weatherLogs: action.payload.weatherLogs }
      })
      return { ...state, runs }
    }
    case 'UPDATE_WEATHER_LOG': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return {
          ...r,
          weatherLogs: r.weatherLogs.map(w =>
            w.id === action.payload.weatherLogId ? { ...w, ...action.payload.updates } : w
          ),
        }
      })
      return { ...state, runs }
    }
    case 'UPDATE_OPERATOR': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, operatorState: action.payload.state }
      })
      return { ...state, runs }
    }
    case 'UPDATE_POINTS': {
      const runs = state.runs.map(r => {
        if (r.id !== action.payload.runId) return r
        return { ...r, actionPoints: action.payload.points }
      })
      return { ...state, runs }
    }
    case 'SET_MODE':
      return { ...state, mode: action.payload }
    case 'UPDATE_RUN':
      return {
        ...state,
        runs: state.runs.map(r => r.id === action.payload.runId ? { ...r, ...action.payload.updates } : r),
      }
    case 'ADD_PURCHASE_ORDER':
      return { ...state, purchaseOrders: [...state.purchaseOrders, action.payload] }
    case 'UPDATE_PURCHASE_ORDER':
      return { ...state, purchaseOrders: state.purchaseOrders.map(o => o.id === action.payload.orderId ? { ...o, ...action.payload.updates } : o) }
    case 'REMOVE_PURCHASE_ORDER':
      return { ...state, purchaseOrders: state.purchaseOrders.filter(o => o.id !== action.payload) }
    case 'ADD_FUNDING_SOURCE':
      return { ...state, fundingSources: [...state.fundingSources, action.payload] }
    case 'UPDATE_FUNDING_SOURCE':
      return { ...state, fundingSources: state.fundingSources.map(s => s.id === action.payload.sourceId ? { ...s, ...action.payload.updates } : s) }
    case 'REMOVE_FUNDING_SOURCE':
      return { ...state, fundingSources: state.fundingSources.filter(s => s.id !== action.payload) }
    case 'LOAD_DATA':
      return { ...EMPTY_DATA, ...action.payload, menu: action.payload.menu ?? [], beans: action.payload.beans ?? [], runs: action.payload.runs ?? [], transactions: action.payload.transactions ?? [], purchaseOrders: action.payload.purchaseOrders ?? [], fundingSources: action.payload.fundingSources ?? [] }
    default:
      return state
  }
}

interface StoreContextType {
  state: AppData
  dispatch: React.Dispatch<Action>
  startNewRun: (goalMin?: number, goalMax?: number, dayNumber?: number, startTime?: string, endTime?: string) => string
  createPastRun: (date: string, goalMin?: number, goalMax?: number) => string
  pauseRun: (runId: string) => void
  endRun: (runId: string) => void
  resumeRun: (runId: string) => void
  removeRun: (runId: string) => void
  addSale: (runId: string, items: { menuItemId: string; menuItemName: string; price: number; quantity: number; autoDecide: string }[], customerProfile: CustomerProfile, nationality: string, note: string, discountPercent?: number) => void
  getActiveRun: () => DayRun | null
  getBean: (id: string) => BeanInventory | undefined
  getMenuItemsByCategory: (category: string) => MenuItem[]
  totalSales: (run: DayRun) => number
  addPurchase: (beanId: string, quantityGrams: number, totalCost: number, note?: string) => void
  getBeanStock: (beanId: string) => number
  getBeanTransactions: (beanId: string) => InventoryTransaction[]
  getBeanCostSummary: (beanId: string) => BeanCostSummary
  deductInventory: (beanId: string, quantityGrams: number, note?: string) => void
  getAllTransactions: () => InventoryTransaction[]
  setMode: (mode: PosMode) => void
  updateRun: (runId: string, updates: Partial<DayRun>) => void
  updateTransaction: (transactionId: string, updates: Partial<InventoryTransaction>) => void
  deleteTransaction: (transactionId: string) => void
  addPurchaseOrder: (order: PurchaseOrder) => void
  updatePurchaseOrder: (orderId: string, updates: Partial<PurchaseOrder>) => void
  removePurchaseOrder: (orderId: string) => void
  executePurchaseOrder: (orderId: string) => void
  addFundingSource: (source: FundingSource) => void
  updateFundingSource: (sourceId: string, updates: Partial<FundingSource>) => void
  removeFundingSource: (sourceId: string) => void
  addWeatherLog: (runId: string, weatherLog: WeatherLog) => void
  updateWeatherLog: (runId: string, weatherLogId: string, updates: Partial<WeatherLog>) => void
  testMode: boolean
  setTestMode: (enabled: boolean) => void
  clearTestData: () => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_DATA)
  const [currentKey, setCurrentKey] = useState(getStoreKey)
  const testMode = currentKey === TEST_KEY

  useEffect(() => {
    async function init() {
      const isTest = currentKey === TEST_KEY

      let data: AppData | null = null
      if (!isTest) {
        try {
          const res = await fetch('/api/data')
          if (res.ok) data = await res.json()
        } catch {}
      }

      if (data?.runs) data.runs = migrateRuns(data.runs)

      if (!data) data = loadData(currentKey)

      const hasData = data.menu.length > 0 || data.beans.length > 0 || data.runs.length > 0
      if (!hasData) {
        data = generateSeedData()
        try { localStorage.setItem(currentKey, JSON.stringify(data)) } catch {}
        if (!isTest) {
          try { await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) } catch {}
        }
      }

      dispatch({ type: 'LOAD_DATA', payload: data })
    }
    init()
  }, [])

  useEffect(() => {
    if (state === EMPTY_DATA) return
    try { localStorage.setItem(currentKey, JSON.stringify(state)) } catch {}
    if (currentKey !== TEST_KEY) {
      fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) }).catch(() => {})
    }
  }, [state, currentKey])

  function setTestMode(enabled: boolean) {
    const newKey = enabled ? TEST_KEY : REAL_KEY
    try { localStorage.setItem(currentKey, JSON.stringify(state)) } catch {}
    setCurrentKey(newKey)
    try { localStorage.setItem(KEY_FLAG, newKey) } catch {}
    if (enabled) {
      const existing = loadData(newKey)
      if (existing === EMPTY_DATA || (!existing.menu.length && !existing.beans.length)) {
        dispatch({ type: 'LOAD_DATA', payload: { ...EMPTY_DATA, menu: state.menu, beans: state.beans } })
      } else {
        dispatch({ type: 'LOAD_DATA', payload: existing })
      }
    } else {
      dispatch({ type: 'LOAD_DATA', payload: loadData(newKey) })
    }
  }

  function clearTestData() {
    try { localStorage.removeItem(TEST_KEY) } catch {}
    dispatch({ type: 'LOAD_DATA', payload: { ...EMPTY_DATA, menu: state.menu, beans: state.beans } })
  }

  function startNewRun(goalMin = 2000, goalMax = 4000, dayNumber?: number, startTime?: string, endTime?: string): string {
    const run: DayRun = {
      id: generateId(),
      date: todayISO(),
      dayNumber: dayNumber ?? getDayNumber(),
      startTime,
      endTime,
      goalMin,
      goalMax,
      weatherLogs: [],
      operatorState: null,
      actionPoints: null,
      sales: [],
      note: '',
      status: 'active',
    }
    dispatch({ type: 'START_RUN', payload: run })
    return run.id
  }

  function createPastRun(date: string, goalMin = 2000, goalMax = 4000): string {
    const start = new Date(2026, 0, 1)
    const d = new Date(date)
    const diff = d.getTime() - start.getTime()
    const dayNum = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
    const run: DayRun = {
      id: generateId(),
      date,
      dayNumber: dayNum,
      goalMin,
      goalMax,
      weatherLogs: [],
      operatorState: null,
      actionPoints: null,
      sales: [],
      note: '',
      status: 'ended',
    }
    dispatch({ type: 'START_RUN', payload: run })
    return run.id
  }

  function pauseRun(runId: string) {
    dispatch({ type: 'PAUSE_RUN', payload: runId })
  }

  function endRun(runId: string) {
    dispatch({ type: 'END_RUN', payload: runId })
  }

  function resumeRun(runId: string) {
    dispatch({ type: 'RESUME_RUN', payload: runId })
  }

  function removeRun(runId: string) {
    dispatch({ type: 'REMOVE_RUN', payload: runId })
  }

  function addSale(
    runId: string,
    items: ({ menuItemId: string; menuItemName: string; price: number; quantity: number; autoDecide: string } & { sweetness?: string; doseOverride?: number; doseUpcharge?: number })[],
    customerProfile: CustomerProfile,
    nationality: string,
    note: string,
    discountPercent?: number,
  ) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return

    const baseTotal = items.reduce((s, i) => s + i.price * i.quantity + (i.doseUpcharge || 0) * i.quantity, 0)
    const total = discountPercent ? Math.round(baseTotal * (1 - discountPercent / 100)) : baseTotal
    const index = run.sales.length + 1
    const ad = items[0]?.autoDecide || 'NA'

    const sale: Sale = {
      id: generateSaleId(run.dayNumber, run.date, index, ad, items[0]?.menuItemName || '', customerProfile),
      items: items.map(i => ({ ...i, autoDecide: i.autoDecide as any, sweetness: i.sweetness as any })),
      total,
      timestamp: new Date().toISOString(),
      customerProfile,
      nationality,
      note,
      discountPercent,
    }
    dispatch({ type: 'ADD_SALE', payload: { runId, sale } })

    for (const item of items) {
      const menuItem = state.menu.find(m => m.id === item.menuItemId)
      if (!menuItem?.beanId || !menuItem.recipe?.dose) continue
      const dose = item.doseOverride ?? menuItem.recipe.dose
      deductInventory(menuItem.beanId, dose * item.quantity, `Sale: ${menuItem.name}`)
    }
  }

  function getActiveRun(): DayRun | null {
    if (!state.activeRunId) return null
    return state.runs.find(r => r.id === state.activeRunId) || null
  }

  function getBean(id: string): BeanInventory | undefined {
    return state.beans.find(b => b.id === id)
  }

  function getMenuItemsByCategory(category: string): MenuItem[] {
    return state.menu.filter(m => m.category === category && m.active)
  }

  function totalSales(run: DayRun): number {
    return run.sales.reduce((sum, s) => sum + s.total, 0)
  }

  function addPurchase(beanId: string, quantityGrams: number, totalCost: number, note = '') {
    const bean = state.beans.find(b => b.id === beanId)
    if (!bean) return

    const costPerGram = quantityGrams > 0 ? totalCost / quantityGrams : 0
    const date = todayISO()

    const tx: InventoryTransaction = {
      id: generateId(),
      date,
      beanId,
      beanName: bean.name,
      type: 'purchase',
      quantity: quantityGrams,
      costPerGram,
      totalCost,
      note,
      createdAt: new Date().toISOString(),
    }

    dispatch({ type: 'ADD_TRANSACTION', payload: tx })

    const purchaseTxns = [...state.transactions, tx]
      .filter(t => t.beanId === beanId && t.type === 'purchase')
    const totalGrams = purchaseTxns.reduce((s, t) => s + t.quantity, 0)
    const totalSpent = purchaseTxns.reduce((s, t) => s + t.totalCost, 0)
    const usageTxns = [...state.transactions, tx]
      .filter(t => t.beanId === beanId && (t.type === 'usage' || t.type === 'spoilage'))
    const usedGrams = usageTxns.reduce((s, t) => s + t.quantity, 0)
    const avgCost = totalGrams > 0 ? totalSpent / totalGrams : 0

    dispatch({
      type: 'UPDATE_BEAN',
      payload: { ...bean, stockGrams: totalGrams - usedGrams, costPerGram: avgCost },
    })
  }

  function recalcBeanStock(beanId: string) {
    const bean = state.beans.find(b => b.id === beanId)
    if (!bean) return
    const purchaseTxns = state.transactions.filter(t => t.beanId === beanId && t.type === 'purchase')
    const totalGrams = purchaseTxns.reduce((s, t) => s + t.quantity, 0)
    const totalSpent = purchaseTxns.reduce((s, t) => s + t.totalCost, 0)
    const usageTxns = state.transactions.filter(t => t.beanId === beanId && (t.type === 'usage' || t.type === 'spoilage'))
    const usedGrams = usageTxns.reduce((s, t) => s + Math.abs(t.quantity), 0)
    const avgCost = totalGrams > 0 ? totalSpent / totalGrams : 0
    dispatch({
      type: 'UPDATE_BEAN',
      payload: { ...bean, stockGrams: totalGrams - usedGrams, costPerGram: avgCost },
    })
  }

  function updateTransaction(transactionId: string, updates: Partial<InventoryTransaction>) {
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { transactionId, updates } })
    const txn = state.transactions.find(t => t.id === transactionId)
    if (txn?.beanId) recalcBeanStock(txn.beanId)
  }

  function deleteTransaction(transactionId: string) {
    const txn = state.transactions.find(t => t.id === transactionId)
    dispatch({ type: 'REMOVE_TRANSACTION', payload: transactionId })
    if (txn?.beanId) recalcBeanStock(txn.beanId)
  }

  function deductInventory(beanId: string, quantityGrams: number, note = '') {
    const bean = state.beans.find(b => b.id === beanId)
    if (!bean || quantityGrams <= 0) return

    const date = todayISO()
    const purchaseTxns = state.transactions.filter(t => t.beanId === beanId && t.type === 'purchase')
    const avgCost = purchaseTxns.length > 0
      ? purchaseTxns.reduce((s, t) => s + t.totalCost, 0) / purchaseTxns.reduce((s, t) => s + t.quantity, 0)
      : 0

    const tx: InventoryTransaction = {
      id: generateId(),
      date,
      beanId,
      beanName: bean.name,
      type: 'usage',
      quantity: -Math.abs(quantityGrams),
      costPerGram: avgCost,
      totalCost: avgCost * Math.abs(quantityGrams),
      note,
      createdAt: new Date().toISOString(),
    }

    dispatch({ type: 'ADD_TRANSACTION', payload: tx })

    const allTxns = [...state.transactions, tx]
    const totalPurchased = allTxns
      .filter(t => t.beanId === beanId && t.type === 'purchase')
      .reduce((s, t) => s + t.quantity, 0)
    const totalUsed = allTxns
      .filter(t => t.beanId === beanId && (t.type === 'usage' || t.type === 'spoilage'))
      .reduce((s, t) => s + Math.abs(t.quantity), 0)

    dispatch({
      type: 'UPDATE_BEAN',
      payload: { ...bean, stockGrams: totalPurchased - totalUsed },
    })
  }

  function getBeanStock(beanId: string): number {
    const purchases = state.transactions
      .filter(t => t.beanId === beanId && t.type === 'purchase')
      .reduce((s, t) => s + t.quantity, 0)
    const usage = state.transactions
      .filter(t => t.beanId === beanId && (t.type === 'usage' || t.type === 'spoilage'))
      .reduce((s, t) => s + Math.abs(t.quantity), 0)
    return purchases - usage
  }

  function getBeanTransactions(beanId: string): InventoryTransaction[] {
    return state.transactions
      .filter(t => t.beanId === beanId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  function getBeanCostSummary(beanId: string): BeanCostSummary {
    const purchases = state.transactions
      .filter(t => t.beanId === beanId && t.type === 'purchase')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const usage = state.transactions
      .filter(t => t.beanId === beanId && t.type === 'usage')

    const totalUsedGrams = usage.reduce((s, t) => s + Math.abs(t.quantity), 0)
    const totalInvested = purchases.reduce((s, t) => s + t.totalCost, 0)
    const totalGrams = purchases.reduce((s, t) => s + t.quantity, 0)
    const avgCostPerGram = totalGrams > 0 ? totalInvested / totalGrams : 0

    let remainingToConsume = totalUsedGrams
    let fifoCost = 0
    for (const p of purchases) {
      const take = Math.min(remainingToConsume, p.quantity)
      fifoCost += take * p.costPerGram
      remainingToConsume -= take
      if (remainingToConsume <= 0) break
    }

    remainingToConsume = totalUsedGrams
    let lifoCost = 0
    for (const p of [...purchases].reverse()) {
      const take = Math.min(remainingToConsume, p.quantity)
      lifoCost += take * p.costPerGram
      remainingToConsume -= take
      if (remainingToConsume <= 0) break
    }

    return {
      fifoCostPerGram: totalUsedGrams > 0 ? fifoCost / totalUsedGrams : 0,
      lifoCostPerGram: totalUsedGrams > 0 ? lifoCost / totalUsedGrams : 0,
      avgCostPerGram,
      totalInvested,
      totalUsedGrams,
    }
  }

  function getAllTransactions(): InventoryTransaction[] {
    return [...state.transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  function addWeatherLog(runId: string, weatherLog: WeatherLog) {
    dispatch({ type: 'ADD_WEATHER_LOG', payload: { runId, weatherLog } })
  }

  function updateWeatherLog(runId: string, weatherLogId: string, updates: Partial<WeatherLog>) {
    dispatch({ type: 'UPDATE_WEATHER_LOG', payload: { runId, weatherLogId, updates } })
  }

  function setMode(mode: PosMode) {
    dispatch({ type: 'SET_MODE', payload: mode })
  }

  function updateRun(runId: string, updates: Partial<DayRun>) {
    dispatch({ type: 'UPDATE_RUN', payload: { runId, updates } })
  }

  function addPurchaseOrder(order: PurchaseOrder) {
    dispatch({ type: 'ADD_PURCHASE_ORDER', payload: order })
  }

  function updatePurchaseOrder(orderId: string, updates: Partial<PurchaseOrder>) {
    dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: { orderId, updates } })
  }

  function removePurchaseOrder(orderId: string) {
    dispatch({ type: 'REMOVE_PURCHASE_ORDER', payload: orderId })
  }

  function executePurchaseOrder(orderId: string) {
    const order = state.purchaseOrders.find(o => o.id === orderId)
    if (!order) return
    const addedTx: InventoryTransaction[] = []
    for (const item of order.items) {
      const bean = state.beans.find(b => item.itemName.toLowerCase().includes(b.name.toLowerCase()) || b.name.toLowerCase().includes(item.itemName.toLowerCase()))
      if (!bean) continue
      const costPerGram = item.quantity > 0 && item.unit === 'g' ? item.totalCost / item.quantity : 0
      const tx: InventoryTransaction = {
        id: generateId(),
        date: new Date().toISOString().slice(0, 10),
        beanId: bean.id,
        beanName: bean.name,
        type: 'purchase',
        quantity: item.unit === 'g' ? item.quantity : 0,
        costPerGram,
        totalCost: item.totalCost,
        note: item.note || `Purchase order ${orderId.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'ADD_TRANSACTION', payload: tx })
      addedTx.push(tx)
      const allNew = [...state.transactions.filter(t => t.beanId === bean.id && t.type === 'purchase'), ...addedTx.filter(t => t.beanId === bean.id && t.type === 'purchase')]
      const totalGrams = allNew.reduce((s, t) => s + t.quantity, 0)
      const totalSpent = allNew.reduce((s, t) => s + t.totalCost, 0)
      const usage = state.transactions.filter(t => t.beanId === bean.id && (t.type === 'usage' || t.type === 'spoilage'))
      const usedGrams = usage.reduce((s, t) => s + Math.abs(t.quantity), 0)
      const avgCost = totalGrams > 0 ? totalSpent / totalGrams : 0
      dispatch({ type: 'UPDATE_BEAN', payload: { ...bean, stockGrams: totalGrams - usedGrams, costPerGram: avgCost } })
    }
    dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: { orderId, updates: { status: 'executed', executedAt: new Date().toISOString() } } })
  }

  function addFundingSource(source: FundingSource) {
    dispatch({ type: 'ADD_FUNDING_SOURCE', payload: source })
  }

  function updateFundingSource(sourceId: string, updates: Partial<FundingSource>) {
    dispatch({ type: 'UPDATE_FUNDING_SOURCE', payload: { sourceId, updates } })
  }

  function removeFundingSource(sourceId: string) {
    dispatch({ type: 'REMOVE_FUNDING_SOURCE', payload: sourceId })
  }

  return (
    <StoreContext.Provider value={{
      state,
      dispatch,
      startNewRun,
      createPastRun,
      pauseRun,
      endRun,
      resumeRun,
      removeRun,
      addSale,
      getActiveRun,
      getBean,
      getMenuItemsByCategory,
      totalSales,
      addPurchase,
      getBeanStock,
      getBeanTransactions,
      getBeanCostSummary,
      deductInventory,
      getAllTransactions,
      setMode,
      updateRun,
      updateTransaction,
      deleteTransaction,
      addPurchaseOrder,
      updatePurchaseOrder,
      removePurchaseOrder,
      executePurchaseOrder,
      addFundingSource,
      updateFundingSource,
      removeFundingSource,
      addWeatherLog,
      updateWeatherLog,
      testMode,
      setTestMode,
      clearTestData,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
