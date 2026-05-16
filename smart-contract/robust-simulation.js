const transactions = require('@stacks/transactions');
const stacksNetwork = require('@stacks/network');
const fetch = require('node-fetch');
const fs = require('fs');

const CONTRACT_ADDRESS = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const CONTRACT_NAME = 'sip010-token';
const RECIPIENT = 'SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6';
const TOKEN_IDENTIFIER = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}::stack-token`;
const AMOUNT = 1000000n; // 1 token
const FEE = 1000n;      // 0.001 STX

const network = stacksNetwork.createNetwork({
  url: 'https://api.hiro.so',
  chainId: stacksNetwork.ChainId.Mainnet
});

async function getAccountInfo(address) {
  try {
    const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`);
    if (!response.ok) return { stxBalance: 0n, tokenBalance: 0n, nonce: 0n };
    const data = await response.json();
    
    const stxBalance = data.stx && data.stx.balance ? BigInt(data.stx.balance) : 0n;
    
    let tokenBalance = 0n;
    if (data.fungible_tokens && data.fungible_tokens[TOKEN_IDENTIFIER]) {
      tokenBalance = BigInt(data.fungible_tokens[TOKEN_IDENTIFIER].balance);
    }
    
    const nonceResponse = await fetch(`https://api.mainnet.hiro.so/extended/v1/address/${address}/nonce`);
    const nonceData = nonceResponse.ok ? await nonceResponse.json() : { possible_next_nonce: 0 };
    const nonce = nonceData.possible_next_nonce !== undefined ? BigInt(nonceData.possible_next_nonce) : 0n;
    
    return { stxBalance, tokenBalance, nonce };
  } catch (e) {
    return { stxBalance: 0n, tokenBalance: 0n, nonce: 0n };
  }
}

async function waitForConfirmation(txid) {
  console.log(`    Polling confirmation for ${txid}...`);
  let attempts = 0;
  while (attempts < 60) {
    try {
      const response = await fetch(`https://api.mainnet.hiro.so/extended/v1/tx/${txid}`);
      if (response.status === 404) {
        await new Promise(r => setTimeout(r, 10000));
        attempts += 0.2;
        continue;
      }
      const data = await response.json();
      if (data.tx_status === 'success') {
        console.log(`    ✓ Confirmed!`);
        return true;
      } else if (['failed', 'dropped_replace_by_fee', 'dropped_replace_with_error'].includes(data.tx_status)) {
        console.log(`    ✗ Transaction failed: ${data.tx_status}`);
        return false;
      }
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 60000));
      attempts += 1;
    } catch (e) {
      await new Promise(r => setTimeout(r, 10000));
      attempts += 0.2;
    }
  }
  return false;
}

async function simulate() {
  const accounts = JSON.parse(fs.readFileSync('./accounts.json', 'utf8'));
  const activeAccounts = [];
  
  console.log('Scanning first 5 accounts for STK balance...');
  for (const account of accounts.slice(0, 5)) {
     const info = await getAccountInfo(account.address);
     if (info.tokenBalance >= AMOUNT && info.stxBalance >= FEE) {
       activeAccounts.push({ ...account, ...info });
     }
  }

  if (activeAccounts.length === 0) return;

  for (const account of activeAccounts) {
    console.log(`\n[Account ${account.id}] ${account.address}`);
    try {
      const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'transfer',
        functionArgs: [
          transactions.uintCV(AMOUNT),
          transactions.principalCV(account.address),
          transactions.principalCV(RECIPIENT),
          transactions.noneCV()
        ],
        senderKey: account.privateKey,
        network: network,
        anchorMode: transactions.AnchorMode.Any,
        fee: FEE,
        nonce: account.nonce,
        postConditionMode: transactions.PostConditionMode.Allow
      };

      const transaction = await transactions.makeContractCall(txOptions);
      const serializedTx = transaction.serialize();
      
      const response = await fetch(`https://api.mainnet.hiro.so/v2/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: serializedTx
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`    ✗ Broadcast Error (HTTP ${response.status}): ${errorText}`);
        continue;
      }

      const broadcastResponse = await response.json();
      const txid = broadcastResponse.txid || broadcastResponse;
      console.log(`    ✓ Broadcast successful. TxID: ${txid}`);
      
      const confirmed = await waitForConfirmation(txid);
      if (!confirmed) break;
    } catch (e) {
      console.log(`    ✗ Unexpected Error: ${e.message}`);
      break;
    }
  }
}

simulate().catch(console.error);
