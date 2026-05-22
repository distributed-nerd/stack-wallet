const { makeContractCall, AnchorMode, PostConditionMode, uintCV, principalCV, noneCV, broadcastTransaction } = require('@stacks/transactions');
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
const RESULTS_FILE = './simulation-persistence-600.json';
const TOTAL_ROUNDS = 12; // 12 rounds * 50 accounts = 600 transactions

async function getNonce(address) {
  let attempts = 0;
  while (attempts < 10) {
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/nonces`);
      if (response.status === 429) {
          console.warn(`    ! Rate limit hit (429) on nonce fetch. Waiting 15s...`);
          await new Promise(r => setTimeout(r, 15000));
          attempts++;
          continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return BigInt(data.possible_next_nonce);
    } catch (e) {
      attempts++;
      console.warn(`    ! Nonce fetch Error [${address}]: ${e.message} (attempt ${attempts})`);
      await new Promise(r => setTimeout(r, 5000 * attempts));
    }
  }
  return null;
}

async function checkTransactionStatus(txid) {
  try {
    const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/tx/${txid}`);
    if (response.status === 429) {
        await new Promise(r => setTimeout(r, 10000));
        return 'pending';
    }
    if (!response.ok) return 'pending';
    const data = await response.json();
    return data.tx_status;
  } catch (e) {
    return 'error';
  }
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
        if (typeof error === 'object' && error.message && error.message.includes('rate limit')) {
            console.warn(`    ! Rate limit hit on broadcast. Waiting 20s...`);
            await new Promise(r => setTimeout(r, 20000));
            attempts++;
            continue;
        }
        throw new Error(typeof error === "string" ? error : JSON.stringify(error));
      }
      
      return { status: 'success', txid: broadcastResponse.txid || broadcastResponse };
    } catch (e) {
      if (e.message.includes('rate limit') || e.message.includes('429')) {
          await new Promise(r => setTimeout(r, 20000));
          attempts++;
          continue;
      }
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
  
  console.log(`\n==================================================================`);
  console.log(`SIMULATION 600: 600 Transactions (12 Rounds)`);
  console.log(`==================================================================\n`);
  
  for (let roundNum = 1; roundNum <= TOTAL_ROUNDS; roundNum++) {
    let round = state.rounds.find(r => r.round === roundNum);
    if (!round) {
      round = { round: roundNum, transactions: [] };
      state.rounds.push(round);
    }

    if (round.confirmed) {
      console.log(`>>> ROUND ${roundNum} ALREADY CONFIRMED. Skipping.`);
      continue;
    }

    console.log(`>>> ROUND ${roundNum}: Processing 50 Transactions...`);
    
    for (let i = 0; i < numAccounts; i++) {
        const account = accounts[i];
        if (round.transactions.find(t => t.id === account.id && t.status !== 'failed')) {
            // Already processed this account in this round
            continue;
        }

        const nextIdx = (i + 1) % numAccounts;
        const recipientAddr = accounts[nextIdx].address;
        
        const nonce = await getNonce(account.address);
        if (nonce === null) {
            console.error(`  [Account ${account.id}] ✗ Nonce failure`);
            continue;
        }
        
        const result = await sendTransaction(account, recipientAddr, nonce);
        if (result.status === 'success') {
            console.log(`  [Account ${account.id}] ✓ ${result.txid === 'mempool' ? 'Already in Mempool' : 'Broadcasted: ' + result.txid}`);
            round.transactions.push({ id: account.id, txid: result.txid, status: 'broadcasted' });
        } else {
            console.error(`  [Account ${account.id}] ✗ Failed: ${result.error}`);
            round.transactions.push({ id: account.id, error: result.error, status: 'failed' });
        }
        
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(state, null, 2));
        await new Promise(r => setTimeout(r, 2000)); // Increased delay between broadcasts
    }

    console.log(`\nRound ${roundNum} broadcast phase complete. Waiting for block confirmations...`);
    
    let allConfirmed = false;
    let pollCount = 0;
    while (!allConfirmed && pollCount < 240) { // Max 240 mins (4 hours)
      allConfirmed = true;
      let pendingCount = 0;
      
      for (const tx of round.transactions) {
        if (tx.status === 'broadcasted' && tx.txid !== 'mempool') {
          const status = await checkTransactionStatus(tx.txid);
          if (status === 'success') {
            tx.status = 'confirmed';
          } else {
            allConfirmed = false;
            pendingCount++;
          }
        }
      }
      
      if (!allConfirmed) {
        pollCount++;
        process.stdout.write(`\r  (${pendingCount}/${round.transactions.length} pending... Elapsed: ${pollCount}m)    `);
        await new Promise(r => setTimeout(r, 60000));
      } else {
        console.log(`\n\n✓ ALL ROUND ${roundNum} TRANSACTIONS CONFIRMED!`);
        round.confirmed = true;
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(state, null, 2));
      }
    }
    
    if (roundNum < TOTAL_ROUNDS) {
      console.log(`\nWaiting 30 seconds before next round...`);
      await new Promise(r => setTimeout(r, 30000));
    }
  }
  
  console.log(`\n==================================================================`);
  console.log(`SIMULATION FINISHED SUCCESSFULLY!`);
  console.log(`==================================================================\n`);
}

runSimulation().catch(console.error);
// Incremental update part 1
// Incremental update part 2
// Incremental update part 3
// Incremental update part 4
// Incremental update part 5
// Incremental update part 6
// Incremental update part 7
// Incremental update part 8
// Incremental update part 9
// Incremental update part 10
// Incremental update part 11
// Incremental update part 12
// Incremental update part 13
// Incremental update part 14
// Incremental update part 15
// Incremental update part 16
// Incremental update part 17
// Incremental update part 18
// Incremental update part 19
// Incremental update part 20
// Incremental update part 21
