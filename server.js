const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Load contract configuration single source of truth
const configPath = path.join(__dirname, "contract-config.json");
let contractConfig = {};
if (fs.existsSync(configPath)) {
  contractConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
}

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.RPC_URL || contractConfig.rpcUrl || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.autoRebalancerAddress;
const TOKEN_A_ADDRESS = process.env.TOKEN_A_ADDRESS || contractConfig.tokenAAddress;
const TOKEN_B_ADDRESS = process.env.TOKEN_B_ADDRESS || contractConfig.tokenBAddress;
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// Read contract ABI
let contractAbi = [];
if (contractConfig.abiPath) {
  const fullAbiPath = path.resolve(__dirname, contractConfig.abiPath);
  if (fs.existsSync(fullAbiPath)) {
    const artifact = JSON.parse(fs.readFileSync(fullAbiPath, "utf8"));
    contractAbi = artifact.abi;
  }
}

// Fallback minimal ABI if artifact is missing
if (!contractAbi || contractAbi.length === 0) {
  contractAbi = [
    "function getConfig() external view returns (uint256, uint256, address, address, address)",
    "function owner() external view returns (address)",
    "function executeRebalance(bool sellTokenAForB, uint256 amountIn, string calldata aiReasoning) external",
    "event Rebalanced(uint256 indexed timestamp, bool sellTokenAForB, uint256 amountIn, uint256 amountOut, string aiReasoning)"
  ];
}

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

// Initialize Provider and Signer
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });

// If EXECUTOR_PRIVATE_KEY is not set in env, check if default local Hardhat accounts can be used
let executorWallet;
if (EXECUTOR_PRIVATE_KEY) {
  executorWallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);
} else {
  console.warn("⚠️ EXECUTOR_PRIVATE_KEY not provided in env. Transaction execution will be simulated or fallback to local provider signer if available.");
}

// Initialize Google Gemini SDK client
let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
} else {
  console.warn("⚠️ GEMINI_API_KEY not set in env. AI rebalance checks will use local fallback simulation if no key is provided.");
}

const app = express();

// Enable CORS
app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? "*" : ALLOWED_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// Timestamped logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Helper function to fetch current contract & portfolio status
async function getPortfolioStatus() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not configured.");
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);

  // Read config & owner from contract
  const config = await contract.getConfig();
  const targetAllocationBps = Number(config._targetAllocationBps || config[0]);
  const maxTradeSizeWei = BigInt(config._maxTradeSize || config[1]);
  const executorAddress = config._executor || config[2];
  const tokenAAddr = config._tokenA || config[3] || TOKEN_A_ADDRESS;
  const tokenBAddr = config._tokenB || config[4] || TOKEN_B_ADDRESS;

  const ownerAddress = await contract.owner();

  // Read ERC20 token balances of contract owner
  const tokenAContract = new ethers.Contract(tokenAAddr, ERC20_ABI, provider);
  const tokenBContract = new ethers.Contract(tokenBAddr, ERC20_ABI, provider);

  const [balAWei, balBWei] = await Promise.all([
    tokenAContract.balanceOf(ownerAddress),
    tokenBContract.balanceOf(ownerAddress)
  ]);

  const balA = Number(ethers.formatEther(balAWei));
  const balB = Number(ethers.formatEther(balBWei));

  // Current price of Token A in terms of Token B (default 1.0 or mock oracle)
  const priceAToB = 1.0;

  // Calculate portfolio allocation
  const valA = balA * priceAToB;
  const valB = balB;
  const totalVal = valA + valB;

  let currentAllocationBps = 0;
  if (totalVal > 0) {
    currentAllocationBps = Math.round((valA / totalVal) * 10000);
  }

  const driftBps = currentAllocationBps - targetAllocationBps;

  return {
    contractAddress: CONTRACT_ADDRESS,
    ownerAddress,
    executorAddress,
    targetAllocationBps,
    currentAllocationBps,
    driftBps,
    tokenABalance: balA.toFixed(4),
    tokenBBalance: balB.toFixed(4),
    tokenABalanceRaw: balAWei.toString(),
    tokenBBalanceRaw: balBWei.toString(),
    maxTradeSizeWei: maxTradeSizeWei.toString(),
    maxTradeSizeFormatted: ethers.formatEther(maxTradeSizeWei),
    priceAToB,
    tokenAAddress: tokenAAddr,
    tokenBAddress: tokenBAddr
  };
}

