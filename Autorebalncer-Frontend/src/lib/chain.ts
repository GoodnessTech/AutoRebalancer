import { defineChain } from 'viem';

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://rpc.botchain.ai';
const EXPLORER_URL = import.meta.env.VITE_EXPLORER_URL || 'https://scan.botchain.ai';
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 677);
const IS_TESTNET = CHAIN_ID === 968;

export const botChain = defineChain({
  id: CHAIN_ID,
  name: IS_TESTNET ? 'BOT Chain Testnet' : 'BOT Chain Mainnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOT Chain Explorer',
      url: EXPLORER_URL,
    },
  },
  testnet: IS_TESTNET,
});

export const SUPPORTED_CHAIN_IDS = [CHAIN_ID];
export const EXPLORER_BASE_URL = EXPLORER_URL;
export const EXPLORER_TX_URL = `${EXPLORER_URL}/tx/`;
export const EXPLORER_ADDRESS_URL = `${EXPLORER_URL}/address/`;
