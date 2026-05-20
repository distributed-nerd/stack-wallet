const { makeContractCall, AnchorMode, PostConditionMode, uintCV, principalCV, noneCV, broadcastTransaction } = require('@stacks/transactions');
const { STACKS_MAINNET } = require('@stacks/network');

async function test() {
  console.log('Testing broadcastTransaction signature...');
  try {
    // Just a dummy tx to check serialization/broadcast call
    const txOptions = {
        contractAddress: 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6',
        contractName: 'sip010-token',
        functionName: 'transfer',
        functionArgs: [uintCV(1), principalCV('SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6'), principalCV('SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6'), noneCV()],
        senderKey: 'YOUR_PRIVATE_KEY_HERE01',
        network: STACKS_MAINNET,
        anchorMode: AnchorMode.Any,
        fee: 1000n,
        nonce: 0n,
        postConditionMode: PostConditionMode.Allow
    };
    const transaction = await makeContractCall(txOptions);
    console.log('Transaction created successfully');
    
    // Check if it's an object with serialize method
    if (transaction && typeof transaction.serialize === 'function') {
        console.log('Transaction has serialize method');
    } else {
        console.log('Transaction does NOT have serialize method or is undefined');
    }

    // Try a mock broadcast to see if it even gets to the network call
    // We expect a network error or "Invalid nonce" since we are using a real key but maybe wrong nonce
    // But we want to see if the library fails BEFORE the network call
    try {
        const res = await broadcastTransaction({ transaction, network: STACKS_MAINNET });
        console.log('Broadcast call reached network phase');
    } catch (e) {
        console.log('Broadcast call reached network phase (or failed with network error):', e.message);
    }
  } catch (e) {
    console.error('Test failed:', e);
  }
}

test();
