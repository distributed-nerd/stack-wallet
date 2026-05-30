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
