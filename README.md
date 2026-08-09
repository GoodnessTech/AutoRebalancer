# AutoRebalancer Smart Contract & AI Executor Backend

**AutoRebalancer** is an EVM-compatible smart contract and AI executor backend service deployed on **BOT Chain Testnet** (**Chain ID 968**).

It allows a user (contract owner) to set a target token allocation ratio (e.g. 50% BOT / 50% USDC) and delegate trade execution permissions to an off-chain AI service wallet ("executor") up to a strict trade size cap. The contract verifies authority, enforces trade size boundaries, executes swaps via the BOT DEX Router, returns swapped tokens directly to the user's wallet, and logs an on-chain `Rebalanced` event containing the AI's reasoning string for permanent auditing.

---

## 📄 Deployed Contracts (BOT Chain Testnet - Chain ID 968)

- **RPC Endpoint**: `https://rpc.bohr.life`
- **AutoRebalancer Contract**: [`0xC699A99E4833De2F31eAc502d7c2694aC19af2AF`](https://scan.bohr.life/address/0xC699A99E4833De2F31eAc502d7c2694aC19af2AF)
- **Token A (BOT)**: [`0xf647Ed610c806A6F05c3699D0AdF0001DfDb5274`](https://scan.bohr.life/address/0xf647Ed610c806A6F05c3699D0AdF0001DfDb5274)
- **Token B (USDC)**: [`0x424A0aB461B8965F0552285cD8cB719C2887E199`](https://scan.bohr.life/address/0x424A0aB461B8965F0552285cD8cB719C2887E199)
- **Authorized Executor**: `0xE9a1AABA8061dbcec156Fef994c476e9F91D9B6d`

---

## 🚀 Persistent Deployment to Render.com (24/7 Hosting)

### Step 1: Push Repository to GitHub
Create a GitHub repository and push your project:
```bash
git init
git add .
git commit -m "AutoRebalancer backend & smart contracts"
git remote add origin https://github.com/your-username/AutoRebalancer.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Blueprint**.
2. Connect your `AutoRebalancer` GitHub repository.
3. Render will auto-detect [render.yaml](file:///c:/Users/Goodness/Desktop/Projects/AutoRebalancer/render.yaml) and prompt you to input the secret environment variables:
   - `EXECUTOR_PRIVATE_KEY`: `422e267fac19ba966827b5ba1d1d1585288832598944f4ba1aba18621f1ab97b` (or your dedicated executor key)
   - `ANTHROPIC_API_KEY`: `your_anthropic_api_key`
4. Click **Apply**.

Render will deploy your backend service at a permanent HTTPS URL (e.g. `https://autorebalancer-backend.onrender.com`).

---

## 🏃 Local Development

### Start Local Backend
```bash
npm start
```
The server will run at `http://localhost:3001`.

### API Endpoints
- **`GET /status`**: Returns target allocation, current allocation, drift Bps, balances, and prices.
- **`POST /rebalance/check`**: Triggers Claude AI portfolio analysis and executes signed rebalance transaction on-chain if a trade is required.

---

## 🧪 Smart Contract Testing

Run unit tests:
```bash
npm test
```
