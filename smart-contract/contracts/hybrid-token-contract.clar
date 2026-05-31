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
(define-constant ERR-COST-TOO-HIGH            (err u424))

;; ===== safety bounds =====
(define-constant MAX-SUPPLY              u21000000000000)
(define-constant MAX-MINT-PER-TX         u1000000000)
(define-constant MAX-BATCH-SIZE          u50)
(define-constant MAX-POOL-DEPOSIT        u1000000000)
(define-constant MAX-YIELD-RATE-BPS      u2000)
(define-constant BPS-DENOMINATOR         u10000)
(define-constant MAX-LOCK-BLOCKS         u52560)
(define-constant MAX-COUNTER-COST        u100000000)

;; ===== data vars =====
(define-data-var contract-admin      principal CONTRACT-DEPLOYER)
(define-data-var is-paused           bool      false)
(define-data-var initialized         bool      false)
(define-data-var token-cap           uint      MAX-SUPPLY)
(define-data-var yield-rate-bps      uint      u100)
(define-data-var counter-action-cost uint      u1000)
(define-data-var total-minted        uint      u0)
(define-data-var total-burned        uint      u0)
(define-data-var total-pool-deposits uint      u0)
(define-data-var total-yield-paid    uint      u0)
(define-data-var action-nonce        uint      u0)
(define-data-var snapshot-nonce      uint      u0)

;; ===== data maps =====
(define-map allowances
  { owner: principal, spender: principal }
  uint)

(define-map wallet-pools          uint uint)

(define-map pool-depositors
  { wallet-id: uint, depositor: principal }
  uint)

(define-map yield-debt            principal uint)
(define-map stake-start-block     principal uint)
(define-map stake-balances        principal uint)
(define-map stake-lock-until      principal uint)
(define-map member-action-tally   principal uint)
(define-map batch-receipts        uint { executed-at: uint, count: uint, total-amount: uint })
(define-map supply-snapshots      uint { block: uint, supply: uint, burned: uint })

;; ===== private helpers =====

(define-private (is-admin)
  (is-eq tx-sender (var-get contract-admin)))

(define-private (assert-live)
  (if (var-get is-paused) ERR-PAUSED (ok true)))

(define-private (assert-ready)
  (if (var-get initialized) (ok true) ERR-NOT-INITIALIZED))

(define-private (assert-valid-token (token <sip010-trait>))
  (if (is-eq (contract-of token) .sip010-token) (ok true) ERR-INVALID-TOKEN))

(define-private (blocks-staked (who principal))
  (let ((start (default-to burn-block-height (map-get? stake-start-block who))))
    (if (> burn-block-height start) (- burn-block-height start) u0)))

(define-private (pending-yield (who principal))
  (let (
        (staked  (default-to u0 (map-get? stake-balances who)))
        (elapsed (blocks-staked who))
        (rate    (var-get yield-rate-bps))
        (debt    (default-to u0 (map-get? yield-debt who)))
       )
    (+ debt (/ (* (* staked elapsed) rate) BPS-DENOMINATOR))))

(define-private (bump-action (who principal))
  (begin
    (map-set member-action-tally who
      (+ (default-to u0 (map-get? member-action-tally who)) u1))
    (var-set action-nonce (+ (var-get action-nonce) u1))
    true))

(define-private (do-transfer (token <sip010-trait>) (amount uint) (from principal) (to principal))
  (begin
    (asserts! (not (is-eq from to)) ERR-SELF-TRANSFER)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (contract-call? token transfer amount from to none)))

;; ===== admin functions =====

(define-public (initialize)
  (begin
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (var-set initialized true)
    (ok true)))

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (var-set is-paused paused)
    (ok paused)))

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (not (is-eq new-admin (as-contract tx-sender))) ERR-ZERO-ADDRESS)
    (var-set contract-admin new-admin)
    (ok new-admin)))

