import AutoRebalancerAbi from '@/abis/AutoRebalancer.json';
import Erc20Abi from '@/abis/ERC20.json';

export const CONTRACTS = {
  autoRebalancer: (import.meta.env.VITE_CONTRACT_ADDRESS ||
    '0x1672fBF0E2322e8662D2242C1aC10DAB37D11223') as `0x${string}`,
  tokenA: (import.meta.env.VITE_TOKEN_A_ADDRESS ||
    '0x546307af427902A75771434Df831d88219784E19') as `0x${string}`,
  tokenB: (import.meta.env.VITE_TOKEN_B_ADDRESS ||
    '0xef8DC669ECa13E612b67Ff09478352E85bD6CC53') as `0x${string}`,
  defaultExecutor: (import.meta.env.VITE_EXECUTOR_ADDRESS ||
    '0xE9a1AABA8061dbcec156Fef994c476e9F91D9B6d') as `0x${string}`,
};

export const TOKEN_A_SYMBOL = import.meta.env.VITE_TOKEN_A_SYMBOL || 'BOT';
export const TOKEN_B_SYMBOL = import.meta.env.VITE_TOKEN_B_SYMBOL || 'USDC';
export const TOKEN_DECIMALS = 18;

export { AutoRebalancerAbi, Erc20Abi };
