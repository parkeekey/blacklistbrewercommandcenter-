import { useState, useRef } from 'react'
import { useStore } from '../store'
import { generateSeedData } from '../seed-data'
import type { AppData } from '../types'

export default function JsonDataManager() {
  const { state, dispatch } = useStore()
  const [json, setJson] = useState(() => JSON.stringify(state, null, 2))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showSeed, setShowSeed] = useState(false)

  function handleEdit(value: string) {
    setJson(value)
    setError('')
    setSaved(false)
  }

  function handleSave() {
    try {
      const data = JSON.parse(json) as AppData
      if (!data.menu || !data.beans || !data.runs || !data.transactions) {
        setError('Invalid data structure — missing menu, beans, runs, or transactions')
        return
      }
      dispatch({ type: 'LOAD_DATA', payload: data })
      setSaved(true)
      setError('')
    } catch (e) {
      setError('Invalid JSON: ' + (e instanceof Error ? e.message : 'parse error'))
    }
  }

  function handleDownload() {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'centrolstock-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setJson(text)
      setError('')
      setSaved(false)
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function loadSeedData() {
    const seed = generateSeedData()
    setJson(JSON.stringify(seed, null, 2))
    setError('')
    setSaved(false)
    setShowSeed(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-none">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">📦 JSON Data Manager</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSeed(!showSeed)}
            className="text-[10px] px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold"
          >
            Seed
          </button>
          <button
            onClick={handleDownload}
            className="text-[10px] px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
          >
            Download
          </button>
          <label className="text-[10px] px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer">
            Upload
            <input ref={fileRef} type="file" accept=".json" onChange={handleUpload} className="hidden" />
          </label>
          <button
            onClick={handleSave}
            className="text-[10px] px-3 py-1 rounded-lg bg-blue-600 text-white font-bold"
          >
            Save
          </button>
        </div>
      </div>

      {showSeed && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex-none">
          <p className="text-[10px] text-amber-700 dark:text-amber-300 mb-1.5 font-medium">
            Load seed data with your 3 beans + menu items?
          </p>
          <div className="flex gap-2">
            <button onClick={loadSeedData} className="text-[10px] px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold">
              Yes, load seed data
            </button>
            <button onClick={() => setShowSeed(false)} className="text-[10px] px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] border-b border-rose-200 dark:border-rose-800 flex-none">
          {error}
        </div>
      )}

      {saved && (
        <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] border-b border-emerald-200 dark:border-emerald-800 flex-none">
          Data saved successfully ✓
        </div>
      )}

      <textarea
        value={json}
        onChange={e => handleEdit(e.target.value)}
        className="flex-1 w-full bg-slate-900 text-green-400 font-mono text-[11px] leading-relaxed p-3 resize-none border-0 outline-none"
        spellCheck={false}
      />
    </div>
  )
}
