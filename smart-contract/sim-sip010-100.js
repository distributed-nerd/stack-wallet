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