# StackWallet Frontend

A premium, high-performance Stacks Wallet dashboard designed for batch account management and contract interaction simulations.

## Key Features
- **Glassmorphism Design**: High-end UI with fuzzy backgrounds, gradients, and micro-animations.
- **Stacks.js Integration**: Real-time balance fetching and contract calls using Stacks v7.
- **Batch Simulator**: specialized dashboard for coordinating interactions across 50 farming accounts simultaneously.
- **Responsive & PWA**: Mobile-ready interface with standalone installation support.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **State**: React Context / Hooks
- **Styling**: Vanilla CSS (Premium Tokens)
- **Blockchain**: `@stacks/connect`, `@stacks/transactions`, `@stacks/network`
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env.local` file with:
   ```env
   NEXT_PUBLIC_STX_CONTRACT_ADDRESS=SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6
   NEXT_PUBLIC_NETWORK=mainnet
   ```

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Prepare Accounts**:
   Ensure `public/accounts.json` is populated from the `smart-contract` directory.

## Commit History
The project follows a granular 30-commit roadmap documenting the complete development lifecycle.
