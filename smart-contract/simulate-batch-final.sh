#!/bin/bash

# Configuration
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1"      # 1 micro-STX
FEE="1000"       # 1000 micro-STX (0.001 STX per tx for fast confirmation)
ACCOUNTS_FILE="accounts.json"

echo "Starting batch simulation of 100 transactions from 50 accounts using 'stx' CLI..."
echo "Each transaction: $AMOUNT micro-STX + $FEE micro-STX fee"
echo "Total fee cost for 100 transactions: 1000 micro-STX (0.001 STX)"
echo ""

# Read accounts from JSON
ACCOUNTS_DATA=$(cat $ACCOUNTS_FILE | jq -c '.[]')

COUNTER=0
SUCCESS=0
FAILED=0

while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  if [ $COUNTER -le 32 ]; then
    continue
  fi
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
  
  echo "[$COUNTER/50] Account $ADDRESS processing..."
  
  # Get current nonce
  CURRENT_NONCE=$(stx balance "$ADDRESS" | jq -r '.nonce')
  if [ -z "$CURRENT_NONCE" ] || [ "$CURRENT_NONCE" == "null" ]; then
    CURRENT_NONCE=0
  fi
  
  for i in {1..2}; do
    NONCE=$((CURRENT_NONCE + i - 1))
    echo "  -> Sending transaction #$i with nonce $NONCE..."
    
    # Use stx send_tokens
    RESULT=$(stx send_tokens "$RECIPIENT" "$AMOUNT" "$FEE" "$NONCE" "$PRIVATE_KEY" 2>&1)
    
    if [[ $RESULT == *"txid"* ]] || [[ $RESULT == *"0x"* ]]; then
      TXID=$(echo "$RESULT" | grep -o "0x[0-9a-f]\{64\}" | head -n 1)
      if [ -z "$TXID" ]; then TXID="$RESULT"; fi
      echo "    ✓ Success - TxID: $TXID"
      SUCCESS=$((SUCCESS + 1))
    else
      echo "    ✗ Failed: $RESULT"
      FAILED=$((FAILED + 1))
    fi
    
    # Small delay between transactions
    sleep 0.5
  done
  
  echo ""
  
done <<< "$ACCOUNTS_DATA"

echo "========================================="
echo "Simulation Complete!"
echo "  Successful transactions: $SUCCESS"
echo "  Failed transactions: $FAILED"
echo "  Total fees paid: $(echo "scale=3; $SUCCESS * $FEE / 1000000" | bc) STX"
echo "========================================="
