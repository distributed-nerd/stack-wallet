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

async function checkTransactionStatus(txid) {
  try {
    const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/tx/${txid}`);
    if (!response.ok) return 'pending';
    const data = await response.json();
    return data.tx_status;
  } catch (e) {
    return 'error';
  }
}

async function sendTransaction(account, recipientAddr, nonce) {
  let attempts = 0;
  while (attempts < 8) {
    try {
      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'transfer',
        functionArgs: [
          uintCV(AMOUNT),
          principalCV(account.address),
          principalCV(recipientAddr),
          noneCV()
        ],
        senderKey: account.privateKey,
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        fee: FEE,
        nonce: nonce,
        postConditionMode: PostConditionMode.Allow
      };

      const transaction = await makeContractCall(txOptions);
      const serializedTx = transaction.serialize();
      
      const response = await fetch(`https://api.mainnet.hiro.so/v2/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: serializedTx
      });

      const text = await response.text();
      let broadcastResponse;
      try {
        broadcastResponse = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (broadcastResponse.error || broadcastResponse.reason) {
        const error = broadcastResponse.reason || broadcastResponse.error;
        if (error === 'ConflictingNonceInMempool') {
            return { status: 'success', txid: 'mempool', alreadyInMempool: true };
        }
        throw new Error(JSON.stringify(error));
      }
      
      return { status: 'success', txid: broadcastResponse.txid || broadcastResponse };
    } catch (e) {
      attempts++;
      console.warn(`    ! Broadcast Error [Account ${account.id}]: ${e.message} (attempt ${attempts})`);
      await new Promise(r => setTimeout(r, 5000 * attempts));
    }
  }
  return { status: 'failed', error: 'Max retries reached' };
}

async function runSimulation() {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  const numAccounts = accounts.length;
  
  let state = { rounds: [] };
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
      console.log(`Resuming simulation from ${RESULTS_FILE}`);
    } catch (e) {}
  }
}
