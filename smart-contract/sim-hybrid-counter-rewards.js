const {
  makeContractCall,
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  contractPrincipalCV,
} = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fetch = require('node-fetch');
