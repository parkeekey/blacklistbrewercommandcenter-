import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { formatCurrency } from '../utils'

export default function SalesView() {
  const { state, totalSales } = useStore()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(state.activeRunId)

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

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sales</h2>

      <div className="flex gap-2 overflow-x-auto flex-nowrap pb-1">
        {allRuns.slice(0, 10).map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedRunId(r.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              selectedRunId === r.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            Day {r.dayNumber}
            {r.id === state.activeRunId && (
              <span className="ml-1 text-[10px] opacity-70">(active)</span>
            )}
          </button>
        ))}
        {allRuns.length === 0 && (
          <div className="text-xs text-slate-400 py-2">No runs yet</div>
        )}
      </div>

      {!run ? (
        <div className="text-center py-12 text-slate-400 text-sm">Select a run to see sales data</div>
      ) : !stats ? null : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Day {run.dayNumber} - {run.date}
              </span>
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

            {stats.drinkCost === 0 && stats.drinkCount > 0 && (
              <div className="text-xs text-slate-400 text-center py-1">
                Set Dose (g) on menu items linked to beans to see cost & profit
              </div>
            )}

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

            {stats.drinkCost > 0 && (
              <div className="mt-2 text-center text-[10px] text-slate-400">
                Avg cost/drink: {formatCurrency(Math.round(stats.drinkCost / stats.drinkCount))}
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
                    {item.cost > 0 && (
                      <span className="text-rose-400">{formatCurrency(Math.round(item.cost))}</span>
                    )}
                    {item.cost > 0 && (
                      <span className={`font-medium w-12 text-right ${item.rev - item.cost >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {formatCurrency(Math.round(item.rev - item.cost))}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {sortedItems.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs">No items sold in this run</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
