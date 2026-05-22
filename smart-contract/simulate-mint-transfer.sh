#!/bin/bash

# Configuration
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
OWNER_KEY="YOUR_PRIVATE_KEY_HERE01"
OWNER_ADDR="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1"      # 1 token unit
FEE="1000"      # 1000 micro-STX (0.001 STX per tx for fast confirmation)
ACCOUNTS_FILE="accounts.json"

echo "=================================================================="
echo "Starting Batch Simulation: MINT + TRANSFER (100 Transactions total)"
echo "=================================================================="
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo "Fee: $FEE micro-STX per transaction"
echo ""

# Read accounts from JSON
ACCOUNTS_DATA=$(cat $ACCOUNTS_FILE | jq -c '.[]')

SUCCESS_MINT=0
FAILED_MINT=0
SUCCESS_TRANSFER=0
FAILED_TRANSFER=0

# --- PART 1: MINTING (50 transactions) ---
echo "--- Phase 1: Minting tokens to 50 accounts ---"
OWNER_NONCE=$(stx balance "$OWNER_ADDR" | jq -r '.nonce')
echo "Initial owner nonce: $OWNER_NONCE"

COUNTER=0
while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  NONCE=$((OWNER_NONCE + COUNTER - 1))
  
  echo "[$COUNTER/50] Minting to $ADDRESS (Owner Nonce: $NONCE)..."
  
  RESULT=$(stx call_contract_func \
    --contract_address "$CONTRACT_ADDRESS" \
    --contract_name "$CONTRACT_NAME" \
    --function_name "mint" \
    --fee "$FEE" \
    --nonce "$NONCE" \
    --payment_key "$OWNER_KEY" \
    --function_args "u$AMOUNT, '$ADDRESS" \
    2>&1)
  
  if [[ $RESULT == *"txid"* ]] || [[ $RESULT == *"0x"* ]]; then
    SUCCESS_MINT=$((SUCCESS_MINT + 1))
    echo "    ✓ Mint Success"
  else
    FAILED_MINT=$((FAILED_MINT + 1))
    echo "    ✗ Mint Failed: $RESULT"
  fi
  sleep 0.5
done <<< "$ACCOUNTS_DATA"

echo ""
echo "--- Phase 1 Complete: $SUCCESS_MINT Mints broadcasted ---"
echo ""

# --- PART 2: TRANSFERRING (50 transactions) ---
echo "--- Phase 2: Transferring tokens from 50 accounts ---"
COUNTER=0
while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
  
  # Get current account nonce
  ACC_NONCE=$(stx balance "$ADDRESS" | jq -r '.nonce')
  if [ -z "$ACC_NONCE" ] || [ "$ACC_NONCE" == "null" ]; then ACC_NONCE=0; fi
  
  echo "[$COUNTER/50] Transferring from $ADDRESS (Nonce: $ACC_NONCE)..."
  
  RESULT=$(stx call_contract_func \
    --contract_address "$CONTRACT_ADDRESS" \
    --contract_name "$CONTRACT_NAME" \
    --function_name "transfer" \
    --fee "$FEE" \
    --nonce "$ACC_NONCE" \
    --payment_key "$PRIVATE_KEY" \
    --function_args "u$AMOUNT, '$ADDRESS, '$RECIPIENT, none" \
    2>&1)
  
  if [[ $RESULT == *"txid"* ]] || [[ $RESULT == *"0x"* ]]; then
    SUCCESS_TRANSFER=$((SUCCESS_TRANSFER + 1))
    echo "    ✓ Transfer Success"
  else
    FAILED_TRANSFER=$((FAILED_TRANSFER + 1))
    echo "    ✗ Transfer Failed: $RESULT"
  fi
  sleep 0.5
done <<< "$ACCOUNTS_DATA"

echo ""
echo "========================================="
echo "Simulation Complete Summary:"
echo "  Successful Mints: $SUCCESS_MINT"
echo "  Failed Mints: $FAILED_MINT"
echo "  Successful Transfers: $SUCCESS_TRANSFER"
echo "  Failed Transfers: $FAILED_TRANSFER"
echo "  Total Transactions: $((SUCCESS_MINT + SUCCESS_TRANSFER))"
echo "  Total Fees: $(echo "scale=3; ($SUCCESS_MINT + SUCCESS_TRANSFER) * $FEE / 1000000" | bc) STX"
echo "========================================="
