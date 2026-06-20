import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { formatCurrency, formatTime } from '../utils'

export default function CalendarView() {
  const { state, totalSales } = useStore()
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [showCost, setShowCost] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11) } else { setCalMonth(calMonth - 1) } }
  const nextMonth = () => { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0) } else { setCalMonth(calMonth + 1) } }

  const runsByDate = useMemo(() => {
    const map: Record<string, typeof state.runs> = {}
    for (const run of state.runs) {
      if (!map[run.date]) map[run.date] = []
      map[run.date].push(run)
    }
    return map
  }, [state.runs])

  function getDayData(dateStr: string) {
    const runs = runsByDate[dateStr]
    if (!runs || runs.length === 0) return null

    let rev = 0, cost = 0, servings = 0
    const dayNumbers: number[] = []
    for (const run of runs) {
      dayNumbers.push(run.dayNumber)
      rev += totalSales(run)
      for (const sale of run.sales) {
        for (const item of sale.items) {
          servings += item.quantity
          const mi = state.menu.find(m => m.id === item.menuItemId)
          if (mi?.beanId && mi.recipe?.dose) {
            const b = state.beans.find(x => x.id === mi.beanId)
            if (b) cost += mi.recipe.dose * b.costPerGram * item.quantity
          }
        }
      }
    }
    return { rev, cost, profit: rev - cost, servings, runs, dayNumbers }
  }

  function getDaySummaries(dateStr: string) {
    const runs = runsByDate[dateStr]
    if (!runs) return []
    const all: { time: string; items: string; total: number; dayNumber: number }[] = []
    for (const run of runs) {
      for (const sale of run.sales) {
        all.push({
          time: formatTime(sale.timestamp),
          items: sale.items.map(i => `${i.menuItemName}x${i.quantity}`).join(', '),
          total: sale.total,
          dayNumber: run.dayNumber,
        })
      }
    }
    return all
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Calendar</h2>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={showCost} onChange={e => setShowCost(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
          Show cost & profit
        </label>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-700">
          <button onClick={prevMonth} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 font-medium">&larr; Prev</button>
          <span className="text-base font-bold text-slate-800 dark:text-white">{monthLabel}</span>
          <button onClick={nextMonth} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 font-medium">Next &rarr;</button>
        </div>

        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-[11px] font-medium text-slate-400 text-center py-2 border-b border-slate-100 dark:border-slate-700">{d}</div>
          ))}
          {Array.from({ length: firstDow }, (_, i) => (
            <div key={`e-${i}`} className="border-r border-b border-slate-50 dark:border-slate-800/50 min-h-[90px]" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const data = getDayData(dateStr)
            const isToday = dateStr === todayStr
            const isSelected = selectedDate === dateStr
            return (
              <div
                key={day}
                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                className={`border-r border-b border-slate-50 dark:border-slate-800/50 p-1.5 min-h-[90px] cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{day}</div>
                {data && (
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400">#{data.dayNumbers.join(', ')}</div>
                    <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{formatCurrency(data.rev)}</div>
                    {showCost && data.cost > 0 && (
                      <>
                        <div className="text-[10px] text-rose-500">{formatCurrency(Math.round(data.cost))}</div>
                        <div className={`text-[10px] font-medium ${data.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatCurrency(Math.round(data.profit))}
                        </div>
                      </>
                    )}
                    {showCost && data.cost === 0 && data.rev > 0 && (
                      <div className="text-[10px] text-slate-400 italic">no cost data</div>
                    )}
                    <div className="text-[9px] text-slate-400">{data.servings}s</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDate && (() => {
        const summaries = getDaySummaries(selectedDate)
        if (summaries.length === 0) return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center text-sm text-slate-400">
            No sales on {selectedDate}
          </div>
        )
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedDate}</h3>
              <span className="text-xs text-slate-400">{summaries.length} sale{summaries.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {summaries.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 w-8 flex-shrink-0">{s.time}</span>
                    <span className="text-[10px] text-blue-500 font-semibold w-8 flex-shrink-0">#{s.dayNumber}</span>
                    <span className="text-slate-600 dark:text-slate-400 truncate">{s.items}</span>
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex-shrink-0 ml-2">{formatCurrency(s.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
