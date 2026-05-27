const { makeContractCall, AnchorMode, PostConditionMode, uintCV, principalCV, noneCV, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');
const fs = require('fs');

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'sip010-token';
const ACCOUNTS_FILE = './accounts.json';
const NETWORK = STACKS_MAINNET;

async function test() {
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  const account = accounts[0];
  const recipientAddr = accounts[1].address;
  
  console.log(`Testing with Account ${account.id}: ${account.address}`);
  
  try {
    const txOptions = {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'transfer',
      functionArgs: [
        uintCV(1000000n),
        principalCV(account.address),
        principalCV(recipientAddr),
        noneCV()
      ],
      senderKey: account.privateKey,
      network: NETWORK,
      anchorMode: AnchorMode.Any,
      fee: 1000n,
      postConditionMode: PostConditionMode.Allow
    };

    console.log('Calling makeContractCall...');
    const transaction = await makeContractCall(txOptions);
    console.log('Transaction created:', !!transaction);
    
    if (transaction) {
      console.log('Serializing...');
      const serialized = transaction.serialize();
      console.log('Serialized length:', serialized.length);
      
      console.log('Broadcasting...');
      const result = await broadcastTransaction(transaction, NETWORK);
      console.log('Result:', JSON.stringify(result));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
