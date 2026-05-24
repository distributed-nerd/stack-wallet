// Local-only: derive the master STX private key from a mnemonic and verify the address.
// Reads the mnemonic from env var MASTER_MNEMONIC so it never lands in the source file.
const { generateWallet } = require('@stacks/wallet-sdk');
const { privateKeyToAddress } = require('@stacks/transactions');

async function main() {
  const mnemonic = process.env.MASTER_MNEMONIC;
  if (!mnemonic) {
    console.error('MASTER_MNEMONIC env var is required');
    process.exit(1);
  }

  const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
  const account = wallet.accounts[0];
  const stxPrivateKey = account.stxPrivateKey;
  const address = privateKeyToAddress(stxPrivateKey, 'mainnet');

  console.log(JSON.stringify({ address, stxPrivateKey }));
}

main().catch((e) => { console.error(e); process.exit(1); });
