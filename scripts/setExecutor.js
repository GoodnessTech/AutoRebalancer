const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const configPath = path.join(__dirname, "..", "contract-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const [owner] = await hre.ethers.getSigners();
  const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!executorPrivateKey) {
    throw new Error("EXECUTOR_PRIVATE_KEY not set in .env");
  }

  const formattedExecKey = executorPrivateKey.startsWith("0x") ? executorPrivateKey : `0x${executorPrivateKey}`;
  const executorWallet = new hre.ethers.Wallet(formattedExecKey);
  const executorAddress = executorWallet.address;

  console.log(`Connecting to contract at: ${config.autoRebalancerAddress}`);
  console.log(`Owner address: ${owner.address}`);
  console.log(`Executor address: ${executorAddress}`);

  const AutoRebalancer = await hre.ethers.getContractFactory("AutoRebalancer");
  const autoRebalancer = AutoRebalancer.attach(config.autoRebalancerAddress);

  console.log("Calling setExecutor on contract...");
  const tx = await autoRebalancer.setExecutor(executorAddress);
  console.log(`Transaction submitted: ${tx.hash}. Waiting for block confirmation...`);
  await tx.wait(1);
  console.log(`✅ setExecutor successfully executed! Executor is now: ${executorAddress}`);

  // Also set initial target allocation (5000 = 50%) and maxTradeSize (100 tokens) if 0
  const currentConfig = await autoRebalancer.getConfig();
  if (currentConfig._targetAllocationBps.toString() === "0") {
    console.log("Setting initial target allocation (50.00%) and maxTradeSize (100 tokens)...");
    const targetTx = await autoRebalancer.setTarget(5000, hre.ethers.parseEther("100"));
    console.log(`Target transaction submitted: ${targetTx.hash}. Waiting for confirmation...`);
    await targetTx.wait(1);
    console.log("✅ setTarget successfully executed!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
