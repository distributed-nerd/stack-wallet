const { makeSTXTokenTransfer, broadcastTransaction, AnchorMode } = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');
const fs = require('fs');

const MASTER_PRIVATE_KEY = '8a51fdd22d780af5859e7406cf6bec0ff32edd6ede9353ab2afb0894b0be29b401';
const AMOUNT_MICROSTX = 100000; // 0.1 STX
const FEE_MICROSTX = 1000; // 0.001 STX fee per transaction
const STARTING_NONCE = 10; // Current nonce from blockchain

async function sendSTX() {
  // Read generated accounts
  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  
  const stacksNetwork = new StacksMainnet();
  const results = [];
  
  console.log(`Sending 0.1 STX to ${accounts.length} accounts...`);
  console.log(`Starting nonce: ${STARTING_NONCE}`);
  console.log(`Total cost: ${(accounts.length * (AMOUNT_MICROSTX + FEE_MICROSTX)) / 1000000} STX\n`);
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    
    try {
      const txOptions = {
        recipient: account.address,
        amount: BigInt(AMOUNT_MICROSTX),
        senderKey: MASTER_PRIVATE_KEY,
        network: stacksNetwork,
        anchorMode: AnchorMode.Any,
        fee: BigInt(FEE_MICROSTX),
        nonce: BigInt(STARTING_NONCE + i) // Increment nonce for each transaction
      };
      
      const transaction = await makeSTXTokenTransfer(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, stacksNetwork);
      
      console.log(`✓ Account ${account.id}: ${account.address}`);
      console.log(`  TxID: ${broadcastResponse.txid}`);
      
      results.push({
        account: account.id,
        address: account.address,
        txid: broadcastResponse.txid,
        status: 'success'
      });
      
      // Wait a bit between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`✗ Account ${account.id}: ${account.address}`);
      console.error(`  Error: ${error.message}`);
      
      results.push({
        account: account.id,
        address: account.address,
        error: error.message,
        status: 'failed'
      });
    }
  }
  
  // Save results
  fs.writeFileSync('./transfer-results.json', JSON.stringify(results, null, 2));
  console.log('\nTransfer complete! Results saved to transfer-results.json');
  
  const successful = results.filter(r => r.status === 'success').length;
  console.log(`\nSummary: ${successful}/${accounts.length} transfers successful`);
  console.log(`Total STX sent: ${(successful * AMOUNT_MICROSTX) / 1000000} STX`);
  console.log(`Total fees paid: ${(successful * FEE_MICROSTX) / 1000000} STX`);
}

sendSTX().catch(console.error);
