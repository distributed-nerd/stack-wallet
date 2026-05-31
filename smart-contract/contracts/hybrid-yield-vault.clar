;; hybrid-yield-vault
;; Hybrid contract coupling sip010-token + stack-wallet with staking, yield,
;; governance and escrow vaults.
;;
;; Subsystems:
;;   - staking            : lock STK tokens, accrue block-based yield
;;   - yield              : claim accrued rewards minted from the token contract
;;   - governance         : create / vote / execute parameter proposals
;;   - vault escrow       : per-vault deposits keyed by depositor
;;   - counter bridge     : advance stack-wallet counter by burning stake
;;   - member accounting  : per-member tallies for reward attribution
;;
;; All token movements flow through the sip010-token contract; the vault holds
;; tokens as-contract and mints yield against accrued reward debt.

;; ===== traits =====
(use-trait sip010-trait .sip010-trait.sip-010-trait)

;; ===== deployer / admin =====
(define-constant CONTRACT-DEPLOYER tx-sender)

;; ===== error constants =====
(define-constant ERR-NOT-ADMIN              (err u300))
(define-constant ERR-PAUSED                 (err u301))
(define-constant ERR-NOT-INITIALIZED        (err u302))
(define-constant ERR-ALREADY-INITIALIZED    (err u303))
(define-constant ERR-INVALID-TOKEN          (err u304))
(define-constant ERR-INVALID-AMOUNT         (err u305))
(define-constant ERR-INSUFFICIENT-STAKE     (err u306))
(define-constant ERR-NO-STAKE               (err u307))
(define-constant ERR-NOTHING-TO-CLAIM       (err u308))
(define-constant ERR-VAULT-NOT-FOUND        (err u309))
(define-constant ERR-VAULT-EXISTS           (err u310))
(define-constant ERR-NOT-VAULT-OWNER        (err u311))
(define-constant ERR-WITHDRAW-EXCEEDS-VAULT (err u312))
(define-constant ERR-PROPOSAL-NOT-FOUND     (err u313))
(define-constant ERR-PROPOSAL-CLOSED        (err u314))
(define-constant ERR-PROPOSAL-OPEN          (err u315))
(define-constant ERR-ALREADY-VOTED          (err u316))
(define-constant ERR-PROPOSAL-EXECUTED      (err u317))
(define-constant ERR-PROPOSAL-REJECTED      (err u318))
(define-constant ERR-VOTING-NOT-ENDED       (err u319))
(define-constant ERR-VOTING-ENDED           (err u320))
(define-constant ERR-NOT-PROPOSER           (err u321))
(define-constant ERR-COUNTER-CALL-FAIL      (err u322))
(define-constant ERR-RATE-TOO-HIGH          (err u323))
(define-constant ERR-LOCK-TOO-LONG          (err u324))
(define-constant ERR-STILL-LOCKED           (err u325))
(define-constant ERR-ZERO-ADDRESS           (err u326))
(define-constant ERR-COST-TOO-HIGH          (err u327))
(define-constant ERR-UNKNOWN-PARAM          (err u328))
(define-constant ERR-QUORUM-NOT-MET         (err u329))

;; ===== safety bounds =====
(define-constant MAX-YIELD-RATE-BPS     u2000)
(define-constant MAX-LOCK-BLOCKS        u52560)
(define-constant MAX-COUNTER-COST       u100000000)
(define-constant MAX-VAULT-DEPOSIT      u1000000000)
(define-constant BPS-DENOMINATOR        u10000)
(define-constant MIN-VOTING-BLOCKS      u10)

;; ===== governance parameter selectors =====
(define-constant PARAM-YIELD-RATE       u1)
(define-constant PARAM-COUNTER-COST     u2)
(define-constant PARAM-VOTING-WINDOW    u3)
(define-constant PARAM-QUORUM           u4)

;; ===== data vars : config =====
(define-data-var contract-admin principal CONTRACT-DEPLOYER)
(define-data-var is-paused bool false)
(define-data-var initialized bool false)
(define-data-var yield-rate-bps uint u100)
(define-data-var counter-action-cost uint u1000)
(define-data-var voting-window-blocks uint u144)
(define-data-var proposal-quorum uint u3)

;; ===== data vars : accounting =====
(define-data-var total-staked uint u0)
(define-data-var total-yield-minted uint u0)
(define-data-var total-tokens-burned uint u0)
(define-data-var total-vault-deposits uint u0)
(define-data-var proposal-nonce uint u0)
(define-data-var vault-nonce uint u0)
(define-data-var action-count-global uint u0)

;; ===== data maps : staking =====
(define-map stake-balances principal uint)
(define-map stake-start-block principal uint)
(define-map stake-lock-until principal uint)
(define-map accrued-yield-debt principal uint)
(define-map member-action-tally principal uint)

;; ===== data maps : vaults =====
(define-map vaults uint { owner: principal, balance: uint, created-at: uint })
(define-map vault-depositors { vault-id: uint, depositor: principal } uint)

;; ===== data maps : governance =====
(define-map proposals uint {
    proposer: principal,
    param: uint,
    new-value: uint,
    start-block: uint,
    end-block: uint,
    yes-votes: uint,
    no-votes: uint,
    executed: bool,
    rejected: bool
  })
(define-map proposal-votes { proposal-id: uint, voter: principal } bool)
(define-map member-reward-claims principal uint)

;; ===== private helpers =====

(define-private (is-admin)
  (is-eq tx-sender (var-get contract-admin)))

(define-private (assert-not-paused)
  (if (var-get is-paused) ERR-PAUSED (ok true)))

(define-private (assert-initialized)
  (if (var-get initialized) (ok true) ERR-NOT-INITIALIZED))

(define-private (assert-valid-token (token <sip010-trait>))
  (if (is-eq (contract-of token) .sip010-token) (ok true) ERR-INVALID-TOKEN))

(define-private (blocks-staked (who principal))
  (let ((start (default-to burn-block-height (map-get? stake-start-block who))))
    (if (> burn-block-height start) (- burn-block-height start) u0)))

(define-private (pending-yield (who principal))
  (let (
        (staked (default-to u0 (map-get? stake-balances who)))
        (elapsed (blocks-staked who))
        (rate (var-get yield-rate-bps))
        (debt (default-to u0 (map-get? accrued-yield-debt who)))
       )
    (+ debt (/ (* (* staked elapsed) rate) BPS-DENOMINATOR))))

(define-private (bump-action (who principal))
  (begin
    (map-set member-action-tally who
      (+ (default-to u0 (map-get? member-action-tally who)) u1))
    (var-set action-count-global (+ (var-get action-count-global) u1))
    true))

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
    (var-set contract-admin new-admin)
