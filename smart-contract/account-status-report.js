const fetch = require('node-fetch');
const fs = require('fs');

async function reportAccounts() {
  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  const report = [];

  console.log(`Analyzing ${accounts.length} accounts...\n`);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${account.address}/balances`);
      const data = await response.json();
      const stxBalance = parseInt(data.stx.balance);
      
      const nonceResponse = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${account.address}/nonce`);
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.possible_next_nonce;

      process.stdout.write('.');
      report.push({
        id: account.id,
        address: account.address,
        balance: stxBalance,
        nonce: nonce
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`\nError checking ${account.address}:`, error.message);
    }
  }

  console.log('\n\nReporting Results:');
  console.log('ID | Address | Balance (uSTX) | Nonce');
  console.log('---|---------|----------------|-------');
  report.forEach(acc => {
    console.log(`${acc.id} | ${acc.address} | ${acc.balance} | ${acc.nonce}`);
  });

  fs.writeFileSync('./detailed-report.json', JSON.stringify(report, null, 2));
}

reportAccounts().catch(console.error);
