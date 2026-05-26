const { makeContractCall, AnchorMode, PostConditionMode, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'stack-wallet-v2';
const FEE = 3000n; // 0.003 STX per tx
const TOTAL_TXS = 200;
const MIN_BALANCE_USTX = 12000; // ~3 txs worth of fees (9000) + buffer
const API = 'https://api.hiro.so';

const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));

async function fetchJsonWithRetry(url, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
