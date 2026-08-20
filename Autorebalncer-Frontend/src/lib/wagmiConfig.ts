import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { botChain } from './chain';

export const config = createConfig({
  chains: [botChain],
  connectors: [injected()],
  ssr: false,
  transports: {
    [botChain.id]: http(botChain.rpcUrls.default.http[0]),
  },
});
