# StackWallet

> A full-stack toolkit for the **Stacks** blockchain: SIP-010 fungible tokens, a multi-signature wallet/organization contract written in Clarity, a premium Next.js dashboard, and a battle-tested batch-simulation harness for exercising contracts across many mainnet accounts.

![Stacks](https://img.shields.io/badge/Stacks-Mainnet-5546FF)
![Clarity](https://img.shields.io/badge/Clarity-smart%20contracts-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-green)

StackWallet started as an experiment in coordinating on-chain activity across a fleet of accounts ("farming") and grew into a complete reference project: the Clarity contracts that hold the logic, the scripts that deploy/mint/distribute and simulate load against them, and a polished web dashboard to observe it all. Everything here targets the public Stacks mainnet, with testnet/devnet paths documented for safe iteration.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Smart Contracts](#smart-contracts)
- [Frontend Dashboard](#frontend-dashboard)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Tooling & Scripts](#tooling--scripts)
- [Simulation Harness](#simulation-harness)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

StackWallet is organized as a monorepo with two primary workspaces:

- **`smart-contract/`** — Clarity contracts plus a large collection of Node.js/Bash automation for deployment, minting, token distribution, and high-volume transaction simulation against Stacks mainnet.
- **`frontend/`** — A Next.js (App Router) dashboard for connecting a Stacks wallet, viewing balances across accounts, and visualizing simulation activity.

The contracts and tooling are designed to be run end-to-end: generate accounts, deploy the token + wallet contracts, mint and distribute tokens, then drive realistic load through the simulation harness while observing results in the dashboard.

## Features

- **SIP-010 fungible token** (`stack-token`, symbol `STK`, 6 decimals) with mint/burn and standard transfer semantics.
- **Multi-signature wallet contract** supporting wallets/organizations, role-based membership, spending limits, and approval-based spending proposals.
- **Reproducible deployments** via Clarinet for devnet, testnet, and mainnet.
- **Batch account fleet management** — generate, fund, mint to, and distribute across 50+ accounts.
- **Robust simulation harness** with nonce management, broadcast retries, and block-confirmation polling.
- **Premium dashboard** with glassmorphism UI, real-time balances, and a batch simulator view.

## Architecture

```
                 ┌──────────────────────────┐
                 │     Next.js Dashboard     │
                 │  (@stacks/connect, v7)    │
                 └────────────┬─────────────┘
                              │ read balances / submit txs
                              ▼
        ┌─────────────────────────────────────────┐
        │             Stacks Mainnet               │
        │   sip010-token   •   stack-wallet (msig)  │
        └─────────────────────────────────────────┘
                              ▲
                              │ deploy / mint / distribute / simulate
                 ┌────────────┴─────────────┐
                 │   Node.js + Bash tooling  │
                 │   (smart-contract/*.js)   │
                 └──────────────────────────┘
```

The dashboard and the tooling are independent clients of the same on-chain contracts. The tooling drives writes (deploys, mints, transfers, simulations); the dashboard is primarily read/observe with wallet-initiated calls.

## Repository Layout

```
stack-wallet/
├── frontend/              # Next.js dashboard (App Router)
│   ├── app/               # routes: /, /simulations, /settings
│   ├── components/        # UI components (GlassCard, BatchSimulator, ...)
│   ├── context/           # StacksAuthContext (wallet connection)
│   └── public/            # static assets + accounts.json
├── smart-contract/        # Clarity contracts + automation
│   ├── contracts/         # *.clar source
│   ├── tests/             # contract tests
│   ├── settings/          # Devnet/Testnet/Mainnet.toml
│   ├── docs/              # SIMULATION_REPORT.md
│   ├── Clarinet.toml      # Clarinet project config
│   └── *.js / *.sh        # deploy, mint, distribute, simulate
├── LICENSE
└── README.md
```

## Tech Stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Smart contracts  | Clarity, Clarinet                                                 |
| Token standard   | SIP-010 (fungible token)                                          |
| Frontend         | Next.js 16 (App Router), React 19, TypeScript                     |
| Blockchain SDK   | `@stacks/connect`, `@stacks/transactions`, `@stacks/network`      |
| Animations / UI  | Framer Motion, Lucide React, vanilla CSS design tokens            |
| Tooling          | Node.js, Bash, Hiro API                                           |

## Smart Contracts

All Clarity sources live in `smart-contract/contracts/` and are registered in `Clarinet.toml`. There are four contracts: a SIP-010 trait, a SIP-010 token, a multisig wallet, and a minimal hello-world contract used for connectivity checks.

### `sip010-trait.clar`

Defines the standard SIP-010 trait that the token contract implements. Declaring the trait separately lets other contracts (and the multisig wallet) accept any SIP-010-compliant token via `use-trait`/`<sip010-trait>` rather than hard-coding a single token.

### `sip010-token.clar`

A fungible token implementing SIP-010.

- **Name / symbol / decimals:** `Stack Token` / `STK` / `6`
- **Max supply:** `1,000,000,000` base units; the full supply is minted to the deployer on initialization.
- **Public functions:** `transfer`, `mint` (owner-only), `burn`
- **Read-only:** `get-name`, `get-symbol`, `get-decimals`, `get-balance`, `get-total-supply`, `get-token-uri`

`transfer` enforces that `tx-sender` is the `sender`, and supports an optional `memo` buffer that is printed on transfer.

### `stack-wallet.clar` — multisig wallet / organizations

A multi-signature wallet and organization-management system for SIP-010 tokens. Each wallet has a name, description, creator, active flag, and a `required-approvals` threshold.

**Roles:**

| Role     | Value | Purpose                         |
| -------- | ----- | ------------------------------- |
| Owner    | `u1`  | Full control of the wallet      |
| Admin    | `u2`  | Manage members and settings     |
| Member   | `u3`  | Create / vote on proposals      |
| Viewer   | `u4`  | Read-only participation         |

Members are tracked per wallet with a role, a spending limit, an added-at height, and an active flag.

#### Spending proposals & voting

Spending is gated behind approval-based proposals:

1. A member creates a proposal (recipient, amount, token).
2. Other members vote until the wallet's `required-approvals` threshold is met.
3. Once approved (and before expiry), the proposal can be executed, moving tokens out of the wallet.

The contract guards against double-voting, expired proposals, re-executing an already-executed proposal, and spending above a member's configured limit.

### `hello-stacks.clar`

A minimal contract used as a connectivity / deployment smoke test — handy for verifying that Clarinet, network settings, and the deploy pipeline all work before touching the real contracts.

### Error codes

The wallet contract uses a consistent error namespace:

| Code   | Meaning                       |
| ------ | ----------------------------- |
| `u100` | Owner only                    |
| `u101` | Not found                     |
| `u102` | Unauthorized                  |
| `u103` | Already exists                |
| `u104` | Invalid parameters            |
| `u105` | Insufficient approvals        |
| `u106` | Already voted                 |
| `u107` | Proposal expired              |
| `u108` | Proposal already executed     |
| `u109` | Not a member                  |
| `u110` | Spending limit exceeded       |

## Frontend Dashboard

A premium, high-performance Stacks wallet dashboard for batch account management and contract-interaction simulations. Built with the Next.js App Router and Stacks.js v7.

### Highlights

- **Glassmorphism design** — layered blur, gradients, and micro-animations.
- **Stacks.js integration** — real-time balance fetching and contract calls.
- **Batch simulator** — coordinate interactions across the farming account fleet.
- **Responsive & PWA-ready** — mobile-friendly with standalone install support.

### Routes

| Path           | Description                                  |
| -------------- | -------------------------------------------- |
| `/`            | Dashboard home — balances and account list   |
| `/simulations` | Simulation activity and batch runs           |
| `/settings`    | Network / contract configuration             |

### Key components & state

`GlassCard`, `Header`, `Sidebar`, `BalanceCard`, `AccountList`, `TokenList`, `TransactionList`, `BatchSimulator`, `StatusBadge`, `Notification`, and `Skeleton` loaders. Components favor composition and a shared visual token system defined in `app/globals.css`.

Wallet connection is provided through `context/StacksAuthContext.tsx`, which wraps `@stacks/connect` and exposes the authenticated session to the component tree via React Context. Balance and transaction data are fetched from the Hiro API and refreshed on demand.

## Prerequisites

- **Node.js** 18+ and npm
- **Clarinet** — Clarity runtime & dev tool ([install guide](https://github.com/hirosystems/clarinet))
- A **Stacks wallet** (Hiro Wallet / Xverse) for interacting with the dashboard
- For deployments: a funded wallet and its mnemonic/private key

## Quick Start

Clone the repository:

```bash
git clone https://github.com/distributed-nerd/stack-wallet.git
cd stack-wallet
```

The two workspaces (`smart-contract/` and `frontend/`) are set up independently — follow the relevant section below.

### Smart contracts

```bash
cd smart-contract
npm install            # installs Stacks.js tooling used by the scripts
clarinet check         # type/syntax-check all contracts
```

`clarinet check` validates every contract listed in `Clarinet.toml` against the configured Clarity version.

### Running contract tests

```bash
cd smart-contract
clarinet test          # run the test suite in tests/
clarinet console       # open an interactive REPL against the contracts
```

Use `clarinet console` to call functions manually and inspect data maps while developing.

### Frontend configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_STX_CONTRACT_ADDRESS=SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6
NEXT_PUBLIC_NETWORK=mainnet
```

Point `NEXT_PUBLIC_NETWORK` at `testnet` while iterating to avoid spending real STX.

### Running the dashboard

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

Populate `frontend/public/accounts.json` from the `smart-contract` directory so the dashboard can display the account fleet.

## Tooling & Scripts

The `smart-contract/` directory contains a large set of Node.js and Bash utilities for operating the contracts at scale. The most useful entry points are grouped below.

### Account generation

```bash
node generate-accounts.js          # generate a fleet of accounts -> accounts.json
node quick-gen-accounts.js         # lightweight variant
./generate-mainnet-accounts.sh     # mainnet-oriented generation
node derive-master-key.js          # derive the master address from a key
```

Generated accounts are written to `accounts.json`, which downstream scripts and the dashboard consume.

### Minting

```bash
node mint-tokens.js                # mint STK to accounts
./mint-batch.sh                    # batched minting
./master-mint-tokens.sh            # orchestrated mint across the fleet
```

Minting is owner-gated on-chain (`mint` asserts `tx-sender` is the contract owner), so these run from the deployer account.

### Distribution & transfers

```bash
node send-stx.js                       # send STX to accounts
./transfer-tokens-batch.sh             # batch STK transfers
./master-distribute-tokens.sh          # orchestrated distribution
node check-balances.js                 # spot-check balances
node full-balance-report.js            # full STX + STK report
node account-status-report.js          # per-account status summary
```

## Simulation Harness

The simulation scripts drive realistic, high-volume load against the deployed contracts on mainnet. They are built for reliability over speed:

- **Sequential execution** — accounts are processed one at a time to keep nonces sane.
- **Confirmation polling** — each transaction is polled on the Hiro API until it reaches `success` before moving on.
- **Retries & nonce correction** — broadcast loops recover from transient failures and nonce conflicts.

### Counter simulations

The `sim-counter-*` scripts exercise the wallet contract's `counter` increment/decrement path across many accounts at various fee levels:

```bash
node sim-counter-100-fee005.js     # 100 iterations, fee 0.005 STX
node sim-counter-200-fee001.js     # 200 iterations, fee 0.001 STX
node sim-counter-300-fee0025.js    # 300 iterations, fee 0.0025 STX
```

Each run emits a `.log` and a `*-results.json` artifact next to the script.

### SIP-010 token simulations

The `sim-sip010-*` scripts drive SIP-010 `transfer` activity across the fleet:

```bash
node sim-sip010-100-fee005.js
node sim-sip010-200-fee001.js
node sim-sip010-300-fee0025.js
```

These mirror the counter sims but target token transfers, which is closer to real-world usage and stresses balance/nonce handling harder.

### Fee tuning

Filenames encode the per-transaction fee used (`fee001` = 0.001 STX, `fee0025` = 0.0025 STX, `fee005` = 0.005 STX). Lower fees are cheaper but can stall when the mempool minimum rises; the scripts log the mempool minimum and bump fees when needed. Tune the fee to current network conditions before large runs.

### Results & reports

Every simulation writes structured output you can diff and archive:

- `*-results.json` — per-account outcome, txid, nonce, and confirmation status.
- `*.log` — human-readable run log.
- `docs/SIMULATION_REPORT.md` — a curated summary of balances and notable runs.

Confirmed-state snapshots (e.g. `sim-counter-100-confirmed.json`) capture the on-chain result after polling completes.

## Deployment

Full details are in [`smart-contract/DEPLOYMENT.md`](smart-contract/DEPLOYMENT.md). In short:

```bash
cd smart-contract
clarinet deployments generate --testnet   # plan + cost estimate
clarinet deploy --testnet                  # deploy to testnet first
clarinet deploy --mainnet                  # then mainnet, once verified
```

Always deploy to **testnet** first (fund via the Hiro faucet), verify on the explorer, then promote to mainnet. Mainnet deployments are permanent and contract names are unique per deployer address.

## Environment Variables

| Variable                           | Where        | Description                                  |
| ---------------------------------- | ------------ | -------------------------------------------- |
| `NEXT_PUBLIC_STX_CONTRACT_ADDRESS` | frontend     | Deployer/contract address shown in the UI    |
| `NEXT_PUBLIC_NETWORK`              | frontend     | `mainnet` or `testnet`                       |
| Deployer mnemonic                  | `settings/*` | Clarinet wallet for deploys (never commit)   |

Frontend variables go in `frontend/.env.local`; deployment credentials go in Clarinet's `settings/Mainnet.toml` / `Testnet.toml`.

## Security

> [!WARNING]
> **Never commit mainnet credentials.** Keep mnemonics and private keys out of git. `settings/Mainnet.toml` must contain real secrets only locally — add it to `.gitignore` before populating it.

- Test on **testnet** before every mainnet action.
- Treat `accounts.json` and any key material as sensitive.
- Review fee/nonce logic before large mainnet simulation runs — they spend real STX.
- Mainnet contract deployments are irreversible.

## Roadmap

- [ ] Expand the contract test suite (`clarinet test`) for the multisig flows.
- [ ] Surface live simulation progress in the `/simulations` dashboard view.
- [ ] Add a one-command end-to-end devnet bootstrap (generate → deploy → mint → simulate).
- [ ] Parameterize the simulation harness via CLI flags instead of per-fee script copies.
- [ ] Token metadata / explorer verification helpers.
