import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { generateId, parseMenuImportJSON } from '../utils'
import type { MenuImportResult } from '../utils'
import type { MenuItem, AutoDecide, MenuCategory } from '../types'
import { MENU_CATEGORIES, AUTO_DECIDE_OPTIONS } from '../types'
import { formatCurrency } from '../utils'

export default function MenuManager() {
  const { state, dispatch, getBeanStock } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menuSearch, setMenuSearch] = useState('')

  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [category, setCategory] = useState<MenuCategory>('Iced Coffee Drinks')
  const [autoDecide, setAutoDecide] = useState<AutoDecide>('decided')
  const [beanId, setBeanId] = useState('')
  const [dose, setDose] = useState(0)
  const [espressoYield, setEspressoYield] = useState(0)
  const [ice, setIce] = useState(0)
  const [cupSize, setCupSize] = useState(0)
  const [milk, setMilk] = useState(0)
  const [water, setWater] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importResult, setImportResult] = useState<MenuImportResult | null>(null)
  const autoDecideTouched = useRef(false)

  useEffect(() => {
    if (autoDecideTouched.current) return
    const lower = name.toLowerCase()
    if (lower.includes('iced')) {
      setAutoDecide('ice')
    } else if (lower.includes('hot')) {
      setAutoDecide('hot')
    } else {
      setAutoDecide('decided')
    }
  }, [name])

  function resetForm() {
    setName('')
    setPrice(0)
    setCategory('Iced Coffee Drinks')
    autoDecideTouched.current = false
    setAutoDecide('decided')
    setBeanId('')
    setDose(0)
    setEspressoYield(0)
    setIce(0)
    setCupSize(0)
    setMilk(0)
    setWater(0)
    setEditingId(null)
    setShowForm(false)
  }

  function handleEdit(item: MenuItem) {
    setName(item.name)
    setPrice(item.price)
    setCategory(item.category)
    autoDecideTouched.current = true
    setAutoDecide(item.autoDecide)
    setBeanId(item.beanId || '')
    setDose(item.recipe?.dose || 0)
    setEspressoYield(item.recipe?.espressoYield || 0)
    setIce(item.recipe?.ice || 0)
    setCupSize(item.recipe?.cupSize || 0)
    setMilk(item.recipe?.milk || 0)
    setWater(item.recipe?.water || 0)
    setEditingId(item.id)
    setShowForm(true)
  }

  function handleSave() {
    if (!name.trim()) return

    if (editingId) {
      const existing = state.menu.find(m => m.id === editingId)
      if (existing) {
        dispatch({
          type: 'UPDATE_MENU_ITEM',
          payload: { ...existing, name: name.trim(), price, category, autoDecide, beanId: beanId || undefined, recipe: dose > 0 ? { dose, espressoYield: espressoYield || undefined, ice: ice || undefined, cupSize: cupSize || undefined, milk: milk || undefined, water: water || undefined } : undefined },
        })
      }
    } else {
      const item: MenuItem = {
        id: generateId(),
        name: name.trim(),
        price,
        category,
        autoDecide,
        beanId: beanId || undefined,
        recipe: dose > 0 ? { dose, espressoYield: espressoYield || undefined, ice: ice || undefined, cupSize: cupSize || undefined, milk: milk || undefined, water: water || undefined } : undefined,
        active: true,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'ADD_MENU_ITEM', payload: item })
    }
    resetForm()
  }

  function handleToggleActive(item: MenuItem) {
    dispatch({ type: 'UPDATE_MENU_ITEM', payload: { ...item, active: !item.active } })
  }

  function handleDelete(id: string) {
    dispatch({ type: 'REMOVE_MENU_ITEM', payload: id })
  }

  function handlePreviewImport() {
    setImportResult(parseMenuImportJSON(importJson))
  }

  function handleImportAll() {
    if (!importResult) return
    for (const item of importResult.valid) {
      dispatch({ type: 'ADD_MENU_ITEM', payload: item })
    }
    setImportJson('')
    setImportResult(null)
    setShowImport(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Menu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowImport(!showImport); setShowForm(false); setImportResult(null) }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold"
          >
            JSON Import
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); setShowImport(false) }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            + Add Item
          </button>
        </div>
      </div>

      <input
        type="text"
        value={menuSearch}
        onChange={e => setMenuSearch(e.target.value)}
        placeholder="Search menu..."
        className="w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-400 placeholder-slate-400"
      />

      {showImport && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Import Items from JSON</h3>
            <button
              onClick={() => { setShowImport(false); setImportResult(null); setImportJson('') }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>
          <textarea
            value={importJson}
            onChange={e => { setImportJson(e.target.value); setImportResult(null) }}
            placeholder='[{&#10;  "name": "Americano",&#10;  "price": 50,&#10;  "category": "Espresso Drinks",&#10;  "autoDecide": "hot"&#10;}]'
            rows={8}
            className="w-full font-mono text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 dark:text-white placeholder-slate-400"
          />
          {importResult && importResult.errors.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 space-y-1">
              <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">Errors ({importResult.errors.length})</div>
              {importResult.errors.map((err, i) => (
                <div key={i} className="text-xs text-rose-500">
                  {err.index >= 0 ? `Item #${err.index + 1}: ` : ''}{err.message}
                </div>
              ))}
            </div>
          )}
          {importResult && importResult.valid.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 space-y-1">
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {importResult.valid.length} item(s) ready to import
              </div>
              {importResult.valid.map((item, i) => (
                <div key={i} className="text-xs text-emerald-700 dark:text-emerald-300 flex justify-between">
                  <span>{item.name}</span>
                  <span>{item.category} &middot; {item.autoDecide} &middot; {formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePreviewImport}
              disabled={!importJson.trim()}
              className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              Preview
            </button>
            <button
              onClick={handleImportAll}
              disabled={!importResult || importResult.valid.length === 0}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              Import All
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Item name"
            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Price (THB)</label>
              <input
                type="number"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Auto-Decide</label>
              <select
                value={autoDecide}
                onChange={e => { autoDecideTouched.current = true; setAutoDecide(e.target.value as AutoDecide) }}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              >
                {AUTO_DECIDE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as MenuCategory)}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              >
                {MENU_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Bean (optional)</label>
              <select
                value={beanId}
                onChange={e => setBeanId(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              >
                <option value="">None</option>
                {state.beans.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-3 mb-2">Recipe</div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Dose (g)</label>
              <input
                type="number"
                value={dose}
                onChange={e => setDose(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Yield (g)</label>
              <input
                type="number"
                value={espressoYield}
                onChange={e => setEspressoYield(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Ratio</label>
              <div className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white text-slate-400">
                {dose > 0 && espressoYield > 0 ? `1:${(espressoYield / dose).toFixed(1)}` : '\u2014'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Ice (g)</label>
              <input
                type="number"
                value={ice}
                onChange={e => setIce(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Milk (ml)</label>
              <input
                type="number"
                value={milk}
                onChange={e => setMilk(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Water (ml)</label>
              <input
                type="number"
                value={water}
                onChange={e => setWater(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Cup Size (ml)</label>
              <input
                type="number"
                value={cupSize}
                onChange={e => setCupSize(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Cost/drink</label>
              <div className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white text-slate-400">
                {(() => {
                  if (!dose || !beanId) return '\u2014'
                  const b = state.beans.find(x => x.id === beanId)
                  if (!b) return '\u2014'
                  return formatCurrency(Math.round(dose * b.costPerGram))
                })()}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {state.menu
          .filter(m => !menuSearch.trim() || m.name.toLowerCase().includes(menuSearch.trim().toLowerCase()))
          .map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleActive(item)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  item.active
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {item.active ? '✓' : ''}
              </button>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</div>
                <div className="text-xs text-slate-400">
                  {item.category} · {item.autoDecide}
                  {item.beanId && (() => {
                    const b = state.beans.find(x => x.id === item.beanId)
                    return b ? ` · ${b.name}` : ' · with bean'
                  })()}
                  {item.recipe?.dose ? ` · ${item.recipe.dose}g` : ''}
                </div>
                {item.recipe && (item.recipe.espressoYield || item.recipe.ice || item.recipe.cupSize || item.recipe.milk || item.recipe.water) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.recipe.espressoYield ? <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">Yield: {item.recipe.espressoYield}g</span> : null}
                    {item.recipe.ice ? <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">Ice: {item.recipe.ice}g</span> : null}
                    {item.recipe.milk ? <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">Milk: {item.recipe.milk}ml</span> : null}
                    {item.recipe.water ? <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">Water: {item.recipe.water}ml</span> : null}
                    {item.recipe.cupSize ? <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">Cup: {item.recipe.cupSize}ml</span> : null}
                  </div>
                )}
                {item.recipe && item.recipe.cupSize && item.recipe.espressoYield && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Volume: {(item.recipe.espressoYield + (item.recipe.ice || 0) + (item.recipe.milk || 0) + (item.recipe.water || 0))}ml / {item.recipe.cupSize}ml cup
                    {(() => {
                      const total = item.recipe.espressoYield! + (item.recipe.ice || 0) + (item.recipe.milk || 0) + (item.recipe.water || 0)
                      if (total > item.recipe.cupSize) return ' (overfills)'
                      const pct = Math.round((total / item.recipe.cupSize) * 100)
                      return ` (${pct}% full)`
                    })()}
                  </div>
                )}
                {item.beanId && item.recipe?.dose ? (
                  <div className="text-[10px] mt-0.5">
                    {(() => {
                      const stock = getBeanStock(item.beanId!)
                      if (stock <= 0) return <span className="text-rose-500">No stock — 0 serves</span>
                      const serves = Math.floor(stock / item.recipe!.dose!)
                      const color = serves < 10 ? 'text-rose-500' : serves < 30 ? 'text-amber-500' : 'text-emerald-500'
                      return <span className={color}>~{serves} serves left ({stock}g remaining)</span>
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(item.price)}</span>
              <button
                onClick={() => handleEdit(item)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs text-rose-500 hover:underline"
              >
                Del
              </button>
            </div>
          </div>
        ))}
        {state.menu.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No menu items yet. Add your first one.
          </div>
        )}
        {state.menu.length > 0 && state.menu.filter(m => !menuSearch.trim() || m.name.toLowerCase().includes(menuSearch.trim().toLowerCase())).length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs">
            No items match "{menuSearch}"
          </div>
        )}
      </div>
    </div>
  )
}
