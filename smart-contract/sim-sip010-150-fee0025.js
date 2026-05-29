const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  uintCV,
  principalCV,
  noneCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'sip010-token';
const TOKEN_ID = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}::stack-token`;
const FEE = 2500n;                  // 0.0025 STX
const TRANSFER_AMOUNT = 1000n;      // 0.001 STK (token has 6 decimals)
const TOTAL_TXS = 150;
const MIN_STX_USTX = 9000;          // ~3 txs worth of fee (7500) + buffer
const MIN_TOKEN = TRANSFER_AMOUNT * 4n; // enough for 3 transfers + buffer
const API = 'https://api.hiro.so';

const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));

async function fetchJsonWithRetry(url, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) {
        await new Promise(r => setTimeout(r, 5000 * (i + 1)));
        continue;
      }
      const text = await r.text();
      try { return JSON.parse(text); }
      catch (e) {
        await new Promise(r => setTimeout(r, 5000 * (i + 1)));
        continue;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error('fetchJsonWithRetry exhausted: ' + url);
}

async function getState(address) {
  const b = await fetchJsonWithRetry(`${API}/extended/v1/address/${address}/balances`);
  await new Promise(r => setTimeout(r, 200));
  const n = await fetchJsonWithRetry(`${API}/extended/v1/address/${address}/nonces`);
  return {
    stxBalance: parseInt(b.stx?.balance ?? '0'),
    tokenBalance: BigInt(b.fungible_tokens?.[TOKEN_ID]?.balance ?? '0'),
    nonce: BigInt(n.possible_next_nonce ?? 0),
  };
}

async function broadcastTransfer(account, recipient, nonce) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'transfer',
    functionArgs: [
      uintCV(TRANSFER_AMOUNT),
      principalCV(account.address),
      principalCV(recipient),
      noneCV(),
    ],
    senderKey: account.privateKey,
    network: STACKS_MAINNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: FEE,
    nonce,
  };
  const tx = await makeContractCall(txOptions);
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
      if (result.error) {
        return { ok: false, error: `${result.error}: ${result.reason}`, detail: result.reason_data };
      }
      return { ok: true, txid: typeof result === 'string' ? result : result.txid };
    } catch (e) {
      lastErr = e;
      const msg = String(e?.cause?.message || e?.message || e);
      const rateLimited = msg.includes('Per-minute') || msg.includes('429') || msg.includes('rate');
      if (!rateLimited && attempt > 0) break;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return { ok: false, error: `broadcast threw: ${String(lastErr?.message || lastErr)}` };
}

async function main() {
  console.log(`Contract: ${CONTRACT_ADDRESS}.${CONTRACT_NAME}`);
  console.log(`Fee per tx: ${FEE} uSTX (${Number(FEE) / 1_000_000} STX)`);
  console.log(`Transfer amount: ${TRANSFER_AMOUNT} micro-STK per tx`);
  console.log(`Target: ${TOTAL_TXS} txs across ${accounts.length} accounts`);
  console.log(`Loading balances/nonces for ${accounts.length} accounts...`);

  const state = [];
  for (let i = 0; i < accounts.length; i++) {
    const s = await getState(accounts[i].address);
    state.push({ ...accounts[i], ...s, idx: i + 1 });
    await new Promise(r => setTimeout(r, 400));
  }

  const funded = state.filter(a =>
    a.stxBalance >= MIN_STX_USTX && a.tokenBalance >= MIN_TOKEN);
  console.log(`Eligible accounts (>= ${MIN_STX_USTX} uSTX and >= ${MIN_TOKEN} micro-STK): ${funded.length}/${accounts.length}`);
  const skipped = state.filter(a => !funded.includes(a));
  for (const a of skipped) {
    console.log(`  skip #${a.idx} ${a.address.slice(0, 10)} stx=${a.stxBalance} stk=${a.tokenBalance.toString()}`);
  }
  if (funded.length === 0) {
    console.error('No eligible accounts.');
    process.exit(1);
  }
