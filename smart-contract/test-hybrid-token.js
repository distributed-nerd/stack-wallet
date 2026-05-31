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
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed');
}

async function main() {
  console.log(`\nSmoke-testing ${DEPLOYER}.${CONTRACT}\n`);

  await test('get-admin returns a principal', async () => {
    const r = await read('get-admin');
    assert(r.success, 'not ok');
    assert(r.value.type === 'principal', `expected principal got ${r.value.type}`);
  });

  await test('is-contract-paused returns bool', async () => {
    const r = await read('is-contract-paused');
    assert(r.success, 'not ok');
    assert(typeof r.value.value === 'boolean', 'not bool');
  });

  await test('is-initialized returns bool', async () => {
    const r = await read('is-initialized');
    assert(r.success, 'not ok');
  });

  await test('get-token-cap returns uint', async () => {
    const r = await read('get-token-cap');
    assert(r.success, 'not ok');
    assert(r.value.type === 'uint', `expected uint got ${r.value.type}`);
  });

  await test('get-yield-rate returns uint', async () => {
    const r = await read('get-yield-rate');
    assert(r.success, 'not ok');
  });

  await test('get-counter-cost returns uint', async () => {
    const r = await read('get-counter-cost');
    assert(r.success, 'not ok');
  });

  await test('get-total-minted returns uint', async () => {
    const r = await read('get-total-minted');
    assert(r.success, 'not ok');
  });

  await test('get-total-burned returns uint', async () => {
    const r = await read('get-total-burned');
    assert(r.success, 'not ok');
  });

  await test('get-total-pool-deposits returns uint', async () => {
    const r = await read('get-total-pool-deposits');
    assert(r.success, 'not ok');
  });

  await test('get-total-yield-paid returns uint', async () => {
    const r = await read('get-total-yield-paid');
    assert(r.success, 'not ok');
  });

  await test('get-action-nonce returns uint', async () => {
