const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  contractPrincipalCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const HYBRID_CONTRACT_NAME = 'hybrid-stack-wallet';
const TOKEN_CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const TOKEN_CONTRACT_NAME = 'sip010-token';
const TOKEN_ID = `${TOKEN_CONTRACT_ADDRESS}.${TOKEN_CONTRACT_NAME}::stack-token`;
const FEE = 5000n;
const TOTAL_TXS = 100;
const MIN_STX_USTX = 35000;
const MIN_TOKEN = 10000n;
const API = 'https://api.hiro.so';
const INTERVAL_MS = 1500;

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

async function broadcastHybridCall(account, fnName, nonce) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: HYBRID_CONTRACT_NAME,
    functionName: fnName,
    functionArgs: [
      contractPrincipalCV(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_NAME),
    ],
    senderKey: account.privateKey,
    network: STACKS_MAINNET,
