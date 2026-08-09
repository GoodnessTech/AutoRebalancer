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

  console.log(`Deploying AutoRebalancer to network: ${networkName} (Chain ID: ${chainId})`);
  if (deployer) {
    console.log(`Deployer address: ${deployer.address}`);
  }

  let tokenAAddress = process.env.TOKEN_A_ADDRESS;
  let tokenBAddress = process.env.TOKEN_B_ADDRESS;
  let dexRouterAddress = process.env.DEX_ROUTER_ADDRESS;

  // If tokenA address is not supplied, deploy a MockERC20 for Token A (BOT Token)
  if (!tokenAAddress) {
    console.log("No TOKEN_A_ADDRESS provided in env. Deploying MockERC20 for Token A (BOT)...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("BOT Token", "BOT", hre.ethers.parseEther("1000000"));
    await tokenA.waitForDeployment();
    tokenAAddress = await tokenA.getAddress();
    console.log(`Mock Token A deployed to: ${tokenAAddress}`);
  }

  // If tokenB address is not supplied, deploy a MockERC20 for Token B (Mock USDC)
  if (!tokenBAddress) {
    console.log("No TOKEN_B_ADDRESS provided in env. Deploying MockERC20 for Token B (USDC)...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const tokenB = await MockERC20.deploy("Mock USDC", "USDC", hre.ethers.parseEther("1000000"));
    await tokenB.waitForDeployment();
    tokenBAddress = await tokenB.getAddress();
    console.log(`Mock Token B deployed to: ${tokenBAddress}`);
  }

  // If dexRouter address is not supplied, deploy MockDEXRouter
  if (!dexRouterAddress) {
    console.log("No DEX_ROUTER_ADDRESS provided in env. Deploying MockDEXRouter...");
    const MockDEXRouter = await hre.ethers.getContractFactory("MockDEXRouter");
    const router = await MockDEXRouter.deploy();
    await router.waitForDeployment();
    dexRouterAddress = await router.getAddress();
    console.log(`Mock DEX Router deployed to: ${dexRouterAddress}`);
  }

  console.log("Deploying AutoRebalancer...");
  const AutoRebalancer = await hre.ethers.getContractFactory("AutoRebalancer");
  const autoRebalancer = await AutoRebalancer.deploy(
    tokenAAddress,
    tokenBAddress,
    dexRouterAddress
  );
  await autoRebalancer.waitForDeployment();
  const autoRebalancerAddress = await autoRebalancer.getAddress();

  console.log(`AutoRebalancer deployed to: ${autoRebalancerAddress}`);

  const config = {
    network: networkName,
    chainId: Number(chainId),
    rpcUrl: rpcUrl,
    autoRebalancerAddress: autoRebalancerAddress,
    tokenAAddress: tokenAAddress,
    tokenBAddress: tokenBAddress,
    decimals: 18,
    abiPath: "./artifacts/contracts/AutoRebalancer.sol/AutoRebalancer.json"
  };

  const configPath = path.join(__dirname, "..", "contract-config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("\n==========================================");
  console.log("Contract Configuration Written & Displayed:");
  console.log("==========================================");
  console.log(JSON.stringify(config, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
