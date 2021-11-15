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
    hard: {
      url: "http://127.0.0.1:8545"
    }
  }
};

export default config;
