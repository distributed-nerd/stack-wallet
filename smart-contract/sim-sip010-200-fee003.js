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
const FEE = 3000n;                  // 0.003 STX
const TRANSFER_AMOUNT = 1000n;      // 0.001 STK (token has 6 decimals)
const TOTAL_TXS = 200;
const MIN_STX_USTX = 15000;         // ~4 txs worth of fee (12000) + buffer
const MIN_TOKEN = TRANSFER_AMOUNT * 5n; // enough for 4 transfers + buffer
