# Balance Report: Stacks Farming Operation

This report summarizes the current STX and Stack Token (STK) balances for the master account and the 50 generated farming accounts.

## Summary

| Account Type | STX Balance | STK Balance |
| :--- | :--- | :--- |
| **Master Account** | 3.243100 STX | 30.000052 STK |
| **Farming Accounts (50)** | 4.764380 STX | 969.999948 STK |
| **TOTAL** | **8.007480 STX** | **1000.000000 STK** |

## Master Account Details
- **Address**: [SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6](https://explorer.hiro.so/address/SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6?chain=mainnet)
- **STX Balance**: 3.243100 STX
- **STK Balance**: 30.000052 STK

## Farming Accounts (Sample)
Full list of 50 accounts checked. Most accounts have approximately **0.095 STX** and varying amounts of **STK** (ranging from 0 to 39 STK depending on transfer status).

> [!NOTE]
> The total STK supply across all accounts is exactly **1,000.00 STK**, confirming that all minted tokens are accounted for.

## Simulated Token Interactions
A robust, sequential simulation has been started to interact with the SIP-010 token for the farming accounts.

### Workflow
1. **Sequential Execution**: Each account processes one by one.
2. **Confirmation Polling**: The script waits for the transaction to be confirmed on the Stacks Mainnet (status: `success`) before proceeding to the next account.
3. **Minimal Fees**: Each interaction uses a fee of **0.001 STX** (1000 micro-STX) as requested.
4. **Current Status**: Account 1 was skipped due to low STK balance. Account 2 has successfully broadcasted its transaction (using corrected Nonce 7) and is currently being monitored for confirmation.

### Monitoring Details
- **Current Transaction**: [0xb42fa805975cb343f97cd8e36eeb7116fe3c45176c25b2fe37d4db8c2fa48630](https://explorer.hiro.so/txid/0xb42fa805975cb343f97cd8e36eeb7116fe3c45176c25b2fe37d4db8c2fa48630?chain=mainnet)
- **Confirmation Time**: Stacks Mainnet blocks occur approximately every 10-15 minutes. The script will continue to poll until confirmation.

## Verification Method
1. Derived master address from private key.
2. Queried Hiro Mainnet API for STX and SIP-010 token balances.
3. Aggregated results for all 50 accounts listed in `accounts.json`.

---

## Counter Sim Batch (2026-05-23): stack-wallet-v2 increment/decrement

### Deployment

- Contract: `SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6.stack-wallet-v2`
- Deploy txid: `90573d8586602292f3be9886c9b65cdb73a856e5377fa36c01585f7057b328c9`
- Deploy nonce: 322, fee: 15000 uSTX (mempool min was 11157)
- Source size: 11020 bytes
- sip010-trait was already deployed at the master address; deploy script skipped that step.

### Batch 1 (fee 1000 uSTX = 0.001 STX per tx)

- Total broadcast: 100 (50 increments + 50 decrements)
- Distribution: 2 transactions per account across all 50 accounts
- Per-broadcast throttle: 1500 ms (Hiro public API per-minute limit)
