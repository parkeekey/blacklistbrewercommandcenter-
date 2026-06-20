import { useState } from 'react'
import { useStore } from '../store'
import type { DayRun } from '../types'

interface Props {
  runId: string
  compact?: boolean
  run?: DayRun
}

export default function EndDayButton({ runId, compact, run }: Props) {
  const { endRun } = useStore()
  const [confirming, setConfirming] = useState(false)

  function handleEnd() {
    endRun(runId)
    setConfirming(false)
  }

  const diffLogs = run?.difficultyLogs || []
  const resistLogs = run?.resistLogs || []
  const darkLogs = run?.darkEventLogs || []
  const latestDiff = diffLogs.length > 0 ? diffLogs.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b) : null
  const latestResist = resistLogs.length > 0 ? resistLogs.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b) : null

  if (compact) {
    if (confirming) {
      return (
        <div className="flex flex-col gap-2">
          {(latestDiff || latestResist || darkLogs.length > 0) && (
            <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-xl px-3 py-2 text-xs space-y-1">
              {latestDiff && <div className="flex items-center gap-2"><span className="text-red-600 font-bold">☠️ {latestDiff.value}</span><span className="text-slate-500 truncate">{latestDiff.note}</span></div>}
              {latestResist && <div className="flex items-center gap-2"><span className="text-orange-600 font-bold">✊ {latestResist.value}</span><span className="text-slate-500 truncate">{latestResist.note}</span></div>}
              {darkLogs.length > 0 && <div className="text-slate-500 truncate">💀 {darkLogs[darkLogs.length - 1].note}</div>}
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={handleEnd}
              className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-transform shadow-lg shadow-rose-600/20"
            >
              YES, End Day
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }
    return (
      <button
        onClick={() => setConfirming(true)}
        className="py-3 px-4 bg-rose-600 text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition-transform shadow-lg shadow-rose-600/20 whitespace-nowrap"
      >
        END DAY
      </button>
    )
  }

  return (
    <div>
      {confirming ? (
        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 border-2 border-rose-300 dark:border-rose-700">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-2">
            End this day? You can resume it later.
          </p>
          {(latestDiff || latestResist || darkLogs.length > 0) && (
            <div className="mb-3 text-xs space-y-1 bg-white/50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
              {latestDiff && <div className="flex items-center gap-2"><span className="text-red-600 font-bold">☠️ {latestDiff.value}</span><span className="text-slate-500 truncate">{latestDiff.note}</span></div>}
              {latestResist && <div className="flex items-center gap-2"><span className="text-orange-600 font-bold">✊ {latestResist.value}</span><span className="text-slate-500 truncate">{latestResist.note}</span></div>}
              {darkLogs.length > 0 && <div className="text-slate-500 truncate">💀 {darkLogs[darkLogs.length - 1].note}</div>}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleEnd} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold active:scale-[0.98]">End Day</button>
            <button onClick={() => setConfirming(false)} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl font-bold">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform shadow-lg shadow-rose-600/30"
        >
          END DAY
        </button>
      )}
    </div>
  )
}
