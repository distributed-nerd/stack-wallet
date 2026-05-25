const { makeContractCall, AnchorMode, PostConditionMode, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'stack-wallet-v2';
const FEE = 10000n; // 0.01 STX per tx
const TOTAL_TXS = 150;
const MIN_BALANCE_USTX = 35000; // need >= 3 txs worth of fees (30000) + buffer
const API = 'https://api.hiro.so';

const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));