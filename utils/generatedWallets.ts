import { ethers } from 'ethers';

export const privateKeys = [
  '0x1b6a52b57a4935e82f9860bc6ff108c694f10f9792e13f07ffac7379b043b919',
  '0x90cb8f571a5e66159887cf813b4a04556f9d9d37cb6d6c148f48e32b3916d1d4',
  '0x1e4ac5e48f7067caabe3dede199867f76580ee7c6a21f263027d89bdc5edbbf3',
  '0xa362e19bb76394662c4a2daac01df3bf72be5b044aab98122c3267905a24ee1b'
];

export function generatedWallets(provider: ethers.providers.BaseProvider) {
  return privateKeys.map((key: string) => {
    return new ethers.Wallet(key, provider);
  });
}

export async function signMessage(message: string, wallet: ethers.Wallet) {
  const messageHash = ethers.utils.id(message);
  const messageHashBytes = ethers.utils.arrayify(messageHash);
  const flatSig = await wallet.signMessage(messageHashBytes);
  return ethers.utils.arrayify(flatSig);
}
