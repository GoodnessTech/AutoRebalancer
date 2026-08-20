import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { AlertTriangle } from 'lucide-react';
import { botChain } from '@/lib/chain';

export function WrongNetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === botChain.id) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-red-800">Wrong Network Connected</p>
        <p className="text-sm text-red-600">
          AutoRebalance requires the {botChain.name}. Switch to continue.
        </p>
      </div>
      <button
        onClick={() => switchChain({ chainId: botChain.id })}
        disabled={isPending}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {isPending ? 'Switching...' : 'Switch Network'}
      </button>
    </div>
  );
}
