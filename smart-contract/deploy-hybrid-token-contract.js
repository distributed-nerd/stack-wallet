const {
  makeContractDeploy,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  getAddressFromPrivateKey,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const fetch = require('node-fetch');
const fs = require('fs');

const CONTRACT_NAME = 'hybrid-token-contract';
const CONTRACT_FILE = './contracts/hybrid-token-contract.clar';
const DEPLOY_FEE = 250000n;
