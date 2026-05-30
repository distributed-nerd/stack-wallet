;; hybrid-stack-wallet
;; Bridge contract that couples the sip010-token and stack-wallet contracts.
;;
;; Behaviours:
;;   - increment-with-burn  / decrement-with-burn  : burns STK tokens to advance counter
;;   - claim-proposal-reward                       : mints STK reward when proposal is recorded
;;   - deposit-to-wallet-pool                      : escrows STK against a wallet-id
;;   - withdraw-from-wallet-pool                   : returns escrowed STK to caller
;;   - per-member action tally tracked for reward attribution

;; traits
(use-trait sip010-trait .sip010-trait.sip-010-trait)

;; deployer-recorded admin
(define-constant CONTRACT-DEPLOYER tx-sender)

;; error constants
(define-constant ERR-NOT-ADMIN              (err u200))
(define-constant ERR-PAUSED                 (err u201))
(define-constant ERR-NOT-INITIALIZED        (err u202))
(define-constant ERR-ALREADY-INITIALIZED    (err u203))
(define-constant ERR-WALLET-NOT-FOUND       (err u204))
(define-constant ERR-NOT-MEMBER             (err u205))
(define-constant ERR-INSUFFICIENT-BALANCE   (err u206))
(define-constant ERR-INVALID-AMOUNT         (err u207))
(define-constant ERR-NO-REWARDS             (err u208))
(define-constant ERR-POOL-NOT-FOUND         (err u209))
(define-constant ERR-INVALID-TOKEN          (err u210))
(define-constant ERR-COUNTER-CALL-FAIL      (err u211))
(define-constant ERR-PROPOSAL-NOT-EXECUTED  (err u212))
(define-constant ERR-REWARD-ALREADY-CLAIMED (err u213))
(define-constant ERR-WITHDRAW-EXCEEDS-POOL  (err u214))
(define-constant ERR-COST-TOO-HIGH          (err u215))
(define-constant ERR-REWARD-TOO-HIGH        (err u216))
(define-constant ERR-ZERO-ADDRESS           (err u217))

;; safety bounds
(define-constant MAX-COUNTER-COST u100000000)
(define-constant MAX-PROPOSAL-REWARD u500000000)
(define-constant MAX-WALLET-DEPOSIT u1000000000)

;; data vars
(define-data-var contract-admin principal CONTRACT-DEPLOYER)
(define-data-var is-paused bool false)
(define-data-var initialized bool false)
(define-data-var counter-action-cost uint u1000)
(define-data-var proposal-execution-reward uint u5000)
(define-data-var wallet-creation-deposit uint u10000)
(define-data-var total-rewards-issued uint u0)
(define-data-var total-tokens-burned uint u0)
(define-data-var total-pool-deposits uint u0)
(define-data-var action-count-global uint u0)

;; data maps
(define-map member-action-tally principal uint)
(define-map wallet-token-pools uint uint)
(define-map reward-claims-tally principal uint)
(define-map executed-proposal-rewards uint bool)
(define-map last-action-burn-block principal uint)
(define-map wallet-pool-depositors { wallet-id: uint, depositor: principal } uint)

;; ----- admin functions -----

(define-public (initialize)
  (begin
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
    (var-set initialized true)
    (ok true)))

(define-public (set-counter-cost (new-cost uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
    (asserts! (<= new-cost MAX-COUNTER-COST) ERR-COST-TOO-HIGH)
    (var-set counter-action-cost new-cost)
    (ok new-cost)))

(define-public (set-proposal-reward (new-reward uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
    (asserts! (<= new-reward MAX-PROPOSAL-REWARD) ERR-REWARD-TOO-HIGH)
    (var-set proposal-execution-reward new-reward)
    (ok new-reward)))

(define-public (set-wallet-deposit (new-deposit uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
    (asserts! (<= new-deposit MAX-WALLET-DEPOSIT) ERR-INVALID-AMOUNT)
    (var-set wallet-creation-deposit new-deposit)
    (ok new-deposit)))

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
    (var-set is-paused paused)
    (ok paused)))

(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
    (var-set contract-admin new-admin)
    (ok new-admin)))

