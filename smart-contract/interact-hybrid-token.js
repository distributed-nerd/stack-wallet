/**
 * interact-hybrid-token.js
 * CLI helper for calling hybrid-token-contract functions on mainnet.
 *
 * Usage:
 *   node interact-hybrid-token.js <command> [args...]
 *
 * Commands:
 *   initialize
 *   set-paused <true|false>
 *   mint-to <amount> <recipient>
 *   burn-from <amount>
 *   approve <spender> <amount>
 *   deposit-to-pool <wallet-id> <amount>
 *   withdraw-from-pool <wallet-id> <amount>
 *   stake-tokens <amount> <lock-blocks>
 *   unstake-tokens <amount>
 *   claim-yield
 *   compound-yield
 *   counter-increment-burn
 *   counter-decrement-burn
 *   take-snapshot
 *   read <function-name> [args...]
 */

const {
  makeContractCall,
  broadcastTransaction,
  getAddressFromPrivateKey,
  AnchorMode,
  PostConditionMode,
  uintCV,
  boolCV,
  principalCV,
  contractPrincipalCV,
  callReadOnlyFunction,
  cvToJSON,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const fetch = require('node-fetch');
const fs = require('fs');

const API = 'https://api.hiro.so';
const DEPLOYER = process.env.STACKS_CONTRACT_ADDRESS || 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'hybrid-token-contract';
const TOKEN_CONTRACT_NAME = 'sip010-token';
const FEE = 10000n;

async function loadPrivateKey() {
  if (process.env.STACKS_PRIVATE_KEY) return process.env.STACKS_PRIVATE_KEY;
  const tomlPath = './settings/Mainnet.toml';
  if (!fs.existsSync(tomlPath)) { console.error('No key source found.'); process.exit(1); }
  const tomlText = fs.readFileSync(tomlPath, 'utf8');
  const match = tomlText.match(/^\s*mnemonic\s*=\s*"([^"]+)"/m);
  if (!match) { console.error('No mnemonic in Mainnet.toml'); process.exit(1); }
  const wallet = await generateWallet({ secretKey: match[1].trim(), password: '' });
  return wallet.accounts[0].stxPrivateKey;
}

async function getNonce(address) {
  const res = await fetch(`${API}/extended/v1/address/${address}/nonces`);
  const data = await res.json();
  return data.possible_next_nonce;
}

async function callContract(senderKey, functionName, functionArgs) {
  const address = getAddressFromPrivateKey(senderKey, 'mainnet');
  const nonce = await getNonce(address);

  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    senderKey,
    network: STACKS_MAINNET,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: FEE,
    nonce: BigInt(nonce),
  });

  const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
  if (result.error) {
    console.error(`Error: ${result.error} - ${result.reason}`);
    process.exit(1);
  }
  const txid = typeof result === 'string' ? result : result.txid;
  console.log(`Broadcast OK  txid: ${txid}`);
  console.log(`Explorer: https://explorer.hiro.so/txid/${txid}?chain=mainnet`);
  return txid;
}

async function readContract(functionName, functionArgs = []) {
  const result = await callReadOnlyFunction({
