#!/bin/bash

# Configuration
PRIVATE_KEY="" # YOUR_PRIVATE_KEY_HERE
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
AMOUNT="20000000"  # 20 tokens with 6 decimals
FEE="1000"        # 0.001 STX fee as requested
CUR_NONCE=154
NETWORK="mainnet"

# Read accounts from JSON
ADDRESSES=$(cat accounts.json | jq -r '.[] | .address')

echo "Transferring 20 SIP-010 tokens to remaining accounts..."
echo "Starting nonce: $CUR_NONCE"
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo ""

COUNTER=44
for ADDRESS in $ADDRESSES; do
  COUNTER=$((COUNTER + 1))
  
  # Skip first 11 accounts (already pending)
  if [ $COUNTER -le 11 ]; then
    continue
  fi
  
  echo "[$COUNTER/50] Transferring to: $ADDRESS"
  
  # Use stacks-cli to call transfer function
  RESULT=$(stx call_contract_func \
    --contract_address "$CONTRACT_ADDRESS" \
    --contract_name "$CONTRACT_NAME" \
    --function_name "transfer" \
    --fee "$FEE" \
    --nonce "$CUR_NONCE" \
    --payment_key "$PRIVATE_KEY" \
    --function_args "u$AMOUNT, '$CONTRACT_ADDRESS, '$ADDRESS, none" \
    2>&1)
  
  if echo "$RESULT" | grep -q "txid"; then
    TXID=$(echo "$RESULT" | grep -o "0x[0-9a-f]\{64\}" | head -n 1)
    if [ -z "$TXID" ]; then TXID="$RESULT"; fi
    
    echo "  ✓ Success - Nonce: $CUR_NONCE"
    echo "  TxID: $TXID"
    CUR_NONCE=$((CUR_NONCE + 1))
  else
    echo "  ✗ Failed: $RESULT"
    # Don't increment nonce on failure to retry or avoid gaps
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "========================================="
echo "Transfer Summary:"
echo "  Successful Transfers (This Run): $((CUR_NONCE - 121))"
echo "  Final Nonce: $((CUR_NONCE - 1))"
echo "========================================="
