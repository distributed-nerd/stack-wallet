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
(use-trait sip010-trait .sip010-trait.sip-010-trait)

;; ===== deployer =====
(define-constant CONTRACT-DEPLOYER tx-sender)

;; ===== error constants =====
(define-constant ERR-NOT-ADMIN                (err u400))
(define-constant ERR-PAUSED                   (err u401))
(define-constant ERR-NOT-INITIALIZED          (err u402))
(define-constant ERR-ALREADY-INITIALIZED      (err u403))
(define-constant ERR-INVALID-TOKEN            (err u404))
(define-constant ERR-INVALID-AMOUNT           (err u405))
(define-constant ERR-INSUFFICIENT-BALANCE     (err u406))
(define-constant ERR-INSUFFICIENT-ALLOWANCE   (err u407))
(define-constant ERR-ZERO-ADDRESS             (err u408))
(define-constant ERR-WALLET-NOT-FOUND         (err u409))
(define-constant ERR-NOT-MEMBER               (err u410))
(define-constant ERR-POOL-OVERFLOW            (err u411))
(define-constant ERR-WITHDRAW-EXCEEDS-POOL    (err u412))
(define-constant ERR-PROPOSAL-NOT-FOUND       (err u413))
(define-constant ERR-PROPOSAL-ALREADY-EXEC    (err u414))
(define-constant ERR-INSUFFICIENT-APPROVALS   (err u415))
(define-constant ERR-BATCH-TOO-LARGE          (err u416))
(define-constant ERR-SELF-TRANSFER            (err u417))
(define-constant ERR-CAP-EXCEEDED             (err u418))
(define-constant ERR-RATE-TOO-HIGH            (err u419))
(define-constant ERR-LOCK-ACTIVE              (err u420))
(define-constant ERR-NOTHING-TO-CLAIM         (err u421))
(define-constant ERR-ALREADY-MEMBER           (err u422))
(define-constant ERR-SNAPSHOT-NOT-FOUND       (err u423))
