/**
 * test-hybrid-token.js
 * Smoke-test suite for hybrid-token-contract read-only functions.
 * Runs against mainnet (read-only calls only, no transactions).
 */

const {
  callReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
