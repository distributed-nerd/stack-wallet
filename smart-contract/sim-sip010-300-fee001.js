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
const FEE = 1000n;                  // 0.001 STX
const TRANSFER_AMOUNT = 1000n;      // 0.001 STK (token has 6 decimals)
const TOTAL_TXS = 300;
