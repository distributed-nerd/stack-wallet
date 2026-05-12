const { generateSecretKey, generateWallet } = require('@stacks/wallet-sdk');
const transactions = require('@stacks/transactions');

async function generateAccounts() {
  const accounts = [];

  for (let i = 0; i < 50; i++) {
    const secretKey = generateSecretKey();
    const wallet = await generateWallet({
      secretKey,
      password: 'temp-password'
    });
    
    const account = wallet.accounts[0];
    const address = transactions.getAddressFromPrivateKey(account.stxPrivateKey);
    
    accounts.push({
      id: i + 1,
      address: address,
      privateKey: account.stxPrivateKey,
      mnemonic: secretKey
    });
  }

  console.log(JSON.stringify(accounts, null, 2));
}

generateAccounts().catch(console.error);
