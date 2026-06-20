import { useState } from 'react'
import { useStore } from '../store'
import { formatCurrency } from '../utils'

export default function LedgerView() {
  const { state, getAllTransactions, getBeanCostSummary, getBeanStock } = useStore()
  const [filter, setFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const allTxns = getAllTransactions()
  const beans = state.beans

  const filteredTxns = allTxns.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (filter !== 'all' && t.beanId !== filter) return false
    return true
  })

  const summaryByBean = beans.map(b => ({
    ...b,
    stock: getBeanStock(b.id),
    cost: getBeanCostSummary(b.id),
  }))

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ledger</h2>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Cost Summary by Bean</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 pr-2">Bean</th>
                <th className="text-right px-2">Stock</th>
                <th className="text-right px-2">Invested</th>
                <th className="text-right px-2">Avg/g</th>
                <th className="text-right px-2">FIFO/g</th>
                <th className="text-right px-2">LIFO/g</th>
              </tr>
            </thead>
            <tbody>
              {summaryByBean.map(b => (
                <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <td className="py-2 pr-2 font-medium text-slate-700 dark:text-slate-300">{b.name}</td>
                  <td className={`text-right px-2 ${b.stock <= 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{b.stock}g</td>
                  <td className="text-right px-2 text-slate-600 dark:text-slate-400">{formatCurrency(b.cost.totalInvested)}</td>
                  <td className="text-right px-2 text-slate-600 dark:text-slate-400">{b.cost.avgCostPerGram.toFixed(2)}</td>
                  <td className="text-right px-2 text-slate-600 dark:text-slate-400">{b.cost.fifoCostPerGram.toFixed(2)}</td>
                  <td className="text-right px-2 text-slate-600 dark:text-slate-400">{b.cost.lifoCostPerGram.toFixed(2)}</td>
                </tr>
              ))}
              {summaryByBean.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-slate-400">No beans</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs dark:text-white">
          <option value="all">All Beans</option>
          {beans.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs dark:text-white">
          <option value="all">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="usage">Usage</option>
          <option value="spoilage">Spoilage</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="p-3 border-b border-slate-100 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-500">Transaction Log ({filteredTxns.length})</span>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {filteredTxns.map(tx => (
            <div key={tx.id} className="px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                  tx.type === 'purchase' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                  tx.type === 'usage' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  tx.type === 'spoilage' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                  'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>{tx.type}</span>
                <div className="min-w-0">
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate">{tx.beanName}</div>
                  <div className="text-[10px] text-slate-400">{tx.date} {tx.note && <span>· {tx.note}</span>}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-medium ${tx.quantity > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {tx.quantity > 0 ? '+' : ''}{tx.quantity}g
                </span>
                {tx.costPerGram > 0 && (
                  <span className="text-[10px] text-slate-400">{tx.costPerGram.toFixed(2)}/g</span>
                )}
              </div>
            </div>
          ))}
          {filteredTxns.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">No transactions match the filter</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">What's FIFO / LIFO?</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>FIFO</strong> (First In, First Out): The oldest bean purchases are used first when calculating cost. Best for fresh inventory that degrades over time.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          <strong>LIFO</strong> (Last In, First Out): The newest bean purchases are used first. Reflects current market replacement cost.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          Compare both to see how your cost of goods sold changes depending on which batch you draw from.
        </p>
      </div>
    </div>
  )
}
