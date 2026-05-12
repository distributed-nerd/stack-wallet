#!/bin/bash

# Configuration
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1000000"  # 1 token with 6 decimals
FEE="1000"       # 0.001 STX as requested
NONCE=0          # New accounts start at nonce 0
NETWORK="mainnet"

# Read accounts from JSON
# We need both address and private key for each account
ACCOUNTS_DATA=$(cat accounts.json | jq -c '.[]')

echo "Simulating SIP-010 interactions for 50 accounts..."
echo "Each account will transfer 1 token to: $RECIPIENT"
echo "Fee: 0.001 STX"
echo ""

COUNTER=0
SUCCESS=0
FAILED=0

while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
  
  echo "[$COUNTER/50] Account $ADDRESS interacting..."
  
  # Use stacks-cli to call transfer function
  # Each account sends from itself, so sender matches the signing key's address
  RESULT=$(stx call_contract_func \
    --contract_address "$CONTRACT_ADDRESS" \
    --contract_name "$CONTRACT_NAME" \
    --function_name "transfer" \
    --fee "$FEE" \
    --nonce "$NONCE" \
    --payment_key "$PRIVATE_KEY" \
    --function_args "u$AMOUNT, '$ADDRESS, '$RECIPIENT, none" \
    2>&1)
  
  if echo "$RESULT" | grep -q "txid"; then
    TXID=$(echo "$RESULT" | grep -o "0x[0-9a-f]\{64\}" | head -n 1)
    if [ -z "$TXID" ]; then TXID="$RESULT"; fi
    
    echo "  ✓ Success - TxID: $TXID"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ Failed: $RESULT"
    FAILED=$((FAILED + 1))
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.5
  
done <<< "$ACCOUNTS_DATA"

echo ""
echo "========================================="
echo "Simulation Summary:"
echo "  Successful Interactions: $SUCCESS"
echo "  Failed Interactions: $FAILED"
echo "  Total STX Fees: $(echo "scale=3; $SUCCESS * 0.001" | bc) STX"
echo "========================================="
