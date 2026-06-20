import { useMemo, useState } from 'react'
import type { DayRun } from '../types'
import { formatTime } from '../utils'

interface Props {
  run: DayRun
}

export default function SalesGraph({ run }: Props) {
  const [filterType, setFilterType] = useState<string>('all')

  const sorted = useMemo(() => {
    return [...run.sales].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [run.sales])

  const { chartData, downtimes, avgDowntime, peakHour } = useMemo(() => {
    if (sorted.length === 0) return { chartData: [], downtimes: [], avgDowntime: 0, peakHour: '' }

    const dts: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      dts.push(new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime())
    }
    const avg = dts.length > 0 ? dts.reduce((s, d) => s + d, 0) / dts.length / 60000 : 0

    const hours: Record<number, number> = {}
    for (const s of sorted) {
      const h = new Date(s.timestamp).getHours()
      hours[h] = (hours[h] || 0) + 1
    }
    let peakH = ''
    let peakC = 0
    for (const [h, c] of Object.entries(hours)) {
      if (c > peakC) { peakC = c; peakH = h }
    }

    const data = sorted.map(s => {
      const t = new Date(s.timestamp).getTime()
      const items = s.items.map(it => it.menuItemName).join(', ')
      return { sale: s, items, timestamp: t }
    })

    return {
      chartData: data,
      downtimes: dts,
      avgDowntime: avg,
      peakHour: peakH ? `${peakH}:00` : '',
    }
  }, [sorted])

  const filteredData = filterType === 'all' ? chartData : chartData.filter(d => {
    return d.sale.items.some(i => i.menuItemName === filterType)
  })

  const uniqueItems = useMemo(() => {
    const set = new Set<string>()
    for (const s of sorted) {
      for (const i of s.items) set.add(i.menuItemName)
    }
    return Array.from(set)
  }, [sorted])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-xs">
        No sales to chart yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-400"
        >
          <option value="all">All items</option>
          {uniqueItems.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <span className="text-[10px] text-slate-400">{sorted.length} sales</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 overflow-x-auto">
        <svg width={Math.max(filteredData.length * 40, 300)} height={120} className="w-full">
          <line x1="0" y1="100" x2={Math.max(filteredData.length * 40, 300)} y2="100" stroke="#94a3b8" strokeWidth="1" />

          {filteredData.map((d, i) => {
            const x = i * 40 + 20
            const h = 60 + Math.random() * 20
            const t = new Date(d.sale.timestamp)
            const label = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
            const cat = d.sale.items[0]?.menuItemName || 'Other'
            const colorIdx = uniqueItems.indexOf(cat)
            const color = colorIdx >= 0 ? `hsl(${colorIdx * 45}, 65%, 55%)` : '#6b7280'

            return (
              <g key={d.sale.id}>
                <rect x={x - 4} y={100 - h} width={8} height={h} rx={2} fill={color} opacity={0.8}>
                  <title>{d.items} · {formatTime(d.sale.timestamp)} · {d.sale.total} THB</title>
                </rect>
                {i % 3 === 0 && (
                  <text x={x} y={114} textAnchor="middle" fontSize="8" fill="#94a3b8">{label}</text>
                )}
              </g>
            )
          })}

          {filteredData.length === 0 && (
            <text x="50%" y="50" textAnchor="middle" fontSize="12" fill="#94a3b8">No matching sales</text>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 text-center">
          <div className="text-[10px] text-slate-400">Total Sales</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{sorted.length}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 text-center">
          <div className="text-[10px] text-slate-400">Avg Downtime</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{avgDowntime < 1 ? '<1' : Math.round(avgDowntime)} min</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2 text-center">
          <div className="text-[10px] text-slate-400">Peak Hour</div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{peakHour || '-'}</div>
        </div>
      </div>

      {downtimes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Downtime Between Sales</div>
          <div className="space-y-1">
            {downtimes.slice(0, 10).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">
                  Sale #{i + 1} → #{i + 2}
                </span>
                <span className={`font-medium ${d > 300000 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}>
                  {Math.round(d / 60000)} min
                </span>
              </div>
            ))}
            {downtimes.length > 10 && (
              <div className="text-[10px] text-slate-400 text-center pt-1">...and {downtimes.length - 10} more</div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {uniqueItems.map(name => {
          const colorIdx = uniqueItems.indexOf(name)
          const color = `hsl(${colorIdx * 45}, 65%, 55%)`
          return (
            <button
              key={name}
              onClick={() => setFilterType(filterType === name ? 'all' : name)}
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                filterType === name ? 'ring-1 ring-slate-400 dark:ring-slate-500' : ''
              }`}
              style={{ borderColor: color, color }}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
