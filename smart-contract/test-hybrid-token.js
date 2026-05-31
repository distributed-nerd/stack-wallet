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
    const r = await read('get-action-nonce');
    assert(r.success, 'not ok');
  });

  await test('get-snapshot-nonce returns uint', async () => {
    const r = await read('get-snapshot-nonce');
    assert(r.success, 'not ok');
  });

  await test('get-max-supply returns uint', async () => {
    const r = await read('get-max-supply');
    assert(r.success, 'not ok');
    assert(r.value.value === '21000000000000', `unexpected cap: ${r.value.value}`);
  });

  await test('get-max-mint-per-tx returns uint', async () => {
    const r = await read('get-max-mint-per-tx');
    assert(r.success, 'not ok');
    assert(r.value.value === '1000000000', `unexpected: ${r.value.value}`);
  });

  await test('get-max-batch-size returns uint', async () => {
    const r = await read('get-max-batch-size');
    assert(r.success, 'not ok');
    assert(r.value.value === '50', `unexpected: ${r.value.value}`);
  });

  await test('get-max-pool-deposit returns uint', async () => {
    const r = await read('get-max-pool-deposit');
    assert(r.success, 'not ok');
  });

  await test('get-max-yield-rate-bps returns uint', async () => {
    const r = await read('get-max-yield-rate-bps');
    assert(r.success, 'not ok');
    assert(r.value.value === '2000', `unexpected: ${r.value.value}`);
  });

  await test('get-max-lock-blocks returns uint', async () => {
    const r = await read('get-max-lock-blocks');
    assert(r.success, 'not ok');
    assert(r.value.value === '52560', `unexpected: ${r.value.value}`);
  });

  await test('get-allowance for deployer self returns 0', async () => {
    const r = await read('get-allowance', [principalCV(DEPLOYER), principalCV(DEPLOYER)]);
    assert(r.success, 'not ok');
    assert(r.value.value === '0', `expected 0 got ${r.value.value}`);
  });

  await test('get-wallet-pool for id 0 returns 0', async () => {
    const r = await read('get-wallet-pool', [uintCV(0n)]);
    assert(r.success, 'not ok');
    assert(r.value.value === '0', `expected 0 got ${r.value.value}`);
  });

  await test('get-stake for deployer returns 0', async () => {
    const r = await read('get-stake', [principalCV(DEPLOYER)]);
    assert(r.success, 'not ok');
    assert(r.value.value === '0', `expected 0 got ${r.value.value}`);
  });

  await test('get-pending-yield for deployer returns 0', async () => {
    const r = await read('get-pending-yield', [principalCV(DEPLOYER)]);
    assert(r.success, 'not ok');
    assert(r.value.value === '0', `expected 0 got ${r.value.value}`);
  });

  await test('get-member-action-count for deployer returns 0', async () => {
    const r = await read('get-member-action-count', [principalCV(DEPLOYER)]);
    assert(r.success, 'not ok');
    assert(r.value.value === '0', `expected 0 got ${r.value.value}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

