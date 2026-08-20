const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const networkName = hre.network.name;
  const networkConfig = hre.network.config;
  const providerNetwork = await hre.ethers.provider.getNetwork();
  const chainId = networkConfig.chainId || Number(providerNetwork.chainId);
  const rpcUrl = networkConfig.url || "http://127.0.0.1:8545";
  const isMainnet = chainId === 677 || networkName === "botMainnet";

  console.log(`==================================================`);
  console.log(`🚀 AutoRebalancer Deployment to: ${networkName}`);
  console.log(`🔗 Chain ID: ${chainId} | RPC: ${rpcUrl}`);
  if (deployer) {
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`👤 Deployer: ${deployer.address} (${hre.ethers.formatEther(balance)} BOT)`);
  }
  console.log(`==================================================`);

  let tokenAAddress = process.env.TOKEN_A_ADDRESS;
  let tokenBAddress = process.env.TOKEN_B_ADDRESS;
  let dexRouterAddress = process.env.DEX_ROUTER_ADDRESS;

  if (isMainnet) {
    console.log("🌐 Production Mainnet Deployment Mode (No Mocks)");
    // Default mainnet token & router addresses if not explicitly set in env
    if (!tokenAAddress || tokenAAddress.toLowerCase() === "0xf647ed610c806a6f05c3699d0adf0001dfdb5274") {
      tokenAAddress = "0x546307af427902A75771434Df831d88219784E19"; // CarryPact (CA) on BOT Chain
    }
    if (!tokenBAddress || tokenBAddress.toLowerCase() === "0x424a0ab461b8965f0552285cd8cb719c2887e199") {
      tokenBAddress = "0xef8DC669ECa13E612b67Ff09478352E85bD6CC53"; // Ecosystem Token on BOT Chain
    }
    if (!dexRouterAddress) {
      dexRouterAddress = "0x143b0Cf8A34B7bFD794d64e0E565155f0904902B"; // Mainnet Router on BOT Chain
    }
  } else {
    // If tokenA address is not supplied on testnet/local, deploy a MockERC20
    if (!tokenAAddress) {
      console.log("No TOKEN_A_ADDRESS provided in env. Deploying MockERC20 for Token A (BOT)...");
      const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
      const tokenA = await MockERC20.deploy("BOT Token", "BOT", hre.ethers.parseEther("1000000"));
      await tokenA.waitForDeployment();
      tokenAAddress = await tokenA.getAddress();
      console.log(`Mock Token A deployed to: ${tokenAAddress}`);
    }

    // If tokenB address is not supplied on testnet/local, deploy a MockERC20
    if (!tokenBAddress) {
      console.log("No TOKEN_B_ADDRESS provided in env. Deploying MockERC20 for Token B (USDC)...");
      const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
      const tokenB = await MockERC20.deploy("Mock USDC", "USDC", hre.ethers.parseEther("1000000"));
      await tokenB.waitForDeployment();
      tokenBAddress = await tokenB.getAddress();
      console.log(`Mock Token B deployed to: ${tokenBAddress}`);
    }

    // If dexRouter address is not supplied on testnet/local, deploy MockDEXRouter
    if (!dexRouterAddress) {
      console.log("No DEX_ROUTER_ADDRESS provided in env. Deploying MockDEXRouter...");
      const MockDEXRouter = await hre.ethers.getContractFactory("MockDEXRouter");
      const router = await MockDEXRouter.deploy();
      await router.waitForDeployment();
      dexRouterAddress = await router.getAddress();
      console.log(`Mock DEX Router deployed to: ${dexRouterAddress}`);
    }
  }

  console.log(`Token A Address:   ${tokenAAddress}`);
  console.log(`Token B Address:   ${tokenBAddress}`);
  console.log(`DEX Router:        ${dexRouterAddress}`);

  console.log("\n📦 Deploying AutoRebalancer smart contract...");
  const AutoRebalancer = await hre.ethers.getContractFactory("AutoRebalancer");

  // Deploy contract with gas optimization
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("20", "gwei");

  const autoRebalancer = await AutoRebalancer.deploy(
    tokenAAddress,
    tokenBAddress,
    dexRouterAddress,
    { gasPrice }
  );
  await autoRebalancer.waitForDeployment();
  const autoRebalancerAddress = await autoRebalancer.getAddress();

  console.log(`✅ AutoRebalancer successfully deployed to: ${autoRebalancerAddress}`);

  // Configure initial target & executor if executor key or address is available
  const executorAddress = process.env.EXECUTOR_ADDRESS || "0xE9a1AABA8061dbcec156Fef994c476e9F91D9B6d";
  if (executorAddress && deployer) {
    console.log(`\n⚙️ Initializing contract parameters...`);
    console.log(`Setting executor to: ${executorAddress}`);
    const execTx = await autoRebalancer.setExecutor(executorAddress, { gasPrice });
    await execTx.wait(1);
    console.log(`✅ Executor authorized.`);

    console.log(`Setting initial target allocation (50.00% / 5000 bps) and max trade cap (100 tokens)...`);
    const targetTx = await autoRebalancer.setTarget(5000, hre.ethers.parseEther("100"), { gasPrice });
    await targetTx.wait(1);
    console.log(`✅ Target allocation & cap initialized.`);
  }

  const config = {
    network: networkName,
    chainId: Number(chainId),
    rpcUrl: rpcUrl,
    autoRebalancerAddress: autoRebalancerAddress,
    tokenAAddress: tokenAAddress,
    tokenBAddress: tokenBAddress,
    executorAddress: executorAddress,
    decimals: 18,
    abiPath: "./artifacts/contracts/AutoRebalancer.sol/AutoRebalancer.json"
  };

  const configPath = path.join(__dirname, "..", "contract-config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("\n==========================================");
  console.log("Contract Configuration Written & Saved:");
  console.log("==========================================");
  console.log(JSON.stringify(config, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
