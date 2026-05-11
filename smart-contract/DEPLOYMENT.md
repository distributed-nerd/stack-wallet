# Deployment Guide

## Prerequisites for Mainnet Deployment

1. **Funded Stacks Wallet**: You need a Stacks wallet with sufficient STX for deployment fees (typically 0.5-2 STX)
2. **Wallet Credentials**: Your 24-word mnemonic phrase or private key
3. **Clarinet CLI**: Ensure Clarinet is installed

## Security Warning

⚠️ **NEVER commit your mainnet wallet credentials to git!**

Add `settings/Mainnet.toml` to `.gitignore` after adding your credentials.

## Deployment Steps

### 1. Configure Your Mainnet Wallet

Edit `settings/Mainnet.toml` and replace the placeholder with your actual wallet mnemonic:

```toml
[accounts.deployer]
mnemonic = "your actual 24-word mnemonic phrase here"
```

### 2. Verify Your Configuration

Check your wallet address and balance:

```bash
cd smart-contract
clarinet accounts mainnet
```

### 3. Estimate Deployment Cost

```bash
clarinet deployments generate --mainnet
```

This creates a deployment plan showing estimated costs.

### 4. Deploy to Mainnet

**Option A: Interactive Deployment**
```bash
clarinet deploy --mainnet
```

**Option B: Using Deployment Plan**
```bash
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

### 5. Verify Deployment

After deployment, you'll receive a transaction ID. Check it on:
- Stacks Explorer: https://explorer.hiro.so/
- Or via API: `https://api.hiro.so/extended/v1/tx/YOUR_TX_ID`

## Alternative: Deploy to Testnet First

It's recommended to test on testnet before mainnet:

### 1. Get Testnet STX

Visit the faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet

### 2. Configure Testnet Wallet

Edit `settings/Testnet.toml`:

```toml
[accounts.deployer]
mnemonic = "your testnet wallet mnemonic"
```

### 3. Deploy to Testnet

```bash
clarinet deploy --testnet
```

## Post-Deployment

After successful deployment, your contract will be available at:

```
<YOUR_STACKS_ADDRESS>.sip010-token
```

You can interact with it using:
- Stacks CLI
- Stacks.js SDK
- Web wallets (Hiro Wallet, Xverse)
- Block explorers

## Troubleshooting

**Insufficient Funds**: Ensure your wallet has enough STX for deployment fees

**Network Issues**: Check your internet connection and try again

**Contract Already Exists**: Contract names must be unique per address

**Nonce Issues**: Wait for pending transactions to complete

## Contract Verification

After deployment, verify your contract on the explorer:
1. Go to https://explorer.hiro.so/
2. Search for your contract address
3. Verify the source code matches your local version

## Important Notes

- Mainnet deployments are permanent and cannot be undone
- Contract names are unique per deployer address
- Always test thoroughly on testnet first
- Keep your deployment transaction ID for records
- Monitor gas fees during high network activity
