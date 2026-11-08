// scripts/safe-transfer.js
// Shared helpers for the Themba pot (Safe, 2-of-3) on Sepolia.
// npm install @safe-global/protocol-kit @safe-global/api-kit
// Docs: https://docs.safe.global/sdk/overview

import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { BrowserProvider, Contract, Interface, parseUnits, formatUnits, getAddress } from "ethers";

// ---- FILL THESE IN -------------------------------------------------------
export const SAFE_CONFIG = {
  safeAddress: "0xdFCAc3d0006A920E005212eE3c0F357B5c24DFB4",
  chainId: 11155111n,
  tokenAddress: "0xA6747B2a329FDc8550c1f2892dCc45dF9E537b9c", // Mock USDT
  tokenDecimals: 6
};
// --------------------------------------------------------------------------

export const explorerTx = (hash) => `https://sepolia.etherscan.io/tx/${hash}`;
export const explorerAddress = (address) => `https://sepolia.etherscan.io/address/${address}`;

const erc20 = new Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)"
]);

let cachedApi = null;
function apiKit() {
  if (!cachedApi) {
    cachedApi = new SafeApiKit({
      chainId: SAFE_CONFIG.chainId,
      txServiceUrl: `${window.location.origin}/api/safe-proxy`
    });
  }
  return cachedApi;
}

async function protocolKit(provider, signerAddress) {
  return Safe.init({ provider, signer: signerAddress, safeAddress: SAFE_CONFIG.safeAddress });
}

export function describeError(error) {
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") return "Cancelled in your wallet.";
  const message = error?.shortMessage || error?.message || "Something went wrong.";
  return message.length > 160 ? `${message.slice(0, 157)}…` : message;
}

// ---- Reads ---------------------------------------------------------------

export async function getSafeSummary(provider, account) {
  const kit = await protocolKit(provider, account);
  const [owners, threshold, isOwner] = await Promise.all([
    kit.getOwners(),
    kit.getThreshold(),
    kit.isOwner(account)
  ]);
  return { owners, threshold, isOwner };
}

export async function getSafeTokenBalance(provider) {
  const token = new Contract(SAFE_CONFIG.tokenAddress, erc20, new BrowserProvider(provider));
  const raw = await token.balanceOf(SAFE_CONFIG.safeAddress);
  return formatUnits(raw, SAFE_CONFIG.tokenDecimals);
}

function normalize(tx) {
  let recipient = null;
  let amount = null;
  try {
    if (tx.to?.toLowerCase() === SAFE_CONFIG.tokenAddress.toLowerCase() && tx.data) {
      const parsed = erc20.parseTransaction({ data: tx.data });
      if (parsed?.name === "transfer") {
        recipient = parsed.args[0];
        amount = formatUnits(parsed.args[1], SAFE_CONFIG.tokenDecimals);
      }
    }
  } catch {
    /* not a token transfer */
  }
  return {
    safeTxHash: tx.safeTxHash,
    nonce: Number(tx.nonce),
    proposer: tx.proposer,
    recipient,
    amount,
    confirmations: (tx.confirmations || []).map((c) => c.owner),
    confirmationsRequired: tx.confirmationsRequired,
    submissionDate: tx.submissionDate,
    txHash: tx.transactionHash || null
  };
}

export async function listPending() {
  const res = await apiKit().getPendingTransactions(SAFE_CONFIG.safeAddress);
  return res.results.map(normalize);
}

export async function listExecuted(limit = 5) {
  const res = await apiKit().getMultisigTransactions(SAFE_CONFIG.safeAddress);
  return res.results.filter((t) => t.isExecuted && t.isSuccessful).slice(0, limit).map(normalize);
}

// ---- Writes --------------------------------------------------------------

// Any member: plain ERC-20 transfer from their own wallet into the Safe. No signatures needed.
export async function contributeToSafe(provider, amount) {
  const signer = await new BrowserProvider(provider).getSigner();
  const token = new Contract(SAFE_CONFIG.tokenAddress, erc20, signer);
  const tx = await token.transfer(
    SAFE_CONFIG.safeAddress,
    parseUnits(String(amount), SAFE_CONFIG.tokenDecimals)
  );
  await tx.wait();
  return tx.hash;
}

// Signer: propose a withdrawal. Their signature counts as approval 1 of 2.
export async function proposeTransfer(provider, account, to, amount) {
  const kit = await protocolKit(provider, account);
  if (!(await kit.isOwner(account))) {
    throw new Error("The connected account is not a signer on the Themba Safe.");
  }
  const data = erc20.encodeFunctionData("transfer", [
    getAddress(to),
    parseUnits(String(amount), SAFE_CONFIG.tokenDecimals)
  ]);
  // Use the next free nonce so several proposals can be queued without clashing.
  const nonce = Number(await apiKit().getNextNonce(SAFE_CONFIG.safeAddress));
  const safeTx = await kit.createTransaction({
    transactions: [{ to: SAFE_CONFIG.tokenAddress, value: "0", data }],
    options: { nonce }
  });
  const safeTxHash = await kit.getTransactionHash(safeTx);
  const signature = await kit.signHash(safeTxHash);
  await apiKit().proposeTransaction({
    safeAddress: SAFE_CONFIG.safeAddress,
    safeTransactionData: safeTx.data,
    safeTxHash,
    senderAddress: getAddress(account),
    senderSignature: signature.data
  });
  return safeTxHash;
}

// Another signer: add a signature (off-chain, no gas).
export async function approveTransfer(provider, account, safeTxHash) {
  const kit = await protocolKit(provider, account);
  if (!(await kit.isOwner(account))) throw new Error("Only a Themba Safe signer can approve.");
  const signature = await kit.signHash(safeTxHash);
  await apiKit().confirmTransaction(safeTxHash, signature.data);
}

// Any signer, once the threshold is met: execute on-chain (executor pays Sepolia ETH gas).
export async function executeTransfer(provider, account, safeTxHash) {
  const tx = await apiKit().getTransaction(safeTxHash);
  const kit = await protocolKit(provider, account);
  const threshold = await kit.getThreshold();
  const have = tx.confirmations?.length || 0;
  if (have < threshold) throw new Error(`Needs ${threshold} signatures; has ${have}.`);
  const result = await kit.executeTransaction(tx);
  return result.hash;
}