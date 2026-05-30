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
