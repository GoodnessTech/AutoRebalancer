// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDEXRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract AutoRebalancer is Ownable, ReentrancyGuard {
    address public tokenA;
    address public tokenB;
    address public dexRouter;

    uint256 public targetAllocationBps;
    uint256 public maxTradeSize;
    address public executor;

    event TargetSet(uint256 targetAllocationBps, uint256 maxTradeSize);
    event ExecutorSet(address indexed executor);
    event Rebalanced(
        uint256 indexed timestamp,
        bool sellTokenAForB,
        uint256 amountIn,
        uint256 amountOut,
        string aiReasoning
    );

    constructor(
        address _tokenA,
        address _tokenB,
        address _dexRouter
    ) Ownable(msg.sender) {
        require(_tokenA != address(0), "Invalid tokenA address");
        require(_tokenB != address(0), "Invalid tokenB address");
        require(_dexRouter != address(0), "Invalid router address");

        tokenA = _tokenA;
        tokenB = _tokenB;
        dexRouter = _dexRouter;
    }

    function setTarget(uint256 _targetAllocationBps, uint256 _maxTradeSize) external onlyOwner {
        targetAllocationBps = _targetAllocationBps;
        maxTradeSize = _maxTradeSize;
        emit TargetSet(_targetAllocationBps, _maxTradeSize);
    }

    function setExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "Invalid executor address");
        executor = _executor;
        emit ExecutorSet(_executor);
    }

    function executeRebalance(
        bool sellTokenAForB,
        uint256 amountIn,
        string calldata aiReasoning
    ) external nonReentrant {
        require(msg.sender == executor, "Only authorized executor can execute rebalance");
        require(amountIn > 0, "Amount must be greater than zero");
        require(amountIn <= maxTradeSize, "Amount exceeds max trade size");

        address inputToken = sellTokenAForB ? tokenA : tokenB;
        address outputToken = sellTokenAForB ? tokenB : tokenA;
        address userOwner = owner();

        // Pull input tokens from user (owner) into this contract
        IERC20(inputToken).transferFrom(userOwner, address(this), amountIn);

        // Approve dexRouter to spend tokens from this contract
        IERC20(inputToken).approve(dexRouter, amountIn);

        // Prepare swap path
        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        // Execute swap sending outputs directly to user (owner)
        uint256[] memory amounts = IDEXRouter(dexRouter).swapExactTokensForTokens(
            amountIn,
            0,
            path,
            userOwner,
            block.timestamp
        );

        uint256 amountOut = amounts[amounts.length - 1];

        emit Rebalanced(
            block.timestamp,
            sellTokenAForB,
            amountIn,
            amountOut,
            aiReasoning
        );
    }

    function getConfig()
        external
        view
        returns (
            uint256 _targetAllocationBps,
            uint256 _maxTradeSize,
            address _executor,
            address _tokenA,
            address _tokenB
        )
    {
        return (targetAllocationBps, maxTradeSize, executor, tokenA, tokenB);
    }
}
