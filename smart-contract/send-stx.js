const { makeSTXTokenTransfer, broadcastTransaction, AnchorMode } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fs = require('fs');

const MASTER_PRIVATE_KEY = process.env.MASTER_PRIVATE_KEY || '';
const AMOUNT_MICROSTX = 200000; // 0.2 STX
const FEE_MICROSTX = 10000; // 0.01 STX fee per transaction
const STARTING_NONCE = 323; // Current nonce from blockchain
const THROTTLE_MS = 1500; // per-broadcast throttle for Hiro public API

async function broadcastWithRetry(transaction) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await broadcastTransaction({ transaction, network: STACKS_MAINNET });
      if (result && result.error) {
        return { ok: false, error: `${result.error}: ${result.reason}`, detail: result.reason_data };
      }
      const txid = typeof result === 'string' ? result : result.txid;
      return { ok: true, txid };
    } catch (e) {
      lastErr = e;
      const msg = String(e?.cause?.message || e?.message || e);
      const rateLimited = msg.includes('Per-minute') || msg.includes('429') || msg.includes('rate');
      if (!rateLimited && attempt > 0) break;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return { ok: false, error: String(lastErr?.message || lastErr) };
}

async function sendSTX() {
  if (!MASTER_PRIVATE_KEY) {
    console.error('MASTER_PRIVATE_KEY env var is required');
    process.exit(1);
  }

  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  const results = [];

  console.log(`Sending 0.2 STX to ${accounts.length} accounts...`);
  console.log(`Starting nonce: ${STARTING_NONCE}`);
  console.log(`Total cost: ${(accounts.length * (AMOUNT_MICROSTX + FEE_MICROSTX)) / 1000000} STX\n`);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const nonce = BigInt(STARTING_NONCE + i);

    try {
      const transaction = await makeSTXTokenTransfer({
        recipient: account.address,
        amount: BigInt(AMOUNT_MICROSTX),
        senderKey: MASTER_PRIVATE_KEY,
        network: STACKS_MAINNET,
        anchorMode: AnchorMode.Any,
        fee: BigInt(FEE_MICROSTX),
        nonce,
      });

      const r = await broadcastWithRetry(transaction);

      if (r.ok) {
        console.log(`✓ Account ${account.id} (nonce ${nonce}): ${account.address}`);
        console.log(`  TxID: ${r.txid}`);
        results.push({ account: account.id, address: account.address, nonce: nonce.toString(), txid: r.txid, status: 'success' });
      } else {
        console.error(`✗ Account ${account.id} (nonce ${nonce}): ${account.address}`);
        console.error(`  Error: ${r.error}`);
        results.push({ account: account.id, address: account.address, nonce: nonce.toString(), error: r.error, status: 'failed' });
      }
    } catch (error) {
      console.error(`✗ Account ${account.id} (nonce ${nonce}): ${account.address}`);
      console.error(`  Error: ${error.message}`);
      results.push({ account: account.id, address: account.address, nonce: nonce.toString(), error: error.message, status: 'failed' });
    }

    await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
  }

  fs.writeFileSync('./transfer-results.json', JSON.stringify(results, null, 2));
  console.log('\nTransfer complete! Results saved to transfer-results.json');

  const successful = results.filter(r => r.status === 'success').length;
  console.log(`\nSummary: ${successful}/${accounts.length} transfers successful`);
  console.log(`Total STX sent: ${(successful * AMOUNT_MICROSTX) / 1000000} STX`);
  console.log(`Total fees paid: ${(successful * FEE_MICROSTX) / 1000000} STX`);
}

sendSTX().catch((e) => { console.error(e); process.exit(1); });