;; ----- hybrid actions -----

(define-public (increment-with-burn (token <sip010-trait>))
  (let
    (
      (cost (var-get counter-action-cost))
      (caller tx-sender)
    )
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> cost u0) ERR-INVALID-AMOUNT)
    (try! (contract-call? token transfer cost caller (as-contract tx-sender) none))
    (try! (as-contract (contract-call? .sip010-token burn cost)))
    (try! (contract-call? .stack-wallet increment))
    (map-set member-action-tally caller
      (+ (default-to u0 (map-get? member-action-tally caller)) u1))
    (map-set last-action-burn-block caller burn-block-height)
    (var-set total-tokens-burned (+ (var-get total-tokens-burned) cost))
    (var-set action-count-global (+ (var-get action-count-global) u1))
    (ok cost)))

(define-public (decrement-with-burn (token <sip010-trait>))
  (let
    (
      (cost (var-get counter-action-cost))
      (caller tx-sender)
    )
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> cost u0) ERR-INVALID-AMOUNT)
    (try! (contract-call? token transfer cost caller (as-contract tx-sender) none))
    (try! (as-contract (contract-call? .sip010-token burn cost)))
    (try! (contract-call? .stack-wallet decrement))
    (map-set member-action-tally caller
      (+ (default-to u0 (map-get? member-action-tally caller)) u1))
    (map-set last-action-burn-block caller burn-block-height)
    (var-set total-tokens-burned (+ (var-get total-tokens-burned) cost))
    (var-set action-count-global (+ (var-get action-count-global) u1))
    (ok cost)))

(define-public (claim-proposal-reward (proposal-id uint))
  (let
    (
      (reward (var-get proposal-execution-reward))
      (caller tx-sender)
    )
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> reward u0) ERR-NO-REWARDS)
    (asserts! (is-none (map-get? executed-proposal-rewards proposal-id))
              ERR-REWARD-ALREADY-CLAIMED)
    (try! (as-contract (contract-call? .sip010-token mint reward caller)))
    (map-set executed-proposal-rewards proposal-id true)
    (map-set reward-claims-tally caller
      (+ (default-to u0 (map-get? reward-claims-tally caller)) reward))
    (var-set total-rewards-issued (+ (var-get total-rewards-issued) reward))
    (ok reward)))

(define-public (deposit-to-wallet-pool (token <sip010-trait>) (wallet-id uint) (amount uint))
  (let
    (
      (caller tx-sender)
      (existing-deposit (default-to u0
        (map-get? wallet-pool-depositors { wallet-id: wallet-id, depositor: caller })))
    )
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (contract-call? token transfer amount caller (as-contract tx-sender) none))
    (map-set wallet-token-pools wallet-id
      (+ (default-to u0 (map-get? wallet-token-pools wallet-id)) amount))
    (map-set wallet-pool-depositors { wallet-id: wallet-id, depositor: caller }
      (+ existing-deposit amount))
    (var-set total-pool-deposits (+ (var-get total-pool-deposits) amount))
    (ok amount)))

(define-public (withdraw-from-wallet-pool (token <sip010-trait>) (wallet-id uint) (amount uint))
  (let
    (
      (caller tx-sender)
      (pool-balance (default-to u0 (map-get? wallet-token-pools wallet-id)))
      (caller-stake (default-to u0
        (map-get? wallet-pool-depositors { wallet-id: wallet-id, depositor: caller })))
    )
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= caller-stake amount) ERR-INSUFFICIENT-BALANCE)
    (asserts! (>= pool-balance amount) ERR-WITHDRAW-EXCEEDS-POOL)
    (try! (as-contract (contract-call? token transfer amount tx-sender caller none)))
    (map-set wallet-token-pools wallet-id (- pool-balance amount))
    (map-set wallet-pool-depositors { wallet-id: wallet-id, depositor: caller }
      (- caller-stake amount))
    (var-set total-pool-deposits (- (var-get total-pool-deposits) amount))
    (ok amount)))

(define-public (reset-action-tally (member principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-ADMIN)
