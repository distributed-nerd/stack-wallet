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

const CONTRACT_NAME = 'hybrid-stack-wallet';
const CONTRACT_FILE = './contracts/hybrid-stack-wallet.clar';
const DEPLOY_FEE = 200000n;
const API = 'https://api.hiro.so';
const EXPECTED_ADDRESS = process.env.STACKS_EXPECTED_ADDRESS;

