// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDEXRouter {
    uint256 public rateNumerator = 1;
    uint256 public rateDenominator = 1;

    function setRate(uint256 _numerator, uint256 _denominator) external {
        require(_denominator > 0, "Invalid denominator");
        rateNumerator = _numerator;
        rateDenominator = _denominator;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path length");
        require(deadline >= block.timestamp, "Expired deadline");

        address inputToken = path[0];
        address outputToken = path[path.length - 1];

        // Pull input token from caller (AutoRebalancer)
        IERC20(inputToken).transferFrom(msg.sender, address(this), amountIn);

        // Calculate output token amount
        uint256 amountOut = (amountIn * rateNumerator) / rateDenominator;
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Transfer output token to recipient
        IERC20(outputToken).transfer(to, amountOut);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;

        return amounts;
    }
}
