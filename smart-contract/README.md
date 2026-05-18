# Stacks Smart Contract Project

This project contains Clarity smart contracts for the Stacks blockchain.

## Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - Clarity runtime and development tool

## Installation

Install Clarinet:
```bash
# macOS
brew install clarinet

# Linux/WSL
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/

# Windows
scoop install clarinet
```

## Project Structure

```
smart-contract/
├── contracts/          # Clarity smart contracts (.clar files)
├── tests/             # Contract tests
├── settings/          # Network configurations
│   ├── Devnet.toml
│   ├── Testnet.toml
│   └── Mainnet.toml
└── Clarinet.toml      # Project configuration
```

## Usage

### Create a new contract
```bash
cd smart-contract
clarinet contract new <contract-name>
```

### Check contract syntax
```bash
clarinet check
```

### Run tests
```bash
clarinet test
```

### Start local devnet
```bash
clarinet integrate
```

### Deploy to testnet
```bash
clarinet deploy --testnet
```

## Development

Write your Clarity contracts in the `contracts/` directory and tests in the `tests/` directory.

Example contract structure:
```clarity
;; contract-name.clar
(define-public (hello-world)
  (ok "Hello, Stacks!"))
```
## Tools


# Simulation Persistence
Tracks the state of sequential token transfers for robust execution.
## Ultimate Simulation
A high-reliability script for mass token transfers.
### Usage
Run `node ultimate-sequential-simulation.js` to start.
### Robustness
Features include nonce retries, broadcast loops, and block polling.
---
