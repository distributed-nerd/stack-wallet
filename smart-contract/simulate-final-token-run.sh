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
echo "Starting FINAL SUCCESSFUL TOKEN Simulation: 100 Transactions"
echo "=================================================================="
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo ""

# Read accounts from JSON
ACCOUNTS_DATA=$(cat $ACCOUNTS_FILE | jq -c '.[]')

SUCCESS_PHASE1=0
FAILED_PHASE1=0
SUCCESS_PHASE2=0
FAILED_PHASE2=0

# --- PHASE 1: OWNER -> ACCOUNTS (50 transfers) ---
echo "--- Phase 1: Owner distributing tokens ---"
OWNER_NONCE=$(stx balance "$OWNER_ADDR" | jq -r '.nonce')
echo "Starting owner nonce: $OWNER_NONCE"

COUNTER=0
while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  NONCE=$((OWNER_NONCE + COUNTER - 1))
  
  echo "[$COUNTER/50] Owner -> $ADDRESS (Nonce: $NONCE)..."
  
  RESULT=$(stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "transfer" "$FEE" "$NONCE" "$OWNER_KEY" "u$AMOUNT, '$OWNER_ADDR, '$ADDRESS, none" 2>&1)
  
  if [[ $RESULT == *"txid"* ]] || [[ $RESULT == *"0x"* ]]; then
    SUCCESS_PHASE1=$((SUCCESS_PHASE1 + 1))
    TXID=$(echo "$RESULT" | grep -o '0x[0-9a-fA-F]\{64\}' | head -n 1)
    echo "    ✓ Broadcast: $TXID"
  else
    FAILED_PHASE1=$((FAILED_PHASE1 + 1))
    echo "    ✗ Broadcast Failed: $RESULT"
  fi
  sleep 1 # Slightly longer delay to avoid rate limiting and allow mempool to update
done <<< "$ACCOUNTS_DATA"

echo ""
echo "--- Phase 1 Complete ---"
echo ""

# --- PHASE 2: ACCOUNTS -> RECIPIENT (50 transfers) ---
echo "--- Phase 2: Accounts transferring back ---"
COUNTER=0
while read -r ACCOUNT; do
  COUNTER=$((COUNTER + 1))
  ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
  PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
  
  # Get dynamic nonce for the account
  ACC_NONCE=$(stx balance "$ADDRESS" | jq -r '.nonce')
  if [ -z "$ACC_NONCE" ] || [ "$ACC_NONCE" == "null" ]; then ACC_NONCE=0; fi
  
  echo "[$COUNTER/50] $ADDRESS -> Recipient (Nonce: $ACC_NONCE)..."
  
  RESULT=$(stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "transfer" "$FEE" "$ACC_NONCE" "$PRIVATE_KEY" "u$AMOUNT, '$ADDRESS, '$RECIPIENT, none" 2>&1)
  
  if [[ $RESULT == *"txid"* ]] || [[ $RESULT == *"0x"* ]]; then
    SUCCESS_PHASE2=$((SUCCESS_PHASE2 + 1))
    TXID=$(echo "$RESULT" | grep -o '0x[0-9a-fA-F]\{64\}' | head -n 1)
    echo "    ✓ Broadcast: $TXID"
  else
    FAILED_PHASE2=$((FAILED_PHASE2 + 1))
    echo "    ✗ Broadcast Failed: $RESULT"
  fi
  sleep 1
done <<< "$ACCOUNTS_DATA"

echo ""
echo "========================================="
echo "Final Simulation Summary:"
echo "  Phase 1 Success: $SUCCESS_PHASE1"
echo "  Phase 2 Success: $SUCCESS_PHASE2"
echo "  Total Transactions: $((SUCCESS_PHASE1 + SUCCESS_PHASE2))"
echo "========================================="
