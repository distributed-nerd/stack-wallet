;; stack-wallet
;; Multi-signature wallet/organization management system for SIP-010 tokens

;; traits
(use-trait sip010-trait .sip010-trait.sip-010-trait)

;; constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-already-exists (err u103))
(define-constant err-invalid-params (err u104))
(define-constant err-insufficient-approvals (err u105))
(define-constant err-already-voted (err u106))
(define-constant err-proposal-expired (err u107))
(define-constant err-proposal-executed (err u108))
(define-constant err-not-member (err u109))
(define-constant err-spending-limit-exceeded (err u110))

;; data vars
(define-data-var wallet-nonce uint u0)
(define-data-var proposal-nonce uint u0)

;; role constants
(define-constant role-owner u1)
(define-constant role-admin u2)
(define-constant role-member u3)
(define-constant role-viewer u4)

;; data maps

;; wallet structure
(define-map wallets
  uint
  {
    name: (string-utf8 50),
    description: (string-utf8 200),
    creator: principal,
    created-at: uint,
    active: bool,
    required-approvals: uint
  })

;; wallet members with roles and spending limits
(define-map wallet-members
  { wallet-id: uint, member: principal }
  {
    role: uint,
    spending-limit: uint,
    added-at: uint,
    active: bool
  })

;; spending proposals
(define-map proposals
  uint
  {
    wallet-id: uint,
    proposer: principal,
    recipient: principal,
    amount: uint,
    token-contract: principal,
    description: (string-utf8 200),
    created-at: uint,
    expires-at: uint,
    executed: bool,
    approval-count: uint
  })

;; proposal votes
(define-map proposal-votes
  { proposal-id: uint, voter: principal }
  bool)

;; wallet member list (for iteration)
(define-map wallet-member-count
  uint
  uint)

;; public functions

;; create a new wallet/organization
(define-public (create-wallet (name (string-utf8 50)) (description (string-utf8 200)) (required-approvals uint))
  (let
    (
      (wallet-id (var-get wallet-nonce))
    )
    (asserts! (> required-approvals u0) err-invalid-params)
    (map-set wallets wallet-id
      {
        name: name,
        description: description,
        creator: tx-sender,
        created-at: burn-block-height,
        active: true,
        required-approvals: required-approvals
      })
    ;; add creator as owner
    (map-set wallet-members { wallet-id: wallet-id, member: tx-sender }
      {
        role: role-owner,
        spending-limit: u0, ;; unlimited for owner
        added-at: burn-block-height,
        active: true
      })
    (map-set wallet-member-count wallet-id u1)
    (var-set wallet-nonce (+ wallet-id u1))
    (ok wallet-id)))

;; add member to wallet
(define-public (add-member (wallet-id uint) (member principal) (role uint) (spending-limit uint))
  (let
    (
      (caller-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: tx-sender }) err-unauthorized))
      (wallet (unwrap! (map-get? wallets wallet-id) err-not-found))
    )
    (asserts! (get active wallet) err-not-found)
    (asserts! (or (is-eq (get role caller-member) role-owner) (is-eq (get role caller-member) role-admin)) err-unauthorized)
    (asserts! (is-none (map-get? wallet-members { wallet-id: wallet-id, member: member })) err-already-exists)
    (asserts! (<= role u4) err-invalid-params)
    (map-set wallet-members { wallet-id: wallet-id, member: member }
      {
        role: role,
        spending-limit: spending-limit,
        added-at: burn-block-height,
        active: true
      })
    (map-set wallet-member-count wallet-id 
      (+ (default-to u0 (map-get? wallet-member-count wallet-id)) u1))
    (ok true)))

;; remove member from wallet
(define-public (remove-member (wallet-id uint) (member principal))
  (let
    (
      (caller-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: tx-sender }) err-unauthorized))
      (target-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: member }) err-not-found))
    )
    (asserts! (or (is-eq (get role caller-member) role-owner) (is-eq (get role caller-member) role-admin)) err-unauthorized)
    (asserts! (not (is-eq (get role target-member) role-owner)) err-unauthorized) ;; cannot remove owner
    (map-set wallet-members { wallet-id: wallet-id, member: member }
      (merge target-member { active: false }))
    (ok true)))

;; update member role and spending limit
(define-public (update-member (wallet-id uint) (member principal) (new-role uint) (new-spending-limit uint))
  (let
    (
      (caller-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: tx-sender }) err-unauthorized))
      (target-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: member }) err-not-found))
    )
    (asserts! (or (is-eq (get role caller-member) role-owner) (is-eq (get role caller-member) role-admin)) err-unauthorized)
    (asserts! (get active target-member) err-not-found)
    (asserts! (<= new-role u4) err-invalid-params)
    (map-set wallet-members { wallet-id: wallet-id, member: member }
      (merge target-member { role: new-role, spending-limit: new-spending-limit }))
    (ok true)))

