import { History, TrendingUp, Pause, ExternalLink, Inbox } from 'lucide-react';
import { EXPLORER_TX_URL } from '@/lib/chain';
import { formatTimestamp } from '@/lib/format';
import type { HistoryEntry } from '@/lib/types';

interface DecisionHistoryProps {
  entries: HistoryEntry[];
}

export function DecisionHistory({ entries }: DecisionHistoryProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <History className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Session Decision History</h2>
            <p className="text-xs text-gray-400">Audit log of AI evaluations &amp; trades</p>
          </div>
        </div>
        {entries.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {entries.length} {entries.length === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">No session decisions yet</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Trigger an AI rebalance check above to generate real-time evaluations and on-chain logs.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="px-6 py-4 hover:bg-orange-50/20 transition-colors">
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    entry.status === 'trade'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {entry.status === 'trade' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        entry.status === 'trade'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {entry.status === 'trade' ? 'EXECUTED' : 'HOLD'}
                    </span>
                    {entry.amountFormatted && (
                      <span className="text-xs font-mono font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                        {entry.amountFormatted} tokens
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-2 font-normal">
                    {entry.reasoning}
                  </p>
                  {entry.txHash && (
                    <a
                      href={entry.explorerUrl || `${EXPLORER_TX_URL}${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold"
                    >
                      <span>View on Explorer ({entry.txHash.slice(0, 8)}...{entry.txHash.slice(-6)})</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
