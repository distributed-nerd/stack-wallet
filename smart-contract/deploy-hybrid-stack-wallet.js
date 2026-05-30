const {
  makeContractDeploy,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  getAddressFromPrivateKey,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const fetch = require('node-fetch');
const fs = require('fs');

const CONTRACT_NAME = 'hybrid-stack-wallet';
const CONTRACT_FILE = './contracts/hybrid-stack-wallet.clar';
const DEPLOY_FEE = 200000n;
const API = 'https://api.hiro.so';
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
  const res = await fetch(`${API}/extended/v1/address/${address}/nonces`);
  const data = await res.json();
  return data.possible_next_nonce;
}

async function contractExists(address, contractName) {
  const res = await fetch(`${API}/v2/contracts/source/${address}/${contractName}`);
  return res.status === 200;
}

async function broadcastWithRetry(transaction) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await broadcastTransaction({ transaction, network: STACKS_MAINNET });
      if (result && result.error) {
        return { ok: false, error: `${result.error}: ${result.reason}`, detail: result.reason_data };
      }
      return { ok: true, txid: typeof result === 'string' ? result : result.txid };
    } catch (e) {
      lastErr = e;
      const msg = String(e?.cause?.message || e?.message || e);
      const rateLimited = msg.includes('Per-minute') || msg.includes('429') || msg.includes('rate');
      if (!rateLimited && attempt > 0) break;
      await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  return { ok: false, error: String(lastErr?.message || lastErr) };
}

async function deployContract(senderKey, contractName, contractFile, nonce, fee) {
  const contractSource = fs.readFileSync(contractFile, 'utf8');
  console.log(`Deploying ${contractName}`);
  console.log(`  source size: ${contractSource.length} bytes`);
  console.log(`  nonce: ${nonce}`);
  console.log(`  fee: ${fee} uSTX`);

  const txOptions = {
    contractName,
    codeBody: contractSource,
    senderKey,
    network: STACKS_MAINNET,
    anchorMode: AnchorMode.Any,
