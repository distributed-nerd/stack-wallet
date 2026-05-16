const fetch = require('node-fetch');
const fs = require('fs');

async function checkBalances() {
  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  const insufficient = [];
  const minRequired = 20; // 20 micro-STX for 2 transactions of 10 micro-STX each

  console.log(`Checking balances for ${accounts.length} accounts...\n`);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${account.address}/balances`);
      const data = await response.json();
      const balance = parseInt(data.stx.balance);
      
      const status = balance >= minRequired ? '✓' : '✗';
      console.log(`${status} [Account ${account.id}] ${account.address}: ${balance} micro-STX`);

      if (balance < minRequired) {
        insufficient.push({
          id: account.id,
          address: account.address,
          balance: balance
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error checking balance for ${account.address}:`, error.message);
    }
  }

  console.log('\n=========================================');
  if (insufficient.length === 0) {
    console.log('All accounts have sufficient funds for the simulation!');
  } else {
    console.log(`${insufficient.length} accounts have insufficient funds (need min 20 micro-STX):`);
    insufficient.forEach(acc => {
      console.log(`  - Account ${acc.id} (${acc.address}): ${acc.balance} micro-STX`);
    });
  }
  console.log('=========================================\n');
}

checkBalances().catch(console.error);
