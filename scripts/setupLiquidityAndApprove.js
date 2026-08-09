const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const configPath = path.join(__dirname, "..", "contract-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  const [owner] = await hre.ethers.getSigners();
  const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
  const formattedExecKey = executorPrivateKey.startsWith("0x") ? executorPrivateKey : `0x${executorPrivateKey}`;
  const executorWallet = new hre.ethers.Wallet(formattedExecKey, hre.ethers.provider);
  const executorAddress = executorWallet.address;

  console.log(`Setting up liquidity & approvals for testnet demo...`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Executor: ${executorAddress}`);
  console.log(`Contract: ${config.autoRebalancerAddress}`);

  const ERC20 = await hre.ethers.getContractFactory("MockERC20");
  const tokenA = ERC20.attach(config.tokenAAddress);
  const tokenB = ERC20.attach(config.tokenBAddress);

  // 1. Approve AutoRebalancer to spend owner's Token A and Token B
  const maxApprove = hre.ethers.MaxUint256;
  console.log("Approving AutoRebalancer as spender for Token A & Token B...");
  const appATx = await tokenA.approve(config.autoRebalancerAddress, maxApprove);
  await appATx.wait(1);
  const appBTx = await tokenB.approve(config.autoRebalancerAddress, maxApprove);
  await appBTx.wait(1);
  console.log("✅ Owner approved AutoRebalancer for unlimited Token A & B spending.");

  // 2. Read Mock DEX Router address from AutoRebalancer contract
  const AutoRebalancer = await hre.ethers.getContractFactory("AutoRebalancer");
  const autoRebalancer = AutoRebalancer.attach(config.autoRebalancerAddress);
  const routerAddress = await autoRebalancer.dexRouter();
  console.log(`DEX Router address on contract: ${routerAddress}`);

  // 3. Fund DEX Router with Token A & B liquidity so swaps can fulfill
  console.log("Transferring 100,000 Token A & B to Mock DEX Router for swap liquidity...");
  const fundAmount = hre.ethers.parseEther("100000");
  const fundATx = await tokenA.transfer(routerAddress, fundAmount);
  await fundATx.wait(1);
  const fundBTx = await tokenB.transfer(routerAddress, fundAmount);
  await fundBTx.wait(1);
  console.log("✅ DEX Router funded with liquidity.");

  // 4. Ensure Executor wallet has native BOT gas tokens
  const execBalance = await hre.ethers.provider.getBalance(executorAddress);
  console.log(`Executor native BOT balance: ${hre.ethers.formatEther(execBalance)} BOT`);
  if (execBalance < hre.ethers.parseEther("0.1")) {
    console.log("Transferring 0.5 native BOT to Executor wallet for gas...");
    const gasTx = await owner.sendTransaction({
      to: executorAddress,
      value: hre.ethers.parseEther("0.5")
    });
    await gasTx.wait(1);
    console.log("✅ Sent native BOT gas to Executor wallet.");
  }

  // 5. Update target allocation to 40% (4000 Bps) so drift is non-zero and triggers AI trade
  console.log("Setting target allocation to 40.00% (4000 Bps) to demonstrate AI rebalance trade...");
  const setTargetTx = await autoRebalancer.setTarget(4000, hre.ethers.parseEther("100"));
  await setTargetTx.wait(1);
  console.log("✅ Target allocation updated to 40.00%. Portfolio is now 50% BOT / 50% USDC (drift = +10.00%).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
