import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store'
import { formatCurrency, generateId } from '../utils'
import type { PurchaseOrder } from '../types'
import { PURCHASE_CATEGORIES } from '../types'
import RecordsView from './RecordsView'

const CAT_ITEMS: { name: string; emoji: string; color: string }[] = [
  { name: 'Coffee Beans', emoji: '🫘', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  { name: 'Daily product', emoji: '🥛', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-300 dark:border-sky-700' },
  { name: 'Syrup & Ingredients', emoji: '🍯', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700' },
  { name: 'Cups & Lids', emoji: '🥤', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  { name: 'Straw & Utensil', emoji: '🥢', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-700' },
  { name: 'Packaging', emoji: '📦', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-300 dark:border-teal-700' },
  { name: 'Cleaning', emoji: '🧹', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300 border-lime-300 dark:border-lime-700' },
  { name: 'Equipment', emoji: '⚙️', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-300 dark:border-violet-700' },
  { name: 'Other', emoji: '📌', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
]
function catColor(cat: string): string {
  return CAT_ITEMS.find(c => c.name === cat)?.color || 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 border-slate-300 dark:border-slate-700'
}
function catEmoji(cat: string): string {
  return CAT_ITEMS.find(c => c.name === cat)?.emoji || '📌'
}

export default function FinanceView() {
  const { state, totalSales, addPurchase, addPurchaseOrder, removePurchaseOrder, executePurchaseOrder, addFundingSource, updateFundingSource, removeFundingSource } = useStore()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(state.activeRunId)
  const [tab, setTab] = useState<'sales' | 'beans' | 'purchasing' | 'records'>('sales')
  const [buyBeanId, setBuyBeanId] = useState<string | null>(null)
  const [buyQty, setBuyQty] = useState(0)
  const [buyCost, setBuyCost] = useState(0)
  const [buyNote, setBuyNote] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)
  const [cartItems, setCartItems] = useState<{ itemName: string; category: string; quantity: number; unit: string; totalCost: number; note: string; purchaseDate: string; expirationDate?: string; roastedDate?: string; fundingSourceId?: string }[]>([])
  const [cartNote, setCartNote] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [newItemQty, setNewItemQty] = useState(0)
  const [newItemUnit, setNewItemUnit] = useState('g')
  const [newItemCost, setNewItemCost] = useState(0)
  const [newItemNote, setNewItemNote] = useState('')
  const [newItemDate, setNewItemDate] = useState(todayStr)
  const [newItemExpiry, setNewItemExpiry] = useState('')
  const [newItemRoast, setNewItemRoast] = useState('')
  const [newItemFund, setNewItemFund] = useState('')
  const [allCategories, setAllCategories] = useState<string[]>(PURCHASE_CATEGORIES)
  const [categorySearch, setCategorySearch] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)

  useEffect(() => {
    if (newItemCategory && state.fundingSources) {
      const matched = state.fundingSources.find(s => s.categories.includes(newItemCategory))
      if (matched && matched.id !== newItemFund) setNewItemFund(matched.id)
    }
  }, [newItemCategory])
  const [customCategory, setCustomCategory] = useState('')
  const [executing, setExecuting] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddText, setQuickAddText] = useState('')

  const allRuns = useMemo(() => {
    return [...state.runs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [state.runs])

  const run = selectedRunId ? state.runs.find(r => r.id === selectedRunId) : null

  const stats = useMemo(() => {
    if (!run) return null
    let drinkCost = 0, drinkCount = 0
    let hotQt = 0, iceQt = 0, hotRev = 0, iceRev = 0
    const itemMap: Record<string, { name: string; qty: number; rev: number; cost: number }> = {}

    for (const sale of run.sales) {
      for (const item of sale.items) {
        drinkCount += item.quantity
        if (item.autoDecide === 'hot') { hotQt += item.quantity; hotRev += item.price * item.quantity }
        else if (item.autoDecide === 'ice') { iceQt += item.quantity; iceRev += item.price * item.quantity }

        if (!itemMap[item.menuItemId]) {
          itemMap[item.menuItemId] = { name: item.menuItemName, qty: 0, rev: 0, cost: 0 }
        }
        itemMap[item.menuItemId].qty += item.quantity
        itemMap[item.menuItemId].rev += item.price * item.quantity

        const mi = state.menu.find(m => m.id === item.menuItemId)
        if (mi?.beanId && mi.recipe?.dose) {
          const b = state.beans.find(x => x.id === mi.beanId)
          if (b) {
            const c = mi.recipe.dose * b.costPerGram * item.quantity
            drinkCost += c
            itemMap[item.menuItemId].cost += c
          }
        }
      }
    }

    const rev = totalSales(run)
    const profit = rev - drinkCost
    const margin = rev > 0 ? (profit / rev) * 100 : 0
    const totalQt = hotQt + iceQt

    return { rev, drinkCost, profit, margin, drinkCount, hotQt, iceQt, hotRev, iceRev, totalQt, itemMap }
  }, [run, state.menu, state.beans, totalSales])

  const sortedItems = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats.itemMap)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.rev - a.rev)
  }, [stats])

  const beanFinance = useMemo(() => {
    return state.beans.map(bean => {
      const purchases = state.transactions.filter(t => t.beanId === bean.id && t.type === 'purchase')
      const usage = state.transactions.filter(t => t.beanId === bean.id && (t.type === 'usage' || t.type === 'spoilage'))
      const totalBought = purchases.reduce((s, t) => s + t.quantity, 0)
      const totalSpent = purchases.reduce((s, t) => s + t.totalCost, 0)
      const totalUsedGrams = usage.reduce((s, t) => s + Math.abs(t.quantity), 0)
      const stock = totalBought - totalUsedGrams
      const avgCost = totalBought > 0 ? totalSpent / totalBought : 0
      const stockValue = stock * avgCost

      const linked = state.menu.filter(m => m.beanId === bean.id && m.recipe?.dose)
      const avgDose = linked.length > 0 ? linked.reduce((s, m) => s + (m.recipe!.dose || 0), 0) / linked.length : 0
      const dosesRemaining = avgDose > 0 ? Math.floor(stock / avgDose) : 0
      const servingsRemaining = dosesRemaining

      return { ...bean, totalBought, totalSpent, totalUsedGrams, stock, avgCost, stockValue, avgDose, dosesRemaining, servingsRemaining }
    }).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [state.beans, state.transactions, state.menu])

  const totalBeanInvestment = useMemo(() => beanFinance.reduce((s, b) => s + b.totalSpent, 0), [beanFinance])
  const totalStockValue = useMemo(() => beanFinance.reduce((s, b) => s + b.stockValue, 0), [beanFinance])

  function handleBuy(beanId: string) {
    if (buyQty <= 0 || buyCost <= 0) return
    addPurchase(beanId, buyQty, buyCost, buyNote)
    setBuyQty(0)
    setBuyCost(0)
    setBuyNote('')
    setBuyBeanId(null)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Finance</h2>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button onClick={() => setTab('sales')} className={`text-sm font-medium px-3 py-1 rounded-lg transition-all ${tab === 'sales' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Sales</button>
        <button onClick={() => setTab('beans')} className={`text-sm font-medium px-3 py-1 rounded-lg transition-all ${tab === 'beans' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Beans</button>
        <button onClick={() => setTab('purchasing')} className={`text-sm font-medium px-3 py-1 rounded-lg transition-all ${tab === 'purchasing' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Purchasing</button>
        <button onClick={() => setTab('records')} className={`text-sm font-medium px-3 py-1 rounded-lg transition-all ${tab === 'records' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Records</button>
      </div>

      {tab === 'sales' && (
        <>
          <div className="flex gap-2 overflow-x-auto flex-nowrap pb-1">
            {allRuns.slice(0, 10).map(r => (
              <button key={r.id} onClick={() => setSelectedRunId(r.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${selectedRunId === r.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                Day {r.dayNumber}
                {r.id === state.activeRunId && <span className="ml-1 text-[10px] opacity-70">(active)</span>}
              </button>
            ))}
            {allRuns.length === 0 && <div className="text-xs text-slate-400 py-2">No runs yet</div>}
          </div>

          {!run ? (
            <div className="text-center py-12 text-slate-400 text-sm">Select a run to see sales data</div>
          ) : !stats ? null : (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Day {run.dayNumber} - {run.date}</span>
                  <span className="text-xs text-slate-400">{run.sales.length} sales · {stats.drinkCount} serves</span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-indigo-400">Revenue</div>
                    <div className="text-base font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(stats.rev)}</div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-rose-400">Cost</div>
                    <div className={`text-base font-bold ${stats.drinkCost > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                      {stats.drinkCost > 0 ? formatCurrency(Math.round(stats.drinkCost)) : '\u2014'}
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-emerald-400">Profit</div>
                    <div className={`text-base font-bold ${stats.drinkCost === 0 ? 'text-slate-400' : stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {stats.drinkCost > 0 ? formatCurrency(Math.round(stats.profit)) : '\u2014'}
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] text-amber-400">Margin</div>
                    <div className={`text-base font-bold ${stats.drinkCost > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400'}`}>
                      {stats.drinkCost > 0 ? `${stats.margin.toFixed(1)}%` : '\u2014'}
                    </div>
                  </div>
                </div>

                {stats.totalQt > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-2.5 border border-rose-200 dark:border-rose-800">
                      <div className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">Hot</div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{stats.hotQt} serves</div>
                      <div className="text-[10px] text-rose-400">{stats.hotRev > 0 ? formatCurrency(Math.round(stats.hotRev)) : ''}</div>
                    </div>
                    <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-2.5 border border-sky-200 dark:border-sky-800">
                      <div className="text-[10px] text-sky-500 dark:text-sky-400 font-medium">Ice</div>
                      <div className="text-sm font-bold text-sky-700 dark:text-sky-300">{stats.iceQt} serves</div>
                      <div className="text-[10px] text-sky-400">{stats.iceRev > 0 ? formatCurrency(Math.round(stats.iceRev)) : ''}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Items Breakdown</h3>
                <div className="space-y-1.5">
                  {sortedItems.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                        <span className="text-slate-400 flex-shrink-0">x{item.qty}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-slate-500">{formatCurrency(Math.round(item.rev))}</span>
                        {item.cost > 0 && <span className="text-rose-400">{formatCurrency(Math.round(item.cost))}</span>}
                        {item.cost > 0 && (
                          <span className={`font-medium w-12 text-right ${item.rev - item.cost >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {formatCurrency(Math.round(item.rev - item.cost))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {sortedItems.length === 0 && <div className="text-center py-4 text-slate-400 text-xs">No items sold in this run</div>}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'beans' && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-3 gap-2 mb-1">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-indigo-400">Total Spent on Coffee</div>
                <div className="text-base font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totalBeanInvestment)}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-emerald-400">Inventory Worth</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Math.round(totalStockValue))}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5 text-center">
                <div className="text-[10px] text-amber-400">Coffee Varieties</div>
                <div className="text-base font-bold text-amber-600 dark:text-amber-300">{state.beans.length}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {beanFinance.map(b => {
              const needsBuy = b.stock <= b.avgDose * 10
              return (
                <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{b.name}</div>
                      <div className="text-xs text-slate-400">{b.origin} · {b.process}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${b.stock <= 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{b.stock}g</div>
                      {b.avgDose > 0 && <div className="text-[10px] text-slate-400">~{b.dosesRemaining} doses</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div><span className="text-slate-400">Spent</span><br /><span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(b.totalSpent))}</span></div>
                    <div><span className="text-slate-400">On hand</span><br /><span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(b.stockValue))}</span></div>
                    <div><span className="text-slate-400">Avg cost</span><br /><span className="font-medium text-slate-700 dark:text-slate-300">{b.avgCost.toFixed(2)}/g</span></div>
                  </div>

                  {b.avgDose > 0 && (
                    <div className="text-[10px] text-slate-400 mt-1">~{b.servingsRemaining} servings · {b.avgDose.toFixed(1)}g/dose</div>
                  )}

                  {needsBuy && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Low stock — consider restocking</span>
                      {buyBeanId === b.id ? (
                        <div className="flex-1 flex gap-1 items-center">
                          <input type="number" value={buyQty || ''} onChange={e => setBuyQty(Number(e.target.value))} placeholder="g" className="w-16 text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" />
                          <input type="number" value={buyCost || ''} onChange={e => setBuyCost(Number(e.target.value))} placeholder="cost" className="w-16 text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" />
                          <button onClick={() => handleBuy(b.id)} disabled={buyQty <= 0 || buyCost <= 0} className="text-[10px] px-2 py-1 bg-emerald-600 text-white rounded font-semibold">OK</button>
                          <button onClick={() => setBuyBeanId(null)} className="text-[10px] px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">X</button>
                        </div>
                      ) : (
                        <button onClick={() => { setBuyBeanId(b.id); setBuyQty(0); setBuyCost(0); setBuyNote('') }} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded font-semibold">+ Buy</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {beanFinance.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">No beans. Add beans in the Beans tab.</div>}
          </div>
        </>
      )}

      {tab === 'purchasing' && (
        <div className="space-y-3">
          {/* Header with quick-add */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Purchasing Board</h2>
            <div className="flex gap-1.5">
              <button onClick={() => { setShowQuickAdd(!showQuickAdd); setShowAddItem(false) }} className={`text-[11px] px-3 py-1.5 rounded-xl font-semibold transition-all ${showQuickAdd ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'}`}>Quick</button>
               <button onClick={() => { setShowAddItem(true); setShowQuickAdd(false); setNewItemName(''); setNewItemCategory(''); setNewItemQty(0); setNewItemUnit('g'); setNewItemCost(0); setNewItemNote(''); setShowCustomCategory(false); setCustomCategory(''); setNewItemDate(todayStr); setNewItemExpiry(''); setNewItemRoast(''); setNewItemFund('') }} className="text-[11px] px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-semibold">+ Add Item</button>
            </div>
          </div>

          {/* Quick-add textarea */}
          {showQuickAdd && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border-2 border-blue-300 dark:border-blue-700 shadow-sm">
              <textarea
                value={quickAddText}
                onChange={e => setQuickAddText(e.target.value)}
                placeholder="Paste or type items, one per line&#10;e.g.:&#10;Colombia Gesha 100g 440&#10;Milk 2L 120&#10;Cups 50pcs 80"
                className="w-full h-28 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white placeholder-slate-400 resize-none"
              />
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => {
                  const lines = quickAddText.split('\n').filter(l => l.trim())
                  const parsed: { itemName: string; category: string; quantity: number; unit: string; totalCost: number; note: string; purchaseDate: string }[] = []
                  for (const line of lines) {
                    const colonIdx = line.indexOf(':')
                    let category = ''
                    let rest = line.trim()
                    if (colonIdx > 0) {
                      category = line.slice(0, colonIdx).trim()
                      rest = line.slice(colonIdx + 1).trim()
                    }
                    const parts = rest.split(/\s+/)
                    if (parts.length < 2) continue
                    const cost = Number(parts[parts.length - 1])
                    const qtyRaw = parts[parts.length - 2]
                    const qtyMatch = qtyRaw.match(/^(\d+)([a-zA-Z]*)$/)
                    if (!qtyMatch || isNaN(cost)) continue
                    const qty = Number(qtyMatch[1])
                    const unit = qtyMatch[2] || 'g'
                    const name = parts.slice(0, parts.length - 2).join(' ')
                    if (!category) category = PURCHASE_CATEGORIES.includes(name) ? name : 'Other'
                    parsed.push({ itemName: name, category, quantity: qty, unit, totalCost: cost, note: '', purchaseDate: todayStr })
                  }
                  if (parsed.length > 0) {
                    setCartItems([...cartItems, ...parsed])
                    setQuickAddText('')
                    setShowQuickAdd(false)
                  }
                }} disabled={!quickAddText.trim()} className="text-[11px] px-4 py-1.5 bg-blue-600 text-white rounded-xl font-semibold">Parse & Add ({quickAddText.split('\n').filter(l => l.trim()).length} lines)</button>
                <button onClick={() => { setShowQuickAdd(false); setQuickAddText('') }} className="text-[11px] px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl">Cancel</button>
              </div>
            </div>
          )}

          {/* Add item form */}
          {showAddItem && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
              <div className="space-y-2.5">
                {/* Category selector — searchable grid of cards */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Category</label>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 pl-8 dark:text-white placeholder-slate-400"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {allCategories
                      .filter(c => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setNewItemCategory(cat); setShowCustomCategory(false); setCustomCategory('') }}
                          className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 font-semibold transition-all text-xs ${
                            newItemCategory === cat && !showCustomCategory
                              ? `${catColor(cat)} border-current scale-[1.02] shadow-md`
                              : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <span className="text-lg leading-none">{catEmoji(cat)}</span>
                          <span className="leading-tight text-center">{cat}</span>
                        </button>
                      ))}
                    {showCustomCategory ? (
                      <div className="col-span-3">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customCategory}
                            onChange={e => setCustomCategory(e.target.value)}
                            placeholder="Type new category..."
                            className="flex-1 text-xs bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600 rounded-xl px-3 py-2 dark:text-white font-semibold"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && customCategory.trim() && !allCategories.includes(customCategory.trim())) {
                                setAllCategories([...allCategories, customCategory.trim()])
                                setNewItemCategory(customCategory.trim())
                                setShowCustomCategory(false)
                                setCustomCategory('')
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const trimmed = customCategory.trim()
                              if (trimmed && !allCategories.includes(trimmed)) {
                                setAllCategories([...allCategories, trimmed])
                                setNewItemCategory(trimmed)
                              }
                              setShowCustomCategory(false)
                              setCustomCategory('')
                            }}
                            disabled={!customCategory.trim()}
                            className="text-xs px-3 py-2 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40"
                          >
                            Add
                          </button>
                          <button onClick={() => { setShowCustomCategory(false); setCustomCategory('') }} className="text-xs px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl">X</button>
                        </div>
                      </div>
                    ) : !categorySearch && (
                      <button
                        onClick={() => { setShowCustomCategory(true); setCustomCategory(''); setNewItemCategory('') }}
                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 border-dashed font-semibold transition-all text-xs ${
                          !newItemCategory && !showCustomCategory
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                            : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50'
                        }`}
                      >
                        <span className="text-lg leading-none">✨</span>
                        <span className="leading-tight text-center">New</span>
                      </button>
                    )}
                  </div>
                  {newItemCategory && !showCustomCategory && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-sm px-3 py-1 rounded-xl font-bold ${catColor(newItemCategory)}`}>{catEmoji(newItemCategory)} {newItemCategory}</span>
                      <span className="text-[11px] text-emerald-500 font-semibold">selected</span>
                    </div>
                  )}
                  {/* Funding source auto-select */}
                  {newItemCategory && !showCustomCategory && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Fund</label>
                      <select
                        value={newItemFund}
                        onChange={e => setNewItemFund(e.target.value)}
                        className={`flex-1 text-xs rounded-xl px-3 py-2 dark:text-white font-medium border ${
                          newItemFund && state.fundingSources.find(s => s.id === newItemFund)
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        <option value="">Unassigned</option>
                        {state.fundingSources.map(fs => (
                          <option key={fs.id} value={fs.id}>
                            {fs.name} ({formatCurrency(Math.round(fs.initialAmount))})
                          </option>
                        ))}
                      </select>
                      {newItemFund && (
                        <button onClick={() => setNewItemFund('')} className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold">Clear</button>
                      )}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Item name (e.g. Colombia Gesha, Milk, Cups)"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 dark:text-white placeholder-slate-400 font-medium"
                  autoFocus
                />
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5">
                    <input
                      type="number"
                      value={newItemQty || ''}
                      onChange={e => setNewItemQty(Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full text-sm bg-transparent outline-none dark:text-white font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-slate-400 font-medium uppercase">×</span>
                    <input
                      type="text"
                      value={newItemUnit}
                      onChange={e => setNewItemUnit(e.target.value)}
                      placeholder="unit"
                      className="w-10 text-xs bg-transparent outline-none dark:text-white text-center"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5">
                    <span className="text-xs text-slate-400 font-medium">฿</span>
                    <input
                      type="number"
                      value={newItemCost || ''}
                      onChange={e => setNewItemCost(Number(e.target.value))}
                      placeholder="Total cost"
                      className="w-full text-sm bg-transparent outline-none dark:text-white font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                {/* Purchase date — always shown */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Date</label>
                  <input
                    type="date"
                    value={newItemDate}
                    onChange={e => setNewItemDate(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white"
                  />
                </div>

                {/* Expiration date — Daily product & Syrup & Ingredients */}
                {(newItemCategory === 'Daily product' || newItemCategory === 'Syrup & Ingredients') && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Expires</label>
                    <input
                      type="date"
                      value={newItemExpiry}
                      onChange={e => setNewItemExpiry(e.target.value)}
                      className="flex-1 text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2 dark:text-white"
                    />
                    {newItemExpiry && (
                      <button onClick={() => setNewItemExpiry('')} className="text-[10px] text-rose-400 hover:text-rose-600 font-semibold">Clear</button>
                    )}
                  </div>
                )}

                {/* Roasted date — Coffee Beans */}
                {newItemCategory === 'Coffee Beans' && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Roasted</label>
                    <input
                      type="date"
                      value={newItemRoast}
                      onChange={e => setNewItemRoast(e.target.value)}
                      className="flex-1 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 dark:text-white"
                    />
                    {newItemRoast && (
                      <button onClick={() => setNewItemRoast('')} className="text-[10px] text-amber-400 hover:text-amber-600 font-semibold">Clear</button>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  value={newItemNote}
                  onChange={e => setNewItemNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white placeholder-slate-400"
                />
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (!newItemName.trim() || newItemQty <= 0 || newItemCost <= 0) return
                      const cat = showCustomCategory ? customCategory.trim() : newItemCategory
                      if (!cat) return
                      if (!allCategories.includes(cat)) setAllCategories([...allCategories, cat])
                      const item: typeof cartItems[0] = {
                        itemName: newItemName.trim(),
                        category: cat,
                        quantity: newItemQty,
                        unit: newItemUnit || 'g',
                        totalCost: newItemCost,
                        note: newItemNote,
                        purchaseDate: newItemDate,
                        fundingSourceId: newItemFund || undefined,
                      }
                      if (newItemExpiry) item.expirationDate = newItemExpiry
                      if (newItemRoast) item.roastedDate = newItemRoast
                      setCartItems([...cartItems, item])
                      setNewItemName('')
                      setNewItemQty(0)
                      setNewItemUnit('g')
                      setNewItemCost(0)
                      setNewItemNote('')
                      setNewItemCategory('')
                      setShowCustomCategory(false)
                      setCustomCategory('')
                      setNewItemDate(todayStr)
                      setNewItemExpiry('')
                      setNewItemRoast('')
                      setNewItemFund('')
                    }}
                    disabled={!newItemName.trim() || newItemQty <= 0 || newItemCost <= 0 || (!newItemCategory && !customCategory.trim())}
                    className="flex-1 text-[11px] py-2.5 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-40"
                  >
                    Add to Cart
                  </button>
                  <button onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemQty(0); setNewItemUnit('g'); setNewItemCost(0); setNewItemNote(''); setNewItemCategory(''); setShowCustomCategory(false); setCustomCategory(''); setNewItemDate(todayStr); setNewItemExpiry(''); setNewItemRoast(''); setNewItemFund('') }} className="text-[11px] px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Cart items as POS-style cards grouped by category */}
          {cartItems.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cart ({cartItems.length} items)</h3>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Math.round(cartItems.reduce((s, i) => s + i.totalCost, 0)))}</span>
              </div>
              {(() => {
                const grouped: Record<string, typeof cartItems> = {}
                for (const item of cartItems) {
                  const cat = item.category || 'Other'
                  if (!grouped[cat]) grouped[cat] = []
                  grouped[cat].push(item)
                }
                return Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-3 last:mb-0">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl mb-2 ${catColor(cat)}`}>
                      <span>{catEmoji(cat)} {cat}</span>
                      <span className="opacity-70">· {items.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((item, i) => (
                        <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600 relative group">
                          <button
                            onClick={() => setCartItems(cartItems.filter((_, j) => j !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                          >×</button>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.itemName}</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Math.round(item.totalCost))}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">{item.quantity}{item.unit}</span>
                            {item.note && <span className="text-[9px] text-slate-400 truncate">{item.note}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400">
                            <span>{item.purchaseDate}</span>
                            {item.expirationDate && <span className="text-rose-400">Exp: {item.expirationDate}</span>}
                            {item.roastedDate && <span className="text-amber-500">Roast: {item.roastedDate}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}

              {/* Save/Clear buttons */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  value={cartNote}
                  onChange={e => setCartNote(e.target.value)}
                  placeholder="Order note (optional)"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white placeholder-slate-400 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const order: PurchaseOrder = {
                        id: generateId(),
                        createdAt: new Date().toISOString(),
                        items: [...cartItems],
                        status: 'draft',
                        note: cartNote,
                      }
                      addPurchaseOrder(order)
                      setCartItems([])
                      setCartNote('')
                    }}
                    className="flex-1 text-xs py-2.5 bg-blue-600 text-white rounded-xl font-semibold"
                  >
                    Save Order
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all cart items?')) {
                        setCartItems([])
                        setCartNote('')
                      }
                    }}
                    className="text-xs px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {cartItems.length === 0 && state.purchaseOrders.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-lg mb-2">📦</div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">No purchase orders yet</div>
              <div className="text-[11px] text-slate-400 mb-3">Add items to build a purchase order, then save or execute.</div>
              <button onClick={() => { setShowAddItem(true); setNewItemName(''); setNewItemCategory(''); setNewItemQty(0); setNewItemUnit('g'); setNewItemCost(0); setNewItemNote(''); setShowCustomCategory(false); setCustomCategory(''); setNewItemDate(todayStr); setNewItemExpiry(''); setNewItemRoast(''); setNewItemFund('') }} className="text-xs px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold">+ First Item</button>
            </div>
          )}

          {/* Draft orders */}
          {state.purchaseOrders.filter(o => o.status === 'draft').length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-amber-200 dark:border-amber-800 shadow-sm">
              <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">
                Draft Orders ({state.purchaseOrders.filter(o => o.status === 'draft').length})
              </h3>
              <div className="space-y-2">
                {state.purchaseOrders.filter(o => o.status === 'draft').map(order => {
                  const total = order.items.reduce((s, i) => s + i.totalCost, 0)
                  return (
                    <div key={order.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">#{order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(total))}</span>
                      </div>
                      {order.note && <div className="text-[10px] text-slate-400 mb-1.5 italic">{order.note}</div>}
                      <div className="space-y-0.5 mb-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-2 truncate min-w-0">
                              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold flex-shrink-0 ${catColor(item.category)}`}>{catEmoji(item.category)} {item.category || '?'}</span>
                              <span className="truncate text-slate-700 dark:text-slate-300">{item.itemName} · {item.quantity}{item.unit}</span>
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <div className="text-[9px] text-slate-400 text-right leading-tight">
                                {item.purchaseDate && <div>{item.purchaseDate}</div>}
                                {item.expirationDate && <div className="text-rose-400">Exp {item.expirationDate}</div>}
                                {item.roastedDate && <div className="text-amber-500">R {item.roastedDate}</div>}
                              </div>
                              <span className="text-slate-600 dark:text-slate-400 font-medium">{formatCurrency(Math.round(item.totalCost))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-600">
                        <button
                          onClick={() => {
                            if (window.confirm('Execute this purchase order?\nBeans (matched by name) will create inventory transactions. Other items are recorded as ordered.')) {
                              setExecuting(true)
                              executePurchaseOrder(order.id)
                              setExecuting(false)
                            }
                          }}
                          disabled={executing}
                          className="flex-1 text-[10px] py-2 bg-emerald-600 text-white rounded-xl font-semibold"
                        >
                          Execute
                        </button>
                        <button onClick={() => removePurchaseOrder(order.id)} className="text-[10px] px-4 py-2 bg-rose-500 text-white rounded-xl font-semibold">Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Executed orders */}
          {state.purchaseOrders.filter(o => o.status === 'executed').length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Purchase History ({state.purchaseOrders.filter(o => o.status === 'executed').length})
              </h3>
              <div className="space-y-2">
                {state.purchaseOrders.filter(o => o.status === 'executed').sort((a, b) => new Date(b.executedAt || b.createdAt).getTime() - new Date(a.executedAt || a.createdAt).getTime()).map(order => {
                  const total = order.items.reduce((s, i) => s + i.totalCost, 0)
                  return (
                    <div key={order.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">#{order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-emerald-500">{order.executedAt ? new Date(order.executedAt).toLocaleDateString() : ''}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(total))}</span>
                      </div>
                      {order.note && <div className="text-[10px] text-slate-400 mb-1.5 italic">{order.note}</div>}
                      <div className="space-y-0.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-2 truncate min-w-0">
                              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold flex-shrink-0 ${catColor(item.category)}`}>{catEmoji(item.category)} {item.category || '?'}</span>
                              <span className="truncate text-slate-700 dark:text-slate-300">{item.itemName} · {item.quantity}{item.unit}</span>
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <div className="text-[9px] text-slate-400 text-right leading-tight">
                                {item.purchaseDate && <div>{item.purchaseDate}</div>}
                                {item.expirationDate && <div className="text-rose-400">Exp {item.expirationDate}</div>}
                                {item.roastedDate && <div className="text-amber-500">R {item.roastedDate}</div>}
                              </div>
                              <span className="text-slate-600 dark:text-slate-400 font-medium">{formatCurrency(Math.round(item.totalCost))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <RecordsView
          runs={state.runs}
          purchaseOrders={state.purchaseOrders}
          transactions={state.transactions}
          totalSales={totalSales}
          fundingSources={state.fundingSources}
          addFundingSource={addFundingSource}
          updateFundingSource={updateFundingSource}
          removeFundingSource={removeFundingSource}
        />
      )}
    </div>
  )
}
