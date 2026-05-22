const { execSync } = require('child_process');
const fs = require('fs');
const fetch = require('node-fetch');

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'sip010-token';
const AMOUNT = "1000000";
const FEE = "1000";
const ACCOUNTS_FILE = './accounts.json';
const RESULTS_FILE = './simulation-persistence-600.json';
const TOTAL_ROUNDS = 12;

async function getNonce(address) {
  let attempts = 0;
  while (attempts < 10) {
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/nonces`);
      if (response.status === 429) {
          await new Promise(r => setTimeout(r, 15000));
          attempts++;
          continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.possible_next_nonce;
    } catch (e) {
      attempts++;
      await new Promise(r => setTimeout(r, 3000 * attempts));
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

function sendTransactionCLI(account, recipientAddr, nonce) {
  try {
    const args = `u${AMOUNT}, '${account.address}, '${recipientAddr}, none`;
    const cmd = `stx call_contract_func ${CONTRACT_ADDRESS} ${CONTRACT_NAME} transfer ${FEE} ${nonce} ${account.privateKey} "${args}"`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const txidMatch = output.match(/txid: '(0x[0-9a-f]+)'/);
    if (txidMatch) {
      return { status: 'success', txid: txidMatch[1].replace('0x', '') };
    }
    try {
      const cleaned = output.replace(/'/g, '"').replace(/([a-zA-Z0-9]+):/g, '"":');
      const parsed = JSON.parse(cleaned);
      if (parsed.txid) return { status: 'success', txid: parsed.txid.replace('0x', '') };
    } catch(e) {}
    return { status: 'failed', error: output };
  } catch (e) {
    return { status: 'failed', error: e.message };
  }
}

async function runSimulation() {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  const numAccounts = accounts.length;
  let state = { rounds: [] };
  if (fs.existsSync(RESULTS_FILE)) {
    try { state = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch (e) {}
  }
  console.log(`\n==================================================================`);
  console.log(`CLI SIMULATION 600: 600 Transactions (12 Rounds)`);
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
        if (round.transactions.find(t => t.id === account.id && t.status !== 'failed')) continue;
        const nextIdx = (i + 1) % numAccounts;
        const recipientAddr = accounts[nextIdx].address;
        const nonce = await getNonce(account.address);
        if (nonce === null) {
            console.error(`  [Account ${account.id}] ✗ Nonce failure`);
            continue;
        }
        const result = sendTransactionCLI(account, recipientAddr, nonce);
        if (result.status === 'success') {
            console.log(`  [Account ${account.id}] ✓ Broadcasted: ${result.txid}`);
            round.transactions.push({ id: account.id, txid: result.txid, status: 'broadcasted' });
        } else {
            if (result.error.includes('ConflictingNonceInMempool')) {
                 console.log(`  [Account ${account.id}] ✓ Already in Mempool`);
                 round.transactions.push({ id: account.id, txid: 'mempool', status: 'broadcasted' });
            } else {
                 console.error(`  [Account ${account.id}] ✗ Failed: ${result.error}`);
                 round.transactions.push({ id: account.id, error: result.error, status: 'failed' });
            }
        }
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(state, null, 2));
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log(`\nRound ${roundNum} broadcast finished. Waiting for confirmations...`);
    let allConfirmed = false;
    let pollCount = 0;
    while (!allConfirmed && pollCount < 240) {
      allConfirmed = true;
      let pendingCount = 0;
      for (const tx of round.transactions) {
        if (tx.status === 'broadcasted' && tx.txid !== 'mempool') {
          const status = await checkTransactionStatus(tx.txid);
          if (status === 'success') tx.status = 'confirmed';
          else { allConfirmed = false; pendingCount++; }
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
    if (roundNum < TOTAL_ROUNDS) await new Promise(r => setTimeout(r, 30000));
  }
}

runSimulation().catch(console.error);
