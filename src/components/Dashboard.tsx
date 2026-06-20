import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { formatCurrency, servingsCount, mostPopularItem, formatTime, generateId } from '../utils'
import type { WeatherCondition, WeatherLog, DifficultyLog, ResistLog, DarkEventLog } from '../types'
import EndDayButton from './EndDayButton'
import SalesGraph from './SalesGraph'

const WEATHER_CONDITIONS: { value: WeatherCondition; icon: string; label: string }[] = [
  { value: 'sunny', icon: '\u2600\uFE0F', label: 'Sunny' },
  { value: 'cloudy', icon: '\u26C5', label: 'Cloudy' },
  { value: 'rainy', icon: '\uD83C\uDF27\uFE0F', label: 'Rainy' },
  { value: 'stormy', icon: '\u26C8\uFE0F', label: 'Stormy' },
]

const FLAVOR_TAGS = [
  'sour', 'sweet', 'aromatic', 'mouthfeel',
  'floral', 'fruity', 'nutty', 'spicy', 'chocolate', 'earthy', 'smoky',
]

export default function Dashboard() {
  const { state, startNewRun, pauseRun, resumeRun, setMode, totalSales: calcTotal, updateRun, addWeatherLog } = useStore()
  const [goalMin, setGoalMin] = useState(2000)
  const [goalMax, setGoalMax] = useState(4000)
  const [dayNumberInput, setDayNumberInput] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stopAt, setStopAt] = useState(() => localStorage.getItem('centrolstock.stopAt') || '')

  const [diffValue, setDiffValue] = useState('')
  const [diffNote, setDiffNote] = useState('')
  const [diffEditId, setDiffEditId] = useState<string | null>(null)
  const [resistValue, setResistValue] = useState('')
  const [resistNote, setResistNote] = useState('')
  const [resistEditId, setResistEditId] = useState<string | null>(null)
  const [darkNote, setDarkNote] = useState('')
  const [darkEditId, setDarkEditId] = useState<string | null>(null)

  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('sunny')
  const [weatherTemp, setWeatherTemp] = useState('32')
  const [weatherHumidity, setWeatherHumidity] = useState('60')
  const [weatherFlavors, setWeatherFlavors] = useState<string[]>([])
  const [downtime, setDowntime] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    if (!actionMessage) return
    const t = setTimeout(() => setActionMessage(''), 3000)
    return () => clearTimeout(t)
  }, [actionMessage])

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    localStorage.setItem('centrolstock.stopAt', stopAt)
  }, [stopAt])

  useEffect(() => {
    const id = setInterval(() => {
      const activeRun = state.activeRunId ? state.runs.find(r => r.id === state.activeRunId) : null
      if (!activeRun) { setDowntime(''); return }
      const paidSales = activeRun.sales.filter(s => s.total > 0)
      if (paidSales.length === 0) { setDowntime('No paid sales yet'); return }
      const latest = paidSales.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b)
      const elapsed = Date.now() - new Date(latest.timestamp).getTime()
      const h = Math.floor(elapsed / 3600000)
      const m = Math.floor((elapsed % 3600000) / 60000)
      const s = Math.floor((elapsed % 60000) / 1000)
      setDowntime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(id)
  }, [state.activeRunId, state.runs])

  const activeRun = state.activeRunId ? state.runs.find(r => r.id === state.activeRunId) : null
  const recentRuns = state.runs.slice(0, 10)

  const [showCalendar, setShowCalendar] = useState(false)
  const [editingDayNum, setEditingDayNum] = useState(false)
  const [editDayNumValue, setEditDayNumValue] = useState(0)
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null)

  const runDates = new Set(state.runs.map(r => r.date))

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const selectedRun = selectedCalDate ? state.runs.find(r => r.date === selectedCalDate) : null

  function handleStartRun() {
    const dn = dayNumberInput ? Number(dayNumberInput) : undefined
    if (dayNumberInput && (isNaN(dn!) || dn! < 1)) return
    startNewRun(goalMin, goalMax, dn, startTime || undefined, endTime || undefined)
  }

  function handleLogWeather() {
    if (!activeRun) return
    const wl: WeatherLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      condition: weatherCondition,
      temperature: Number(weatherTemp),
      humidity: Number(weatherHumidity),
      uvIndex: 0,
      wind: 0,
      feelsLike: Number(weatherTemp),
      rainRisk: weatherCondition === 'rainy' || weatherCondition === 'stormy' ? 80 : weatherCondition === 'cloudy' ? 30 : 5,
      flavors: weatherFlavors.length > 0 ? [...weatherFlavors] : undefined,
    }
    addWeatherLog(activeRun.id, wl)
    const wc = WEATHER_CONDITIONS.find(w => w.value === weatherCondition)
    const condStr = weatherFlavors.length > 0 ? ` · ${weatherFlavors.join(', ')}` : ''
    setActionMessage(`Weather recorded ${wc?.icon || ''} ${weatherTemp}°C ${weatherHumidity}%${condStr}`)
    setWeatherFlavors([])
  }

  function toggleFlavor(f: string) {
    setWeatherFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  return (
    <div className="p-4 space-y-4">
      {actionMessage && (
        <div className="bg-emerald-600 text-white text-xs text-center py-2 rounded-2xl font-medium shadow-lg">
          {actionMessage}
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-wider">
              {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}:{String(currentTime.getSeconds()).padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400">Stop at</label>
            <input
              type="time"
              value={stopAt}
              onChange={e => setStopAt(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-400"
            />
            {stopAt && (
              <button
                onClick={() => setStopAt('')}
                className="text-[10px] text-rose-500 hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              />
            </div>
          </div>

      {activeRun && activeRun.startTime && (() => {
        const [sh, sm] = activeRun.startTime!.split(':').map(Number)
        const now = new Date()
        const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm)
        const e = activeRun.endTime
          ? (() => { const [eh, em] = activeRun.endTime!.split(':').map(Number); return new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em) })()
          : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59)
        const total = e.getTime() - s.getTime()
        const elapsed = now.getTime() - s.getTime()
        const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0
        return (
          <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
              <span>{activeRun.startTime}</span>
              <span className="font-semibold text-blue-600">{Math.round(pct)}%</span>
              <span>{activeRun.endTime || 'close'}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })()}

      <div className="flex gap-2 items-center">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setMode('operational')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
              state.mode === 'operational'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Operational
          </button>
          <button
            onClick={() => setMode('aftercount')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
              state.mode === 'aftercount'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            After-Count
          </button>
        </div>
        {state.mode === 'aftercount' && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Paper bill entry — no timestamps
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button onClick={() => setShowCalendar(!showCalendar)} className="w-full p-3 flex items-center justify-between text-left">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Calendar</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCalendar && (
          <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between py-2">
              <button onClick={() => { if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11) } else { setCalMonth(calMonth - 1) } }} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">{'<'}</button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{monthLabel}</span>
              <button onClick={() => { if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0) } else { setCalMonth(calMonth + 1) } }} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">{'>'}</button>
            </div>
            <div className="grid grid-cols-7 gap-0 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-[10px] text-slate-400 py-1">{d}</div>
              ))}
              {Array.from({ length: firstDow }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasRun = runDates.has(dateStr)
                const isSelected = selectedCalDate === dateStr
                const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedCalDate(selectedCalDate === dateStr ? null : dateStr)}
                    className={`text-xs py-1.5 rounded-lg relative ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isToday
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {day}
                    {hasRun && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                )
              })}
            </div>
            {selectedRun && (
              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-xs">
                <div className="font-medium text-slate-700 dark:text-slate-300">Day {selectedRun.dayNumber} - {selectedRun.date}</div>
                <div className="text-slate-400">{servingsCount(selectedRun)} serves · {formatCurrency(calcTotal(selectedRun))}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard</h2>

      {!state.activeRunId ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">No active run. Start a new one.</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Day #</label>
              <input
                type="number"
                value={dayNumberInput}
                onChange={e => setDayNumberInput(e.target.value)}
                placeholder="Auto"
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Goal Min</label>
              <input
                type="number"
                value={goalMin}
                onChange={e => setGoalMin(Number(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Goal Max</label>
              <input
                type="number"
                value={goalMax}
                onChange={e => setGoalMax(Number(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
              />
            </div>
          </div>
          <button
            onClick={handleStartRun}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold active:scale-[0.98] transition-transform"
          >
            Start New Run
          </button>
        </div>
      ) : activeRun && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {editingDayNum ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-slate-500">#blacklistbrewer - Day</span>
                    <input type="number" value={editDayNumValue} onChange={e => setEditDayNumValue(Number(e.target.value))} className="w-16 text-sm font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" autoFocus />
                    <button onClick={() => { updateRun(activeRun.id, { dayNumber: editDayNumValue }); setEditingDayNum(false) }} className="text-xs px-1.5 py-0.5 bg-emerald-600 text-white rounded">OK</button>
                    <button onClick={() => setEditingDayNum(false)} className="text-xs px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditDayNumValue(activeRun.dayNumber); setEditingDayNum(true) }} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors">#blacklistbrewer - Day {activeRun.dayNumber}</button>
                )}
                <span className="text-sm text-slate-400">{activeRun.date}</span>
                {activeRun.status === 'active' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">Active</span>}
                {activeRun.status === 'active' && activeRun.endTime && (() => {
                  const [eh, em] = activeRun.endTime!.split(':').map(Number)
                  const now = currentTime
                  const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em)
                  if (now.getTime() > endToday.getTime()) {
                    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold">🕐 Overtime</span>
                  }
                  return null
                })()}
                {activeRun.status === 'paused' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold">Paused</span>}
                {activeRun.status === 'ended' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 font-semibold">Ended</span>}
                {activeRun.startTime && <span className="text-[10px] text-slate-400">🕐 {activeRun.startTime}{activeRun.endTime ? `-${activeRun.endTime}` : ''}</span>}
              </div>
              <span className="text-xs text-slate-400">{servingsCount(activeRun)} servings</span>
            </div>

            <div className="mb-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Operation Intel</div>

              <div className="bg-red-50 dark:bg-red-900/5 border border-red-200 dark:border-red-800/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">☠️</span>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">Difficulty</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number" min={0} max={99}
                    value={diffValue}
                    onChange={e => setDiffValue(e.target.value)}
                    placeholder="0-99"
                    className="w-14 text-sm font-bold bg-white dark:bg-slate-700 border border-red-300 dark:border-red-700 rounded-lg px-2 py-1 dark:text-white placeholder-red-300 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    type="text"
                    value={diffNote}
                    onChange={e => setDiffNote(e.target.value)}
                    placeholder="Why this rating?"
                    className="flex-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 dark:text-white placeholder-slate-400 outline-none"
                  />
                  <button
                    onClick={() => {
                      const logs = activeRun.difficultyLogs || []
                      const entry: DifficultyLog = { id: diffEditId || generateId(), timestamp: new Date().toISOString(), value: Number(diffValue), note: diffNote }
                      if (diffEditId) {
                        updateRun(activeRun.id, { difficultyLogs: logs.map(l => l.id === diffEditId ? entry : l) })
                      } else {
                        updateRun(activeRun.id, { difficultyLogs: [...logs, entry] })
                      }
                      setDiffValue(''); setDiffNote(''); setDiffEditId(null)
                    }}
                    disabled={!diffValue}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg font-medium disabled:opacity-40"
                  >{diffEditId ? 'Update' : 'Save'}</button>
                  {diffEditId && (
                    <button onClick={() => { setDiffValue(''); setDiffNote(''); setDiffEditId(null) }} className="text-xs px-2 py-1.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg">Cancel</button>
                  )}
                </div>
                {(activeRun.difficultyLogs || []).length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {[...(activeRun.difficultyLogs || [])].reverse().map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs bg-white/50 dark:bg-slate-700/30 rounded-lg px-2 py-1">
                        <span className="font-bold text-red-600 dark:text-red-400 w-5">{log.value}</span>
                        <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{log.note}</span>
                        <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                        <button onClick={() => { setDiffValue(String(log.value)); setDiffNote(log.note); setDiffEditId(log.id) }} className="text-slate-400 hover:text-blue-600">Edit</button>
                        <button onClick={() => updateRun(activeRun.id, { difficultyLogs: (activeRun.difficultyLogs || []).filter(l => l.id !== log.id) })} className="text-slate-400 hover:text-red-600">Del</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/5 border border-orange-200 dark:border-orange-800/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✊</span>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Resist</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number" min={0} max={99}
                    value={resistValue}
                    onChange={e => setResistValue(e.target.value)}
                    placeholder="0-99"
                    className="w-14 text-sm font-bold bg-white dark:bg-slate-700 border border-orange-300 dark:border-orange-700 rounded-lg px-2 py-1 dark:text-white placeholder-orange-300 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    type="text"
                    value={resistNote}
                    onChange={e => setResistNote(e.target.value)}
                    placeholder="What prep helps?"
                    className="flex-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 dark:text-white placeholder-slate-400 outline-none"
                  />
                  <button
                    onClick={() => {
                      const logs = activeRun.resistLogs || []
                      const entry: ResistLog = { id: resistEditId || generateId(), timestamp: new Date().toISOString(), value: Number(resistValue), note: resistNote }
                      if (resistEditId) {
                        updateRun(activeRun.id, { resistLogs: logs.map(l => l.id === resistEditId ? entry : l) })
                      } else {
                        updateRun(activeRun.id, { resistLogs: [...logs, entry] })
                      }
                      setResistValue(''); setResistNote(''); setResistEditId(null)
                    }}
                    disabled={!resistValue}
                    className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg font-medium disabled:opacity-40"
                  >{resistEditId ? 'Update' : 'Save'}</button>
                  {resistEditId && (
                    <button onClick={() => { setResistValue(''); setResistNote(''); setResistEditId(null) }} className="text-xs px-2 py-1.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg">Cancel</button>
                  )}
                </div>
                {(activeRun.resistLogs || []).length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {[...(activeRun.resistLogs || [])].reverse().map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs bg-white/50 dark:bg-slate-700/30 rounded-lg px-2 py-1">
                        <span className="font-bold text-orange-600 dark:text-orange-400 w-5">{log.value}</span>
                        <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{log.note}</span>
                        <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                        <button onClick={() => { setResistValue(String(log.value)); setResistNote(log.note); setResistEditId(log.id) }} className="text-slate-400 hover:text-blue-600">Edit</button>
                        <button onClick={() => updateRun(activeRun.id, { resistLogs: (activeRun.resistLogs || []).filter(l => l.id !== log.id) })} className="text-slate-400 hover:text-red-600">Del</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-100 dark:bg-slate-700/30 border border-slate-300 dark:border-slate-600 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💀</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dark Event</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={darkNote}
                    onChange={e => setDarkNote(e.target.value)}
                    placeholder="What ruined your day?"
                    className="flex-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 dark:text-white placeholder-slate-400 outline-none"
                  />
                  <button
                    onClick={() => {
                      const logs = activeRun.darkEventLogs || []
                      const entry: DarkEventLog = { id: darkEditId || generateId(), timestamp: new Date().toISOString(), note: darkNote }
                      if (darkEditId) {
                        updateRun(activeRun.id, { darkEventLogs: logs.map(l => l.id === darkEditId ? entry : l) })
                      } else {
                        updateRun(activeRun.id, { darkEventLogs: [...logs, entry] })
                      }
                      setDarkNote(''); setDarkEditId(null)
                    }}
                    disabled={!darkNote}
                    className="text-xs px-3 py-1.5 bg-slate-600 text-white rounded-lg font-medium disabled:opacity-40"
                  >{darkEditId ? 'Update' : 'Save'}</button>
                  {darkEditId && (
                    <button onClick={() => { setDarkNote(''); setDarkEditId(null) }} className="text-xs px-2 py-1.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg">Cancel</button>
                  )}
                </div>
                {(activeRun.darkEventLogs || []).length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {[...(activeRun.darkEventLogs || [])].reverse().map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs bg-white/50 dark:bg-slate-700/30 rounded-lg px-2 py-1">
                        <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{log.note}</span>
                        <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                        <button onClick={() => { setDarkNote(log.note); setDarkEditId(log.id) }} className="text-slate-400 hover:text-blue-600">Edit</button>
                        <button onClick={() => updateRun(activeRun.id, { darkEventLogs: (activeRun.darkEventLogs || []).filter(l => l.id !== log.id) })} className="text-slate-400 hover:text-red-600">Del</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <div className="text-xs text-slate-400">Total Sales</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(calcTotal(activeRun))}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                <div className="text-xs text-slate-400">Goal</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(activeRun.goalMax)}</div>
              </div>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (calcTotal(activeRun) / activeRun.goalMax) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0</span>
              <span>{Math.round((calcTotal(activeRun) / activeRun.goalMax) * 100)}%</span>
              <span>{formatCurrency(activeRun.goalMax)}</span>
            </div>

            {(() => {
              const popular = mostPopularItem(activeRun)
              if (!popular) return null
              return (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Most popular: <span className="font-semibold text-slate-700 dark:text-slate-300">{popular.name}</span> ({popular.count} sold)
                </div>
              )
            })()}

            {(() => {
              let hotQt = 0, iceQt = 0, hotRev = 0, iceRev = 0
              for (const sale of activeRun.sales) {
                for (const item of sale.items) {
                  if (item.autoDecide === 'hot') { hotQt += item.quantity; hotRev += item.price * item.quantity }
                  else if (item.autoDecide === 'ice') { iceQt += item.quantity; iceRev += item.price * item.quantity }
                }
              }
              const totalQt = hotQt + iceQt
              if (totalQt === 0) return null
              return (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-2.5 border border-rose-200 dark:border-rose-800">
                    <div className="text-[10px] text-rose-500 dark:text-rose-400 font-medium">Hot</div>
                    <div className="text-sm font-bold text-rose-700 dark:text-rose-300">{hotQt} serves</div>
                    <div className="text-[10px] text-rose-400">{formatCurrency(hotRev)}</div>
                  </div>
                  <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-2.5 border border-sky-200 dark:border-sky-800">
                    <div className="text-[10px] text-sky-500 dark:text-sky-400 font-medium">Ice</div>
                    <div className="text-sm font-bold text-sky-700 dark:text-sky-300">{iceQt} serves</div>
                    <div className="text-[10px] text-sky-400">{formatCurrency(iceRev)}</div>
                  </div>
                </div>
              )
            })()}

            {(() => {
              let drinkCost = 0, drinkCount = 0
              for (const sale of activeRun.sales) {
                for (const item of sale.items) {
                  drinkCount += item.quantity
                  const mi = state.menu.find(m => m.id === item.menuItemId)
                  if (!mi?.beanId || !mi.recipe?.dose) continue
                  const b = state.beans.find(x => x.id === mi.beanId)
                  if (!b) continue
                  drinkCost += mi.recipe.dose * b.costPerGram * item.quantity
                }
              }
              const rev = calcTotal(activeRun)
              const profit = rev - drinkCost
              const margin = rev > 0 ? (profit / rev) * 100 : 0
              return (
                <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mb-1.5">Profit Estimate</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-indigo-400">Revenue</div>
                      <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(rev)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-indigo-400">Cost</div>
                      <div className={`text-sm font-bold ${drinkCost > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {drinkCost > 0 ? formatCurrency(Math.round(drinkCost)) : '\u2014'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-indigo-400">Profit</div>
                      <div className={`text-sm font-bold ${drinkCost === 0 ? 'text-slate-400' : profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {drinkCost > 0 ? formatCurrency(Math.round(profit)) : '\u2014'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 text-center text-[10px] text-indigo-400">
                    {drinkCost > 0 ? (
                      <>
                        Margin: <span className="font-semibold text-indigo-600 dark:text-indigo-300">{margin.toFixed(1)}%</span>
                        <span className="ml-2">Avg cost/drink: {formatCurrency(Math.round(drinkCost / drinkCount))}</span>
                      </>
                    ) : (
                      <span>Set Dose (g) on your menu items to see profit</span>
                    )}
                  </div>
                </div>
              )
            })()}

            {activeRun.status === 'active' && (
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => pauseRun(activeRun.id)} className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-transform">Pause</button>
                  <EndDayButton runId={activeRun.id} compact run={activeRun} />
                </div>
                <p className="text-[10px] text-slate-400 text-center">Pause to stop sales temporarily · End to close the day</p>
              </div>
            )}
            {activeRun.status === 'paused' && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => resumeRun(activeRun.id)} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-transform">Resume</button>
                <EndDayButton runId={activeRun.id} compact run={activeRun} />
              </div>
            )}
            {activeRun.status === 'ended' && (
              <div className="mt-4 space-y-2">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                  <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Day Ended</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(calcTotal(activeRun))}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {servingsCount(activeRun)} servings · Goal: {formatCurrency(activeRun.goalMax)} · {
                      calcTotal(activeRun) >= activeRun.goalMax ? '✓ Goal met' : `${Math.round((calcTotal(activeRun) / activeRun.goalMax) * 100)}% of goal`
                    }
                  </div>
                  {(activeRun.difficultyLogs?.length || activeRun.resistLogs?.length || activeRun.darkEventLogs?.length) ? (
                    <div className="mt-2 space-y-0.5 text-[11px]">
                      {activeRun.difficultyLogs && activeRun.difficultyLogs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-500 font-bold">☠️</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Last: {activeRun.difficultyLogs.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b).value} · {activeRun.difficultyLogs.length} log{activeRun.difficultyLogs.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {activeRun.resistLogs && activeRun.resistLogs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500 font-bold">✊</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Last: {activeRun.resistLogs.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b).value} · {activeRun.resistLogs.length} log{activeRun.resistLogs.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {activeRun.darkEventLogs && activeRun.darkEventLogs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">💀</span>
                          <span className="text-slate-500 dark:text-slate-400">{activeRun.darkEventLogs.length} dark event{activeRun.darkEventLogs.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => resumeRun(activeRun.id)}
                  className="w-full py-3 bg-amber-600 text-white rounded-2xl font-bold active:scale-[0.98] transition-transform"
                >
                  Resume Day
                </button>
              </div>
            )}
          </div>

          {activeRun.status === 'active' && (() => {
            const paidSales = [...activeRun.sales].filter(s => s.total > 0).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            const withGaps = paidSales.map((s, i) => {
              if (i === 0) return { ...s, gapMs: 0, gapDisplay: 'first' }
              const prev = paidSales[i - 1]
              const gap = new Date(s.timestamp).getTime() - new Date(prev.timestamp).getTime()
              const h = Math.floor(gap / 3600000)
              const m = Math.floor((gap % 3600000) / 60000)
              return { ...s, gapMs: gap, gapDisplay: `${h}h ${m}m` }
            }).reverse()

            const longest = withGaps.reduce((best, s) => s.gapMs > best.gapMs ? s : best, { gapMs: 0, gapDisplay: '', timestamp: '', items: [] as any[] })

            return (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Down Time</h3>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold tabular-nums tracking-wider text-slate-900 dark:text-white font-mono">
                    {downtime || '\u2014'}
                  </div>
                  <div className="text-[10px] text-slate-400">since last paid sale</div>
                </div>
                {longest.gapMs > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200 dark:border-amber-800">
                    <div className="text-[10px] text-amber-500 font-medium">Longest gap</div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{longest.gapDisplay}</div>
                    <div className="text-[9px] text-amber-400">at {formatTime(longest.timestamp)}</div>
                  </div>
                )}
                {withGaps.length > 0 && (
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium mb-1">Sale gaps (most recent first)</div>
                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {withGaps.slice(0, 20).map(s => (
                        <div key={s.id} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100 dark:border-slate-700 last:border-0 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-slate-500 flex-shrink-0">{formatTime(s.timestamp)}</span>
                            <span className="text-slate-700 dark:text-slate-300 truncate">{s.items.map(x => x.menuItemName).join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(s.total)}</span>
                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${s.gapMs === 0 ? 'text-slate-400' : s.gapMs > 3600000 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                              {s.gapDisplay === 'first' ? '\u2014' : s.gapDisplay}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Log Weather</h3>
            <div className="flex gap-1">
              {WEATHER_CONDITIONS.map(wc => (
                <button
                  key={wc.value}
                  onClick={() => setWeatherCondition(wc.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    weatherCondition === wc.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {wc.icon} {wc.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Temp (°C)</label>
                <input
                  type="number"
                  value={weatherTemp}
                  onChange={e => setWeatherTemp(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">Humidity (%)</label>
                <input
                  type="number"
                  value={weatherHumidity}
                  onChange={e => setWeatherHumidity(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Coffee Flavors Observed</label>
              <div className="flex flex-wrap gap-1.5">
                {FLAVOR_TAGS.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFlavor(f)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                      weatherFlavors.includes(f)
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleLogWeather}
              className="w-full py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Record Weather
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Sales Timeline</h3>
            <SalesGraph run={activeRun} />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Timeline</h3>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {(() => {
                const events: { ts: string; type: 'sale' | 'weather'; data: any }[] = []
                for (const sale of activeRun.sales) {
                  events.push({ ts: sale.timestamp, type: 'sale', data: sale })
                }
                for (const wl of activeRun.weatherLogs) {
                  events.push({ ts: wl.timestamp, type: 'weather', data: wl })
                }
                events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
                if (events.length === 0) {
                  return <div className="text-center py-6 text-slate-400 text-xs">No events yet</div>
                }
                return events.slice(0, 40).map(ev => {
                  if (ev.type === 'sale') {
                    const sale = ev.data
                    return (
                      <div key={sale.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                            sale.customerProfile === 'R' ? 'bg-emerald-600' :
                            sale.customerProfile === 'P' ? 'bg-amber-600' :
                            sale.customerProfile === 'U' ? 'bg-violet-600' :
                            sale.customerProfile === 'A' ? 'bg-rose-600' :
                            'bg-slate-500'
                          }`}>
                            {sale.customerProfile}
                          </span>
                          <div className="min-w-0">
                            <div className="text-slate-600 dark:text-slate-400 truncate">
                              💰 {sale.items.map((i: any) => i.menuItemName).join(', ')}
                            </div>
                            <div className="text-[10px] text-slate-400">{formatTime(sale.timestamp)}</div>
                          </div>
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex-shrink-0 ml-2">{formatCurrency(sale.total)}</span>
                      </div>
                    )
                  } else {
                    const wl = ev.data as WeatherLog
                    const wc = WEATHER_CONDITIONS.find(w => w.value === wl.condition)
                    return (
                      <div key={wl.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 bg-sky-100 dark:bg-sky-900/30">
                            {wc?.icon || '\u2600\uFE0F'}
                          </span>
                          <div className="min-w-0">
                            <div className="text-slate-600 dark:text-slate-400 truncate">
                              🌤️ {wc?.label || wl.condition} · {wl.temperature}°C · {wl.humidity}%
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatTime(wl.timestamp)}
                              {wl.flavors && wl.flavors.length > 0 && (
                                <span className="ml-1 text-amber-500">· {wl.flavors.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2 flex gap-0.5">
                          {FLAVOR_TAGS.filter(f => wl.flavors?.includes(f)).slice(0, 3).map(f => (
                            <span key={f} className="text-[8px] px-1 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">{f}</span>
                          ))}
                        </div>
                      </div>
                    )
                  }
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {recentRuns.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Previous Runs</h3>
          <div className="space-y-1">
            {recentRuns.map(run => (
              <div key={run.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Day {run.dayNumber} - {run.date}</span>
                  {run.status === 'ended' && (
                    <span className="text-[10px] text-slate-400">(ended)</span>
                  )}
                </div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(calcTotal(run))} ({servingsCount(run)} serves)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
