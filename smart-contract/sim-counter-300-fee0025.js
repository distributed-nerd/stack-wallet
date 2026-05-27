const { makeContractCall, AnchorMode, PostConditionMode, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'stack-wallet-v2';
const FEE = 2500n; // 0.0025 STX per tx
const TOTAL_TXS = 300;
const MIN_BALANCE_USTX = 18000; // ~6 txs worth of fees (15000) + buffer
const API = 'https://api.hiro.so';
