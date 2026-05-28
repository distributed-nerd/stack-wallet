const { makeContractCall, AnchorMode, PostConditionMode, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'stack-wallet-v2';
const FEE = 5000n; // 0.005 STX per tx
const TOTAL_TXS = 300;
const MIN_BALANCE_USTX = 10000; // ~2 txs worth of fees buffer
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
