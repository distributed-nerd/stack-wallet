const { getAddressFromPrivateKey, TransactionVersion } = require('@stacks/transactions');
const fetch = require('node-fetch');
const fs = require('fs');

const MASTER_PRIVATE_KEY = 'YOUR_MASTER_PRIVATE_KEY_HERE';
const TOKEN_IDENTIFIER = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6.sip010-token::stack-token';

async function getBalance(address) {
  try {
    const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    const stxBalance = parseInt(data.stx.balance) / 1000000;
    
    let tokenBalance = 0;
    if (data.fungible_tokens && data.fungible_tokens[TOKEN_IDENTIFIER]) {
      tokenBalance = parseInt(data.fungible_tokens[TOKEN_IDENTIFIER].balance) / 1000000;
    }
    
    return { stx: stxBalance, token: tokenBalance };
  } catch (error) {
    return { stx: 0, token: 0, error: error.message };
  }
}

async function report() {
  let masterAddress;
  try {
    const { TransactionVersion } = require('@stacks/transactions');
    masterAddress = getAddressFromPrivateKey(MASTER_PRIVATE_KEY, TransactionVersion.Mainnet);
  } catch (e) {
    // Fallback if TransactionVersion is structured differently
    masterAddress = getAddressFromPrivateKey(MASTER_PRIVATE_KEY);
  }
  console.log(`Master Account: ${masterAddress}\n`);

  const masterBalance = await getBalance(masterAddress);
  console.log(`Master STX: ${masterBalance.stx.toFixed(6)} STX`);
  console.log(`Master STK: ${masterBalance.token.toFixed(6)} STK`);
  console.log('-----------------------------------------\n');

  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  console.log(`Checking ${accounts.length} farming accounts...\n`);

  const results = [];
  for (const account of accounts) {
    const balance = await getBalance(account.address);
    console.log(`[Account ${account.id}] ${account.address}: ${balance.stx.toFixed(6)} STX | ${balance.token.toFixed(6)} STK`);
    results.push({
      id: account.id,
      address: account.address,
      ...balance
    });
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const totalStx = results.reduce((sum, acc) => sum + acc.stx, 0) + masterBalance.stx;
  const totalStk = results.reduce((sum, acc) => sum + acc.token, 0) + masterBalance.token;

  console.log('\n=========================================');
  console.log('TOTAL SUMMARY:');
  console.log(`Total STX: ${totalStx.toFixed(6)} STX`);
  console.log(`Total STK: ${totalStk.toFixed(6)} STK`);
  console.log('=========================================');
}

report().catch(console.error);
