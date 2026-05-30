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

