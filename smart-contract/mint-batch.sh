#!/bin/bash

# Configuration
PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
AMOUNT="20000000"  # 20 tokens with 6 decimals
FEE="1000"        # 0.001 STX in microSTX
NONCE=60
NETWORK="mainnet"

# Read accounts from JSON
ADDRESSES=$(cat accounts.json | jq -r '.[] | .address')

echo "Minting 20 SIP-010 tokens to 50 accounts..."
echo "Starting nonce: $NONCE"
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo ""

COUNTER=0
SUCCESS=0
FAILED=0

for ADDRESS in $ADDRESSES; do
  COUNTER=$((COUNTER + 1))
  CURRENT_NONCE=$((NONCE + COUNTER - 1))
  
  echo "[$COUNTER/50] Minting to: $ADDRESS"
  
  # Use stacks-cli to call mint function
  RESULT=$(stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "mint" \
    "$FEE" "$CURRENT_NONCE" "$PRIVATE_KEY" "u$AMOUNT, '$ADDRESS" 2>&1)
  
  if echo "$RESULT" | grep -q "txid"; then
    TXID=$(echo "$RESULT" | jq -r '.txid' 2>/dev/null || echo "$RESULT")
    echo "  ✓ Success - Nonce: $CURRENT_NONCE"
    echo "  TxID: $TXID"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ Failed: $RESULT"
    FAILED=$((FAILED + 1))
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "========================================="
echo "Minting Summary:"
echo "  Successful: $SUCCESS"
echo "  Failed: $FAILED"
echo "  Total tokens minted: $((SUCCESS * 20))"
echo "  Total fees: $(echo "scale=3; $SUCCESS * 0.001" | bc) STX"
echo "========================================="
