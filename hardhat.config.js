require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawPrivateKey = process.env.PRIVATE_KEY;
const formattedPrivateKey = rawPrivateKey ? (rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`) : null;
const accounts = formattedPrivateKey ? [formattedPrivateKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    botTestnet: {
      url: "https://rpc.bohr.life",
      chainId: 968,
      accounts: accounts
    },
    botMainnet: {
      url: "https://rpc.botchain.ai",
      chainId: 677,
      accounts: accounts
    }
  }
};
