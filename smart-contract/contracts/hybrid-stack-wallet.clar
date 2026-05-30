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
