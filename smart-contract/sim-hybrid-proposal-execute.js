const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  uintCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const HYBRID_CONTRACT_NAME = 'hybrid-stack-wallet';
const FEE = 2500n;
