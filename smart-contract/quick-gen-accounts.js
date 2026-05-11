const { generateSecretKey, generateWallet } = require('@stacks/wallet-sdk');
const transactions = require('@stacks/transactions');

async function generateAccounts() {
  const accounts = [];

  for (let i = 0; i < 50; i++) {
    const secretKey = generateSecretKey();
    const wallet = await generateWallet({
      secretKey,
      password: 'temp'
    });
    
    const account = wallet.accounts[0];
    // Derive mainnet address
    const address = transactions.getAddressFromPrivateKey(account.stxPrivateKey);
    
    accounts.push({
      id: i + 1,
      address: address,
      privateKey: account.stxPrivateKey
    });
    
    if ((i + 1) % 10 === 0) {
      console.error(`Generated ${i + 1}/50 accounts...`);
    }
  }

  console.log(JSON.stringify(accounts, null, 2));
}

generateAccounts().catch(console.error);
