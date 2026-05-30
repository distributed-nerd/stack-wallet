const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  uintCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

global.fetch = fetch;

