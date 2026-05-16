const { makeSTXTokenTransfer, broadcastTransaction, AnchorMode } = require('@stacks/transactions');
const { createNetwork, STACKS_MAINNET } = require('@stacks/network');
const fs = require('fs');
const fetch = require('node-fetch');
global.fetch = fetch;

async function simulateBatch() {
  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  const network = STACKS_MAINNET;
  const recipient = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6'; // Recipient from simulate-interactions.sh
  const amount = 1n; // 1 micro-STX
  const fee = 100n; // Increasing fee to 100 micro-STX to avoid potential mempool rejection, total 0.01 STX (still cheap)
  
  console.log(`Starting batch simulation of 100 transactions from 50 accounts...`);
  console.log(`Each transaction: ${amount} micro-STX amount + ${fee} micro-STX fee`);
  console.log(`Total fee cost: ${(BigInt(100) * fee).toString()} micro-STX (0.01 STX)\n`);

  const results = [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    console.log(`[Account ${account.id}/50] ${account.address} processing...`);

    // Fetch account info for current nonce
    let currentNonce = 0n;
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${account.address}/nonce`);
      if (response.ok) {
        const data = await response.json();
        currentNonce = data.possible_next_nonce !== undefined ? BigInt(data.possible_next_nonce) : 0n;
      }
    } catch (e) {
      console.warn(`  ! Could not fetch nonce for ${account.address}, starting at 0. Error: ${e.message}`);
    }

    for (let txIndex = 0; txIndex < 2; txIndex++) {
      try {
        const txOptions = {
          recipient,
          amount,
          senderKey: account.privateKey,
          network,
          anchorMode: AnchorMode.Any,
          fee,
          nonce: currentNonce + BigInt(txIndex)
        };

        const transaction = await makeSTXTokenTransfer(txOptions);
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
          throw new Error(`Broadcast failed with non-JSON response: ${responseText}`);
        }

        if (broadcastResponse.error || broadcastResponse.reason) {
          throw new Error(broadcastResponse.reason || broadcastResponse.error || 'Unknown broadcast error');
        }

        const txid = broadcastResponse.txid || `0x${broadcastResponse}`; // Some responses might vary
        console.log(`  ✓ Tx ${txIndex + 1}: ${txid}`);
        results.push({
          account: account.id,
          tx: txIndex + 1,
          txid: txid,
          status: 'success'
        });

      } catch (error) {
        console.error(`  ✗ Tx ${txIndex + 1} Failed: ${error.stack || error.message}`);
        results.push({
          account: account.id,
          tx: txIndex + 1,
          error: error.message,
          status: 'failed'
        });
      }
      
      // Wait a bit to avoid rate limiting and allow node to process
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Save results
  fs.writeFileSync('./simulation-results.json', JSON.stringify(results, null, 2));
  
  const successful = results.filter(r => r.status === 'success').length;
  console.log('\n=========================================');
  console.log(`Simulation complete!`);
  console.log(`Total Transactions: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${results.length - successful}`);
  console.log(`Total Fees Paid: ${(BigInt(successful) * fee).toString()} micro-STX`);
  console.log(`Results saved to simulation-results.json`);
  console.log('=========================================\n');
}

simulateBatch().catch(console.error);
