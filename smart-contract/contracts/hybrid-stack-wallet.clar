;; hybrid-stack-wallet
;; Bridge contract that couples the sip010-token and stack-wallet contracts.
;;
;; Behaviours:
;;   - increment-with-burn  / decrement-with-burn  : burns STK tokens to advance counter
;;   - claim-proposal-reward                       : mints STK reward when proposal is recorded
