;; hybrid-token-contract
;; Production-ready hybrid token contract for wallet interactions.
;;
;; Subsystems:
;;   - Admin controls (pause, cap, yield-rate, counter-cost)
;;   - Mint / burn with supply cap enforcement
;;   - ERC-20-style allowance model on top of SIP-010
;;   - Wallet-pool escrow with per-depositor accounting
;;   - Staking + block-based yield accrual
;;   - Counter bridge (burn tokens to advance stack-wallet counter)
;;   - Supply snapshots for off-chain analytics
;;
;; Depends on: .sip010-trait  .sip010-token  .stack-wallet

;; ===== traits =====
