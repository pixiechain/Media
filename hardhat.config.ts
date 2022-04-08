import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import "hardhat-change-network";
import {HardhatUserConfig, NetworkUserConfig} from 'hardhat/types';
//import 'hardhat-deploy';

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          // You should disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 200
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 3000
      }
    },    
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: [
        '0x1b6a52b57a4935e82f9860bc6ff108c694f10f9792e13f07ffac7379b043b919',
        '0x90cb8f571a5e66159887cf813b4a04556f9d9d37cb6d6c148f48e32b3916d1d4'
      ]
    },
    pixie_test: {
      url: "https://http-testnet.chain.pixie.xyz",
      accounts: [
        '0x4197fedd3febad4df4afa1bc370de9c6e64b2b764735f3bb1f269182c67a27a6',
        '0x038fea60b6994a873e47ae64416abc8d5c74387eb502166e89b1580b79293cb1'
      ]
    },
    pixie: {
      url: "https://http-mainnet.chain.pixie.xyz",
      accounts: [
      ]
    },
    polygon_test: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [
        '0x836a96a33158635ece6ac15a2becb1461bd1c244e8f26bba2ec56ad62b1f1f44',
        '0x8d5ddbc646eba29fec1f8a2f8138367907774ce6c976a892eeaf4bbdd4bd5cd1'
      ]
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [
      ]      
    },
    eth: {
      url: "https://mainnet.infura.io/v3/e8996d3f13d940de8bcb0602ac35d293",
      accounts: [
      ]
    },
    hard: {
      url: "http://127.0.0.1:8545"
    }
  }
};

export default config;
