;; sip010-token
;; A fungible token contract implementing the SIP-010 standard

;; constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-insufficient-balance (err u102))

;; token definition
(define-fungible-token stack-token u1000000000)

;; SIP-010 functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (try! (ft-transfer? stack-token amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)))

(define-read-only (get-name)
  (ok "Stack Token"))

(define-read-only (get-symbol)
  (ok "STK"))

(define-read-only (get-decimals)
  (ok u6))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance stack-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply stack-token)))

(define-read-only (get-token-uri)
  (ok (some u"https://example.com/token-metadata.json")))

;; additional functions

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ft-mint? stack-token amount recipient)))

(define-public (burn (amount uint))
  (begin
    (asserts! (>= (ft-get-balance stack-token tx-sender) amount) err-insufficient-balance)
    (ft-burn? stack-token amount tx-sender)))

;; initialize
(begin
  (try! (ft-mint? stack-token u1000000000 contract-owner))
  (ok true))
