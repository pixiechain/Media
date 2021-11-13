import * as factory from '../typechain';
import { BigNumber, BigNumberish, Bytes, Wallet } from 'ethers';
import { MaxUint256, AddressZero } from '@ethersproject/constants';
import { generatedWallets } from '../utils/generatedWallets';
import { JsonRpcProvider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import {
  recoverTypedMessage,
  recoverTypedSignature,
  signTypedData,
} from 'eth-sig-util';
import {
  bufferToHex,
  ecrecover,
  fromRpcSig,
  pubToAddress,
} from 'ethereumjs-util';
import { toUtf8Bytes } from 'ethers/lib/utils';
import { keccak256 } from '@ethersproject/keccak256';

let provider = new JsonRpcProvider();
let [deployerWallet] = generatedWallets(provider);

function revert(message: string) {
  return `VM Exception while processing transaction: revert ${message}`;
}

export function toNumWei(val: BigNumber) {
  return parseFloat(formatUnits(val, 'wei'));
}


