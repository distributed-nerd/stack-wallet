const { makeContractCall, broadcastTransaction, AnchorMode, PostConditionMode, uintCV, principalCV, noneCV } = require('@stacks/transactions');
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
      console.warn(`    ! Nonce fetch failed for ${address} (attempt ${attempts}): ${e.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempts));
    }
  }
  return null;
}

async function sendTransaction(account, recipientAddr, nonce) {
  let attempts = 0;
  while (attempts < 5) {
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
      if (!transaction) throw new Error('makeContractCall returned undefined');
      
      const serializedTx = transaction.serialize();
      
      const response = await fetch(`https://api.mainnet.hiro.so/v2/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: serializedTx
      });

      const responseText = await response.text();
      let broadcastResponse;
      try {
        broadcastResponse = JSON.parse(responseText);
      } catch (e) {
        broadcastResponse = responseText;
      }

      if (typeof broadcastResponse === 'object' && (broadcastResponse.error || broadcastResponse.reason)) {
        const error = broadcastResponse.reason || broadcastResponse.error;
        if (error === 'ConflictingNonceInMempool') {
            return { status: 'success', txid: 'skipped (already in mempool)', alreadyInMempool: true };
        }
        throw new Error(JSON.stringify(error));
      }
      
      const txid = broadcastResponse.txid || broadcastResponse;
      return { status: 'success', txid: txid };
    } catch (e) {
      if (e.message.includes('fetch failed') || e.message.includes('ECONNRESET') || e.message.includes('ETIMEDOUT')) {
        attempts++;
        console.warn(`    ! Broadcast failed (attempt ${attempts}): ${e.message}`);
        await new Promise(r => setTimeout(r, 4000 * attempts));
      } else {
        return { status: 'failed', error: e.message };
      }
    }
  }
  return { status: 'failed', error: 'Max retries reached' };
}

async function runRedo() {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  const numAccounts = accounts.length;
  
  console.log(`Starting Robust Re-execution for 100 transactions (sequential pattern)...`);
  
  for (let round = 1; round <= 2; round++) {
    console.log(`\n>>> ROUND ${round}`);
    for (let i = 0; i < numAccounts; i++) {
      const account = accounts[i];
      const nextIdx = (i + 1) % numAccounts;
      const recipientAddr = accounts[nextIdx].address;
      
      console.log(`[Account ${account.id}] ${account.address} -> ${recipientAddr}`);
      
      const nonce = await getNonce(account.address);
      if (nonce === null) {
        console.error(`  ✗ Skipping account ${account.id}: Could not fetch nonce`);
        continue;
      }
      
      // We assume each account needs 1 transaction per round.
      // In the first round, if we already sent it, the nonce will be higher.
      // But we'll just try to send and handle "ConflictingNonceInMempool".
      
      const result = await sendTransaction(account, recipientAddr, nonce);
      if (result.status === 'success') {
        console.log(`  ✓ Success: ${result.txid}`);
      } else {
        console.error(`  ✗ Failed: ${result.error}`);
      }
      
      // Adaptive delay
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`\nRound ${round} broadcast finished. waiting 60s before next round...`);
    await new Promise(r => setTimeout(r, 60000));
  }
  
  console.log(`\nRobust Re-execution Finished!`);
}

runRedo().catch(console.error);
