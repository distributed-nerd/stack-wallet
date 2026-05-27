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
