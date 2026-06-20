import { useState } from 'react'
import { useStore, StoreProvider } from './store'
import PosScreen from './components/PosScreen'
import Dashboard from './components/Dashboard'
import MenuManager from './components/MenuManager'
import InventoryView from './components/InventoryView'
import HistoryView from './components/HistoryView'
import LedgerView from './components/LedgerView'
import FinanceView from './components/FinanceView'
import CalendarView from './components/CalendarView'
import JsonDataManager from './components/JsonDataManager'

type Tab = 'pos' | 'dashboard' | 'finance' | 'menu' | 'more'
type MoreTab = 'history' | 'inventory' | 'ledger' | 'calendar' | 'json'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'pos', label: 'POS', icon: '💳' },
  { id: 'dashboard', label: 'Day', icon: '📊' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'menu', label: 'Menu', icon: '📋' },
  { id: 'more', label: 'More', icon: '⚙' },
]

function AppContent() {
  const [tab, setTab] = useState<Tab>('pos')
  const [moreTab, setMoreTab] = useState<MoreTab>('history')

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark')
    try { localStorage.setItem('centrolstock.theme', isDark ? 'dark' : 'light') } catch {}
  }

  function TestModeCard() {
    const { testMode, setTestMode, clearTestData } = useStore()
    return (
      <div className={`px-3 py-2 border-b ${testMode ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">🧪 Test Mode</span>
            {testMode && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-300 font-bold">ACTIVE</span>}
          </div>
          <div className="flex items-center gap-2">
            {testMode && (
              <button
                onClick={() => { if (confirm('Discard all test data?')) clearTestData() }}
                className="text-[10px] px-2 py-1 bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-300 rounded-lg font-semibold"
              >
                Clear Test Data
              </button>
            )}
            <button
              onClick={() => setTestMode(!testMode)}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                testMode
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {testMode ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
        {testMode && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">Test data is stored separately — real records are safe.</p>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          #blacklistbrewer
          <span className="flex items-center gap-1 text-[10px] font-normal text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Live
          </span>
        </h1>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm"
          title="Toggle theme"
        >
          🌙
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {tab === 'pos' && <PosScreen />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'finance' && <FinanceView />}
        {tab === 'menu' && <MenuManager />}
        {tab === 'more' && (
          <div>
            <TestModeCard />
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setMoreTab('history')}
                className={`flex-1 py-2 text-sm font-medium text-center ${
                  moreTab === 'history'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-400'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setMoreTab('inventory')}
                className={`flex-1 py-2 text-sm font-medium text-center ${
                  moreTab === 'inventory'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-400'
                }`}
              >
                Beans
              </button>
              <button
                onClick={() => setMoreTab('ledger')}
                className={`flex-1 py-2 text-sm font-medium text-center ${
                  moreTab === 'ledger'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-400'
                }`}
              >
                Ledger
              </button>
              <button
                onClick={() => setMoreTab('calendar')}
                className={`flex-1 py-2 text-sm font-medium text-center ${
                  moreTab === 'calendar'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-400'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setMoreTab('json')}
                className={`flex-1 py-2 text-sm font-medium text-center ${
                  moreTab === 'json'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-400'
                }`}
              >
                JSON
              </button>
            </div>
            {moreTab === 'history' && <HistoryView />}
            {moreTab === 'inventory' && <InventoryView />}
            {moreTab === 'ledger' && <LedgerView />}
            {moreTab === 'calendar' && <CalendarView />}
            {moreTab === 'json' && <JsonDataManager />}
          </div>
        )}
      </main>

      <nav className="flex-none bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="flex" style={{ flexWrap: 'nowrap' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
                tab === t.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  )
}
