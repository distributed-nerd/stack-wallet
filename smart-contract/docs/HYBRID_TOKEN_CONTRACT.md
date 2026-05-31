# hybrid-token-contract

Production-ready hybrid token contract for wallet interactions on the Stacks blockchain.

## Overview

`hybrid-token-contract` unifies SIP-010 token operations with multi-sig wallet interactions.
It is the third-generation hybrid contract in this project, building on `hybrid-stack-wallet`
and `hybrid-yield-vault` with a cleaner, more composable API.

## Contract Address

Deployed at: `<DEPLOYER>.hybrid-token-contract`

## Subsystems

### Admin Controls
| Function | Description |
|---|---|
| `initialize` | One-time init, admin only |
| `set-paused(bool)` | Emergency pause/unpause |
| `transfer-admin(principal)` | Transfer admin role |
| `set-token-cap(uint)` | Update supply cap |
| `set-yield-rate(uint)` | Update yield rate in BPS |
| `set-counter-cost(uint)` | Update counter burn cost |

### Mint / Burn
| Function | Description |
|---|---|
| `mint-to(amount, recipient)` | Admin-only mint with cap check |
| `burn-from(token, amount)` | Caller burns own tokens |

### Allowance Model
| Function | Description |
|---|---|
| `approve(spender, amount)` | Set allowance |
| `transfer-from(token, amount, owner, recipient)` | Spend allowance |
| `increase-allowance(spender, delta)` | Increase allowance |
| `decrease-allowance(spender, delta)` | Decrease allowance |

### Wallet Pool Escrow
| Function | Description |
|---|---|
| `deposit-to-pool(token, wallet-id, amount)` | Escrow tokens in wallet pool |
| `withdraw-from-pool(token, wallet-id, amount)` | Withdraw from wallet pool |

### Staking & Yield
| Function | Description |
|---|---|
| `stake-tokens(token, amount, lock-blocks)` | Stake with optional lock |
| `unstake-tokens(token, amount)` | Unstake after lock expires |
| `claim-yield()` | Claim accrued yield as new tokens |
| `compound-yield()` | Auto-reinvest yield into stake |

### Counter Bridge
| Function | Description |
|---|---|
| `counter-increment-burn(token)` | Burn tokens to increment stack-wallet counter |
| `counter-decrement-burn(token)` | Burn tokens to decrement stack-wallet counter |

### Supply Snapshots
| Function | Description |
|---|---|
| `take-snapshot()` | Record current supply/burned at this block |

## Error Codes

| Code | Constant | Meaning |
|---|---|---|
| u400 | ERR-NOT-ADMIN | Caller is not admin |
| u401 | ERR-PAUSED | Contract is paused |
| u402 | ERR-NOT-INITIALIZED | Contract not initialized |
| u403 | ERR-ALREADY-INITIALIZED | Already initialized |
| u404 | ERR-INVALID-TOKEN | Wrong token contract |
| u405 | ERR-INVALID-AMOUNT | Zero or out-of-range amount |
| u406 | ERR-INSUFFICIENT-BALANCE | Not enough balance |
| u407 | ERR-INSUFFICIENT-ALLOWANCE | Allowance too low |
| u408 | ERR-ZERO-ADDRESS | Cannot use contract address as admin |
| u409 | ERR-WALLET-NOT-FOUND | Counter call failed |
| u410 | ERR-NOT-MEMBER | Not a wallet member |
| u411 | ERR-POOL-OVERFLOW | Pool deposit exceeds max |
| u412 | ERR-WITHDRAW-EXCEEDS-POOL | Withdraw exceeds pool balance |
| u413 | ERR-PROPOSAL-NOT-FOUND | Proposal does not exist |
| u414 | ERR-PROPOSAL-ALREADY-EXEC | Proposal already executed |
| u415 | ERR-INSUFFICIENT-APPROVALS | Not enough approvals |
| u416 | ERR-BATCH-TOO-LARGE | Batch exceeds MAX-BATCH-SIZE |
| u417 | ERR-SELF-TRANSFER | Cannot transfer to self |
| u418 | ERR-CAP-EXCEEDED | Mint would exceed token cap |
| u419 | ERR-RATE-TOO-HIGH | Yield rate exceeds MAX-YIELD-RATE-BPS |
| u420 | ERR-LOCK-ACTIVE | Stake still locked |
| u421 | ERR-NOTHING-TO-CLAIM | No yield to claim |
| u422 | ERR-ALREADY-MEMBER | Already a wallet member |
| u423 | ERR-SNAPSHOT-NOT-FOUND | Snapshot does not exist |
| u424 | ERR-COST-TOO-HIGH | Counter cost exceeds max |

## Safety Bounds

| Constant | Value | Meaning |
|---|---|---|
| MAX-SUPPLY | 21,000,000,000,000 | Absolute token cap |
| MAX-MINT-PER-TX | 1,000,000,000 | Max mint in one call |
| MAX-BATCH-SIZE | 50 | Max batch recipients |
| MAX-POOL-DEPOSIT | 1,000,000,000 | Max per-pool balance |
| MAX-YIELD-RATE-BPS | 2000 | 20% max yield rate |
| MAX-LOCK-BLOCKS | 52560 | ~1 year lock max |
| MAX-COUNTER-COST | 100,000,000 | Max counter burn cost |

## Deployment

```bash
# Set your private key
export STACKS_PRIVATE_KEY=your_key_here

# Deploy
node deploy-hybrid-token-contract.js

# Initialize (after deployment confirms)
node interact-hybrid-token.js initialize

# Verify
node interact-hybrid-token.js read is-initialized
```

## Testing

```bash
# Read-only smoke tests (no transactions)
node test-hybrid-token.js
```

## Closes

Resolves issue #20: Create hybrid token contract for wallet interactions.
