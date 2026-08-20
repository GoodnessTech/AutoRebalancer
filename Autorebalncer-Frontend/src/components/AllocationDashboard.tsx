import { TrendingUp, Target, Gauge, Coins, ShieldAlert, Cpu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { fetchStatus } from '@/lib/backend';
import { formatPct, formatTokenAmount } from '@/lib/format';
import { TOKEN_A_SYMBOL, TOKEN_B_SYMBOL, TOKEN_DECIMALS } from '@/lib/contracts';

export function AllocationDashboard() {
  const { address } = useAccount();
  const enabled = !!address;

  const { data: status, isLoading, isError, error } = useQuery({
    queryKey: ['status', address],
    queryFn: () => fetchStatus(address),
    refetchInterval: 15000,
    enabled,
  });

  if (!enabled) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <Gauge className="w-7 h-7 text-orange-400" />
        </div>
        <h3 className="font-semibold text-gray-700 mb-1">Wallet Not Connected</h3>
        <p className="text-sm text-gray-400">
          Connect your wallet to view live portfolio allocation and automated rebalancing stats.
        </p>
      </div>
    );
  }

  const botPct = status?.currentAllocation?.botPct ?? 0;
  const usdcPct = status?.currentAllocation?.usdcPct ?? 0;
  const targetBotPct = status?.targetAllocation?.botPct ?? 50;
  const drift = status?.driftPct ?? 0;
  const absDrift = Math.abs(drift);

  const balA = status?.tokenABalance || (status?.balances?.bot ? formatTokenAmount(status.balances.bot, TOKEN_DECIMALS) : '0.0000');
  const balB = status?.tokenBBalance || (status?.balances?.usdc ? formatTokenAmount(status.balances.usdc, TOKEN_DECIMALS) : '0.0000');
  const maxTradeCap = status?.maxTradeSizeFormatted || '100.0';

  return (
    <div className="bg-white rounded-2xl border-2 border-orange-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Allocation Dashboard</h2>
            <p className="text-xs text-gray-400">Live on-chain token ratio &amp; drift</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isError
                ? 'bg-red-400'
                : isLoading
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-green-400'
            }`}
          />
          {isError
            ? 'Backend offline'
            : isLoading
            ? 'Fetching status...'
            : 'Live · 15s poll'}
        </span>
      </div>

      {isError && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-600 font-medium">
          <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>Could not reach backend service: {(error as Error)?.message || 'Connection refused'}</span>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Current vs Target comparison bar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Current Token Allocation</span>
            <span className="text-sm text-gray-500">
              Target:{' '}
              <span className="font-bold text-orange-600">
                {formatPct(targetBotPct)} {TOKEN_A_SYMBOL} / {formatPct(100 - targetBotPct)} {TOKEN_B_SYMBOL}
              </span>
            </span>
          </div>
          <div className="relative h-9 rounded-xl overflow-hidden bg-gray-100 flex shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-700 shadow-sm"
              style={{ width: `${Math.max(0, Math.min(100, botPct))}%` }}
            >
              {botPct >= 12 ? `${TOKEN_A_SYMBOL} ${formatPct(botPct)}` : ''}
            </div>
            <div
              className="h-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, usdcPct))}%` }}
            >
              {usdcPct >= 12 ? `${TOKEN_B_SYMBOL} ${formatPct(usdcPct)}` : ''}
            </div>
            {/* Target marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-950 z-10 pointer-events-none"
              style={{ left: `${Math.max(0, Math.min(100, targetBotPct))}%` }}
              title={`Target: ${formatPct(targetBotPct)} ${TOKEN_A_SYMBOL}`}
            >
              <div className="absolute -top-1 -translate-x-1/2 left-0 w-3 h-3 bg-gray-950 rotate-45 rounded-xs" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-gray-500" />
              <span>Marker indicates on-chain target ratio</span>
            </div>
            <span className="font-mono">
              Drift: <span className={absDrift > 2 ? 'font-semibold text-orange-600' : 'font-semibold text-green-600'}>
                {drift > 0 ? `+${formatPct(drift)}` : formatPct(drift)}
              </span>
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Current Drift"
            value={absDrift > 0 ? (drift > 0 ? `+${formatPct(drift)}` : formatPct(drift)) : '0.0%'}
            icon={<Gauge className="w-4 h-4" />}
            accent={absDrift > 5 ? 'orange' : 'green'}
            subtext={absDrift > 5 ? 'Rebalance recommended' : 'Balanced'}
          />
          <StatCard
            label="Target BOT"
            value={formatPct(targetBotPct)}
            icon={<Target className="w-4 h-4" />}
            accent="neutral"
            subtext={`${formatPct(100 - targetBotPct)} ${TOKEN_B_SYMBOL}`}
          />
          <StatCard
            label={`${TOKEN_A_SYMBOL} Balance`}
            value={balA}
            icon={<Coins className="w-4 h-4" />}
            accent="orange"
            subtext={TOKEN_A_SYMBOL}
          />
          <StatCard
            label={`${TOKEN_B_SYMBOL} Balance`}
            value={balB}
            icon={<Coins className="w-4 h-4" />}
            accent="neutral"
            subtext={TOKEN_B_SYMBOL}
          />
        </div>

        {/* Additional Telemetry info */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <Cpu className="w-4 h-4 text-orange-500" />
            <span>Max Trade Limit Cap:</span>
            <span className="font-semibold text-gray-800">{maxTradeCap} tokens</span>
          </div>
          {status?.executorAddress && (
            <div className="text-gray-500 font-mono">
              Executor: {status.executorAddress.slice(0, 8)}...{status.executorAddress.slice(-6)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: 'orange' | 'green' | 'neutral';
  subtext?: string;
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    neutral: 'bg-gray-50 text-gray-600',
  };
  return (
    <div className="rounded-xl border border-gray-100 p-3 bg-white hover:border-orange-200 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors[accent]}`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-800 tabular-nums">{value}</p>
      {subtext && <p className="text-[11px] text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}
