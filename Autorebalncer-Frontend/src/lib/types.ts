export interface StatusResponse {
  success?: boolean;
  contractAddress?: string;
  ownerAddress?: string;
  accountAddress?: string;
  executorAddress?: string;
  targetAllocationBps: number;
  currentAllocationBps: number;
  driftBps: number;
  currentAllocation: { botPct: number; usdcPct: number };
  targetAllocation: { botPct: number; usdcPct: number };
  driftPct: number;
  balances: {
    bot: string;
    usdc: string;
    botFormatted?: string;
    usdcFormatted?: string;
  };
  tokenABalance?: string;
  tokenBBalance?: string;
  tokenABalanceRaw?: string;
  tokenBBalanceRaw?: string;
  maxTradeSizeWei?: string;
  maxTradeSizeFormatted?: string;
  priceAToB?: number;
  tokenAAddress?: string;
  tokenBAddress?: string;
}

export interface RebalanceResponse {
  success: boolean;
  executed: boolean;
  status: 'hold' | 'trade';
  reasoning: string;
  decision?: {
    action: 'sell_a_for_b' | 'sell_b_for_a' | 'hold';
    amountPercent: number;
    reasoning: string;
  };
  amountIn?: string;
  amountInFormatted?: string;
  txHash?: string;
  blockNumber?: number;
  explorerUrl?: string;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  status: 'hold' | 'trade';
  action?: 'sell_a_for_b' | 'sell_b_for_a' | 'hold';
  amountFormatted?: string;
  reasoning: string;
  txHash?: string;
  explorerUrl?: string;
}
