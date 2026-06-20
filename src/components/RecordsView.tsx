import { useState, useMemo } from 'react'
import type { DayRun, PurchaseOrder, InventoryTransaction, FundingSource } from '../types'
import { PURCHASE_CATEGORIES } from '../types'
import { formatCurrency, generateId } from '../utils'

interface LedgerEntry {
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  category?: string
  sourceLabel: string
  fundingSourceId?: string
}

interface Props {
  runs: DayRun[]
  purchaseOrders: PurchaseOrder[]
  transactions: InventoryTransaction[]
  totalSales: (run: DayRun) => number
  fundingSources: FundingSource[]
  addFundingSource: (source: FundingSource) => void
  updateFundingSource: (sourceId: string, updates: Partial<FundingSource>) => void
  removeFundingSource: (sourceId: string) => void
}

export default function RecordsView({ runs, purchaseOrders, transactions, totalSales, fundingSources, addFundingSource, updateFundingSource, removeFundingSource }: Props) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [showAddSource, setShowAddSource] = useState(false)
  const [editSourceId, setEditSourceId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formAmount, setFormAmount] = useState(0)
  const [formCategories, setFormCategories] = useState<string[]>([])
  const [assignItem, setAssignItem] = useState<{ date: string; desc: string; amount: number; orderId?: string; itemIndex?: number } | null>(null)

  const allEntries = useMemo(() => {
    const list: LedgerEntry[] = []

    for (const run of runs) {
      if (run.sales.length === 0) continue
      const rev = totalSales(run)
      if (rev <= 0) continue
      list.push({
        date: run.date,
        description: `Day ${run.dayNumber} — ${run.sales.length} sale${run.sales.length > 1 ? 's' : ''}`,
        type: 'income',
        amount: rev,
        sourceLabel: 'Sales',
      })
    }

    for (const order of purchaseOrders) {
      if (order.status !== 'executed') continue
      for (const item of order.items) {
        list.push({
          date: item.purchaseDate || order.executedAt?.slice(0, 10) || order.createdAt.slice(0, 10),
          description: `${item.itemName} (${item.quantity}${item.unit})`,
          type: 'expense',
          amount: item.totalCost,
          category: item.category,
          sourceLabel: 'Purchase',
          fundingSourceId: item.fundingSourceId,
        })
      }
    }

    const poItemKeys = new Set<string>()
    for (const order of purchaseOrders) {
      if (order.status !== 'executed') continue
      for (const item of order.items) {
        poItemKeys.add(`${item.itemName}|${item.purchaseDate}|${item.totalCost}`)
      }
    }

    for (const tx of transactions) {
      if (tx.type !== 'purchase') continue
      const key = `${tx.beanName}|${tx.date}|${tx.totalCost}`
      if (poItemKeys.has(key)) continue
      list.push({
        date: tx.date,
        description: `${tx.beanName} (${tx.quantity}g)`,
        type: 'expense',
        amount: tx.totalCost,
        sourceLabel: 'Purchase',
      })
    }

    list.sort((a, b) => a.date.localeCompare(b.date))
    return list
  }, [runs, purchaseOrders, transactions, totalSales])

  const totalIncome = allEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpenses = allEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  function fundExpenses(fundId: string) {
    return allEntries.filter(e => e.type === 'expense' && e.fundingSourceId === fundId).reduce((s, e) => s + e.amount, 0)
  }

  function fundBalance(fund: FundingSource) {
    return fund.initialAmount - fundExpenses(fund.id)
  }

  return (
    <div className="space-y-3">
      {/* Funding source header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Funding Sources</h3>
          <button onClick={() => { setShowAddSource(true); setEditSourceId(null); setFormName(''); setFormAmount(0); setFormCategories([]) }} className="text-[10px] px-3 py-1.5 bg-blue-600 text-white rounded-xl font-semibold">+ New Source</button>
        </div>

        {fundingSources.length === 0 && !showAddSource ? (
          <div className="text-center py-4 text-slate-400 text-xs">No funding sources yet. Create one to start budgeting.</div>
        ) : (
          <div className="space-y-1.5">
            {fundingSources.map(source => {
              const exp = fundExpenses(source.id)
              const bal = source.initialAmount - exp
              return (
                <div key={source.id}
                  className={`rounded-xl p-3 border transition-all cursor-pointer ${selectedSourceId === source.id ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 hover:border-slate-300 dark:hover:border-slate-600'}`}
                  onClick={() => setSelectedSourceId(source.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{source.name}</span>
                      {selectedSourceId === source.id && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold flex-shrink-0">selected</span>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(bal))}</span>
                      {bal < 0 && <span className="text-[9px] text-rose-500 font-semibold">!</span>}
                      <button onClick={e => { e.stopPropagation(); setEditSourceId(source.id); setFormName(source.name); setFormAmount(source.initialAmount); setFormCategories([...source.categories]) }} className="text-[9px] text-slate-400 hover:text-blue-500 ml-1">Edit</button>
                      <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${source.name}"?`)) removeFundingSource(source.id) }} className="text-[9px] text-slate-400 hover:text-rose-500 ml-0.5">Del</button>
                    </div>
                  </div>
                  {(source.categories?.length ?? 0) > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {(source.categories ?? []).map(cat => (
                        <span key={cat} className="text-[8px] bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">{cat}</span>
                      ))}
                    </div>
                  )}
                  {selectedSourceId === source.id && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 text-[10px]">
                      <span className="text-slate-500">Funding <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(Math.round(source.initialAmount))}</strong></span>
                      <span className="text-rose-400">− Spent <strong>{formatCurrency(Math.round(exp))}</strong></span>
                      <span className={`font-bold ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>= {formatCurrency(Math.round(bal))}</span>
                      {(source.categories?.length ?? 0) === 0 && <span className="text-amber-500 text-[9px]">No categories mapped</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add/Edit source form with category mapping */}
        {(showAddSource || editSourceId) && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-2">
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Source name (e.g. Bean Budget)"
              className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">฿</span>
              <input
                type="number"
                value={formAmount || ''}
                onChange={e => setFormAmount(Number(e.target.value))}
                placeholder="Initial amount"
                className="flex-1 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Mapped Categories</label>
              <div className="flex flex-wrap gap-1">
                {PURCHASE_CATEGORIES.map(cat => {
                  const isMapped = formCategories.includes(cat)
                  const conflict = isMapped && editSourceId && fundingSources.some(s => s.id !== editSourceId && (s.categories ?? []).includes(cat))
                  return (
                    <button
                      key={cat}
                      onClick={() => setFormCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                      className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-all ${isMapped ? 'bg-blue-600 text-white' : conflict ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                    >
                      {cat}
                      {conflict && ' ⚠️'}
                    </button>
                  )
                })}
              </div>
              {formCategories.length === 0 && <div className="text-[9px] text-amber-500 mt-0.5">No categories = this fund won't auto-deduct any purchases</div>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => {
                if (!formName.trim() || formAmount <= 0) return
                if (editSourceId) {
                  updateFundingSource(editSourceId, { name: formName.trim(), initialAmount: formAmount, categories: formCategories })
                  setEditSourceId(null)
                } else {
                  addFundingSource({ id: generateId(), name: formName.trim(), initialAmount: formAmount, createdAt: new Date().toISOString(), categories: formCategories })
                }
                setFormName('')
                setFormAmount(0)
                setFormCategories([])
                setShowAddSource(false)
              }} disabled={!formName.trim() || formAmount <= 0} className="flex-1 text-xs py-2 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40">
                {editSourceId ? 'Save' : 'Add Source'}
              </button>
              <button onClick={() => { setShowAddSource(false); setEditSourceId(null); setFormCategories([]) }} className="text-xs px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-200 dark:border-emerald-800">
          <div className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Total Income</div>
          <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(Math.round(totalIncome))}</div>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center border border-rose-200 dark:border-rose-800">
          <div className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider">Total Expenses</div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">{formatCurrency(Math.round(totalExpenses))}</div>
        </div>
        <div className={`rounded-xl p-3 text-center border ${totalIncome - totalExpenses >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net</div>
          <div className={`text-lg font-black ${totalIncome - totalExpenses >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(Math.round(totalIncome - totalExpenses))}</div>
        </div>
      </div>

      {/* Ledger entries */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="w-20 flex-shrink-0">Date</div>
          <div className="flex-1">Description</div>
          <div className="w-24 flex-shrink-0 text-right">Fund</div>
          <div className="w-20 flex-shrink-0 text-right">Amount</div>
        </div>
        {allEntries.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No records yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {allEntries.map((entry, i) => {
              const fund = entry.fundingSourceId ? fundingSources.find(s => s.id === entry.fundingSourceId) : undefined
              const unassigned = entry.type === 'expense' && !entry.fundingSourceId
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="w-20 flex-shrink-0 text-slate-400">{entry.date}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${entry.type === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {entry.type === 'income' ? 'IN' : 'EX'}
                      </span>
                      {entry.category && (
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 rounded">{entry.category}</span>
                      )}
                      <span className="truncate text-slate-700 dark:text-slate-300">{entry.description}</span>
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-right">
                    {unassigned ? (
                      <button
                        onClick={() => setAssignItem({ date: entry.date, desc: entry.description, amount: entry.amount })}
                        className="text-[9px] text-amber-500 hover:text-amber-700 font-semibold bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded"
                      >
                        Assign
                      </button>
                    ) : entry.type === 'income' ? (
                      <span className="text-[9px] text-slate-400">—</span>
                    ) : fund ? (
                      <span className="text-[9px] text-slate-500 font-medium truncate block max-w-[90px]" title={fund.name}>{fund.name}</span>
                    ) : (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </div>
                  <div className={`w-20 flex-shrink-0 font-semibold text-right tabular-nums ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {entry.type === 'income' ? '+' : '-'}{formatCurrency(Math.round(entry.amount))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign unassigned item to a fund */}
      {assignItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAssignItem(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Assign to Funding Source</h3>
            <div className="text-xs text-slate-500 mb-3">{assignItem.desc} · {formatCurrency(Math.round(assignItem.amount))}</div>
            <div className="space-y-1.5 mb-3">
              {fundingSources.map(source => (
                <button
                  key={source.id}
                  onClick={() => {
                    source.categories = [...source.categories]
                    setAssignItem(null)
                  }}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-slate-700 dark:text-slate-300 font-medium"
                >
                  {source.name} <span className="text-slate-400 font-normal">({formatCurrency(Math.round(source.initialAmount))} - {formatCurrency(Math.round(fundExpenses(source.id)))})</span>
                </button>
              ))}
            </div>
            <button onClick={() => setAssignItem(null)} className="w-full text-xs py-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      {/* Fund balances summary */}
      {fundingSources.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(fundingSources.length, 3)}, 1fr)` }}>
          {fundingSources.map(source => {
            const bal = fundBalance(source)
            return (
              <div key={source.id} className={`rounded-xl p-3 border text-center ${bal >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'}`}>
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate" title={source.name}>{source.name}</div>
                <div className={`text-sm font-black mt-0.5 ${bal >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(Math.round(bal))}</div>
                <div className="text-[8px] text-slate-400">of {formatCurrency(Math.round(source.initialAmount))}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}