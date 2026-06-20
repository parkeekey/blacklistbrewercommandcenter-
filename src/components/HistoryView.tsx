import { useState } from 'react'
import { useStore } from '../store'
import { formatCurrency, totalSales, servingsCount, formatTime, exportToCSV } from '../utils'
import type { CustomerProfile } from '../types'
import { CUSTOMER_PROFILES, NATIONALITIES } from '../types'

export default function HistoryView() {
  const { state, dispatch, removeRun } = useStore()
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [editingDayNumRunId, setEditingDayNumRunId] = useState<string | null>(null)
  const [editDayNumValue, setEditDayNumValue] = useState(0)
  const [editProfile, setEditProfile] = useState<CustomerProfile>('C')
  const [editNationality, setEditNationality] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editingDiffLogId, setEditingDiffLogId] = useState<string | null>(null)
  const [editDiffValue, setEditDiffValue] = useState('')
  const [editDiffNote, setEditDiffNote] = useState('')
  const [editingResistLogId, setEditingResistLogId] = useState<string | null>(null)
  const [editResistValue, setEditResistValue] = useState('')
  const [editResistNote, setEditResistNote] = useState('')
  const [editingDarkLogId, setEditingDarkLogId] = useState<string | null>(null)
  const [editDarkNote, setEditDarkNote] = useState('')

  const profileColors: Record<string, string> = {
    R: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    P: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    U: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    C: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
    A: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  }

  function logLines(run: { difficultyLogs?: { value: number; note: string; timestamp: string }[]; resistLogs?: { value: number; note: string; timestamp: string }[]; darkEventLogs?: { note: string; timestamp: string }[] }) {
    const lines: string[] = []
    if (run.difficultyLogs?.length) {
      lines.push('☠️ Difficulty:')
      run.difficultyLogs.forEach(l => lines.push(`  ${l.value} | ${l.note || '-'} | ${formatTime(l.timestamp)}`))
    }
    if (run.resistLogs?.length) {
      lines.push('✊ Resist:')
      run.resistLogs.forEach(l => lines.push(`  ${l.value} | ${l.note || '-'} | ${formatTime(l.timestamp)}`))
    }
    if (run.darkEventLogs?.length) {
      lines.push('💀 Dark Events:')
      run.darkEventLogs.forEach(l => lines.push(`  ${l.note} | ${formatTime(l.timestamp)}`))
    }
    return lines
  }

  function handleExportText(runId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const lines = [
      `#blacklistbrewer - Day ${run.dayNumber} - ${run.date}`,
      `${run.sales.length} sales · ${servingsCount(run)} serves · ${formatCurrency(totalSales(run))}`,
      '',
      ...(run.difficultyLogs?.length || run.resistLogs?.length || run.darkEventLogs?.length ? ['Operation Intel:', ...logLines(run), ''] : []),
      ...run.sales.map(s => {
        const items = s.items.map(i => `${i.menuItemName}x${i.quantity}`).join(', ')
        return `${s.id} | ${formatTime(s.timestamp)} | ${s.customerProfile} | ${s.nationality || '-'} | ${items} | ${formatCurrency(s.total)}`
      }),
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `centrolstock-run-${run.dayNumber}-${run.date}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportCSV(runId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const csv = exportToCSV(run)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `centrolstock-run-${run.dayNumber}-${run.date}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportJSON(runId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const data = {
      run: { dayNumber: run.dayNumber, date: run.date, startTime: run.startTime, endTime: run.endTime },
      operationIntel: { difficultyLogs: run.difficultyLogs, resistLogs: run.resistLogs, darkEventLogs: run.darkEventLogs },
      sales: run.sales,
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `centrolstock-run-${run.dayNumber}-${run.date}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportAllJSON() {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `centrolstock-full-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleSetActive(runId: string) {
    dispatch({ type: 'SET_ACTIVE_RUN', payload: runId })
  }

  function handleEditSale(runId: string, saleId: string) {
    const run = state.runs.find(r => r.id === runId)
    if (!run) return
    const sale = run.sales.find(s => s.id === saleId)
    if (!sale) return
    setEditProfile(sale.customerProfile)
    setEditNationality(sale.nationality)
    setEditNote(sale.note)
    setEditingSaleId(saleId)
  }

  function handleSaveEdit(runId: string) {
    dispatch({
      type: 'UPDATE_SALE',
      payload: {
        runId,
        saleId: editingSaleId!,
        updates: { customerProfile: editProfile, nationality: editNationality, note: editNote },
      },
    })
    setEditingSaleId(null)
  }

  function handleCancelEdit() {
    setEditingSaleId(null)
  }

  function handleDeleteSale(runId: string, saleId: string) {
    if (!window.confirm('Delete this sale record?')) return
    dispatch({ type: 'REMOVE_SALE', payload: { runId, saleId } })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">History</h2>
        <button
          onClick={handleExportAllJSON}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-sm font-semibold"
        >
          Export All JSON
        </button>
      </div>

      <div className="space-y-3">
        {[...state.runs].reverse().map(run => (
          <div key={run.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => { setExpandedRun(expandedRun === run.id ? null : run.id); setEditingSaleId(null) }}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">#blacklistbrewer - Day {run.dayNumber}</div>
                <div className="text-xs text-slate-400">{run.date} · {servingsCount(run)} serves</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalSales(run))}</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedRun === run.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedRun === run.id && (
              <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex gap-2 py-2 flex-wrap">
                  <button onClick={() => handleSetActive(run.id)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg">Set Active</button>
                  <button onClick={() => handleExportText(run.id)} className="text-xs px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">Export Text</button>
                  <button onClick={() => handleExportCSV(run.id)} className="text-xs px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">Export CSV</button>
                  <button onClick={() => handleExportJSON(run.id)} className="text-xs px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">Export JSON</button>
                  <button onClick={() => { if (window.confirm(`Delete Day ${run.dayNumber} (${run.date})? This cannot be undone.`)) { removeRun(run.id); setExpandedRun(null) } }} className="text-xs px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">Delete Day</button>
                </div>

                <div className="flex items-center gap-2 py-1.5 text-xs">
                  <span className="text-slate-400">Day</span>
                  {editingDayNumRunId === run.id ? (
                    <div className="flex items-center gap-1">
                      <input type="number" value={editDayNumValue} onChange={e => setEditDayNumValue(Number(e.target.value))} className="w-16 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" autoFocus />
                      <button onClick={() => { dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { dayNumber: editDayNumValue } } }); setEditingDayNumRunId(null) }} className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">OK</button>
                      <button onClick={() => setEditingDayNumRunId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">#{run.dayNumber}</span>
                      <button onClick={() => { setEditDayNumValue(run.dayNumber); setEditingDayNumRunId(run.id) }} className="text-[10px] text-blue-500 hover:underline">Edit</button>
                    </>
                  )}
                </div>

                {(run.difficultyLogs?.length || run.resistLogs?.length || run.darkEventLogs?.length) && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-2 pb-3 space-y-1">
                    <div className="text-[10px] text-slate-400 font-medium mb-1">Operation Intel</div>
                    {run.difficultyLogs?.map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs">
                        {editingDiffLogId === log.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input type="number" min={0} max={99} value={editDiffValue} onChange={e => setEditDiffValue(e.target.value)} className="w-10 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <input type="text" value={editDiffNote} onChange={e => setEditDiffNote(e.target.value)} className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" />
                            <button onClick={() => {
                              dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { difficultyLogs: run.difficultyLogs!.map(l => l.id === editingDiffLogId ? { ...l, value: Number(editDiffValue), note: editDiffNote } : l) } } })
                              setEditingDiffLogId(null)
                            }} className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">Save</button>
                            <button onClick={() => setEditingDiffLogId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-red-500 font-bold">☠️ {log.value}</span>
                            <span className="text-slate-500 truncate flex-1">{log.note || '-'}</span>
                            <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                            <button onClick={() => { setEditDiffValue(String(log.value)); setEditDiffNote(log.note); setEditingDiffLogId(log.id) }} className="text-[10px] text-blue-500 hover:underline">Edit</button>
                            <button onClick={() => { if (window.confirm('Delete this difficulty log?')) dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { difficultyLogs: run.difficultyLogs!.filter(l => l.id !== log.id) } } }) }} className="text-[10px] text-rose-500 hover:underline">Del</button>
                          </>
                        )}
                      </div>
                    ))}
                    {run.resistLogs?.map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs">
                        {editingResistLogId === log.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input type="number" min={0} max={99} value={editResistValue} onChange={e => setEditResistValue(e.target.value)} className="w-10 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <input type="text" value={editResistNote} onChange={e => setEditResistNote(e.target.value)} className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" />
                            <button onClick={() => {
                              dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { resistLogs: run.resistLogs!.map(l => l.id === editingResistLogId ? { ...l, value: Number(editResistValue), note: editResistNote } : l) } } })
                              setEditingResistLogId(null)
                            }} className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">Save</button>
                            <button onClick={() => setEditingResistLogId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-orange-500 font-bold">✊ {log.value}</span>
                            <span className="text-slate-500 truncate flex-1">{log.note || '-'}</span>
                            <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                            <button onClick={() => { setEditResistValue(String(log.value)); setEditResistNote(log.note); setEditingResistLogId(log.id) }} className="text-[10px] text-blue-500 hover:underline">Edit</button>
                            <button onClick={() => { if (window.confirm('Delete this resist log?')) dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { resistLogs: run.resistLogs!.filter(l => l.id !== log.id) } } }) }} className="text-[10px] text-rose-500 hover:underline">Del</button>
                          </>
                        )}
                      </div>
                    ))}
                    {run.darkEventLogs?.map(log => (
                      <div key={log.id} className="flex items-center gap-2 text-xs">
                        {editingDarkLogId === log.id ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input type="text" value={editDarkNote} onChange={e => setEditDarkNote(e.target.value)} className="flex-1 text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white" />
                            <button onClick={() => {
                              dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { darkEventLogs: run.darkEventLogs!.map(l => l.id === editingDarkLogId ? { ...l, note: editDarkNote } : l) } } })
                              setEditingDarkLogId(null)
                            }} className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">Save</button>
                            <button onClick={() => setEditingDarkLogId(null)} className="text-[10px] px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-slate-500">💀</span>
                            <span className="text-slate-500 truncate flex-1">{log.note}</span>
                            <span className="text-[10px] text-slate-400">{formatTime(log.timestamp)}</span>
                            <button onClick={() => { setEditDarkNote(log.note); setEditingDarkLogId(log.id) }} className="text-[10px] text-blue-500 hover:underline">Edit</button>
                            <button onClick={() => { if (window.confirm('Delete this dark event?')) dispatch({ type: 'UPDATE_RUN', payload: { runId: run.id, updates: { darkEventLogs: run.darkEventLogs!.filter(l => l.id !== log.id) } } }) }} className="text-[10px] text-rose-500 hover:underline">Del</button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-slate-400 mb-2">Sales ({run.sales.length})</div>

                {run.sales.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">No sales in this run</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                          <th className="text-left py-1 pr-2">#</th>
                          <th className="text-left py-1 pr-2">Time</th>
                          <th className="text-left py-1 pr-2">Items</th>
                          <th className="text-center py-1 pr-2 w-10">P</th>
                          <th className="text-left py-1 pr-2">Nationality</th>
                          <th className="text-left py-1 pr-2">Note</th>
                          <th className="text-right py-1 pr-2">Total</th>
                          <th className="text-center py-1 w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {run.sales.map((sale, i) => (
                          <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <td className="py-1.5 pr-2 text-slate-400 align-top">{i + 1}</td>
                            <td className="py-1.5 pr-2 text-slate-500 whitespace-nowrap align-top">{formatTime(sale.timestamp)}</td>
                            <td className="py-1.5 pr-2 text-slate-700 dark:text-slate-300 align-top">
                              {sale.items.map(it => `${it.menuItemName}x${it.quantity}`).join(', ')}
                            </td>
                            {editingSaleId === sale.id ? (
                              <>
                                <td className="py-1.5 pr-2 align-top">
                                  <select value={editProfile} onChange={e => setEditProfile(e.target.value as CustomerProfile)} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white w-14">
                                    {CUSTOMER_PROFILES.map(p => (
                                      <option key={p.value} value={p.value}>{p.value}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-1.5 pr-2 align-top">
                                  <select value={editNationality} onChange={e => setEditNationality(e.target.value)} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white w-20">
                                    {NATIONALITIES.map(n => (
                                      <option key={n} value={n}>{n}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-1.5 pr-2 align-top">
                                  <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 dark:text-white w-24" />
                                </td>
                                <td className="py-1.5 pr-2 text-right align-top font-medium text-slate-700 dark:text-slate-300">{formatCurrency(sale.total)}</td>
                                <td className="py-1.5 align-top">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleSaveEdit(run.id)} className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded">Save</button>
                                    <button onClick={handleCancelEdit} className="text-[10px] px-1.5 py-0.5 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded">X</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-1.5 pr-2 text-center align-top">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${profileColors[sale.customerProfile] || profileColors.C}`}>{sale.customerProfile}</span>
                                </td>
                                <td className="py-1.5 pr-2 text-slate-500 align-top">{sale.nationality || '-'}</td>
                                <td className="py-1.5 pr-2 text-slate-400 italic align-top max-w-[80px] truncate">{sale.note || '-'}</td>
                                <td className="py-1.5 pr-2 text-right align-top font-medium text-slate-700 dark:text-slate-300">{formatCurrency(sale.total)}</td>
                                <td className="py-1.5 align-top">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleEditSale(run.id, sale.id)} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Edit</button>
                                    <button onClick={() => handleDeleteSale(run.id, sale.id)} className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded">Del</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {state.runs.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No sales history yet. Start a run and make some sales.
          </div>
        )}
      </div>
    </div>
  )
}
