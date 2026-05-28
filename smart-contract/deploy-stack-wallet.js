const { makeContractDeploy, AnchorMode, PostConditionMode, broadcastTransaction, getAddressFromPrivateKey } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const fetch = require('node-fetch');
const fs = require('fs');

const EXPECTED_ADDRESS = process.env.STACKS_EXPECTED_ADDRESS;

async function loadPrivateKey() {
  if (process.env.STACKS_PRIVATE_KEY) return process.env.STACKS_PRIVATE_KEY;

  const tomlPath = './settings/Mainnet.toml';
  if (!fs.existsSync(tomlPath)) {
    console.error(`ERROR: no STACKS_PRIVATE_KEY env var and ${tomlPath} not found.`);
    process.exit(1);
  }
  const tomlText = fs.readFileSync(tomlPath, 'utf8');
  const match = tomlText.match(/^\s*mnemonic\s*=\s*"([^"]+)"/m);
  if (!match) {
    console.error(`ERROR: no mnemonic = "..." line under [accounts.deployer] in ${tomlPath}.`);
    process.exit(1);
  }
  const wallet = await generateWallet({ secretKey: match[1].trim(), password: '' });
  return wallet.accounts[0].stxPrivateKey;
}

async function getAccountNonce(address) {
  const res = await fetch(`https://api.hiro.so/extended/v1/address/${address}/nonces`);
  const data = await res.json();
  return data.possible_next_nonce;
}

async function contractExists(address, contractName) {
  const res = await fetch(`https://api.hiro.so/v2/contracts/source/${address}/${contractName}`);
  return res.status === 200;
}

async function deployOne(senderKey, contractName, contractFile, nonce, fee) {
  const contractSource = fs.readFileSync(contractFile, 'utf8');
  console.log(`\n--- Deploying: ${contractName} (${contractSource.length} bytes, nonce=${nonce}, fee=${fee}) ---`);

  const txOptions = {
    contractName,
    codeBody: contractSource,
    senderKey,
    network: STACKS_MAINNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: BigInt(fee),
    nonce: BigInt(nonce),
  };

  const transaction = await makeContractDeploy(txOptions);
  const result = await broadcastTransaction({ transaction, network: STACKS_MAINNET });

  if (result.error) {
    console.error(`FAILED: ${result.error} - ${result.reason}`);
    if (result.reason_data) console.error('Details:', JSON.stringify(result.reason_data, null, 2));
    return null;
  }
  const txId = typeof result === 'string' ? result : result.txid;
  console.log(`SUCCESS! TX: ${txId}`);
  console.log(`Explorer: https://explorer.hiro.so/txid/${txId}?chain=mainnet`);
  return txId;
}

async function main() {
  const SENDER_PRIVATE_KEY = await loadPrivateKey();
  const SENDER_ADDRESS = getAddressFromPrivateKey(SENDER_PRIVATE_KEY, 'mainnet');
  if (EXPECTED_ADDRESS && EXPECTED_ADDRESS !== SENDER_ADDRESS) {
    console.error(`ERROR: derived address ${SENDER_ADDRESS} does not match STACKS_EXPECTED_ADDRESS ${EXPECTED_ADDRESS}.`);
    process.exit(1);
  }
  console.log(`Deployer: ${SENDER_ADDRESS}`);

  // Check balance
  const balRes = await fetch(`https://api.hiro.so/extended/v1/address/${SENDER_ADDRESS}/stx`);
  const balData = await balRes.json();
  console.log(`Balance: ${(parseInt(balData.balance) / 1000000).toFixed(6)} STX`);

  let nonce = await getAccountNonce(SENDER_ADDRESS);
  console.log(`Starting nonce: ${nonce}`);

  // Step 1: Deploy sip010-trait if it doesn't already exist
  const traitAlready = await contractExists(SENDER_ADDRESS, 'sip010-trait');
  if (traitAlready) {
    console.log('Skipping sip010-trait: already deployed at this address.');
  } else {
    const traitTx = await deployOne(SENDER_PRIVATE_KEY, 'sip010-trait', './contracts/sip010-trait.clar', nonce, 3000);
    if (!traitTx) {
      console.error('Trait deployment failed, aborting.');
      process.exit(1);
    }
    nonce += 1;
  }

  // Step 2: Deploy stack-wallet-v2
  const walletName = 'stack-wallet-v2';
  if (await contractExists(SENDER_ADDRESS, walletName)) {
    console.error(`Contract ${SENDER_ADDRESS}.${walletName} already exists. Aborting.`);
    process.exit(1);
  }
  const walletTx = await deployOne(SENDER_PRIVATE_KEY, walletName, './contracts/stack-wallet.clar', nonce, 15000);
  if (!walletTx) {
    console.error('Wallet deployment failed.');
    process.exit(1);
  }

  console.log('\n=== Deployment broadcast ===');
}

main().catch(err => console.error('Fatal:', err));
