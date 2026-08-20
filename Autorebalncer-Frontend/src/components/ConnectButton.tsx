import { useAccount, useConnect, useDisconnect, useChainId, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { Wallet, LogOut, ChevronDown, ExternalLink, Copy, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { botChain, EXPLORER_ADDRESS_URL } from '@/lib/chain';
import { toast } from './Toaster';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({
    address,
    chainId: botChain.id,
    query: { enabled: !!address },
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showWallets, setShowWallets] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowWallets(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast('info', 'Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isWrongNetwork = isConnected && chainId !== botChain.id;

  if (!isConnected) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setShowWallets(!showWallets)}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <Wallet className="w-4 h-4" />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        {showWallets && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {connectors.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No injected wallet found. Please install MetaMask or another Web3 wallet.
              </div>
            ) : (
              connectors.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => {
                    connect({ connector: c });
                    setShowWallets(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">Injected EVM Provider</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const formattedBalance = balanceData
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)).toFixed(3)
    : null;

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      {balanceData && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 border border-gray-200">
          <span>{formattedBalance}</span>
          <span className="text-orange-600 font-bold">{balanceData.symbol}</span>
        </div>
      )}

      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md border ${
          isWrongNetwork
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-white text-gray-800 border-gray-200 hover:border-orange-300'
        }`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${isWrongNetwork ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}
        />
        <span className="text-sm font-mono">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Connected Account</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs font-mono text-gray-800 truncate mr-2">{address}</p>
              <button
                onClick={copyAddress}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 text-xs">
              <span className="text-gray-400">Network:</span>
              <span className={`font-semibold ${isWrongNetwork ? 'text-red-500' : 'text-green-600'}`}>
                {isWrongNetwork ? 'Wrong Network' : botChain.name}
              </span>
            </div>
            {address && (
              <a
                href={`${EXPLORER_ADDRESS_URL}${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 mt-2 font-medium"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <button
            onClick={() => {
              disconnect();
              setShowMenu(false);
              toast('info', 'Wallet disconnected');
            }}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm font-medium text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
