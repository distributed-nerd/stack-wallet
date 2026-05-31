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
