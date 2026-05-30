import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const ERR_NOT_ADMIN = 200;
const ERR_PAUSED = 201;
const ERR_NOT_INITIALIZED = 202;
const ERR_ALREADY_INITIALIZED = 203;
const ERR_INSUFFICIENT_BALANCE = 206;
const ERR_INVALID_AMOUNT = 207;
const ERR_REWARD_ALREADY_CLAIMED = 213;
const ERR_WITHDRAW_EXCEEDS_POOL = 214;
const ERR_COST_TOO_HIGH = 215;

function mintTokenTo(chain: Chain, deployer: Account, recipient: string, amount: number) {
  return chain.mineBlock([
    Tx.contractCall('sip010-token', 'mint',
      [types.uint(amount), types.principal(recipient)],
      deployer.address)
  ]);
}

function initializeHybrid(chain: Chain, deployer: Account) {
  return chain.mineBlock([
    Tx.contractCall('hybrid-stack-wallet', 'initialize', [], deployer.address)
  ]);
}

Clarinet.test({
  name: "initialize: deployer can initialize, second attempt fails",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const first = initializeHybrid(chain, deployer);
    first.receipts[0].result.expectOk().expectBool(true);
    const second = initializeHybrid(chain, deployer);
    second.receipts[0].result.expectErr().expectUint(ERR_ALREADY_INITIALIZED);
  },
});

Clarinet.test({
  name: "initialize: non-admin cannot initialize",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'initialize', [], wallet1.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_ADMIN);
  },
});

Clarinet.test({
  name: "set-counter-cost: admin can update within bounds",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    initializeHybrid(chain, deployer);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'set-counter-cost',
        [types.uint(2500)], deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(2500);
    const read = chain.callReadOnlyFn('hybrid-stack-wallet', 'get-counter-cost', [], deployer.address);
    read.result.expectOk().expectUint(2500);
  },
});

Clarinet.test({
  name: "set-counter-cost: above max is rejected",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    initializeHybrid(chain, deployer);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'set-counter-cost',
        [types.uint(100000001)], deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_COST_TOO_HIGH);
  },
});

Clarinet.test({
  name: "set-proposal-reward: admin only",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    initializeHybrid(chain, deployer);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'set-proposal-reward',
        [types.uint(7500)], wallet1.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_ADMIN);
  },
});

Clarinet.test({
  name: "set-paused: admin can pause and unpause",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    initializeHybrid(chain, deployer);
    const pause = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'set-paused', [types.bool(true)], deployer.address)
    ]);
    pause.receipts[0].result.expectOk().expectBool(true);
    const status = chain.callReadOnlyFn('hybrid-stack-wallet', 'is-contract-paused', [], deployer.address);
    status.result.expectOk().expectBool(true);
    const unpause = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'set-paused', [types.bool(false)], deployer.address)
    ]);
    unpause.receipts[0].result.expectOk().expectBool(false);
  },
});

Clarinet.test({
  name: "transfer-admin: admin can hand off",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    initializeHybrid(chain, deployer);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'transfer-admin',
        [types.principal(wallet1.address)], deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectPrincipal(wallet1.address);
    const get = chain.callReadOnlyFn('hybrid-stack-wallet', 'get-admin', [], deployer.address);
    get.result.expectOk().expectPrincipal(wallet1.address);
  },
});

Clarinet.test({
  name: "increment-with-burn: not initialized rejects",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenContract = `${deployer.address}.sip010-token`;
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'increment-with-burn',
        [types.principal(tokenContract)], deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_INITIALIZED);
  },
});

Clarinet.test({
  name: "increment-with-burn: paused rejects",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenContract = `${deployer.address}.sip010-token`;
    initializeHybrid(chain, deployer);
    chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'set-paused', [types.bool(true)], deployer.address)
    ]);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'increment-with-burn',
        [types.principal(tokenContract)], deployer.address)
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_PAUSED);
  },
});

Clarinet.test({
  name: "increment-with-burn: happy path burns tokens and bumps counter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenContract = `${deployer.address}.sip010-token`;
    initializeHybrid(chain, deployer);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'increment-with-burn',
        [types.principal(tokenContract)], deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(1000);
    const tally = chain.callReadOnlyFn('hybrid-stack-wallet', 'get-member-action-count',
      [types.principal(deployer.address)], deployer.address);
    tally.result.expectOk().expectUint(1);
    const burned = chain.callReadOnlyFn('hybrid-stack-wallet', 'get-total-tokens-burned', [], deployer.address);
    burned.result.expectOk().expectUint(1000);
  },
});

Clarinet.test({
  name: "decrement-with-burn: also burns and bumps tally",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const tokenContract = `${deployer.address}.sip010-token`;
    initializeHybrid(chain, deployer);
    const block = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'decrement-with-burn',
        [types.principal(tokenContract)], deployer.address)
    ]);
    block.receipts[0].result.expectOk().expectUint(1000);
    const tally = chain.callReadOnlyFn('hybrid-stack-wallet', 'get-member-action-count',
      [types.principal(deployer.address)], deployer.address);
    tally.result.expectOk().expectUint(1);
  },
});

Clarinet.test({
  name: "claim-proposal-reward: rejects duplicate claim",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    initializeHybrid(chain, deployer);
    const first = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'claim-proposal-reward',
        [types.uint(0)], deployer.address)
    ]);
    first.receipts[0].result.expectOk().expectUint(5000);
    const second = chain.mineBlock([
      Tx.contractCall('hybrid-stack-wallet', 'claim-proposal-reward',
        [types.uint(0)], deployer.address)
    ]);
    second.receipts[0].result.expectErr().expectUint(ERR_REWARD_ALREADY_CLAIMED);
  },
});

