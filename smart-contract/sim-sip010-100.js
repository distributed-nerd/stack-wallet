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
const FEE = 10000n;                 // 0.01 STX
const TRANSFER_AMOUNT = 1000n;      // 0.001 STK (token has 6 decimals)
const TOTAL_TXS = 100;
const TX_PER_ACCT_CAP_USTX = 20000; // need 2x fee per account
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
  console.log(`Loading balances/nonces for ${accounts.length} accounts...`);

  const state = [];
  for (let i = 0; i < accounts.length; i++) {
    const s = await getState(accounts[i].address);
    state.push({ ...accounts[i], ...s, idx: i + 1 });
    await new Promise(r => setTimeout(r, 400));
  }

  // require enough STX for >= 2 txs and enough STK to cover them
  const funded = state.filter(a =>
    a.stxBalance >= TX_PER_ACCT_CAP_USTX && a.tokenBalance >= TRANSFER_AMOUNT * 2n);
  console.log(`Eligible accounts (>= ${TX_PER_ACCT_CAP_USTX} uSTX and >= ${TRANSFER_AMOUNT * 2n} micro-STK): ${funded.length}/${accounts.length}`);
  const skipped = state.filter(a => !funded.includes(a));
  for (const a of skipped) {
    console.log(`  skip #${a.idx} ${a.address.slice(0, 10)} stx=${a.stxBalance} stk=${a.tokenBalance.toString()}`);
  }
  if (funded.length === 0) {
    console.error('No eligible accounts.');
    process.exit(1);
  }

  // round-robin assignment of TOTAL_TXS across funded accounts
  // recipient = next account in the FULL accounts array (deterministic neighbor)
  const plan = [];
  for (let i = 0; i < TOTAL_TXS; i++) {
    const acct = funded[i % funded.length];
    const recipient = accounts[(acct.idx) % accounts.length].address; // neighbor
    plan.push({ acct, recipient });
  }

  // group by sender, assign sequential nonces
  const byAddr = new Map();
  for (const item of plan) {
    if (!byAddr.has(item.acct.address)) byAddr.set(item.acct.address, []);
    byAddr.get(item.acct.address).push(item);
  }
  console.log(`Plan: ${plan.length} txs across ${byAddr.size} senders.`);
  console.log(`Per-account loads: ${[...byAddr.values()].map(v => v.length).join(',')}`);

  const nonceByAddr = new Map();
  for (const [addr, items] of byAddr.entries()) {
    nonceByAddr.set(addr, items[0].acct.nonce);
  }

  // interleave so we don't broadcast back-to-back from the same sender
  const perAcctQueues = [...byAddr.values()].map(items => [...items]);
  const seq = [];
  while (perAcctQueues.some(q => q.length > 0)) {
    for (const q of perAcctQueues) {
      if (q.length) seq.push(q.shift());
    }
  }

  const results = [];
  const INTERVAL_MS = 1500;
  for (let i = 0; i < seq.length; i++) {
    const { acct, recipient } = seq[i];
    const n = nonceByAddr.get(acct.address);
    const r = await broadcastTransfer(acct, recipient, n);
    results.push({
      acctIdx: acct.idx,
      from: acct.address,
      to: recipient,
      amount: TRANSFER_AMOUNT.toString(),
      nonce: n.toString(),
      ...r,
    });
    if (r.ok) {
      console.log(`  [${i + 1}/${seq.length}] #${acct.idx} ${acct.address.slice(0, 10)} -> ${recipient.slice(0, 10)} n=${n} -> ${r.txid}`);
    } else {
      console.log(`  [${i + 1}/${seq.length}] #${acct.idx} ${acct.address.slice(0, 10)} -> ${recipient.slice(0, 10)} n=${n} -> FAIL ${r.error}`);
    }
    nonceByAddr.set(acct.address, n + 1n);
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);
  console.log(`\n=== Broadcast complete: ${ok.length} accepted, ${fail.length} rejected ===`);

  fs.writeFileSync('./sim-sip010-100-results.json', JSON.stringify({
    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
    fee: FEE.toString(),
    transferAmount: TRANSFER_AMOUNT.toString(),
    broadcastedAt: new Date().toISOString(),
    accepted: ok.length,
    rejected: fail.length,
    results,
  }, null, 2));
  console.log('Results saved to sim-sip010-100-results.json');