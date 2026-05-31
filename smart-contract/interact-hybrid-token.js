/**
 * interact-hybrid-token.js
 * CLI helper for calling hybrid-token-contract functions on mainnet.
 *
 * Usage:
 *   node interact-hybrid-token.js <command> [args...]
 *
 * Commands:
 *   initialize
 *   set-paused <true|false>
 *   mint-to <amount> <recipient>
 *   burn-from <amount>
 *   approve <spender> <amount>
 *   deposit-to-pool <wallet-id> <amount>
 *   withdraw-from-pool <wallet-id> <amount>
 *   stake-tokens <amount> <lock-blocks>
