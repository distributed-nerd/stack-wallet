const { makeContractCall, AnchorMode, PostConditionMode, uintCV, principalCV, noneCV } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fs = require('fs');
const fetch = require('node-fetch');
global.fetch = fetch;

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'sip010-token';
const AMOUNT = 1000000n; // 1 token
const FEE = 1000n;      // 0.001 STX
const ACCOUNTS_FILE = './accounts.json';
const NETWORK = STACKS_MAINNET;
const RESULTS_FILE = './simulation-persistence.json';

async function getNonce(address) {
  let attempts = 0;
  while (attempts < 5) {
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/nonces`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return BigInt(data.possible_next_nonce);
    } catch (e) {
      attempts++;
      console.warn(`    ! Nonce fetch Error [${address}]: ${e.message} (attempt ${attempts})`);
      await new Promise(r => setTimeout(r, 3000 * attempts));
    }
  }
  return null;
}
