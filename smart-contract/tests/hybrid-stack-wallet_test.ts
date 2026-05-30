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
