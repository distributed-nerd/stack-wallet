const transactions = require('@stacks/transactions');
const stacksNetwork = require('@stacks/network');

async function test() {
  console.log('transactions keys:', Object.keys(transactions));
  
  const network = stacksNetwork.createNetwork({
    url: 'https://api.hiro.so',
    chainId: stacksNetwork.ChainId.Mainnet
  });

  const txOptions = {
    contractAddress: 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6',
    contractName: 'sip010-token',
    functionName: 'transfer',
    functionArgs: [
      transactions.uintCV(1000000n),
      transactions.principalCV('SP2DTV4BG951T04XSTN1Z0NJFHTXYMSYQGCYM04WP'),
      transactions.principalCV('SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6'),
      transactions.noneCV()
    ],
    senderKey: '5c25c4bb7119d2e0a6dbb2a50799fe12a6c3a6d2510d47bc8cab6c9b5efa9b6601',
    network: network,
    anchorMode: transactions.AnchorMode.Any,
    fee: 1000n,
    nonce: 0n,
    postConditionMode: transactions.PostConditionMode.Allow
  };

  try {
    const transaction = await transactions.makeContractCall(txOptions);
    console.log('Transaction created:', transaction ? 'Yes' : 'No');
    if (transaction) {
      console.log('Transaction keys:', Object.keys(transaction));
      console.log('Transaction prototype:', Object.keys(Object.getPrototypeOf(transaction)));
      if (typeof transaction.serialize === 'function') {
        console.log('serialize() exists');
      } else {
        console.log('serialize() DOES NOT EXIST');
      }
    }
  } catch (e) {
    console.log('Error creating transaction:', e.message);
  }
}

test().catch(console.error);
