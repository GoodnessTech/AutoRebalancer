const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AutoRebalancer", function () {
  let owner, executor, attacker, user;
  let tokenA, tokenB, mockRouter, autoRebalancer;

  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens
  const targetBps = 5000; // 50.00%
  const maxTradeSize = ethers.parseEther("100"); // 100 tokens max per rebalance

  beforeEach(async function () {
    [owner, executor, attacker, user] = await ethers.getSigners();

    // Deploy Mock ERC20 Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("BOT Token", "BOT", initialSupply);
    await tokenA.waitForDeployment();

    tokenB = await MockERC20.deploy("Mock USDC", "USDC", initialSupply);
    await tokenB.waitForDeployment();

    // Deploy Mock DEX Router
    const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
    mockRouter = await MockDEXRouter.deploy();
    await mockRouter.waitForDeployment();

    // Fund Mock DEX Router with tokens so it can fulfill swap outputs
    await tokenB.transfer(await mockRouter.getAddress(), ethers.parseEther("500000"));
    await tokenA.transfer(await mockRouter.getAddress(), ethers.parseEther("500000"));

    // Deploy AutoRebalancer
    const AutoRebalancer = await ethers.getContractFactory("AutoRebalancer");
    autoRebalancer = await AutoRebalancer.deploy(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      await mockRouter.getAddress()
    );
    await autoRebalancer.waitForDeployment();
  });

  describe("Initialization & Admin Configuration", function () {
    it("Should return correct config from getConfig()", async function () {
      const config = await autoRebalancer.getConfig();
      expect(config._targetAllocationBps).to.equal(0);
      expect(config._maxTradeSize).to.equal(0);
      expect(config._executor).to.equal(ethers.ZeroAddress);
      expect(config._tokenA).to.equal(await tokenA.getAddress());
      expect(config._tokenB).to.equal(await tokenB.getAddress());
    });

    it("Should allow owner to set target allocation and max trade size", async function () {
      await expect(autoRebalancer.setTarget(targetBps, maxTradeSize))
        .to.emit(autoRebalancer, "TargetSet")
        .withArgs(targetBps, maxTradeSize);

      const config = await autoRebalancer.getConfig();
      expect(config._targetAllocationBps).to.equal(targetBps);
      expect(config._maxTradeSize).to.equal(maxTradeSize);
    });

    it("Should prevent non-owner from setting target", async function () {
      await expect(
        autoRebalancer.connect(attacker).setTarget(targetBps, maxTradeSize)
      ).to.be.reverted;
    });

    it("Should allow owner to set executor address", async function () {
      await expect(autoRebalancer.setExecutor(executor.address))
        .to.emit(autoRebalancer, "ExecutorSet")
        .withArgs(executor.address);

      const config = await autoRebalancer.getConfig();
      expect(config._executor).to.equal(executor.address);
    });

    it("Should prevent setting zero address as executor", async function () {
      await expect(
        autoRebalancer.setExecutor(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid executor address");
    });

    it("Should prevent non-owner from setting executor", async function () {
      await expect(
        autoRebalancer.connect(attacker).setExecutor(executor.address)
      ).to.be.reverted;
    });
  });

  describe("Rebalance Execution & Cap Enforcement", function () {
    beforeEach(async function () {
      // Set target and executor
      await autoRebalancer.setTarget(targetBps, maxTradeSize);
      await autoRebalancer.setExecutor(executor.address);
    });

    it("Should allow executor to successfully rebalance within cap", async function () {
      const amountIn = ethers.parseEther("50"); // 50 <= 100 max trade size
      const aiReasoning = "Portfolio drift detected: BOT allocation at 55%, selling 50 BOT for USDC to rebalance to 50%";

      // Owner approves AutoRebalancer to spend Token A
      await tokenA.approve(await autoRebalancer.getAddress(), amountIn);

      const ownerBalAInitial = await tokenA.balanceOf(owner.address);
      const ownerBalBInitial = await tokenB.balanceOf(owner.address);

      // Execute rebalance as executor
      const tx = await autoRebalancer
        .connect(executor)
        .executeRebalance(true, amountIn, aiReasoning);

      const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

      await expect(tx)
        .to.emit(autoRebalancer, "Rebalanced")
        .withArgs(
          blockTimestamp,
          true,
          amountIn,
          amountIn,
          aiReasoning
        );

      const ownerBalAFinal = await tokenA.balanceOf(owner.address);
      const ownerBalBFinal = await tokenB.balanceOf(owner.address);

      expect(ownerBalAInitial - ownerBalAFinal).to.equal(amountIn);
      expect(ownerBalBFinal - ownerBalBInitial).to.equal(amountIn);
    });

    it("Should reject rebalance attempt over the cap limit", async function () {
      const amountIn = ethers.parseEther("150"); // 150 > 100 max trade size
      const aiReasoning = "Attempting large rebalance trade";

      await tokenA.approve(await autoRebalancer.getAddress(), amountIn);

      await expect(
        autoRebalancer
          .connect(executor)
          .executeRebalance(true, amountIn, aiReasoning)
      ).to.be.revertedWith("Amount exceeds max trade size");
    });

    it("Should reject rebalance attempt from a non-executor address", async function () {
      const amountIn = ethers.parseEther("50");
      const aiReasoning = "Unauthorized execution attempt";

      await tokenA.approve(await autoRebalancer.getAddress(), amountIn);

      await expect(
        autoRebalancer
          .connect(attacker)
          .executeRebalance(true, amountIn, aiReasoning)
      ).to.be.revertedWith("Only authorized executor can execute rebalance");
    });

    it("Should reject rebalance from contract owner if owner is not set as executor", async function () {
      const amountIn = ethers.parseEther("50");
      const aiReasoning = "Owner trying to directly execute without executor role";

      await tokenA.approve(await autoRebalancer.getAddress(), amountIn);

      await expect(
        autoRebalancer
          .connect(owner)
          .executeRebalance(true, amountIn, aiReasoning)
      ).to.be.revertedWith("Only authorized executor can execute rebalance");
    });
  });
});
