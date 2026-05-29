const { makeContractCall, AnchorMode, PostConditionMode, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'stack-wallet-v2';
const FEE = 1000n; // 0.001 STX per tx
const TOTAL_TXS = 400;
const MIN_BALANCE_USTX = 9000; // ~8 txs worth of fees (8000) + buffer
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

async function getBalanceAndNonce(address) {
  const b = await fetchJsonWithRetry(`${API}/extended/v1/address/${address}/balances`);
  await new Promise(r => setTimeout(r, 200));
  const n = await fetchJsonWithRetry(`${API}/extended/v1/address/${address}/nonces`);
  return {
    balance: parseInt(b.stx?.balance ?? '0'),
    nonce: BigInt(n.possible_next_nonce ?? 0),
  };
}

async function broadcastOne(account, fnName, nonce) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: fnName,
    functionArgs: [],
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
      const backoff = 2000 * (attempt + 1);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  return { ok: false, error: `broadcast threw: ${String(lastErr?.message || lastErr)}` };
}

async function main() {
  console.log(`Contract: ${CONTRACT_ADDRESS}.${CONTRACT_NAME}`);
  console.log(`Fee per tx: ${FEE} uSTX (${Number(FEE) / 1_000_000} STX)`);
  console.log(`Target: ${TOTAL_TXS} txs (increment/decrement) across ${accounts.length} accounts`);
  console.log(`Loading balances/nonces for ${accounts.length} accounts...`);

  const accountState = [];
  for (let i = 0; i < accounts.length; i++) {
    const s = await getBalanceAndNonce(accounts[i].address);
    accountState.push({ ...accounts[i], ...s, idx: i + 1 });
    await new Promise(r => setTimeout(r, 400));
  }

  const funded = accountState.filter(a => a.balance >= MIN_BALANCE_USTX);
  console.log(`Funded accounts (>= ${MIN_BALANCE_USTX} uSTX): ${funded.length} / ${accounts.length}`);
  if (funded.length === 0) {
    console.error('No funded accounts available.');
    process.exit(1);
  }

  const plan = [];
  for (let i = 0; i < TOTAL_TXS; i++) {
    const acct = funded[i % funded.length];
    const fnName = i % 2 === 0 ? 'increment' : 'decrement';
    plan.push({ acct, fnName });
  }

  const byAddr = new Map();
  for (const item of plan) {
    if (!byAddr.has(item.acct.address)) byAddr.set(item.acct.address, []);
    byAddr.get(item.acct.address).push(item);
  }

  console.log(`Plan: ${plan.length} txs across ${byAddr.size} accounts.`);
  console.log(`Per-account loads: ${[...byAddr.values()].map(v => v.length).join(',')}`);

  const nonceByAddr = new Map();
  for (const [addr, items] of byAddr.entries()) {
    nonceByAddr.set(addr, items[0].acct.nonce);
  }

  const seq = [];
  const perAcctQueues = [...byAddr.values()].map(items => [...items]);
  while (perAcctQueues.some(q => q.length > 0)) {
    for (const q of perAcctQueues) {
      if (q.length) seq.push(q.shift());
    }
  }