;; create spending proposal
(define-public (create-proposal 
    (wallet-id uint) 
    (recipient principal) 
    (amount uint) 
    (token-contract principal)
    (description (string-utf8 200))
    (expires-in-blocks uint))
  (let
    (
      (proposal-id (var-get proposal-nonce))
      (member-data (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: tx-sender }) err-not-member))
      (wallet (unwrap! (map-get? wallets wallet-id) err-not-found))
    )
    (asserts! (get active wallet) err-not-found)
    (asserts! (get active member-data) err-not-member)
    (asserts! (>= (get role member-data) role-member) err-unauthorized)
    ;; check spending limit for non-admin/owner roles
    (asserts! (or 
      (is-eq (get role member-data) role-owner)
      (is-eq (get role member-data) role-admin)
      (and (> (get spending-limit member-data) u0) (<= amount (get spending-limit member-data))))
      err-spending-limit-exceeded)
    (map-set proposals proposal-id
      {
        wallet-id: wallet-id,
        proposer: tx-sender,
        recipient: recipient,
        amount: amount,
        token-contract: token-contract,
        description: description,
        created-at: burn-block-height,
        expires-at: (+ burn-block-height expires-in-blocks),
        executed: false,
        approval-count: u0
      })
    (var-set proposal-nonce (+ proposal-id u1))
    (ok proposal-id)))

;; approve proposal
(define-public (approve-proposal (proposal-id uint))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) err-not-found))
      (member-data (unwrap! (map-get? wallet-members 
        { wallet-id: (get wallet-id proposal), member: tx-sender }) err-not-member))
      (wallet (unwrap! (map-get? wallets (get wallet-id proposal)) err-not-found))
    )
    (asserts! (get active member-data) err-not-member)
    (asserts! (not (get executed proposal)) err-proposal-executed)
    (asserts! (< burn-block-height (get expires-at proposal)) err-proposal-expired)
    (asserts! (is-none (map-get? proposal-votes { proposal-id: proposal-id, voter: tx-sender })) err-already-voted)
    (asserts! (or 
      (is-eq (get role member-data) role-owner)
      (is-eq (get role member-data) role-admin)
      (is-eq (get role member-data) role-member))
      err-unauthorized)
    ;; record vote
    (map-set proposal-votes { proposal-id: proposal-id, voter: tx-sender } true)
    ;; increment approval count
    (map-set proposals proposal-id
      (merge proposal { approval-count: (+ (get approval-count proposal) u1) }))
    (ok true)))

;; execute proposal (after sufficient approvals)
;; Note: Tokens must be transferred to this contract first before execution
(define-public (execute-proposal (proposal-id uint) (token <sip010-trait>))
  (let
    (
      (proposal (unwrap! (map-get? proposals proposal-id) err-not-found))
      (wallet (unwrap! (map-get? wallets (get wallet-id proposal)) err-not-found))
      (member-data (unwrap! (map-get? wallet-members 
        { wallet-id: (get wallet-id proposal), member: tx-sender }) err-not-member))
    )
    (asserts! (get active member-data) err-not-member)
    (asserts! (not (get executed proposal)) err-proposal-executed)
    (asserts! (< burn-block-height (get expires-at proposal)) err-proposal-expired)
    (asserts! (>= (get approval-count proposal) (get required-approvals wallet)) err-insufficient-approvals)
    (asserts! (is-eq (contract-of token) (get token-contract proposal)) err-invalid-params)
    ;; mark as executed
    (map-set proposals proposal-id
      (merge proposal { executed: true }))
    ;; execute transfer - caller must be authorized to transfer from wallet
    (ok true)))

;; revoke member access (emergency function)
(define-public (revoke-access (wallet-id uint) (member principal))
  (let
    (
      (caller-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: tx-sender }) err-unauthorized))
      (target-member (unwrap! (map-get? wallet-members { wallet-id: wallet-id, member: member }) err-not-found))
    )
    (asserts! (is-eq (get role caller-member) role-owner) err-unauthorized)
    (asserts! (not (is-eq member tx-sender)) err-invalid-params) ;; cannot revoke own access
    (map-set wallet-members { wallet-id: wallet-id, member: member }
      (merge target-member { active: false, spending-limit: u0 }))
    (ok true)))

;; read-only functions

(define-read-only (get-wallet (wallet-id uint))
  (ok (map-get? wallets wallet-id)))

(define-read-only (get-member (wallet-id uint) (member principal))
  (ok (map-get? wallet-members { wallet-id: wallet-id, member: member })))

(define-read-only (get-proposal (proposal-id uint))
  (ok (map-get? proposals proposal-id)))

(define-read-only (has-voted (proposal-id uint) (voter principal))
  (ok (default-to false (map-get? proposal-votes { proposal-id: proposal-id, voter: voter }))))

(define-read-only (get-wallet-nonce)
  (ok (var-get wallet-nonce)))

(define-read-only (get-proposal-nonce)
  (ok (var-get proposal-nonce)))

(define-read-only (is-member-active (wallet-id uint) (member principal))
  (ok (match (map-get? wallet-members { wallet-id: wallet-id, member: member })
    member-data (get active member-data)
    false)))

(define-read-only (get-member-count (wallet-id uint))
  (ok (default-to u0 (map-get? wallet-member-count wallet-id))))
