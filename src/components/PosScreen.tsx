import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store'
import type { CustomerProfile, MenuItem, AutoDecide, Sweetness } from '../types'
import { CUSTOMER_PROFILES, MENU_CATEGORIES, NATIONALITIES } from '../types'
import { formatCurrency, formatTime } from '../utils'

interface CartItem {
  menuItem: MenuItem
  quantity: number
  addedAt: string
  selectedAutoDecide: AutoDecide
  sweetness?: Sweetness
  doseOverride?: number
  doseUpcharge?: number
}

export default function PosScreen() {
  const { state, dispatch, startNewRun, pauseRun, resumeRun, addSale, setMode, createPastRun, updateRun, totalSales, testMode, getBeanStock } = useStore()

  const [selectedCategory, setSelectedCategory] = useState(MENU_CATEGORIES[0])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>('C')
  const [nationality, setNationality] = useState('None')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [lastSaleTime, setLastSaleTime] = useState<string | null>(null)
  const [showLastSale, setShowLastSale] = useState(false)
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [showNationalities, setShowNationalities] = useState(false)
  const [showProfiling, setShowProfiling] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [afterCountTargetId, setAfterCountTargetId] = useState<string | null>(null)
  const [showNewCount, setShowNewCount] = useState(false)
  const [newCountDate, setNewCountDate] = useState('')
  const [newCountGoalMin, setNewCountGoalMin] = useState(2000)
  const [newCountGoalMax, setNewCountGoalMax] = useState(4000)
  const [salesOpen, setSalesOpen] = useState(true)
  const [salesFilter, setSalesFilter] = useState('')
  const [editSaleId, setEditSaleId] = useState<string | null>(null)
  const [editProfile, setEditProfile] = useState<CustomerProfile>('C')
  const [editNote, setEditNote] = useState('')
  const [editNation, setEditNation] = useState('')

  const filteredNationalities = useMemo(() => {
    if (!nationalitySearch) return NATIONALITIES
    return NATIONALITIES.filter(n => n.toLowerCase().includes(nationalitySearch.toLowerCase()))
  }, [nationalitySearch])

  const activeRun = state.activeRunId ? state.runs.find(r => r.id === state.activeRunId) : null

  const filteredMenu = useMemo(() => {
    let items = state.menu.filter(m => m.category === selectedCategory && m.active)
    if (menuSearch.trim()) {
      const q = menuSearch.trim().toLowerCase()
      items = state.menu.filter(m => m.active && m.name.toLowerCase().includes(q))
    }
    return items
  }, [state.menu, selectedCategory, menuSearch])

  const isAfterCount = state.mode === 'aftercount'

  const afterCountTarget = isAfterCount && afterCountTargetId
    ? state.runs.find(r => r.id === afterCountTargetId) || null
    : null

  const salesTableRun = isAfterCount ? afterCountTarget : activeRun

  const menuServings = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of state.menu) {
      if (!item.beanId || !item.recipe?.dose) continue
      const bean = state.beans.find(b => b.id === item.beanId)
      if (!bean) continue
      const stock = getBeanStock(item.beanId)
      map[item.id] = Math.floor(stock / item.recipe.dose)
    }
    return map
  }, [state.menu, state.beans, state.transactions])

  const menuBeanStock = useMemo(() => {
    const map: Record<string, { stock: number; max: number }> = {}
    for (const item of state.menu) {
      if (!item.beanId) continue
      const stock = getBeanStock(item.beanId)
      const purchases = state.transactions
        .filter(t => t.beanId === item.beanId && t.type === 'purchase')
        .reduce((s, t) => s + t.quantity, 0)
      map[item.id] = { stock, max: purchases || stock || 1 }
    }
    return map
  }, [state.menu, state.beans, state.transactions])

  const endedRuns = useMemo(() => {
    if (!isAfterCount) return []
    return state.runs.filter(r => r.status === 'ended').sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [state.runs, isAfterCount])

  const isLocked = isAfterCount ? false : (activeRun?.status === 'ended' || activeRun?.status === 'paused')

  const lastSoldTimes = useMemo(() => {
    const map: Record<string, string> = {}
    if (!activeRun) return map
    for (const sale of activeRun.sales) {
      for (const item of sale.items) {
        if (!map[item.menuItemId] || new Date(sale.timestamp) > new Date(map[item.menuItemId])) {
          map[item.menuItemId] = sale.timestamp
        }
      }
    }
    return map
  }, [activeRun?.sales])

  const [orderPopup, setOrderPopup] = useState<{ item: MenuItem } | null>(null)
  const [confirmPopup, setConfirmPopup] = useState(false)
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)
  const [amountPaid, setAmountPaid] = useState('')
  const [onHold, setOnHold] = useState(false)
  const [holdTimer, setHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [holdRemaining, setHoldRemaining] = useState(0)
  const [profilerSweetness, setProfilerSweetness] = useState<Sweetness>('regular')
  const [profilerDose, setProfilerDose] = useState(0)
  const [profilerChargeDose, setProfilerChargeDose] = useState(false)
  const [profilerBaseDose, setProfilerBaseDose] = useState(0)
  const [profilerRatio, setProfilerRatio] = useState(16)
  const [profilerUseRounded, setProfilerUseRounded] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [overrideTotal, setOverrideTotal] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [brewTestConfirm, setBrewTestConfirm] = useState(false)
  const [freeGiveawayConfirm, setFreeGiveawayConfirm] = useState(false)
  const [posTime, setPosTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setPosTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!actionMessage) return
    const t = setTimeout(() => setActionMessage(''), 3000)
    return () => clearTimeout(t)
  }, [actionMessage])

  useEffect(() => {
    if (!onHold) return
    const interval = setInterval(() => {
      setHoldRemaining(prev => {
        const next = prev - 1000
        if (next <= 0) { clearInterval(interval); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onHold])

  function handleAddItem(item: MenuItem) {
    if (isLocked) return
    const baseDose = item.recipe?.dose || 0
    const calcRatio = item.recipe?.water && baseDose > 0 ? Math.round(item.recipe.water / baseDose) : 16
    setProfilerSweetness('regular')
    setProfilerDose(baseDose)
    setProfilerBaseDose(baseDose)
    setProfilerRatio(calcRatio)
    setProfilerChargeDose(false)
    setProfilerUseRounded(false)
    setOrderPopup({ item })
  }

  function confirmOrder(item: MenuItem, autoDecide: AutoDecide) {
    const isFilter = item.category === 'Brewed/Filter Coffee'
    const baseDose = item.recipe?.dose || 0
    const exactPrice = isFilter && profilerDose > 0 && baseDose > 0
      ? Math.round((profilerDose / baseDose) * item.price)
      : item.price
    const roundedPrice = Math.ceil(exactPrice / 50) * 50
    const finalPrice = profilerUseRounded ? roundedPrice : exactPrice
    const doseUpcharge = finalPrice - item.price
    const finalUpcharge = profilerChargeDose ? doseUpcharge : 0
    const sweetness = isFilter ? undefined : profilerSweetness
    const doseOverride = profilerDose !== baseDose ? profilerDose : undefined
    setCart(prev => {
      const existing = prev.find(c =>
        c.menuItem.id === item.id &&
        c.selectedAutoDecide === autoDecide &&
        c.sweetness === sweetness &&
        c.doseOverride === doseOverride
      )
      if (existing) {
        return prev.map(c =>
          c.menuItem.id === item.id &&
          c.selectedAutoDecide === autoDecide &&
          c.sweetness === sweetness &&
          c.doseOverride === doseOverride
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [...prev, {
        menuItem: item,
        quantity: 1,
        addedAt: new Date().toISOString(),
        selectedAutoDecide: autoDecide,
        sweetness,
        doseOverride,
        doseUpcharge: finalUpcharge,
      }]
    })
    setOrderPopup(null)
  }

  function handleCycleAutoDecide(itemId: string) {
    setCart(prev => prev.map(c => {
      if (c.menuItem.id !== itemId) return c
      const cycle: Record<string, AutoDecide> = { ice: 'hot', hot: 'decided', decided: 'ice' }
      return { ...c, selectedAutoDecide: cycle[c.selectedAutoDecide] }
    }))
  }

  function handleRemoveItem(itemId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter(c => c.menuItem.id !== itemId)
      }
      return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  function clearCart() {
    setCart([])
    setNote('')
    setShowNote(false)
    setDiscountPercent(0)
  }

  function handleBrewTest() {
    if (cart.length === 0) return
    let runId = state.activeRunId
    if (!runId) {
      runId = startNewRun()
    }
    setPendingRunId(runId)
    setBrewTestConfirm(true)
  }

  function confirmBrewTest() {
    if (!pendingRunId) return
    const currentRun = state.runs.find(r => r.id === pendingRunId)
    if (currentRun?.status === 'ended' || currentRun?.status === 'paused') return
    const items = cart.map(c => ({
      menuItemId: c.menuItem.id,
      menuItemName: c.menuItem.name,
      price: c.menuItem.price,
      quantity: c.quantity,
      autoDecide: c.selectedAutoDecide,
      sweetness: c.sweetness,
      doseOverride: c.doseOverride,
      doseUpcharge: c.doseUpcharge,
    }))
    addSale(pendingRunId, items, customerProfile, nationality, 'brew test', 100)
    setBrewTestConfirm(false)
    setPendingRunId(null)
    setActionMessage('🧪 Brew test recorded — resources deducted')
    clearCart()
  }

  function handleFreeGiveaway() {
    if (!pendingRunId) return
    const currentRun = state.runs.find(r => r.id === pendingRunId)
    if (currentRun?.status === 'ended' || currentRun?.status === 'paused') return
    setConfirmPopup(false)
    setFreeGiveawayConfirm(true)
  }

  function confirmFreeGiveaway() {
    if (!pendingRunId) return
    const currentRun = state.runs.find(r => r.id === pendingRunId)
    if (currentRun?.status === 'ended' || currentRun?.status === 'paused') return
    const items = cart.map(c => ({
      menuItemId: c.menuItem.id,
      menuItemName: c.menuItem.name,
      price: 0,
      quantity: c.quantity,
      autoDecide: c.selectedAutoDecide,
      sweetness: c.sweetness,
      doseOverride: c.doseOverride,
      doseUpcharge: 0,
    }))
    addSale(pendingRunId, items, customerProfile, nationality, '🎁 Free/Giveaway', 100)
    setFreeGiveawayConfirm(false)
    setConfirmPopup(false)
    setPendingRunId(null)
    setActionMessage('🎁 Free/Giveaway recorded')
    clearCart()
  }

  function handleCompleteSale() {
    if (cart.length === 0) return

    if (isAfterCount && afterCountTargetId) {
      const items = cart.map(c => ({
        menuItemId: c.menuItem.id,
        menuItemName: c.menuItem.name,
        price: c.menuItem.price,
        quantity: c.quantity,
        autoDecide: c.selectedAutoDecide,
        sweetness: c.sweetness,
        doseOverride: c.doseOverride,
        doseUpcharge: c.doseUpcharge,
      }))
      addSale(afterCountTargetId, items, 'C', 'None', '', undefined)
      clearCart()
      return
    }

    let runId = state.activeRunId
    if (!runId) {
      runId = startNewRun()
    }
    setPendingRunId(runId)
    setConfirmPopup(true)
    setAmountPaid('')
    setOverrideTotal('')
    setDiscountPercent(0)
  }

  function confirmSale() {
    if (!pendingRunId) return

    const currentRun = state.runs.find(r => r.id === pendingRunId)
    if (currentRun?.status === 'ended' || currentRun?.status === 'paused') return

    const items = cart.map(c => ({
      menuItemId: c.menuItem.id,
      menuItemName: c.menuItem.name,
      price: c.menuItem.price,
      quantity: c.quantity,
      autoDecide: c.selectedAutoDecide,
      sweetness: c.sweetness,
      doseOverride: c.doseOverride,
      doseUpcharge: c.doseUpcharge,
    }))

    addSale(pendingRunId, items, customerProfile, nationality, note, discountPercent || undefined)

    const now = new Date().toISOString()
    setLastSaleTime(now)
    setShowLastSale(true)
    setConfirmPopup(false)
    setPendingRunId(null)
    clearCart()
  }

  function holdSale() {
    setConfirmPopup(false)
    setOnHold(true)
    const FIVE_MIN = 5 * 60 * 1000
    const timer = setTimeout(() => {
      setOnHold(false)
      clearCart()
    }, FIVE_MIN)
    setHoldTimer(timer)
    setHoldRemaining(FIVE_MIN)
  }

  function resumeFromHold() {
    if (holdTimer) clearTimeout(holdTimer)
    setOnHold(false)
    setHoldTimer(null)
    setHoldRemaining(0)
  }

  function cancelSale() {
    setConfirmPopup(false)
    setAmountPaid('')
  }

  const cartTotal = cart.reduce((sum, c) => sum + (c.menuItem.price + (c.doseUpcharge || 0)) * c.quantity, 0)
  const saleTotal = overrideTotal ? Number(overrideTotal) : cartTotal
  const discountedTotal = Math.round(saleTotal * (1 - discountPercent / 100))
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0)

  const profileColors: Record<string, string> = {
    R: 'bg-emerald-600 text-white',
    P: 'bg-amber-600 text-white',
    U: 'bg-violet-600 text-white',
    C: 'bg-slate-500 text-white',
    A: 'bg-rose-600 text-white',
  }

  const statusBadge = () => {
    if (!activeRun) return null
    if (activeRun.status === 'active') return (
      <>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">Active</span>
        {activeRun.endTime && (() => {
          const [eh, em] = activeRun.endTime!.split(':').map(Number)
          const now = posTime
          const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em)
          if (now.getTime() > endToday.getTime()) {
            return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold">Overtime</span>
          }
          return null
        })()}
      </>
    )
    if (activeRun.status === 'paused') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">Paused</span>
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 font-semibold">Ended</span>
  }

  return (
    <div className="flex flex-col h-full relative">
      {orderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOrderPopup(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-80 shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{orderPopup.item.name}</div>
              <div className="text-sm text-slate-400 mt-0.5">{formatCurrency(orderPopup.item.price)}</div>
            </div>

            {orderPopup.item.category === 'Brewed/Filter Coffee' ? (
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">⚖️ Dose</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfilerDose(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg flex items-center justify-center active:scale-[0.9] transition-transform"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{profilerDose}</div>
                    <div className="text-[10px] text-slate-400">std: {profilerBaseDose}g</div>
                  </div>
                  <button
                    onClick={() => setProfilerDose(prev => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg flex items-center justify-center active:scale-[0.9] transition-transform"
                  >
                    +
                  </button>
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 mt-3">💧 Ratio</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfilerRatio(prev => Math.max(10, prev - 0.5))}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg flex items-center justify-center active:scale-[0.9] transition-transform"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">1:{profilerRatio}</div>
                    <div className="text-[10px] text-slate-400">
                      Water: {Math.round(profilerDose * profilerRatio)}ml
                    </div>
                  </div>
                  <button
                    onClick={() => setProfilerRatio(prev => prev + 0.5)}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-lg flex items-center justify-center active:scale-[0.9] transition-transform"
                  >
                    +
                  </button>
                </div>
                {profilerDose > profilerBaseDose && (() => {
                  const exactPrice = Math.round((profilerDose / profilerBaseDose) * orderPopup.item.price)
                  const roundedPrice = Math.ceil(exactPrice / 50) * 50
                  const displayPrice = profilerUseRounded ? roundedPrice : exactPrice
                  const displayAddon = displayPrice - orderPopup.item.price
                  return (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Suggested</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(displayPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-slate-400">Add-on</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        +{formatCurrency(displayAddon)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setProfilerUseRounded(false)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          !profilerUseRounded
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        Exact {formatCurrency(exactPrice)}
                      </button>
                      <button
                        onClick={() => setProfilerUseRounded(true)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          profilerUseRounded
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        Round up {formatCurrency(roundedPrice)}
                      </button>
                    </div>
                    <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profilerChargeDose}
                        onChange={e => setProfilerChargeDose(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                      Charge add-on
                    </label>
                  </div>
                  )})()}
              </div>
            ) : (
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">🍬 Sweetness</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: 'Regular', value: 'regular' as Sweetness },
                    { label: 'Less Sweet', value: 'less-sweet' as Sweetness },
                    { label: 'More Sweet', value: 'more-sweet' as Sweetness },
                    { label: 'No Sweet', value: 'no-sweet' as Sweetness },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setProfilerSweetness(opt.value)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        profilerSweetness === opt.value
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => confirmOrder(orderPopup.item, 'hot')}
                className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 active:scale-[0.97] transition-transform hover:bg-orange-600"
              >
                🔥 Hot
              </button>
              <button
                onClick={() => confirmOrder(orderPopup.item, 'ice')}
                className="flex-1 py-4 rounded-2xl bg-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-[0.97] transition-transform hover:bg-blue-600"
              >
                🧊 Ice
              </button>
            </div>
            <button
              onClick={() => setOrderPopup(null)}
              className="w-full mt-3 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={cancelSale}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">#blacklistbrewer</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 dark:border-slate-700 py-3 mb-3 space-y-2.5">
              {cart.map(c => (
                <div key={c.menuItem.id + c.selectedAutoDecide + (c.sweetness || '') + (c.doseOverride || '')} className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        c.selectedAutoDecide === 'hot' ? 'bg-orange-500' :
                        c.selectedAutoDecide === 'ice' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.menuItem.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-4">
                      <span className="text-[10px] text-slate-400">×{c.quantity}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        c.selectedAutoDecide === 'hot' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                        c.selectedAutoDecide === 'ice' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                      }`}>{c.selectedAutoDecide === 'hot' ? 'HOT' : 'ICE'}</span>
                      {c.sweetness && c.sweetness !== 'regular' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                          {c.sweetness === 'less-sweet' ? 'Less Sweet' : c.sweetness === 'more-sweet' ? 'More Sweet' : 'No Sweet'}
                        </span>
                      )}
                      {c.doseOverride && c.doseOverride > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          {c.doseOverride}g
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-shrink-0 ml-3">{formatCurrency((c.menuItem.price + (c.doseUpcharge || 0)) * c.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(cartTotal)}</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Discount</span>
                <input
                  type="number"
                  value={discountPercent || ''}
                  onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  placeholder="0"
                  className="w-10 text-center text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={0}
                  max={100}
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
              {discountPercent > 0 && (
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  −{formatCurrency(cartTotal - discountedTotal)}
                </span>
              )}
            </div>

            {discountPercent > 0 && (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Net Total</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(discountedTotal)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Override</span>
                <input
                  type="number"
                  value={overrideTotal}
                  onChange={e => setOverrideTotal(e.target.value)}
                  placeholder="0"
                  className="w-full text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {overrideTotal && Number(overrideTotal) > 0 && (
                <span className="text-[10px] text-slate-400">overrides {formatCurrency(cartTotal)}</span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-4 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount Paid</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder="0"
                  className="w-full text-2xl font-black text-slate-900 dark:text-white bg-transparent outline-none mt-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k => (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === 'C') { setAmountPaid(''); return }
                      if (k === '⌫') { setAmountPaid(prev => prev.slice(0, -1)); return }
                      setAmountPaid(prev => prev + k)
                    }}
                    className={`py-3 rounded-xl text-lg font-bold active:scale-[0.95] transition-transform ${
                      k === 'C' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                      k === '⌫' ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300' :
                      'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    }`}
                  >
                    {k === '⌫' ? '⌫' : k}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {['100', '500', '1000'].map(b => (
                  <button
                    key={b}
                    onClick={() => setAmountPaid(prev => prev + b)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 active:scale-[0.95] transition-transform border border-blue-200 dark:border-blue-800"
                  >
                    +{b}
                  </button>
                ))}
              </div>
              {amountPaid && Number(amountPaid) > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Change</span>
                  <span className={`text-xl font-black ${
                    Number(amountPaid) >= discountedTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {Number(amountPaid) >= discountedTotal
                      ? formatCurrency(Number(amountPaid) - discountedTotal)
                      : formatCurrency(discountedTotal - Number(amountPaid)) + ' due'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmSale}
                disabled={!amountPaid || Number(amountPaid) < discountedTotal}
                className={`w-full py-3.5 rounded-2xl font-bold text-base active:scale-[0.98] transition-all ${
                  amountPaid && Number(amountPaid) >= discountedTotal
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                ✓ Confirm Sale — {amountPaid && Number(amountPaid) >= discountedTotal ? `Change ${formatCurrency(Number(amountPaid) - discountedTotal)}` : `Enter ${formatCurrency(discountedTotal)}`}
              </button>
              <button onClick={holdSale} className="w-full py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform border-2 border-dashed border-amber-300 dark:border-amber-700">
                ⏸ On Hold (5 min)
              </button>
              <button
                onClick={handleFreeGiveaway}
                className="w-full py-3 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform border-2 border-dashed border-pink-300 dark:border-pink-700"
              >
                🎁 Free/Giveaway
              </button>
              <button onClick={cancelSale} className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                Cancel — Edit Order
              </button>
            </div>
          </div>
        </div>
      )}

      {brewTestConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setBrewTestConfirm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">🧪 Brew Test</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Coffee will be brewed — not sold</div>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 dark:border-slate-700 py-3 mb-3 space-y-2.5">
              {cart.map(c => {
                const beanId = c.menuItem.beanId
                const dose = c.doseOverride ?? c.menuItem.recipe?.dose ?? 0
                const bean = beanId ? state.beans.find(b => b.id === beanId) : null
                return (
                  <div key={c.menuItem.id + c.selectedAutoDecide} className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.menuItem.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 ml-0.5">
                        <span className="text-[10px] text-slate-400">×{c.quantity}</span>
                        {bean && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            -{Math.round(dose * c.quantity)}g {bean.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-shrink-0 ml-3">{formatCurrency(c.menuItem.price * c.quantity)}</span>
                  </div>
                )
              })}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 border border-amber-200 dark:border-amber-800">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Resources being consumed</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                Coffee beans will be deducted from inventory. No sale will be recorded.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmBrewTest}
                className="w-full py-3.5 rounded-2xl font-bold text-base bg-amber-600 text-white active:scale-[0.98] transition-all shadow-lg shadow-amber-600/20 hover:bg-amber-700"
              >
                ✓ Confirm Brew Test
              </button>
              <button onClick={() => setBrewTestConfirm(false)} className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {freeGiveawayConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { setFreeGiveawayConfirm(false); setConfirmPopup(true) }}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">🎁 Free / Giveaway</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Item given at no charge</div>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 dark:border-slate-700 py-3 mb-3 space-y-2.5">
              {cart.map(c => {
                const beanId = c.menuItem.beanId
                const dose = c.doseOverride ?? c.menuItem.recipe?.dose ?? 0
                const bean = beanId ? state.beans.find(b => b.id === beanId) : null
                return (
                  <div key={c.menuItem.id + c.selectedAutoDecide} className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.menuItem.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 ml-0.5">
                        <span className="text-[10px] text-slate-400">×{c.quantity}</span>
                        {bean && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            -{Math.round(dose * c.quantity)}g {bean.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-400 line-through flex-shrink-0 ml-3">{formatCurrency(c.menuItem.price * c.quantity)}</span>
                  </div>
                )
              })}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 border border-amber-200 dark:border-amber-800">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Resources being consumed</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                Coffee beans will be deducted from inventory. No revenue recorded.
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmFreeGiveaway}
                className="w-full py-3.5 rounded-2xl font-bold text-base bg-pink-600 text-white active:scale-[0.98] transition-all shadow-lg shadow-pink-600/20 hover:bg-pink-700"
              >
                ✓ Confirm Free / Giveaway
              </button>
              <button onClick={() => { setFreeGiveawayConfirm(false); setConfirmPopup(true) }} className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {onHold && (
        <div className="flex-none px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">⏸ On Hold</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              {Math.floor(holdRemaining / 60000)}:{(Math.floor((holdRemaining % 60000) / 1000)).toString().padStart(2, '0')} remaining
            </span>
          </div>
          <button onClick={resumeFromHold} className="text-[10px] px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold">
            Resume
          </button>
        </div>
      )}
      {testMode && (
        <div className="flex-none px-3 py-1.5 bg-rose-600 text-white text-xs font-bold text-center flex items-center justify-center gap-2">
          🧪 TEST MODE — Data is isolated from real records
        </div>
      )}
      {actionMessage && (
        <div className="flex-none px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold text-center">
          {actionMessage}
        </div>
      )}
      {isAfterCount && !afterCountTargetId ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">📋 After-Count Mode</span>
            <span className="text-[10px] text-slate-400">Select a past day to add paper entries</span>
          </div>
          {endedRuns.map(run => (
            <button
              key={run.id}
              onClick={() => setAfterCountTargetId(run.id)}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition-transform"
            >
              <div className="text-sm font-bold text-slate-900 dark:text-white">#blacklistbrewer - Day {run.dayNumber}</div>
              <div className="text-xs text-slate-400">{run.date} · {run.sales.length} sales · {formatCurrency(totalSales(run))}</div>
            </button>
          ))}
          {endedRuns.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">No ended runs yet. Create a new count below.</div>
          )}

          {!showNewCount ? (
            <button
              onClick={() => setShowNewCount(true)}
              className="w-full py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-2xl font-bold text-sm border-2 border-dashed border-amber-300 dark:border-amber-700 active:scale-[0.98] transition-transform"
            >
              + New Count
            </button>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Paper Count</div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Date from paper bill</label>
                <input
                  type="date"
                  value={newCountDate}
                  onChange={e => setNewCountDate(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Goal Min</label>
                  <input
                    type="number"
                    value={newCountGoalMin}
                    onChange={e => setNewCountGoalMin(Number(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Goal Max</label>
                  <input
                    type="number"
                    value={newCountGoalMax}
                    onChange={e => setNewCountGoalMax(Number(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!newCountDate) return
                    const id = createPastRun(newCountDate, newCountGoalMin, newCountGoalMax)
                    setAfterCountTargetId(id)
                    setShowNewCount(false)
                    setNewCountDate('')
                  }}
                  disabled={!newCountDate}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${
                    newCountDate
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  Create & Start Entry
                </button>
                <button
                  onClick={() => setShowNewCount(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setMode('operational')}
            className="w-full py-2 text-center text-xs text-blue-600 dark:text-blue-400"
          >
            ← Back to Operational
          </button>
        </div>
      ) : (
        <>
      {isAfterCount && afterCountTarget && (
        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-xs flex items-center justify-between flex-none border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-700 dark:text-amber-300">📋 After-Count</span>
            <span className="text-amber-600 dark:text-amber-400">#blacklistbrewer - Day {afterCountTarget.dayNumber}</span>
            <input
              type="date"
              value={afterCountTarget.date}
              onChange={e => updateRun(afterCountTarget.id, { date: e.target.value })}
              className="text-[10px] bg-amber-100 dark:bg-amber-800/50 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.5 text-amber-700 dark:text-amber-300 w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400">{afterCountTarget.sales.length} sales</span>
            <button onClick={() => { setAfterCountTargetId(null); setShowNewCount(false) }} className="text-[10px] px-2 py-0.5 bg-amber-500 text-white rounded-full font-semibold">Change</button>
          </div>
        </div>
      )}

      {!isAfterCount && activeRun && (
        <div className={`px-3 py-1 text-xs flex items-center justify-between flex-none ${
          activeRun.status === 'ended'
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
            : activeRun.status === 'paused'
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">#blacklistbrewer - Day {activeRun.dayNumber}</span>
            {statusBadge()}
            {activeRun.status === 'active' && (
              <button onClick={() => pauseRun(activeRun.id)} className="text-[10px] px-2 py-0.5 bg-amber-500 text-white rounded-full font-semibold">Pause</button>
            )}
            {activeRun.status === 'paused' && (
              <button onClick={() => resumeRun(activeRun.id)} className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-full font-semibold">Resume</button>
            )}
            {activeRun.status === 'ended' && (
              <button onClick={() => resumeRun(activeRun.id)} className="text-[10px] px-2 py-0.5 bg-slate-500 text-white rounded-full font-semibold">Reopen</button>
            )}
          </div>
          <span className="font-semibold">{formatCurrency(totalSales(activeRun))} / {formatCurrency(activeRun.goalMax)}</span>
        </div>
      )}

      {!isAfterCount && activeRun && activeRun.startTime && (() => {
        const [sh, sm] = activeRun.startTime!.split(':').map(Number)
        const start = new Date(posTime.getFullYear(), posTime.getMonth(), posTime.getDate(), sh, sm)
        const end = activeRun.endTime
          ? (() => { const [eh, em] = activeRun.endTime!.split(':').map(Number); return new Date(posTime.getFullYear(), posTime.getMonth(), posTime.getDate(), eh, em) })()
          : new Date(posTime.getFullYear(), posTime.getMonth(), posTime.getDate(), 23, 59)
        const total = end.getTime() - start.getTime()
        const elapsed = posTime.getTime() - start.getTime()
        const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0
        return (
          <div className="flex-none px-3 py-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
              <span>{activeRun.startTime}</span>
              <span className="font-medium">{Math.round(pct)}%</span>
              <span>{activeRun.endTime || 'close'}</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })()}

      {!isAfterCount && showLastSale && lastSaleTime && (
        <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-between flex-none border-b border-emerald-200 dark:border-emerald-800">
          <span>✓ Sale recorded</span>
          <div className="flex items-center gap-2">
            {activeRun && activeRun.sales.length > 0 && (() => {
              const lastSale = activeRun.sales[activeRun.sales.length - 1]
              return (
                <div className="flex gap-1">
                  <button onClick={() => { setShowLastSale(false); setEditSaleId(lastSale.id); setEditProfile(lastSale.customerProfile); setEditNation(lastSale.nationality); setEditNote(lastSale.note); setSalesOpen(true) }} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Edit</button>
                  <button onClick={() => { if (window.confirm('Delete this sale record?')) { dispatch({ type: 'REMOVE_SALE', payload: { runId: activeRun.id, saleId: lastSale.id } }); setShowLastSale(false) } }} className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">Del</button>
                </div>
              )
            })()}
            <span>{formatTime(lastSaleTime)}</span>
          </div>
        </div>
      )}

      {!isAfterCount && !showLastSale && activeRun && activeRun.sales.length > 0 && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] flex items-center justify-between flex-none border-b border-slate-200 dark:border-slate-700">
          <span>{activeRun.sales.length} total sales</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(() => {
                const lastSale = activeRun.sales[activeRun.sales.length - 1]
                return (
                  <>
                    <button onClick={() => { setEditSaleId(lastSale.id); setEditProfile(lastSale.customerProfile); setEditNation(lastSale.nationality); setEditNote(lastSale.note); setSalesOpen(true) }} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Edit</button>
                    <button onClick={() => { if (window.confirm('Delete this sale record?')) dispatch({ type: 'REMOVE_SALE', payload: { runId: activeRun.id, saleId: lastSale.id } }) }} className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">Del</button>
                  </>
                )
              })()}
            </div>
            <span>Last: {formatTime(activeRun.sales[activeRun.sales.length - 1].timestamp)}</span>
          </div>
        </div>
      )}

      <div className="flex-none px-3 pt-2">
        <input
          type="text"
          value={menuSearch}
          onChange={e => setMenuSearch(e.target.value)}
          placeholder="Search menu..."
          className="w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-400 placeholder-slate-400"
        />
      </div>
      <div className="flex-none">
        {!menuSearch.trim() && (
          <div className="flex gap-1.5 px-3 pt-2 pb-1 overflow-x-auto flex-nowrap border-b border-slate-200 dark:border-slate-700">
          {MENU_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat === 'Iced Coffee Drinks' ? '🧊 Iced' :
               cat === 'Espresso Drinks' ? '☕ Espresso' :
               cat === 'Brewed/Filter Coffee' ? '⚡ Filter' : '📦 Other'}
            </button>
          ))}
        </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLocked && (
          <div className={`rounded-2xl p-4 mb-3 text-center border ${
            activeRun?.status === 'paused'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          }`}>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Day {activeRun?.status === 'paused' ? 'Paused' : 'Ended'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
              Total: {activeRun ? formatCurrency(totalSales(activeRun)) : '0'} · {activeRun?.sales.length || 0} sales
            </p>
            {activeRun?.status === 'paused' && (
              <button onClick={() => resumeRun(activeRun!.id)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Resume</button>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {filteredMenu.map(item => {
            const ad = item.autoDecide
            const borderColor = ad === 'hot' ? 'border-orange-400 dark:border-orange-600' :
              ad === 'ice' ? 'border-blue-400 dark:border-blue-600' :
              'border-slate-200 dark:border-slate-700'
            const badgeColor = ad === 'hot' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
              ad === 'ice' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
              'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            const label = ad === 'hot' ? 'HOT' : ad === 'ice' ? 'ICE' : 'DEC'
            const displayName = ad === 'hot' ? `${item.name} (Hot)` : ad === 'ice' ? `${item.name} (Iced)` : item.name

            return (
            <button
              key={item.id}
              onClick={() => handleAddItem(item)}
              disabled={isLocked}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 shadow-sm text-left flex flex-col min-h-[80px] ${borderColor} ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed'
                  : 'active:scale-[0.97] transition-transform cursor-pointer'
              }`}
            >
              <span className="font-semibold text-base text-slate-900 dark:text-white leading-tight">
                {displayName}
              </span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">
                {formatCurrency(item.price)}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>
                  {label}
                </span>
                {menuServings[item.id] !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    menuServings[item.id] <= 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' :
                    menuServings[item.id] <= 10 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    ~{menuServings[item.id]} serves
                  </span>
                )}
                {!isAfterCount && lastSoldTimes[item.id] && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatTime(lastSoldTimes[item.id])}
                  </span>
                )}
              </div>
              {item.beanId && menuBeanStock[item.id] && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (menuBeanStock[item.id].stock / menuBeanStock[item.id].max) * 100)}%`,
                        backgroundColor:
                          menuBeanStock[item.id].stock <= 0 ? '#f43f5e' :
                          menuBeanStock[item.id].stock <= (item.recipe?.dose || 1) * 10 ? '#f59e0b' :
                          '#10b981'
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">
                    {menuBeanStock[item.id].stock}g
                  </span>
                </div>
              )}
            </button>
            )
          })}
        </div>

        {filteredMenu.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
            No items in this category.
            <br />
            Go to Menu tab to add some.
          </div>
        )}
      </div>

      <div className="flex-none border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <button
          onClick={() => setSalesOpen(!salesOpen)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs"
        >
          <span className="flex items-center gap-2">
            <span className="text-slate-400">{salesOpen ? '▾' : '▸'}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Sales</span>
            <span className="text-slate-400">
              {salesTableRun ? `${salesTableRun.sales.length} · ${formatCurrency(totalSales(salesTableRun))}` : '0 sales'}
            </span>
          </span>
          <span className="text-slate-400">{salesOpen ? 'Hide' : 'Show'}</span>
        </button>
        {salesOpen && (
          <div className="pb-2">
            <div className="px-3 pb-1">
              <input
                type="text"
                value={salesFilter}
                onChange={e => setSalesFilter(e.target.value)}
                placeholder="Filter sales..."
                className="w-full text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-500 dark:text-slate-400 placeholder-slate-400"
              />
            </div>
            <div className="max-h-48 overflow-y-auto px-3">
              {salesTableRun && salesTableRun.sales.length > 0 ? (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left font-medium py-1 w-8">#</th>
                      <th className="text-left font-medium py-1 w-14">Time</th>
                      <th className="text-left font-medium py-1">Items</th>
                      <th className="text-center font-medium py-1 w-7">P</th>
                      <th className="text-center font-medium py-1 w-10">Nat</th>
                      <th className="text-right font-medium py-1 w-14">Total</th>
                      <th className="text-center font-medium py-1 w-16">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...salesTableRun.sales]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .filter(s => {
                        if (!salesFilter.trim()) return true
                        const q = salesFilter.trim().toLowerCase()
                        return s.items.some(i => i.menuItemName.toLowerCase().includes(q)) ||
                          s.nationality.toLowerCase().includes(q) ||
                          s.note.toLowerCase().includes(q)
                      })
                      .map((sale, idx) => (
                        <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="py-1 text-slate-400">{idx + 1}</td>
                          <td className="py-1 text-slate-400 whitespace-nowrap">{formatTime(sale.timestamp)}</td>
                          <td className="py-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                            {sale.items.map((si, i) => {
                              const adBadge = si.autoDecide === 'hot' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                si.autoDecide === 'ice' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              const adLabel = si.autoDecide === 'hot' ? 'HOT' : si.autoDecide === 'ice' ? 'ICE' : 'DEC'
                              const totalPrice = si.price + (si.doseUpcharge || 0)
                              return (
                                <span key={i} className="inline-flex items-center gap-0.5 mr-2">
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${adBadge}`}>{adLabel}</span>
                                  {si.menuItemName}
                                  {si.sweetness && si.sweetness !== 'regular' && (
                                    <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                                      {si.sweetness === 'less-sweet' ? 'LS' : si.sweetness === 'more-sweet' ? 'MS' : 'NS'}
                                    </span>
                                  )}
                                  {si.doseOverride && si.doseOverride > 0 && (
                                    <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                      {si.doseOverride}g
                                    </span>
                                  )}
                                  <span className="text-slate-500 dark:text-slate-400">{formatCurrency(si.price)}</span>
                                  {si.doseUpcharge ? <span className="text-[9px] text-amber-600 dark:text-amber-400">+{formatCurrency(si.doseUpcharge)}</span> : null}
                                  <span className="text-slate-400 font-medium">×{si.quantity}</span>
                                  <span className="text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(totalPrice * si.quantity)}</span>
                                </span>
                              )
                            })}
                            {editSaleId === sale.id ? (
                              <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} className="mt-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white w-full" placeholder="Note..." />
                            ) : sale.note ? (
                              <div className="text-[10px] text-slate-400 italic mt-0.5">Note: {sale.note}</div>
                            ) : null}
                          </td>
                          {editSaleId === sale.id ? (
                            <>
                              <td className="py-1 text-center">
                                <select value={editProfile} onChange={e => setEditProfile(e.target.value as CustomerProfile)} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-0.5 py-0.5 dark:text-white w-8">
                                  {CUSTOMER_PROFILES.map(p => (
                                    <option key={p.value} value={p.value}>{p.value}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1 text-center">
                                <select value={editNation} onChange={e => setEditNation(e.target.value)} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-0.5 py-0.5 dark:text-white w-12">
                                  {NATIONALITIES.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatCurrency(sale.total)}</td>
                              <td className="py-1 text-center">
                                <div className="flex gap-0.5 justify-center">
                                  <button onClick={() => { dispatch({ type: 'UPDATE_SALE', payload: { runId: salesTableRun.id, saleId: sale.id, updates: { customerProfile: editProfile, nationality: editNation, note: editNote } } }); setEditSaleId(null) }} className="text-[10px] px-1 py-0.5 bg-emerald-600 text-white rounded">✓</button>
                                  <button onClick={() => setEditSaleId(null)} className="text-[10px] px-1 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">✕</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-1 text-center">
                                <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-bold text-white ${
                                  sale.customerProfile === 'R' ? 'bg-emerald-600' :
                                  sale.customerProfile === 'P' ? 'bg-amber-600' :
                                  sale.customerProfile === 'U' ? 'bg-violet-600' :
                                  sale.customerProfile === 'A' ? 'bg-rose-600' :
                                  'bg-slate-400'
                                }`}>{sale.customerProfile}</span>
                              </td>
                              <td className="py-1 text-center text-[10px] text-slate-500 dark:text-slate-400">{sale.nationality || '-'}</td>
                              <td className="py-1 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatCurrency(sale.total)}</td>
                              <td className="py-1 text-center">
                                <div className="flex gap-0.5 justify-center">
                                  <button onClick={() => { setEditSaleId(sale.id); setEditProfile(sale.customerProfile); setEditNation(sale.nationality); setEditNote(sale.note) }} className="text-[10px] px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Edit</button>
                                  <button onClick={() => { if (window.confirm('Delete this sale record?')) dispatch({ type: 'REMOVE_SALE', payload: { runId: salesTableRun.id, saleId: sale.id } }) }} className="text-[10px] px-1 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">Del</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-[11px] text-slate-400 py-4 text-center">No sales yet</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-none border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 pb-6">
        {cart.length > 0 && (
          <div className="mb-3 max-h-36 overflow-y-auto space-y-1">
            {cart.map(c => {
              const rowBg = c.selectedAutoDecide === 'hot' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700' :
                c.selectedAutoDecide === 'ice' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700' :
                'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              const badgeColor = c.selectedAutoDecide === 'hot' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700' :
                c.selectedAutoDecide === 'ice' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700' :
                'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'
              return (
              <div key={c.menuItem.id + c.selectedAutoDecide + (c.sweetness || '') + (c.doseOverride || '')} className={`flex items-center gap-2 text-sm rounded-xl border ${rowBg}`}>
                <div className="flex-1 flex items-center justify-between py-2 pl-3 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => handleRemoveItem(c.menuItem.id)}
                      className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-sm font-bold flex-shrink-0 hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                      −
                    </button>
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {c.menuItem.name}
                      <span className="text-slate-400 ml-1">x{c.quantity}</span>
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${badgeColor}`}>
                        {c.selectedAutoDecide === 'hot' ? 'HOT' : c.selectedAutoDecide === 'ice' ? 'ICE' : 'DEC'}
                      </span>
                      {c.sweetness && c.sweetness !== 'regular' && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-700">
                          {c.sweetness === 'less-sweet' ? 'Less Sweet' : c.sweetness === 'more-sweet' ? 'More Sweet' : 'No Sweet'}
                        </span>
                      )}
                      {c.doseOverride && c.doseOverride > 0 && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                          {c.doseOverride}g
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">{!isAfterCount && formatTime(c.addedAt)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleCycleAutoDecide(c.menuItem.id)}
                      className={`text-[10px] w-6 h-6 rounded-full font-bold border flex items-center justify-center ${badgeColor}`}
                      title="Toggle hot/ice"
                    >
                      ⇄
                    </button>
                    <span className="font-medium text-slate-800 dark:text-slate-200 w-14 text-right">
                      {formatCurrency((c.menuItem.price + (c.doseUpcharge || 0)) * c.quantity)}
                    </span>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowNote(!showNote)}
                className={`text-xs px-2 py-1 rounded-lg border ${
                  showNote || note
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
              >
                Note
              </button>
            </div>
            {showNote && (
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Sale note..."
                className="mt-1 w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-400 placeholder-slate-400"
              />
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(cartTotal)}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2 mt-2">
          <button
            onClick={() => setShowProfiling(!showProfiling)}
            className="flex items-center gap-1.5 px-1 w-full text-left"
          >
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {showProfiling ? '▾' : '▸'} 👤 Customer Profile
            </span>
            {!showProfiling && customerProfile !== 'C' && (
              <span className="text-xs text-blue-500">{customerProfile}</span>
            )}
            {!showProfiling && nationality !== 'None' && (
              <span className="text-xs text-slate-400">{nationality}</span>
            )}
          </button>
          {showProfiling && (
            <div className="flex items-center gap-1.5 px-1 mt-1">
              {['C','U','P','R','A'].map(code => {
                const p = CUSTOMER_PROFILES.find(cp => cp.value === code)
                if (!p) return null
                const isActive = customerProfile === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setCustomerProfile(p.value)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      isActive
                        ? profileColors[p.value] + ' ring-1 ring-white/20'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
              <div className="relative ml-auto max-w-[110px]">
                <input
                  type="text"
                  value={nationalitySearch}
                  onChange={e => { setNationalitySearch(e.target.value); setShowNationalities(true); setNationality('') }}
                  onFocus={() => setShowNationalities(true)}
                  placeholder={nationality || 'Nat...'}
                  className="w-full text-[10px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-slate-500 dark:text-slate-400 placeholder-slate-400"
                />
                {showNationalities && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNationalities(false)} />
                    <div className="absolute top-full mt-0.5 right-0 z-20 max-h-28 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[100px]">
                      {filteredNationalities.map(n => (
                        <button
                          key={n}
                          onClick={() => { setNationality(n); setNationalitySearch(''); setShowNationalities(false) }}
                          className={`block w-full text-left text-[10px] px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                            nationality === n ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      {filteredNationalities.length === 0 && (
                        <div className="text-[10px] text-slate-400 px-2 py-1">No matches</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-3">
          {activeRun && activeRun.status !== 'active' ? (
            activeRun.status === 'ended' || activeRun.status === 'paused' ? (
              <button
                onClick={() => resumeRun(activeRun.id)}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-base active:scale-[0.98] hover:bg-emerald-700"
              >
                Resume Day
              </button>
            ) : null
          ) : null}
          <div className="flex-1 flex flex-col gap-1.5">
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || isLocked || onHold}
              className={`w-full py-3.5 rounded-2xl font-bold text-lg transition-all ${
                cart.length > 0 && !isLocked
                  ? 'bg-blue-600 text-white active:scale-[0.98] shadow-lg shadow-blue-600/20 hover:bg-blue-700'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
              }`}
            >
              {isAfterCount ? 'Record' : 'Sell'}
            </button>
            <button
              onClick={handleBrewTest}
              disabled={cart.length === 0 || isLocked || onHold}
              className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-[0.98] transition-transform hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              🧪 Brew Test
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
