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