(define-public (set-token-cap (new-cap uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (<= new-cap MAX-SUPPLY) ERR-CAP-EXCEEDED)
    (var-set token-cap new-cap)
    (ok new-cap)))

(define-public (set-yield-rate (new-rate uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (<= new-rate MAX-YIELD-RATE-BPS) ERR-RATE-TOO-HIGH)
    (var-set yield-rate-bps new-rate)
    (ok new-rate)))

(define-public (set-counter-cost (new-cost uint))
  (begin
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (<= new-cost MAX-COUNTER-COST) ERR-COST-TOO-HIGH)
    (var-set counter-action-cost new-cost)
    (ok new-cost)))

;; ===== mint and burn =====

(define-public (mint-to (amount uint) (recipient principal))
  (begin
    (try! (assert-live))
    (try! (assert-ready))
    (asserts! (is-admin) ERR-NOT-ADMIN)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= amount MAX-MINT-PER-TX) ERR-INVALID-AMOUNT)
    (asserts! (<= (+ (var-get total-minted) amount) (var-get token-cap)) ERR-CAP-EXCEEDED)
    (try! (as-contract (contract-call? .sip010-token mint amount recipient)))
    (var-set total-minted (+ (var-get total-minted) amount))
    (bump-action recipient)
    (ok amount)))

(define-public (burn-from (token <sip010-trait>) (amount uint))
  (let ((caller tx-sender))
    (try! (assert-live))
    (try! (assert-ready))
    (try! (assert-valid-token token))
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))
    (try! (as-contract (contract-call? .sip010-token burn amount)))
    (var-set total-burned (+ (var-get total-burned) amount))
    (bump-action caller)
    (ok amount)))

;; ===== allowance model =====

(define-public (approve (spender principal) (amount uint))
  (begin
    (try! (assert-live))
    (try! (assert-ready))
    (asserts! (not (is-eq spender tx-sender)) ERR-SELF-TRANSFER)
    (map-set allowances { owner: tx-sender, spender: spender } amount)
    (ok amount)))

(define-public (transfer-from (token <sip010-trait>) (amount uint) (owner principal) (recipient principal))
  (let (
        (spender tx-sender)
        (current-allowance (default-to u0 (map-get? allowances { owner: owner, spender: spender })))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (try! (assert-valid-token token))
    (asserts! (>= current-allowance amount) ERR-INSUFFICIENT-ALLOWANCE)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (do-transfer token amount owner recipient))
    (map-set allowances { owner: owner, spender: spender } (- current-allowance amount))
    (bump-action spender)
    (ok amount)))

(define-public (increase-allowance (spender principal) (delta uint))
  (let ((current (default-to u0 (map-get? allowances { owner: tx-sender, spender: spender }))))
    (try! (assert-live))
    (try! (assert-ready))
    (map-set allowances { owner: tx-sender, spender: spender } (+ current delta))
    (ok (+ current delta))))

(define-public (decrease-allowance (spender principal) (delta uint))
  (let ((current (default-to u0 (map-get? allowances { owner: tx-sender, spender: spender }))))
    (try! (assert-live))
    (try! (assert-ready))
    (asserts! (>= current delta) ERR-INSUFFICIENT-ALLOWANCE)
    (map-set allowances { owner: tx-sender, spender: spender } (- current delta))
    (ok (- current delta))))

;; ===== wallet pool escrow =====

(define-public (deposit-to-pool (token <sip010-trait>) (wallet-id uint) (amount uint))
  (let (
        (caller   tx-sender)
        (existing (default-to u0 (map-get? pool-depositors { wallet-id: wallet-id, depositor: caller })))
        (pool-bal (default-to u0 (map-get? wallet-pools wallet-id)))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (try! (assert-valid-token token))
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= (+ pool-bal amount) MAX-POOL-DEPOSIT) ERR-POOL-OVERFLOW)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))
    (map-set wallet-pools wallet-id (+ pool-bal amount))
    (map-set pool-depositors { wallet-id: wallet-id, depositor: caller } (+ existing amount))
    (var-set total-pool-deposits (+ (var-get total-pool-deposits) amount))
    (bump-action caller)
    (ok amount)))