// Endpoint: GET /status
app.get("/status", async (req, res) => {
  try {
    const status = await getPortfolioStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("❌ Error fetching status:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint: POST /rebalance/check
app.post("/rebalance/check", async (req, res) => {
  try {
    console.log("🤖 Initiating AI Rebalance Check...");
    const status = await getPortfolioStatus();
    console.log(`📊 Current Allocation: ${(status.currentAllocationBps / 100).toFixed(2)}% | Target: ${(status.targetAllocationBps / 100).toFixed(2)}% | Drift: ${(status.driftBps / 100).toFixed(2)}%`);

    let aiDecision;

    if (genAI) {
      const systemPrompt = `You are an automated portfolio rebalancing AI agent for an EVM smart contract on BOT Chain.
Your job is to analyze portfolio token allocations, calculate target drift, and recommend appropriate trade actions.

CRITICAL INSTRUCTIONS:
- Respond ONLY in strict, valid JSON format without markdown code blocks, preambles, or postscript text.
- JSON structure must be EXACTLY:
{
  "action": "sell_a_for_b" | "sell_b_for_a" | "hold",
  "amountPercent": <number 0-100 indicating percentage of drift amount to correct in this trade (recommended 25-50 to avoid over-correcting)>,
  "reasoning": "<2-3 clear, plain-language sentences explaining the rationale for your decision>"
}`;

      const userPrompt = `Analyze the current portfolio status and determine if a rebalance trade is needed:

- Token A Balance (BOT): ${status.tokenABalance}
- Token B Balance (USDC): ${status.tokenBBalance}
- Price (BOT/USDC): ${status.priceAToB}
- Current Allocation of Token A: ${(status.currentAllocationBps / 100).toFixed(2)}% (${status.currentAllocationBps} bps)
- Target Allocation of Token A: ${(status.targetAllocationBps / 100).toFixed(2)}% (${status.targetAllocationBps} bps)
- Allocation Drift: ${(status.driftBps / 100).toFixed(2)}% (${status.driftBps} bps)
- Max Trade Cap Limit: ${status.maxTradeSizeFormatted} tokens

Determine whether to "sell_a_for_b", "sell_b_for_a", or "hold", suggest the trade percentage (amountPercent: 0-100), and provide concise reasoning.`;

      try {
        console.log("🧠 Querying Google Gemini API (model: gemini-3.6-flash)...");
        const geminiResponse = await genAI.models.generateContent({
          model: "gemini-3.6-flash",
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2
          }
        });

        const responseText = (geminiResponse.text || "").trim();
        console.log(`💬 AI Raw Output: ${responseText}`);

        let cleanedJsonStr = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedJsonStr = jsonMatch[0];
        }

        aiDecision = JSON.parse(cleanedJsonStr);
      } catch (apiErr) {
        console.warn(`⚠️ Gemini API call failed (${apiErr.message}). Falling back to AI logic engine...`);
      }
    }

    if (!aiDecision) {
      console.log("ℹ️ Running AI logic engine...");
      const absDrift = Math.abs(status.driftBps);
      if (absDrift < 100) {
        aiDecision = {
          action: "hold",
          amountPercent: 0,
          reasoning: `Portfolio drift is minimal at ${(status.driftBps / 100).toFixed(2)}%, which is within acceptable tolerance boundaries. No rebalance trade required.`
        };
      } else if (status.driftBps > 0) {
        aiDecision = {
          action: "sell_a_for_b",
          amountPercent: 50,
          reasoning: `Token A allocation is over-weight by ${(status.driftBps / 100).toFixed(2)}% relative to target allocation of ${(status.targetAllocationBps / 100).toFixed(2)}%. Selling 50% of drifted Token A for Token B to restore balance.`
        };
      } else {
        aiDecision = {
          action: "sell_b_for_a",
          amountPercent: 50,
          reasoning: `Token A allocation is under-weight by ${Math.abs(status.driftBps / 100).toFixed(2)}% relative to target allocation of ${(status.targetAllocationBps / 100).toFixed(2)}%. Selling Token B for Token A to restore target ratio.`
        };
      }
    }

    // Step 3: Handle "hold" decision
    if (aiDecision.action === "hold") {
      console.log("⏸️ AI Decision: HOLD. No transaction executed.");
      return res.json({
        success: true,
        executed: false,
        decision: aiDecision,
        status
      });
    }

    // Step 4: Handle trade execution ("sell_a_for_b" or "sell_b_for_a")
    const sellTokenAForB = aiDecision.action === "sell_a_for_b";

    // Calculate raw trade amount in wei based on amountPercent of source balance or drift
    const sourceBalWei = sellTokenAForB ? BigInt(status.tokenABalanceRaw) : BigInt(status.tokenBBalanceRaw);
    const amountPercent = Math.min(Math.max(Number(aiDecision.amountPercent) || 50, 1), 100);

    // Estimate trade amount based on drift and requested percentage
    let calculatedAmountWei = (sourceBalWei * BigInt(amountPercent)) / 100n;

    // Enforce maxTradeSize hard cap limit
    const maxTradeSizeWei = BigInt(status.maxTradeSizeWei);
    let amountInWei = calculatedAmountWei;
    if (maxTradeSizeWei > 0n && amountInWei > maxTradeSizeWei) {
      console.log(`⚠️ Calculated trade amount (${ethers.formatEther(amountInWei)}) exceeds maxTradeSize cap (${ethers.formatEther(maxTradeSizeWei)}). Clamping to cap limit.`);
      amountInWei = maxTradeSizeWei;
    }

    if (amountInWei <= 0n) {
      return res.status(400).json({
        success: false,
        error: "Calculated trade amount is 0 or insufficient balance available."
      });
    }

    console.log(`⚡ Executing Rebalance Trade: sellTokenAForB=${sellTokenAForB}, amountIn=${ethers.formatEther(amountInWei)} tokens`);

    // Ensure executor wallet is available
    let activeSigner = executorWallet;
    if (!activeSigner) {
      // Try using local hardhat signer if available
      try {
        const signers = await provider.listAccounts();
        if (signers && signers.length > 0) {
          activeSigner = await provider.getSigner(status.executorAddress || signers[0].address);
        }
      } catch (sErr) {
        // Ignore fallback error
      }
    }

    if (!activeSigner) {
      throw new Error("No EXECUTOR_PRIVATE_KEY provided and local signer unavailable to execute transaction on-chain.");
    }

    const rebalancerContract = new ethers.Contract(status.contractAddress, contractAbi, activeSigner);

    // Call executeRebalance on smart contract
    const tx = await rebalancerContract.executeRebalance(
      sellTokenAForB,
      amountInWei,
      aiDecision.reasoning
    );

    console.log(`⏳ Transaction submitted. Hash: ${tx.hash}. Waiting for block confirmation...`);
    const receipt = await tx.wait(1);
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}!`);

    // Explorer URL format for BOT Chain
    const isTestnet = RPC_URL.includes("bohr") || RPC_URL.includes("968");
    const explorerBase = isTestnet ? "https://scan.bohr.life" : "https://scan.botchain.ai";
    const explorerUrl = `${explorerBase}/tx/${receipt.hash}`;

    return res.json({
      success: true,
      executed: true,
      decision: aiDecision,
      amountIn: amountInWei.toString(),
      amountInFormatted: ethers.formatEther(amountInWei),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl
    });
  } catch (error) {
    console.error("❌ Error during rebalance check execution:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log("==========================================");
  console.log(`🚀 AutoRebalancer AI Executor Backend Running`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 RPC: ${RPC_URL}`);
  console.log(`📜 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 CORS Allowed Origin: ${ALLOWED_ORIGIN}`);
  console.log("==========================================");
});