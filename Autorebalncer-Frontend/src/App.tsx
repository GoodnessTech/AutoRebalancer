import { useState } from 'react';
import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { WrongNetworkBanner } from '@/components/WrongNetworkBanner';
import { AllocationDashboard } from '@/components/AllocationDashboard';
import { SetupSection } from '@/components/SetupSection';
import { PrimaryAction } from '@/components/PrimaryAction';
import { DecisionHistory } from '@/components/DecisionHistory';
import { Toaster } from '@/components/Toaster';
import type { HistoryEntry } from '@/lib/types';

function App() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const addHistory = (entry: HistoryEntry) => {
    setHistory((current) => [entry, ...current]);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <WrongNetworkBanner />

        <section className="mb-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-orange-700">
              <Bot className="h-3.5 w-3.5" />
              Autonomous portfolio agent
            </div>
            <h2 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-gray-950 sm:text-5xl">
              Let AI keep your portfolio{' '}
              <span className="text-orange-500">in balance.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-gray-500 sm:text-lg">
              AutoRebalance monitors your allocation, evaluates drift, and coordinates transparent on-chain decisions on BOT Chain.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gray-900 p-2.5 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Non-custodial by design</p>
                <p className="mt-1 text-sm leading-6 text-gray-500">You control targets, approvals, and execution permissions from your wallet.</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-orange-500" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <AllocationDashboard />
            <PrimaryAction onResult={addHistory} />
          </div>
          <div className="space-y-6">
            <SetupSection />
            <DecisionHistory entries={history} />
          </div>
        </div>

        <footer className="mt-12 flex flex-col gap-2 border-t border-gray-200 pt-5 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <span>AutoRebalance · BOT Chain Testnet</span>
          <span>AI decisions are presented for demonstration purposes.</span>
        </footer>
      </main>
      <Toaster />
    </div>
  );
}

export default App;
