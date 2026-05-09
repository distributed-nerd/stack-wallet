;; hello-stacks
;; A simple example contract for Stacks blockchain

;; constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))

;; data vars
(define-data-var greeting (string-utf8 100) u"Hello, Stacks!")

;; data maps
(define-map messages principal (string-utf8 500))

;; public functions
(define-public (set-greeting (new-greeting (string-utf8 100)))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (var-set greeting new-greeting))))

(define-public (save-message (message (string-utf8 500)))
  (ok (map-set messages tx-sender message)))

;; read only functions
(define-read-only (get-greeting)
  (ok (var-get greeting)))

(define-read-only (get-message (user principal))
  (ok (map-get? messages user)))
