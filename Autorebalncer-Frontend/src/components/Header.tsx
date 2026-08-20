import { Zap } from 'lucide-react';
import { ConnectButton } from './ConnectButton';

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Auto<span className="text-orange-500">Rebalance</span>
          </h1>
          <p className="text-xs text-gray-400 font-medium">AI Portfolio Rebalancing Agent</p>
        </div>
      </div>
      <ConnectButton />
    </header>
  );
}
