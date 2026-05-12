const transactions = require('@stacks/transactions');
const network = require('@stacks/network');
const fs = require('fs');

const MASTER_PRIVATE_KEY = '8a51fdd22d780af5859e7406cf6bec0ff32edd6ede9353ab2afb0894b0be29b401';
const TOKEN_CONTRACT = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6.sip010-token';
const AMOUNT_PER_ACCOUNT = 10000000; // 10 tokens with 6 decimals
const FEE_MICROSTX = 10000; // 0.01 STX fee per transaction
const STARTING_NONCE = 40; // Current nonce (after previous transactions)

async function mintTokens() {
  // Read generated accounts
  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  
  const stacksNetwork = network.createNetwork({
    url: 'https://api.hiro.so',
    chainId: network.ChainId.Mainnet
  });
  
  const results = [];
  
  console.log(`Minting 10 tokens to ${accounts.length} accounts...`);
  console.log(`Starting nonce: ${STARTING_NONCE}`);
  console.log(`Token contract: ${TOKEN_CONTRACT}\n`);
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    
    // Skip if address is null
    if (!account.address || account.address === 'null') {
      console.log(`✗ Account ${account.id}: Invalid address`);
      results.push({
        account: account.id,
        error: 'Invalid address',
        status: 'skipped'
      });
      continue;
    }
    
    try {
      const [contractAddress, contractName] = TOKEN_CONTRACT.split('.');
      
      const txOptions = {
        contractAddress: contractAddress,
        contractName: contractName,
        functionName: 'mint',
        functionArgs: [
          transactions.uintCV(AMOUNT_PER_ACCOUNT),
          transactions.principalCV(account.address)
        ],
        senderKey: MASTER_PRIVATE_KEY,
        network: stacksNetwork,
        anchorMode: transactions.AnchorMode.Any,
        fee: BigInt(FEE_MICROSTX),
        nonce: BigInt(STARTING_NONCE + i),
        postConditionMode: transactions.PostConditionMode.Allow
      };
      
      const transaction = await transactions.makeContractCall(txOptions);
      const broadcastResponse = await transactions.broadcastTransaction(transaction, stacksNetwork);
      
      if (broadcastResponse.error) {
        console.log(`✗ Account ${account.id}: ${account.address}`);
        console.log(`  Error: ${broadcastResponse.reason || broadcastResponse.error}`);
        results.push({
          account: account.id,
          address: account.address,
          error: broadcastResponse.reason || broadcastResponse.error,
          status: 'failed'
        });
      } else {
        console.log(`✓ Account ${account.id}: ${account.address}`);
        console.log(`  TxID: ${broadcastResponse.txid || broadcastResponse}`);
        results.push({
          account: account.id,
          address: account.address,
          txid: broadcastResponse.txid || broadcastResponse,
          status: 'success'
        });
      }
      
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
  fs.writeFileSync('./mint-results.json', JSON.stringify(results, null, 2));
  console.log('\nMinting complete! Results saved to mint-results.json');
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  
  console.log(`\nSummary:`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total tokens minted: ${successful * 10}`);
  console.log(`  Total fees paid: ${(successful * FEE_MICROSTX) / 1000000} STX`);
}

mintTokens().catch(console.error);
