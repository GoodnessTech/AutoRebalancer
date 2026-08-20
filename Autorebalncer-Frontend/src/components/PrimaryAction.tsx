import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  Brain,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  ArrowRightLeft,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { checkRebalance } from '@/lib/backend';
import { EXPLORER_TX_URL } from '@/lib/chain';
import { TOKEN_A_SYMBOL, TOKEN_B_SYMBOL } from '@/lib/contracts';
import type { HistoryEntry, RebalanceResponse } from '@/lib/types';
import { toast } from './Toaster';

interface PrimaryActionProps {
  onResult: (entry: HistoryEntry) => void;
}

export function PrimaryAction({ onResult }: PrimaryActionProps) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RebalanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      toast('info', 'Consulting Gemini AI portfolio engine...');
      const res = await checkRebalance(address);
      setResult(res);

      if (res.status === 'trade' && res.txHash) {
        toast('success', `Rebalance trade executed on-chain! Tx: ${res.txHash.slice(0, 8)}...`);
      } else {
        toast('info', 'AI evaluation complete: Portfolio within balance tolerance.');
      }

      onResult({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        status: res.status,
        action: res.decision?.action,
        amountFormatted: res.amountInFormatted,
        reasoning: res.reasoning,
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
      });

      // Refetch allocation and balances
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch (err) {
      const msg = (err as Error).message || 'Unknown error occurred during rebalance check';
      setError(msg);
      toast('error', `Rebalance check failed: ${msg}`);
      onResult({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        status: 'hold',
        reasoning: `Execution Error: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl border-2 border-orange-200 shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-orange-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Wallet Not Connected</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Connect your wallet to BOT Chain Mainnet to run the autonomous AI rebalancing agent.
        </p>
      </div>
    );
  }

  const isTrade = result?.status === 'trade' || result?.executed;
  const actionText =
    result?.decision?.action === 'sell_a_for_b'
      ? `Sell ${TOKEN_A_SYMBOL} for ${TOKEN_B_SYMBOL}`
      : result?.decision?.action === 'sell_b_for_a'
      ? `Sell ${TOKEN_B_SYMBOL} for ${TOKEN_A_SYMBOL}`
      : 'Hold (No Trade)';

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50/40 rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden">
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Autonomous Rebalancer</h2>
        <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto">
          Google Gemini AI evaluates real-time token drift, calculates optimal trade sizes within your cap limit, and executes signed rebalance transactions on-chain.
        </p>

        <button
          onClick={handleCheck}
          disabled={loading}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base sm:text-lg px-8 py-4 rounded-2xl transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Drift &amp; Consulting AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Trigger AI Rebalance Check</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-6 max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-left">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && !loading && (
        <div className="mx-6 mb-6">
          <div
            className={`rounded-2xl border-2 overflow-hidden shadow-sm ${
              isTrade ? 'border-orange-300 bg-white' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div
              className={`px-5 py-3.5 flex items-center justify-between ${
                isTrade
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isTrade ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                <span className="font-bold text-sm sm:text-base">
                  {isTrade ? 'Rebalance Trade Executed On-Chain' : 'Portfolio In Balance — No Trade Required'}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isTrade ? 'bg-white/25 text-white' : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                {isTrade ? 'EXECUTED' : 'HOLD'}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Action summary badge */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-gray-500">Action:</span>
                <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800">
                  <ArrowRightLeft className="w-3 h-3" />
                  {actionText}
                </span>
                {result.amountInFormatted && (
                  <span className="font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">
                    Amount: {result.amountInFormatted} tokens
                  </span>
                )}
              </div>

              {/* AI Reasoning */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Brain className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                    Gemini AI Reasoning
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-800 leading-relaxed bg-orange-50/60 rounded-xl p-3.5 border border-orange-100 font-normal">
                  {result.reasoning}
                </p>
              </div>

              {/* Transaction Link */}
              {result.txHash && (
                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Confirmed in Block {result.blockNumber || 'latest'}</span>
                  </div>
                  <a
                    href={result.explorerUrl || `${EXPLORER_TX_URL}${result.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <span>View on BOT Chain Explorer ({result.txHash.slice(0, 6)}...{result.txHash.slice(-4)})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
