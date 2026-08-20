import { useState, useEffect } from 'react';
import {
  useAccount,
  useWriteContract,
  useReadContract,
  usePublicClient,
} from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import {
  Settings2,
  UserCheck,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  CONTRACTS,
  AutoRebalancerAbi,
  Erc20Abi,
  TOKEN_A_SYMBOL,
  TOKEN_B_SYMBOL,
  TOKEN_DECIMALS,
} from '@/lib/contracts';
import { EXPLORER_TX_URL } from '@/lib/chain';
import { toast } from './Toaster';

export function SetupSection() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const [targetPct, setTargetPct] = useState(50);
  const [maxTrade, setMaxTrade] = useState('100');
  const [executorAddr, setExecutorAddr] = useState<string>(CONTRACTS.defaultExecutor);
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [isUpdatingExecutor, setIsUpdatingExecutor] = useState(false);
  const [isApprovingA, setIsApprovingA] = useState(false);
  const [isApprovingB, setIsApprovingB] = useState(false);

  // Read config from AutoRebalancer smart contract
  const {
    data: contractConfig,
    refetch: refetchConfig,
  } = useReadContract({
    address: CONTRACTS.autoRebalancer,
    abi: AutoRebalancerAbi,
    functionName: 'getConfig',
    query: { enabled: !!address },
  });

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: CONTRACTS.autoRebalancer,
    abi: AutoRebalancerAbi,
    functionName: 'owner',
    query: { enabled: !!address },
  });

  // Read Token A allowance
  const {
    data: allowanceA,
    refetch: refetchAllowanceA,
  } = useReadContract({
    address: CONTRACTS.tokenA,
    abi: Erc20Abi,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.autoRebalancer] : undefined,
    query: { enabled: !!address },
  });

  // Read Token B allowance
  const {
    data: allowanceB,
    refetch: refetchAllowanceB,
  } = useReadContract({
    address: CONTRACTS.tokenB,
    abi: Erc20Abi,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.autoRebalancer] : undefined,
    query: { enabled: !!address },
  });

  // Sync state with on-chain values
  useEffect(() => {
    if (contractConfig && Array.isArray(contractConfig)) {
      const [targetBps, maxTradeWei, currentExec] = contractConfig as [
        bigint,
        bigint,
        string,
        string,
        string
      ];
      if (targetBps) {
        setTargetPct(Number(targetBps) / 100);
      }
      if (maxTradeWei) {
        try {
          const formatted = formatUnits(maxTradeWei, TOKEN_DECIMALS);
          setMaxTrade(parseFloat(formatted).toString());
        } catch {
          // keep existing
        }
      }
      if (currentExec && currentExec !== '0x0000000000000000000000000000000000000000') {
        setExecutorAddr(currentExec);
      }
    }
  }, [contractConfig]);

  const ownerString = typeof contractOwner === 'string' ? contractOwner : '';
  const isOwner =
    address && ownerString
      ? address.toLowerCase() === ownerString.toLowerCase()
      : true;

  const handleSetTarget = async () => {
    if (!address) return;
    setIsUpdatingTarget(true);
    try {
      const targetBps = BigInt(Math.round(targetPct * 100));
      const maxTradeWei = parseUnits(maxTrade || '100', TOKEN_DECIMALS);

      const hash = await writeContractAsync({
        address: CONTRACTS.autoRebalancer,
        abi: AutoRebalancerAbi,
        functionName: 'setTarget',
        args: [targetBps, maxTradeWei],
      });

      toast('info', `Target transaction submitted: ${hash.slice(0, 10)}...`);
      await publicClient?.waitForTransactionReceipt({ hash });
      toast('success', `Target set to ${targetPct}% ${TOKEN_A_SYMBOL} / Max trade: ${maxTrade} tokens`);
      await refetchConfig();
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch (err) {
      toast('error', `Failed to set target: ${(err as Error).message}`);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleSetExecutor = async () => {
    if (!address || !executorAddr) {
      toast('error', 'Please enter a valid executor address');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(executorAddr)) {
      toast('error', 'Invalid Ethereum address format');
      return;
    }
    setIsUpdatingExecutor(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.autoRebalancer,
        abi: AutoRebalancerAbi,
        functionName: 'setExecutor',
        args: [executorAddr as `0x${string}`],
      });
      toast('info', `Executor transaction submitted: ${hash.slice(0, 10)}...`);
      await publicClient?.waitForTransactionReceipt({ hash });
      toast('success', `Executor authorized: ${executorAddr.slice(0, 8)}...`);
      await refetchConfig();
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch (err) {
      toast('error', `Failed to set executor: ${(err as Error).message}`);
    } finally {
      setIsUpdatingExecutor(false);
    }
  };

  const handleApprove = async (token: 'A' | 'B') => {
    if (!address) return;
    const tokenAddr = token === 'A' ? CONTRACTS.tokenA : CONTRACTS.tokenB;
    const symbol = token === 'A' ? TOKEN_A_SYMBOL : TOKEN_B_SYMBOL;
    const setIsApproving = token === 'A' ? setIsApprovingA : setIsApprovingB;

    setIsApproving(true);
    try {
      const hash = await writeContractAsync({
        address: tokenAddr,
        abi: Erc20Abi,
        functionName: 'approve',
        args: [CONTRACTS.autoRebalancer, maxUint256],
      });
      toast('info', `Approving ${symbol} spend: ${hash.slice(0, 10)}...`);
      await publicClient?.waitForTransactionReceipt({ hash });
      toast('success', `${symbol} approved for AutoRebalancer contract!`);
      if (token === 'A') await refetchAllowanceA();
      else await refetchAllowanceB();
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch (err) {
      toast('error', `Failed to approve ${symbol}: ${(err as Error).message}`);
    } finally {
      setIsApproving(false);
    }
  };

  if (!address) return null;

  const hasAllowanceA = allowanceA ? (allowanceA as bigint) > 0n : false;
  const hasAllowanceB = allowanceB ? (allowanceB as bigint) > 0n : false;
  const onChainExec = contractConfig ? (contractConfig as any)[2] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Contract Configuration</h2>
            <p className="text-xs text-gray-400">On-chain parameters &amp; permissions</p>
          </div>
        </div>
        {ownerString && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isOwner
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {isOwner ? 'Owner Connected' : 'Viewer Mode'}
          </span>
        )}
      </div>

      {!isOwner && ownerString && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            Connected wallet is not contract owner (Owner: {ownerString.slice(0, 6)}...{ownerString.slice(-4)}). Target configuration transactions require the owner wallet.
          </span>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Target Allocation Slider */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-3">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-orange-500" />
              Target Allocation ({TOKEN_A_SYMBOL})
            </span>
            <span className="text-orange-600 font-bold">{targetPct}%</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={targetPct}
              onChange={(e) => setTargetPct(Number(e.target.value))}
              className="flex-1 h-2.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, #f97316 ${targetPct}%, #e5e7eb ${targetPct}%)`,
              }}
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={targetPct}
                onChange={(e) => {
                  const v = Math.min(100, Math.max(0, Number(e.target.value)));
                  setTargetPct(v);
                }}
                className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-orange-500"
              />
              <span className="text-sm text-gray-400 font-medium">%</span>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
            <span>{targetPct}% {TOKEN_A_SYMBOL}</span>
            <span>{100 - targetPct}% {TOKEN_B_SYMBOL}</span>
          </div>

          {/* Max trade size */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Max Single Trade Cap Limit (Tokens)
            </label>
            <input
              type="text"
              value={maxTrade}
              onChange={(e) => setMaxTrade(e.target.value)}
              placeholder="100"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-800 font-mono focus:outline-none focus:border-orange-500 shadow-sm"
            />
          </div>

          <button
            onClick={handleSetTarget}
            disabled={isUpdatingTarget}
            className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isUpdatingTarget ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming on-chain...</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>Update Target &amp; Trade Cap</span>
              </>
            )}
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Executor Authorization */}
        <div>
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-orange-500" />
              Authorized AI Executor
            </span>
          </label>
          <p className="text-xs text-gray-400 mb-2.5">
            The off-chain service wallet authorized to execute rebalance trades within the trade cap.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              value={executorAddr}
              onChange={(e) => setExecutorAddr(e.target.value)}
              placeholder="0x..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-800 focus:outline-none focus:border-orange-500 shadow-sm"
            />
            {onChainExec && onChainExec !== '0x0000000000000000000000000000000000000000' && (
              <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-100">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Active on contract: {String(onChainExec).slice(0, 10)}...{String(onChainExec).slice(-6)}
                </span>
                <a
                  href={`${EXPLORER_TX_URL.replace('/tx/', '/address/')}${onChainExec}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline flex items-center gap-0.5"
                >
                  Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
          <button
            onClick={handleSetExecutor}
            disabled={isUpdatingExecutor}
            className="w-full mt-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isUpdatingExecutor ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing on-chain...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Authorize Executor</span>
              </>
            )}
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Token Approvals */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            Token Spend Approvals
          </label>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            The AutoRebalancer contract requires token spending allowance from your wallet to execute trades.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleApprove('A')}
              disabled={isApprovingA}
              className={`border-2 py-2.5 px-3 rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-1.5 ${
                hasAllowanceA
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              {isApprovingA ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasAllowanceA ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : null}
              <span>{hasAllowanceA ? `${TOKEN_A_SYMBOL} Approved` : `Approve ${TOKEN_A_SYMBOL}`}</span>
            </button>

            <button
              onClick={() => handleApprove('B')}
              disabled={isApprovingB}
              className={`border-2 py-2.5 px-3 rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-1.5 ${
                hasAllowanceB
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isApprovingB ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasAllowanceB ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : null}
              <span>{hasAllowanceB ? `${TOKEN_B_SYMBOL} Approved` : `Approve ${TOKEN_B_SYMBOL}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
