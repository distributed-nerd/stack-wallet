#!/bin/bash

# Configuration
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1"      # 1 token unit
FEE="1000"      # 1000 micro-STX (0.001 STX per tx for fast confirmation)
ACCOUNTS_FILE="accounts.json"

echo "Starting batch simulation of 100 TOKEN INTERACTIONS from 50 accounts using 'stx' CLI..."
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo "Function: transfer"
echo "Amount: $AMOUNT, Recipient: $RECIPIENT"
echo "Fee: $FEE micro-STX per transaction"
echo ""

# Read accounts from JSON
ACCOUNTS_DATA=$(cat $ACCOUNTS_FILE | jq -c '.[]')

COUNTER=0
SUCCESS=0
FAILED=0

while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
  
  echo "[$COUNTER/50] Account $ADDRESS interacting..."
  
  # Get current nonce
  CURRENT_NONCE=$(stx balance "$ADDRESS" | jq -r '.nonce')
  if [ -z "$CURRENT_NONCE" ] || [ "$CURRENT_NONCE" == "null" ]; then
    CURRENT_NONCE=0
  fi
  
  for i in {1..2}; do
    NONCE=$((CURRENT_NONCE + i - 1))
    echo "  -> Sending transaction #$i with nonce $NONCE..."
    
    # Use stx call_contract_func
    # Arguments: (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34)))
    RESULT=$(stx call_contract_func \
      --contract_address "$CONTRACT_ADDRESS" \
      --contract_name "$CONTRACT_NAME" \
      --function_name "transfer" \
      --fee "$FEE" \
      --nonce "$NONCE" \
      --payment_key "$PRIVATE_KEY" \
      --function_args "u$AMOUNT, '$ADDRESS, '$RECIPIENT, none" \
      2>&1)
    
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
echo "Token Simulation Complete!"
echo "  Successful transactions: $SUCCESS"
echo "  Failed transactions: $FAILED"
echo "  Total fees paid: $(echo "scale=3; $SUCCESS * $FEE / 1000000" | bc) STX"
echo "========================================="
