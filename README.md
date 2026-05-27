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
