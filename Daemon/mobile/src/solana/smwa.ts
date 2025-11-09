import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import bs58 from "bs58";

function utf8ToBytes(str: string): Uint8Array {
  const s = unescape(encodeURIComponent(str));
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

export async function signNonceWithSMWA(
  nonce: string,
): Promise<{ address: string; signatureBase58: string }> {
  const message = `Sign in to Daemon Protocol\nNonce: ${nonce}`;
  const payload = utf8ToBytes(message);
  return await transact(async (wallet) => {
    const accounts = await wallet.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No wallet accounts available");
    }
    const address = accounts[0].address;
    const signed = await wallet.signMessages({
      addresses: [address],
      payloads: [payload],
    });
    const signature = signed[0];
    return { address, signatureBase58: bs58.encode(signature) };
  });
}
