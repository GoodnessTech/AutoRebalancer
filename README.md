# AutoRebalancer — Full-Stack AI Portfolio Rebalancer

**AutoRebalancer** is a complete, production-ready decentralized application (dApp) consisting of an EVM-compatible smart contract deployed on **BOT Chain Mainnet** (**Chain ID 677**), an automated **Google Gemini AI** rebalancing engine, an Express.js backend, and a modern React + Wagmi frontend.

---

## 🌐 Deployed Smart Contracts & Infrastructure (BOT Chain Mainnet)

- **Network Name**: BOT Chain Mainnet
- **Chain ID**: `677`
- **RPC Endpoint**: `https://rpc.botchain.ai`
- **Block Explorer**: `https://scan.botchain.ai`
- **AutoRebalancer Mainnet Contract**: [`0x1672fBF0E2322e8662D2242C1aC10DAB37D11223`](https://scan.botchain.ai/address/0x1672fBF0E2322e8662D2242C1aC10DAB37D11223)
- **Token A (BOT / CA)**: [`0x546307af427902A75771434Df831d88219784E19`](https://scan.botchain.ai/address/0x546307af427902A75771434Df831d88219784E19)
- **Token B (USDC / USDT)**: [`0xef8DC669ECa13E612b67Ff09478352E85bD6CC53`](https://scan.botchain.ai/address/0xef8DC669ECa13E612b67Ff09478352E85bD6CC53)
- **DEX Router**: [`0x143b0Cf8A34B7bFD794d64e0E565155f0904902B`](https://scan.botchain.ai/address/0x143b0Cf8A34B7bFD794d64e0E565155f0904902B)
- **Authorized Executor Wallet**: `0xE9a1AABA8061dbcec156Fef994c476e9F91D9B6d`

---

## 🏗️ Architecture & Features

1. **On-Chain Risk Controls (`AutoRebalancer.sol`)**:
   - **Target Allocation**: Owner configures target ratio (e.g. 50% BOT / 50% USDC).
   - **Trade Size Cap**: Strict ceiling preventing any single rebalance from trading more than the permitted token amount.
   - **Executor Role**: Restricted authorization allowing only the designated AI backend service to execute trades.
   - **Transparent Audit Trail**: Every executed trade logs the full AI reasoning string directly on-chain in the `Rebalanced` event.

2. **AI Decision Engine (`server.js`)**:
   - Analyzes real-time portfolio weights, price feeds, and drift against target tolerances.
   - Uses Google Gemini AI (`gemini-3.6-flash`) to generate structured reasoning and trade instructions.
   - Signs and broadcasts `executeRebalance` transactions via the authorized executor wallet.

3. **Modern Web Interface (`Autorebalncer-Frontend/`)**:
   - Built with React, TypeScript, Vite, Tailwind CSS, Wagmi v2, and TanStack Query.
   - Real-time on-chain telemetry, interactive target allocation slider, token spend approval controls, and decision history feed.

---

## 🏃 Local Development

### 1. Install Dependencies
```bash
# Root & Backend dependencies
npm install

# Frontend dependencies
npm --prefix Autorebalncer-Frontend install
```

### 2. Environment Setup
```bash
# Backend environment
cp .env.example .env

# Frontend environment
cp Autorebalncer-Frontend/.env.example Autorebalncer-Frontend/.env
```

### 3. Start Backend & Frontend
```bash
# Start backend (Port 3001)
npm start

# Start frontend (Port 5173)
npm run dev:frontend
```

---

## 🧪 Smart Contract Testing & Verification

Run the Hardhat test suite:
```bash
npx hardhat test
```

Run TypeScript compilation check:
```bash
npm run typecheck:frontend
```

Build production frontend bundle:
```bash
npm run build:frontend
```

---

## ☁️ Deployment

### Backend Deployment (Render)
1. Go to [dashboard.render.com](https://dashboard.render.com) -> **New Blueprint**.
2. Connect your GitHub repository (Render reads `render.yaml`).
3. Set secret variables: `EXECUTOR_PRIVATE_KEY` and `GEMINI_API_KEY`.

### Frontend Deployment (Vercel)
1. Import repository into [Vercel](https://vercel.com).
2. Set Root Directory to `Autorebalncer-Frontend`.
3. Add environment variables:
   - `VITE_BACKEND_URL`: `https://your-backend.onrender.com`
   - `VITE_CHAIN_ID`: `677`
   - `VITE_RPC_URL`: `https://rpc.botchain.ai`
   - `VITE_EXPLORER_URL`: `https://scan.botchain.ai`
   - `VITE_CONTRACT_ADDRESS`: `0x1672fBF0E2322e8662D2242C1aC10DAB37D11223`
   - `VITE_TOKEN_A_ADDRESS`: `0x546307af427902A75771434Df831d88219784E19`
   - `VITE_TOKEN_B_ADDRESS`: `0xef8DC669ECa13E612b67Ff09478352E85bD6CC53`
   - `VITE_EXECUTOR_ADDRESS`: `0xE9a1AABA8061dbcec156Fef994c476e9F91D9B6d`
   - `VITE_TOKEN_A_SYMBOL`: `BOT`
   - `VITE_TOKEN_B_SYMBOL`: `USDC`
