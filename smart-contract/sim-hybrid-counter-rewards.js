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