(define-public (withdraw-from-pool (token <sip010-trait>) (wallet-id uint) (amount uint))
  (let (
        (caller     tx-sender)
        (pool-bal   (default-to u0 (map-get? wallet-pools wallet-id)))
        (deposited  (default-to u0 (map-get? pool-depositors { wallet-id: wallet-id, depositor: caller })))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (try! (assert-valid-token token))
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= deposited amount) ERR-INSUFFICIENT-BALANCE)
    (asserts! (>= pool-bal amount) ERR-WITHDRAW-EXCEEDS-POOL)
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))
    (map-set wallet-pools wallet-id (- pool-bal amount))
    (map-set pool-depositors { wallet-id: wallet-id, depositor: caller } (- deposited amount))
    (var-set total-pool-deposits (- (var-get total-pool-deposits) amount))
    (bump-action caller)
    (ok amount)))

;; ===== staking and yield =====

(define-public (stake-tokens (token <sip010-trait>) (amount uint) (lock-blocks uint))
  (let (
        (caller  tx-sender)
        (current (default-to u0 (map-get? stake-balances caller)))
        (carried (pending-yield caller))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (try! (assert-valid-token token))
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (<= lock-blocks MAX-LOCK-BLOCKS) ERR-INVALID-AMOUNT)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))
    (map-set stake-balances    caller (+ current amount))
    (map-set stake-start-block caller burn-block-height)
    (map-set yield-debt        caller carried)
    (map-set stake-lock-until  caller (+ burn-block-height lock-blocks))
    (bump-action caller)
    (ok (+ current amount))))

(define-public (unstake-tokens (token <sip010-trait>) (amount uint))
  (let (
        (caller     tx-sender)
        (current    (default-to u0 (map-get? stake-balances caller)))
        (carried    (pending-yield caller))
        (lock-until (default-to u0 (map-get? stake-lock-until caller)))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (try! (assert-valid-token token))
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= current amount) ERR-INSUFFICIENT-BALANCE)
    (asserts! (>= burn-block-height lock-until) ERR-LOCK-ACTIVE)
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))
    (map-set stake-balances    caller (- current amount))
    (map-set stake-start-block caller burn-block-height)
    (map-set yield-debt        caller carried)
    (bump-action caller)
    (ok (- current amount))))

(define-public (claim-yield)
  (let (
        (caller  tx-sender)
        (reward  (pending-yield caller))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (asserts! (> (default-to u0 (map-get? stake-balances caller)) u0) ERR-INSUFFICIENT-BALANCE)
    (asserts! (> reward u0) ERR-NOTHING-TO-CLAIM)
    (asserts! (<= (+ (var-get total-minted) reward) (var-get token-cap)) ERR-CAP-EXCEEDED)
    (try! (as-contract (contract-call? .sip010-token mint reward caller)))
    (map-set yield-debt        caller u0)
    (map-set stake-start-block caller burn-block-height)
    (var-set total-minted    (+ (var-get total-minted) reward))
    (var-set total-yield-paid (+ (var-get total-yield-paid) reward))
    (bump-action caller)
    (ok reward)))

(define-public (compound-yield)
  (let (
        (caller  tx-sender)
        (reward  (pending-yield caller))
        (current (default-to u0 (map-get? stake-balances caller)))
       )
    (try! (assert-live))
    (try! (assert-ready))
    (asserts! (> current u0) ERR-INSUFFICIENT-BALANCE)
    (asserts! (> reward u0) ERR-NOTHING-TO-CLAIM)
    (asserts! (<= (+ (var-get total-minted) reward) (var-get token-cap)) ERR-CAP-EXCEEDED)
    (try! (as-contract (contract-call? .sip010-token mint reward (as-contract tx-sender))))
