import { useState, useMemo, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { generateId, formatCurrency } from '../utils'
import type { BeanInventory, CustomerProfile } from '../types'
import { CUSTOMER_PROFILES } from '../types'
import { COFFEE_COUNTRIES, COFFEE_VARIETIES, PROCESS_GROUPS, getRoastLabel, getRoastColor, EMPTY_TASTE_NOTES, TASTE_CATEGORIES, getFreshness, daysSince, type TastingNotes } from '../coffee-data'

export default function InventoryView() {
  const { state, dispatch, addPurchase, getBeanStock, getBeanTransactions, getBeanCostSummary, updateTransaction, deleteTransaction } = useStore()

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'shelf'>('card')
  const [showPurchase, setShowPurchase] = useState<string | null>(null)
  const [expandedBean, setExpandedBean] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [stockAction, setStockAction] = useState<{ beanId: string; type: 'set' | 'deduct'; input: string; reason: string } | null>(null)

  const [form, setForm] = useState({
    name: '', origin: '', variety: '', process: '', group: 'C' as CustomerProfile,
    costPerGram: 0, stockGrams: 0, density: 0, altitude: 0, roastLevel: 50, roastDate: '', tastingNotes: { ...EMPTY_TASTE_NOTES },
  })
  const [originSearch, setOriginSearch] = useState('')
  const [showOrigins, setShowOrigins] = useState(false)
  const [varietySearch, setVarietySearch] = useState('')
  const [showVarieties, setShowVarieties] = useState(false)
  const [customProcess, setCustomProcess] = useState('')
  const [tasteInputs, setTasteInputs] = useState<Record<string, string>>({})
  const [showTasteSuggestions, setShowTasteSuggestions] = useState<Record<string, boolean>>({})
  const originRef = useRef<HTMLDivElement>(null)
  const varietyRef = useRef<HTMLDivElement>(null)

  const [purchaseQty, setPurchaseQty] = useState(0)
  const [purchaseCost, setPurchaseCost] = useState(0)
  const [purchaseNote, setPurchaseNote] = useState('')
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editTxQty, setEditTxQty] = useState(0)
  const [editTxCost, setEditTxCost] = useState(0)
  const [editTxNote, setEditTxNote] = useState('')

  const allCountryOrigins = useMemo(() => {
    const used = new Set(state.beans.map(b => b.origin).filter(Boolean))
    const all = [...new Set([...COFFEE_COUNTRIES, ...used])]
    return all.sort()
  }, [state.beans])

  const filteredOrigins = useMemo(() => {
    if (!originSearch) return allCountryOrigins
    return allCountryOrigins.filter(c => c.toLowerCase().includes(originSearch.toLowerCase()))
  }, [originSearch, allCountryOrigins])

  const filteredVarieties = useMemo(() => {
    if (!varietySearch) return COFFEE_VARIETIES
    return COFFEE_VARIETIES.filter(v => v.toLowerCase().includes(varietySearch.toLowerCase()))
  }, [varietySearch])

  const groupedProcesses = useMemo(() => {
    const groups: Record<string, typeof PROCESS_GROUPS> = {}
    for (const p of PROCESS_GROUPS) {
      if (!groups[p.group]) groups[p.group] = []
      groups[p.group].push(p)
    }
    return groups
  }, [])

  const lastPurchaseDates = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of state.transactions) {
      if (t.type === 'purchase' && (!map[t.beanId] || t.date > map[t.beanId])) {
        map[t.beanId] = t.date
      }
    }
    return map
  }, [state.transactions])

  const filteredBeans = useMemo(() => {
    if (!searchQuery.trim()) return state.beans
    const q = searchQuery.trim().toLowerCase()
    return state.beans.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.origin.toLowerCase().includes(q) ||
      (b.variety || '').toLowerCase().includes(q) ||
      b.process.toLowerCase().includes(q) ||
      getRoastLabel(b.roastLevel).toLowerCase().includes(q) ||
      b.roastDate?.toLowerCase().includes(q) ||
      String(b.altitude ?? '').includes(q)
    )
  }, [state.beans, searchQuery])

  function resetForm() {
    setForm({ name: '', origin: '', variety: '', process: '', group: 'C', costPerGram: 0, stockGrams: 0, density: 0, altitude: 0, roastLevel: 50, roastDate: '', tastingNotes: { ...EMPTY_TASTE_NOTES } })
    setOriginSearch('')
    setVarietySearch('')
    setCustomProcess('')
    setTasteInputs({})
    setEditingId(null)
    setShowForm(false)
  }

  function handleEdit(bean: BeanInventory) {
    setForm({
      name: bean.name, origin: bean.origin, variety: bean.variety || '', process: bean.process, group: bean.group,
      costPerGram: bean.costPerGram, stockGrams: bean.stockGrams, density: bean.density || 0, altitude: bean.altitude || 0, roastLevel: bean.roastLevel,
      roastDate: bean.roastDate || '',
      tastingNotes: { ...bean.tastingNotes },
    })
    setEditingId(bean.id)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    const processValue = form.process || customProcess.trim()
    if (!processValue) return
    if (editingId) {
      const existing = state.beans.find(b => b.id === editingId)
      if (existing) dispatch({ type: 'UPDATE_BEAN', payload: { ...existing, ...form, process: processValue } })
    } else {
      const bean: BeanInventory = {
        id: generateId(), ...form, process: processValue, density: form.density || undefined, altitude: form.altitude || undefined, variety: form.variety || undefined, createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'ADD_BEAN', payload: bean })
    }
    resetForm()
  }

  function handleDelete(id: string) {
    dispatch({ type: 'REMOVE_BEAN', payload: id })
  }

  function addTasteNote(cat: keyof TastingNotes) {
    const val = (tasteInputs[cat] || '').trim()
    if (!val) return
    setForm(f => ({ ...f, tastingNotes: { ...f.tastingNotes, [cat]: [...f.tastingNotes[cat], val] } }))
    setTasteInputs(i => ({ ...i, [cat]: '' }))
  }

  function removeTasteNote(cat: keyof TastingNotes, idx: number) {
    setForm(f => ({ ...f, tastingNotes: { ...f.tastingNotes, [cat]: f.tastingNotes[cat].filter((_, i) => i !== idx) } }))
  }

  function handlePurchase(beanId: string) {
    if (purchaseQty <= 0 || purchaseCost <= 0) return
    addPurchase(beanId, purchaseQty, purchaseCost, purchaseNote)
    setPurchaseQty(0)
    setPurchaseCost(0)
    setPurchaseNote('')
    setShowPurchase(null)
  }

  function handleDeduct(beanId: string, grams: number, reason: string) {
    if (grams <= 0) return
    const bean = state.beans.find(b => b.id === beanId)
    if (!bean) return

    const txType = reason === 'spoilage' ? 'spoilage' as const : 'usage' as const
    const tx = {
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      beanId,
      beanName: bean.name,
      type: txType,
      quantity: -grams,
      costPerGram: 0,
      totalCost: 0,
      note: reason === 'spoilage' ? `Spoilage: ${grams}g` : `Usage: ${grams}g`,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: tx })

    const purchases = state.transactions.filter(t => t.beanId === beanId && t.type === 'purchase')
    const totalBought = purchases.reduce((s, t) => s + t.quantity, 0)
    const allTxns = [...state.transactions, tx]
    const totalUsed = allTxns.filter(t => t.beanId === beanId && (t.type === 'usage' || t.type === 'spoilage')).reduce((s, t) => s + Math.abs(t.quantity), 0)

    dispatch({ type: 'UPDATE_BEAN', payload: { ...bean, stockGrams: totalBought - totalUsed } })
  }

  function handleSetStock(beanId: string, actualGrams: number, reason: string) {
    if (actualGrams < 0) return
    const bean = state.beans.find(b => b.id === beanId)
    if (!bean) return
    const currentStock = getBeanStock(beanId)
    const diff = actualGrams - currentStock
    if (diff === 0) return

    const tx = {
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      beanId,
      beanName: bean.name,
      type: 'adjustment' as const,
      quantity: diff,
      costPerGram: 0,
      totalCost: 0,
      note: reason || (diff > 0 ? `Stock adjustment: +${diff}g (physical count ${actualGrams}g)` : `Stock adjustment: ${diff}g (physical count ${actualGrams}g)`),
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: tx })

    const purchases = state.transactions.filter(t => t.beanId === beanId && t.type === 'purchase')
    const totalBought = purchases.reduce((s, t) => s + t.quantity, 0)
    const allTxns = [...state.transactions, tx]
    const totalUsed = allTxns.filter(t => t.beanId === beanId && (t.type === 'usage' || t.type === 'spoilage')).reduce((s, t) => s + Math.abs(t.quantity), 0)

    dispatch({ type: 'UPDATE_BEAN', payload: { ...bean, stockGrams: totalBought - totalUsed } })
  }

  const fieldClass = 'w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400'
  const labelClass = 'text-xs text-slate-400 block mb-1'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (originRef.current && !originRef.current.contains(e.target as Node)) {
        setShowOrigins(false)
      }
      if (varietyRef.current && !varietyRef.current.contains(e.target as Node)) {
        setShowVarieties(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function SiloIndicator({ bean, stock }: { bean: BeanInventory; stock: number }) {
    const avgDose = useMemo(() => {
      const linked = state.menu.filter(m => m.beanId === bean.id && m.recipe?.dose)
      if (linked.length === 0) return 0
      return linked.reduce((s, m) => s + (m.recipe!.dose || 0), 0) / linked.length
    }, [bean.id, state.menu])

    const doses = avgDose > 0 ? Math.floor(stock / avgDose) : 0
    const servings = avgDose > 0 ? Math.floor(stock / avgDose) : 0
    const maxDisplay = Math.max(stock, bean.stockGrams || 1000)

    return (
      <div className="flex items-center gap-3 mt-2">
        <div className="relative w-4 h-16 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
          <div
            className="absolute bottom-0 w-full transition-all duration-500 rounded-full"
            style={{
              height: `${(stock / maxDisplay) * 100}%`,
              background: stock > 0
                ? `linear-gradient(to top, #059669, #34d399)`
                : '#ef4444',
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold ${stock <= 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stock}g
            </span>
            {avgDose > 0 && (
              <span className="text-slate-400">~{doses} doses</span>
            )}
          </div>
          {avgDose > 0 && (
            <div className="text-[10px] text-slate-400">~{servings} serves · {avgDose.toFixed(1)}g/dose</div>
          )}
          {avgDose === 0 && (
            <div className="text-[10px] text-slate-400">Link to menu item with dose to estimate</div>
          )}
          {stock <= 10 && stock > 0 && <div className="text-[10px] text-amber-500 font-medium mt-0.5">Low stock</div>}
          {stock <= 0 && <div className="text-[10px] text-rose-500 font-medium mt-0.5">Out of stock</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Beans</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
          + Add Bean
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name, origin, process, roast..." className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs dark:text-white placeholder-slate-400" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">X</button>}
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
          <button onClick={() => setViewMode('card')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}>Cards</button>
          <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}>Table</button>
          <button onClick={() => setViewMode('shelf')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'shelf' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}>Shelf</button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bean name" className={fieldClass} />

          <div className="flex gap-2">
            <div className="flex-1 relative" ref={originRef}>
              <label className={labelClass}>Origin</label>
              <input type="text" value={originSearch} onChange={e => { setOriginSearch(e.target.value); setShowOrigins(true); setForm(f => ({ ...f, origin: '' })) }} onFocus={() => setShowOrigins(true)} placeholder="Search countries..." className={fieldClass} />
              {showOrigins && (
                <div className="absolute top-full mt-0.5 left-0 right-0 z-20 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                  {filteredOrigins.map(c => (
                    <button key={c} onClick={() => { setForm(f => ({ ...f, origin: c })); setOriginSearch(c); setShowOrigins(false) }} className={`block w-full text-left text-xs px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 ${form.origin === c ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>{c}</button>
                  ))}
                  {filteredOrigins.length === 0 && <div className="text-xs text-slate-400 px-3 py-2">No matches — type a custom origin</div>}
                </div>
              )}
              {form.origin && !originSearch && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{form.origin}</div>}
            </div>
            <div className="flex-1">
              <label className={labelClass}>Profile</label>
              <select value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value as CustomerProfile }))} className={fieldClass}>
                {CUSTOMER_PROFILES.map(p => <option key={p.value} value={p.value}>{p.label} ({p.value})</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative" ref={varietyRef}>
              <label className={labelClass}>Variety</label>
              <input type="text" value={varietySearch} onChange={e => { setVarietySearch(e.target.value); setShowVarieties(true); setForm(f => ({ ...f, variety: '' })) }} onFocus={() => setShowVarieties(true)} placeholder="Search varieties..." className={fieldClass} />
              {showVarieties && (
                <div className="absolute top-full mt-0.5 left-0 right-0 z-20 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                  {filteredVarieties.map(v => (
                    <button key={v} onClick={() => { setForm(f => ({ ...f, variety: v })); setVarietySearch(v); setShowVarieties(false) }} className={`block w-full text-left text-xs px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 ${form.variety === v ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>{v}</button>
                  ))}
                  {filteredVarieties.length === 0 && <div className="text-xs text-slate-400 px-3 py-2">No matches — type a custom variety</div>}
                </div>
              )}
              {form.variety && !varietySearch && <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{form.variety}</div>}
            </div>
            <div className="flex-1">
              <label className={labelClass}>Density</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="1000" value={form.density} onChange={e => setForm(f => ({ ...f, density: Number(e.target.value) }))} className="flex-1 accent-blue-600" />
                <span className="text-xs text-slate-500 w-16 text-right">{form.density > 0 ? `${form.density} g/L` : '—'}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Altitude</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0" max="3000" step="50" value={form.altitude} onChange={e => setForm(f => ({ ...f, altitude: Number(e.target.value) }))} className="flex-1 accent-blue-600" />
                <span className="text-xs text-slate-500 w-16 text-right">{form.altitude > 0 ? `${form.altitude}m` : '—'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Process</label>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-xl p-1.5">
              {Object.entries(groupedProcesses).map(([group, items]) => (
                <div key={group}>
                  <div className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 uppercase tracking-wider">{group}</div>
                  <div className="flex flex-wrap gap-1 py-0.5">
                    {items.map(p => (
                      <button key={p.label} onClick={() => { setForm(f => ({ ...f, process: p.label })); setCustomProcess('') }} className={`text-[10px] px-2 py-1 rounded-full border font-medium transition-all ${form.process === p.label ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300'}`}>{p.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              <input type="text" value={customProcess} onChange={e => { setCustomProcess(e.target.value); setForm(f => ({ ...f, process: '' })) }} placeholder="Or type custom process..." className={`${fieldClass} text-xs`} />
            </div>
            {form.process && <div className="text-[10px] text-emerald-500 mt-0.5">Selected: {form.process}</div>}
          </div>

          <div>
            <label className={labelClass}>Roast Level: <span className="font-semibold text-slate-700 dark:text-slate-300">{getRoastLabel(form.roastLevel)}</span></label>
            <input type="range" min="0" max="100" value={form.roastLevel} onChange={e => setForm(f => ({ ...f, roastLevel: Number(e.target.value) }))} className="w-full accent-blue-600" />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Green</span>
              <span>Light</span>
              <span>Medium</span>
              <span>Dark</span>
              <span>Charred</span>
            </div>
            <div className="mt-1 w-full h-2 rounded-full" style={{ background: `linear-gradient(to right, #8d734b, #6b4c2a, #4a3220, #372515, #1a0e05)` }} />
          </div>

          <div>
            <label className={labelClass}>Roast Date</label>
            <input type="date" value={form.roastDate} onChange={e => setForm(f => ({ ...f, roastDate: e.target.value }))} className={fieldClass + ' w-full'} />
            {form.roastDate && (() => {
              const d = daysSince(form.roastDate)
              const f = getFreshness(form.roastDate)
              return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5 ${f.color}`}>{d}d · {f.label}</span>
            })()}
          </div>

          <div>
            <label className={labelClass}>Tasting Notes</label>
            <div className="space-y-2">
              {TASTE_CATEGORIES.map(cat => (
                <div key={cat.key}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">{cat.label}</span>
                    <button
                      onClick={() => setShowTasteSuggestions(s => ({ ...s, [cat.key]: !s[cat.key] }))}
                      className="text-[10px] text-blue-500 hover:underline"
                    >
                      {showTasteSuggestions[cat.key] ? 'Hide suggestions' : 'Suggestions'}
                    </button>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-0.5">
                    {form.tastingNotes[cat.key].map((n, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
                        {n} <button onClick={() => removeTasteNote(cat.key, i)} className="text-rose-400 hover:text-rose-600">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={tasteInputs[cat.key] || ''}
                      onChange={e => setTasteInputs(i => ({ ...i, [cat.key]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTasteNote(cat.key) } }}
                      placeholder={`Add ${cat.label.toLowerCase()} note...`}
                      className={fieldClass + ' text-xs'}
                    />
                    <button onClick={() => addTasteNote(cat.key)} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-xs">+</button>
                  </div>
                  {showTasteSuggestions[cat.key] && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {cat.suggestions.filter(s => !form.tastingNotes[cat.key].includes(s)).map(s => (
                        <button key={s} onClick={() => { setForm(f => ({ ...f, tastingNotes: { ...f.tastingNotes, [cat.key]: [...f.tastingNotes[cat.key], s] } })) }} className="text-[10px] px-1.5 py-0.5 bg-slate-50 dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600 rounded-full hover:border-blue-300">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={resetForm} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{filteredBeans.length} of {state.beans.length} beans</span>
          {viewMode === 'table' && state.beans.length > 0 && (
            <span className="text-[10px] text-slate-400">Scroll sideways for more columns →</span>
          )}
        </div>

        {viewMode === 'table' && filteredBeans.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Name</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Origin</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Variety</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Process</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Density</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Altitude</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Roast</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Roast Date</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Freshness</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Stock</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Doses</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Last Buy</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Invested</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Avg /g</th>
                  <th className="text-left px-2 py-1.5 font-medium whitespace-nowrap">Profile</th>
                </tr>
              </thead>
              <tbody>
                {filteredBeans.map(bean => {
                  const s = getBeanStock(bean.id)
                  const c = getBeanCostSummary(bean.id)
                  const linked = state.menu.filter(m => m.beanId === bean.id && m.recipe?.dose)
                  const avgDose = linked.length > 0 ? linked.reduce((a, m) => a + (m.recipe!.dose || 0), 0) / linked.length : 0
                  const doses = avgDose > 0 ? Math.floor(s / avgDose) : 0
                  const freshness = bean.roastDate ? getFreshness(bean.roastDate) : null
                  const roastDays = bean.roastDate ? daysSince(bean.roastDate) : null
                  return (
                    <tr key={bean.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{bean.name}</td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{bean.origin}</td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{bean.variety || '—'}</td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{bean.process}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {bean.density ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(bean.density / 1000) * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400">{bean.density}g/L</span>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {bean.altitude ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(bean.altitude / 3000) * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400">{bean.altitude}m</span>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoastColor(bean.roastLevel) }} />
                          <span className="text-slate-500">{getRoastLabel(bean.roastLevel)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{bean.roastDate || '—'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {freshness ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${freshness.color}`}>{roastDays}d · {freshness.label}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={`font-medium ${s <= 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{s}g</span>
                      </td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{avgDose > 0 ? `~${doses}` : '—'}</td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{lastPurchaseDates[bean.id] || '—'}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatCurrency(c.totalInvested)}</td>
                      <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{c.avgCostPerGram.toFixed(2)}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                          bean.group === 'R' ? 'bg-emerald-600' : bean.group === 'P' ? 'bg-amber-600' : bean.group === 'U' ? 'bg-violet-600' : bean.group === 'A' ? 'bg-rose-600' : 'bg-slate-500'
                        }`}>{bean.group}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'shelf' && filteredBeans.length > 0 && (
          <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-3 min-w-max px-1">
              {[...filteredBeans].sort((a, b) => a.roastLevel - b.roastLevel).map(bean => {
                const s = getBeanStock(bean.id)
                const c = getBeanCostSummary(bean.id)
                const linked = state.menu.filter(m => m.beanId === bean.id && m.recipe?.dose)
                const avgDose = linked.length > 0 ? linked.reduce((a, m) => a + (m.recipe!.dose || 0), 0) / linked.length : 0
                const maxStock = Math.max(s, 1000)
                const barH = Math.max(20, (s / maxStock) * 120)
                return (
                  <div key={bean.id} className="flex flex-col items-center gap-1.5" style={{ width: 80 }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[10px] font-bold ${s <= 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{s}g</span>
                      {avgDose > 0 && <span className="text-[9px] text-slate-400">~{Math.floor(s / avgDose)} doses</span>}
                    </div>
                    <div className="relative w-12 flex flex-col items-center" style={{ height: 140 }}>
                      <div className="absolute bottom-0 w-full rounded-t-lg overflow-hidden flex flex-col items-center justify-end transition-all duration-300 border border-slate-200 dark:border-slate-600" style={{ height: barH, backgroundColor: getRoastColor(bean.roastLevel) }}>
                        <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] leading-tight px-0.5 text-center" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                          {bean.name}
                        </span>
                      </div>
                      <div className="absolute bottom-0 w-full h-px bg-slate-300 dark:bg-slate-500" />
                    </div>
                    <div className="text-center min-h-0">
                      <div className="text-[9px] text-slate-400 truncate max-w-[80px]">{bean.origin}</div>
                      {bean.variety && <div className="text-[9px] text-slate-400 truncate max-w-[80px]">{bean.variety}</div>}
                      <div className="text-[9px] text-slate-400 truncate max-w-[80px]">{bean.process}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold text-white ${
                          bean.group === 'R' ? 'bg-emerald-600' : bean.group === 'P' ? 'bg-amber-600' : bean.group === 'U' ? 'bg-violet-600' : bean.group === 'A' ? 'bg-rose-600' : 'bg-slate-500'
                        }`}>{bean.group}</span>
                        <span className="text-[9px] text-slate-400">{formatCurrency(Math.round(c.totalInvested))}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'card' && filteredBeans.map(bean => {
          const txns = getBeanTransactions(bean.id)
          const stock = getBeanStock(bean.id)
          const cost = getBeanCostSummary(bean.id)

          const allNotes = [
            ...bean.tastingNotes.floral,
            ...bean.tastingNotes.fruity,
            ...bean.tastingNotes.sweet,
            ...bean.tastingNotes.nutty,
            ...bean.tastingNotes.spicy,
            ...bean.tastingNotes.fermented,
            ...bean.tastingNotes.other,
          ]

          return (
            <div key={bean.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{bean.name}</div>
                    <div className="text-xs text-slate-400 truncate">{bean.origin} · {bean.process}</div>
                    {bean.variety && <div className="text-[10px] text-slate-400 mt-0.5">{bean.variety}</div>}
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                    bean.group === 'R' ? 'bg-emerald-600' : bean.group === 'P' ? 'bg-amber-600' : bean.group === 'U' ? 'bg-violet-600' : bean.group === 'A' ? 'bg-rose-600' : 'bg-slate-500'
                  }`}>{bean.group}</span>
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoastColor(bean.roastLevel) }} />
                  <span className="text-[10px] text-slate-400">{getRoastLabel(bean.roastLevel)}</span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400">{bean.process}</span>
                  {bean.roastDate && (() => {
                    const f = getFreshness(bean.roastDate)
                    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.color}`}>{f.label}</span>
                  })()}
                </div>

                <SiloIndicator bean={bean} stock={stock} />

                {(bean.density || bean.altitude) && (
                  <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-400">
                    {bean.density ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Density</span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(bean.density / 1000) * 100}%` }} />
                        </div>
                        <span>{bean.density}g/L</span>
                      </div>
                    ) : null}
                    {bean.altitude ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Altitude</span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(bean.altitude / 3000) * 100}%` }} />
                        </div>
                        <span>{bean.altitude}m</span>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-1">
                  <div className="text-xs text-slate-400">Invested: {formatCurrency(cost.totalInvested)}</div>
                  <div className="text-xs text-slate-400">Avg: {cost.avgCostPerGram.toFixed(2)}/g</div>
                  {lastPurchaseDates[bean.id] && <div className="text-xs text-slate-400">Last buy: {lastPurchaseDates[bean.id]}</div>}
                </div>

                {(() => {
                  const linked = state.menu.filter(m => m.beanId === bean.id && m.recipe?.dose)
                  if (linked.length === 0) return null
                  const totalDose = linked.reduce((s, m) => s + (m.recipe?.dose || 0), 0)
                  const servings = totalDose > 0 ? Math.floor(stock / totalDose) : 0
                  return (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Menu Usage · Serves Remaining</div>
                      <div className="space-y-1">
                        {linked.map(m => {
                          const itemServes = (m.recipe?.dose || 0) > 0 ? Math.floor(stock / (m.recipe?.dose || 1)) : 0
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-400">{m.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${itemServes < 10 ? 'text-red-500' : itemServes < 30 ? 'text-amber-500' : 'text-emerald-500'}`}>~{itemServes} serves</span>
                                <span className="text-slate-400">({m.recipe?.dose || 0}g · {formatCurrency(Math.round((m.recipe?.dose || 0) * cost.avgCostPerGram))}/drink)</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-slate-200 dark:border-slate-600">
                        <span className="text-slate-500">Total dose: {totalDose}g per round</span>
                        <span className={`font-bold ${servings < 10 ? 'text-red-500' : servings < 30 ? 'text-amber-500' : 'text-emerald-500'}`}>~{servings} servings ({Math.round(stock)}g left)</span>
                      </div>
                    </div>
                  )
                })()}

                {(() => {
                  const linked = state.menu.filter(m => m.beanId === bean.id && m.recipe?.dose)
                  if (linked.length === 0) return null
                  if (stock <= 0) return null
                  const avgPerG = cost.avgCostPerGram
                  return (
                    <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/20 rounded-xl">
                      <div className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">Projection · If Sold Out</div>
                      <div className="space-y-1">
                        {linked.map(m => {
                          const dose = m.recipe?.dose || 1
                          const serves = Math.floor(stock / dose)
                          const revenue = serves * m.price
                          const beanCost = serves * dose * avgPerG
                          const profit = revenue - beanCost
                          const pct = beanCost > 0 ? ((profit / beanCost) * 100).toFixed(0) : '-'
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-400">{m.name}</span>
                              <span className="text-slate-500">
                                ~{serves} cups × {formatCurrency(m.price)} = {formatCurrency(revenue)}
                                <span className={profit >= 0 ? 'text-emerald-600 dark:text-emerald-400 ml-1' : 'text-rose-500 ml-1'}>
                                  (⎋{formatCurrency(profit)} · {profit >= 0 ? '+' : ''}{pct}%)
                                </span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-indigo-200 dark:border-indigo-800/30">
                        <span className="text-slate-500">Cost: {avgPerG.toFixed(2)}/g · {formatCurrency(cost.totalInvested)} total</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {Math.round(stock)}g remaining
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {(() => {
                  const linkedIds = new Set(state.menu.filter(m => m.beanId === bean.id).map(m => m.id))
                  if (linkedIds.size === 0) return null
                  let revenue = 0
                  let used = 0
                  for (const run of state.runs) {
                    for (const sale of run.sales) {
                      for (const item of sale.items) {
                        if (linkedIds.has(item.menuItemId)) {
                          revenue += item.price * item.quantity
                          used += (item.doseOverride || state.menu.find(m => m.id === item.menuItemId)?.recipe?.dose || 0) * item.quantity
                        }
                      }
                    }
                  }
                  const beanCost = used * cost.avgCostPerGram
                  const profit = revenue - beanCost
                  const pct = beanCost > 0 ? ((profit / beanCost) * 100).toFixed(0) : '-'
                  if (revenue === 0) return null
                  return (
                    <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/20 rounded-xl">
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Actual Sales</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Revenue</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Bean cost ({Math.round(used)}g)</span>
                        <span className="text-slate-500">{formatCurrency(Math.round(beanCost))}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 mt-1 border-t border-emerald-200 dark:border-emerald-800/30">
                        <span className="text-slate-600 dark:text-slate-400">Profit</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {formatCurrency(Math.round(profit))} · {profit >= 0 ? '+' : ''}{pct}%
                        </span>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex gap-2 mt-2 flex-wrap">
                  <button onClick={() => { setShowPurchase(bean.id); setPurchaseQty(0); setPurchaseCost(0); setPurchaseNote(''); setStockAction(null) }} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg">+ Buy</button>
                  {stock > 0 && <button onClick={() => setStockAction(a => a?.beanId === bean.id && a.type === 'deduct' ? null : { beanId: bean.id, type: 'deduct', input: '', reason: 'usage' })} className={`text-xs px-3 py-1.5 rounded-lg ${stockAction?.beanId === bean.id && stockAction.type === 'deduct' ? 'bg-rose-600 text-white' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>Deduct</button>}
                  <button onClick={() => setStockAction(a => a?.beanId === bean.id && a.type === 'set' ? null : { beanId: bean.id, type: 'set', input: String(stock), reason: '' })} className={`text-xs px-3 py-1.5 rounded-lg ${stockAction?.beanId === bean.id && stockAction.type === 'set' ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>📦 Check</button>
                  <button onClick={() => setExpandedBean(expandedBean === bean.id ? null : bean.id)} className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
                    {expandedBean === bean.id ? 'Hide' : 'Ledger'} ({txns.length})
                  </button>
                  <button onClick={() => handleEdit(bean)} className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">Edit</button>
                  <button onClick={() => handleDelete(bean.id)} className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-rose-500 rounded-lg">Del</button>
                </div>

                {stockAction?.beanId === bean.id && stockAction.type === 'deduct' && (
                  <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1.5">
                    <div className="flex gap-1">
                      <input type="number" value={stockAction.input} onChange={e => setStockAction(a => a ? { ...a, input: e.target.value } : null)} placeholder="Grams to deduct..." className="w-24 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 dark:text-white" />
                      <select value={stockAction.reason} onChange={e => setStockAction(a => a ? { ...a, reason: e.target.value } : null)} className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 dark:text-white">
                        <option value="usage">Usage</option>
                        <option value="spoilage">Spoilage</option>
                        <option value="adjustment">Adjustment</option>
                      </select>
                      <button onClick={() => { handleDeduct(bean.id, Number(stockAction.input), stockAction.reason); setStockAction(null) }} disabled={!stockAction.input || Number(stockAction.input) <= 0} className="text-xs px-2 py-1 bg-rose-600 text-white rounded-lg font-semibold disabled:opacity-40">OK</button>
                      <button onClick={() => setStockAction(null)} className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg">X</button>
                    </div>
                  </div>
                )}

                {stockAction?.beanId === bean.id && stockAction.type === 'set' && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Container Check</span>
                      <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString('th-TH')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white dark:bg-slate-700 rounded-lg p-2 text-center">
                        <div className="text-slate-400 text-[10px]">Calculated</div>
                        <div className="font-bold text-slate-700 dark:text-slate-200">{stock}g</div>
                      </div>
                      <div className="bg-white dark:bg-slate-700 rounded-lg p-2 text-center">
                        <div className="text-slate-400 text-[10px]">Difference</div>
                        <div className={`font-bold ${stockAction.input ? (Number(stockAction.input) - stock) >= 0 ? 'text-emerald-600' : 'text-rose-500' : 'text-slate-400'}`}>
                          {stockAction.input ? (() => { const d = Number(stockAction.input) - stock; return d >= 0 ? `+${d}g` : `${d}g` })() : '—'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-amber-600 dark:text-amber-400 block mb-0.5">Actual weight in container (grams)</label>
                      <input type="number" value={stockAction.input} onChange={e => setStockAction(a => a ? { ...a, input: e.target.value } : null)} placeholder="0" className="w-full text-sm bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 dark:text-white font-bold text-center" autoFocus />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { handleSetStock(bean.id, Number(stockAction.input), ''); setStockAction(null) }} disabled={!stockAction.input || Number(stockAction.input) < 0} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40">Record Check</button>
                      <button onClick={() => setStockAction(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm">Cancel</button>
                    </div>
                    {stockAction.input && Number(stockAction.input) !== stock && (
                      <div className="text-[10px] text-slate-400 text-center">Adjustment transaction will be created automatically</div>
                    )}
                  </div>
                )}

                {allNotes.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {allNotes.map((n, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{n}</span>
                    ))}
                  </div>
                )}
              </div>

              {showPurchase === bean.id && (
                <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2 space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Record Purchase</div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className={labelClass}>Grams</label>
                      <input type="number" value={purchaseQty || ''} onChange={e => setPurchaseQty(Number(e.target.value))} className={fieldClass} placeholder="e.g. 250" />
                    </div>
                    <div className="flex-1">
                      <label className={labelClass}>Total Cost (THB)</label>
                      <input type="number" value={purchaseCost || ''} onChange={e => setPurchaseCost(Number(e.target.value))} className={fieldClass} placeholder="e.g. 500" />
                    </div>
                  </div>
                  {purchaseQty > 0 && purchaseCost > 0 && (
                    <div className="text-xs text-slate-500">
                      Rate: {purchaseCost}/{purchaseQty}g = {(purchaseCost / purchaseQty).toFixed(2)} THB/g
                    </div>
                  )}
                  <input type="text" value={purchaseNote} onChange={e => setPurchaseNote(e.target.value)} placeholder="Note (optional)" className={fieldClass} />
                  <div className="flex gap-2">
                    <button onClick={() => handlePurchase(bean.id)} disabled={purchaseQty <= 0 || purchaseCost <= 0} className={`flex-1 py-2 rounded-xl text-sm font-semibold ${purchaseQty > 0 && purchaseCost > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>Save Purchase</button>
                    <button onClick={() => setShowPurchase(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {expandedBean === bean.id && (
                <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2">
                  <div className="flex items-center gap-3 mb-2 text-xs">
                    <span className="text-slate-500">FIFO: <strong className="text-slate-700 dark:text-slate-300">{cost.fifoCostPerGram.toFixed(2)}/g</strong></span>
                    <span className="text-slate-500">LIFO: <strong className="text-slate-700 dark:text-slate-300">{cost.lifoCostPerGram.toFixed(2)}/g</strong></span>
                    <span className="text-slate-500">Avg: <strong className="text-slate-700 dark:text-slate-300">{cost.avgCostPerGram.toFixed(2)}/g</strong></span>
                  </div>
                  <div className="text-xs text-slate-400 mb-1">Transactions</div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {[...txns].reverse().map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        {editingTxId === t.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input type="number" value={editTxQty || ''} onChange={e => setEditTxQty(Number(e.target.value))} className="w-14 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white [appearance:textfield]" placeholder="g" />
                            <input type="number" value={editTxCost || ''} onChange={e => setEditTxCost(Number(e.target.value))} className="w-14 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white [appearance:textfield]" placeholder="฿" />
                            <input type="text" value={editTxNote} onChange={e => setEditTxNote(e.target.value)} className="w-24 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" placeholder="Note" />
                            <button onClick={() => {
                              const costPerGram = editTxQty > 0 ? editTxCost / editTxQty : 0
                              updateTransaction(t.id, { quantity: editTxQty, totalCost: editTxCost, costPerGram, note: editTxNote })
                              setEditingTxId(null)
                            }} className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">Save</button>
                            <button onClick={() => setEditingTxId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.type === 'purchase' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                                t.type === 'usage' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                t.type === 'spoilage' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                                'bg-slate-100 dark:bg-slate-700 text-slate-500'
                              }`}>
                                {t.type}
                              </span>
                              <span className="text-slate-500">{t.date}</span>
                              {t.type === 'purchase' && <span className="text-slate-500 font-medium">{formatCurrency(t.totalCost)}</span>}
                              {t.note && <span className="text-slate-400 italic">· {t.note}</span>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-medium ${t.quantity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {t.quantity > 0 ? '+' : ''}{t.quantity}g
                              </span>
                              {t.type === 'purchase' && (
                                <>
                                  <button onClick={() => { setEditTxQty(t.quantity); setEditTxCost(t.totalCost); setEditTxNote(t.note || ''); setEditingTxId(t.id) }} className="text-[9px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Edit</button>
                                  <button onClick={() => { if (window.confirm(`Delete this purchase (${t.quantity}g for ${formatCurrency(t.totalCost)})?`)) deleteTransaction(t.id) }} className="text-[9px] px-1 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">Del</button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {txns.length === 0 && <div className="text-center py-4 text-slate-400">No transactions. Buy some beans!</div>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filteredBeans.length === 0 && state.beans.length > 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No beans match your search.</div>
        )}
        {state.beans.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No beans yet. Add your first coffee bean.</div>
        )}
      </div>
    </div>
  )
}
