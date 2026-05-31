/**
 * test-hybrid-token.js
 * Smoke-test suite for hybrid-token-contract read-only functions.
 * Runs against mainnet (read-only calls only, no transactions).
 */

const {
  callReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');

const DEPLOYER = process.env.STACKS_CONTRACT_ADDRESS || 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT = 'hybrid-token-contract';

let passed = 0;
let failed = 0;

async function read(fn, args = []) {
  const result = await callReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: CONTRACT,
    functionName: fn,
    functionArgs: args,
    network: STACKS_MAINNET,
    senderAddress: DEPLOYER,
  });
  return cvToJSON(result);
}

async function test(label, fn) {
  try {
    await fn();
    console.log(`  PASS  ${label}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${label}: ${e.message}`);
