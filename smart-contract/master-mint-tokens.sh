#!/bin/bash
# master-mint-tokens.sh - Mint tokens to all 50 accounts from master

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
AMOUNT="50000000" # 50 STK
FEE="1000"

# Master Identity
MASTER_PRIVATE_KEY="" # YOUR_MASTER_PRIVATE_KEY_HERE
MASTER_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"

echo "Starting Master Minting Process..."
echo "To Account: All 50 in accounts.json"
echo "Amount per account: 50 STK"
echo "---"

ACCOUNTS_DATA=$(cat accounts.json | jq -c '.[]')

run_batch() {
    local BATCH_LABEL=$1
    local START_ID=$2
    local END_ID=$3
    echo ">>> EXECUTING $BATCH_LABEL (Accounts $START_ID to $END_ID)"
    
    local TXIDS=()
    
    # Get Initial Master Nonce for this batch
    local CURRENT_NONCE=$(stx balance "$MASTER_ADDRESS" | jq -r .nonce)
    echo "    Starting at Nonce: $CURRENT_NONCE"
    
    while read -r ACCOUNT; do
        ID=$(echo "$ACCOUNT" | jq -r '.id')
        ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
        
        if [ "$ID" -lt "$START_ID" ] || [ "$ID" -gt "$END_ID" ] || [ "$ID" -eq 0 ]; then
            continue
        fi
        
        # Broadcast Mint
        RESULT=$(stx call_contract_func \
            --contract_address "$CONTRACT_ADDRESS" \
            --contract_name "$CONTRACT_NAME" \
            --function_name "mint" \
            --fee "$FEE" \
            --nonce "$CURRENT_NONCE" \
            --payment_key "$MASTER_PRIVATE_KEY" \
            --function_args "u$AMOUNT, '$ADDRESS" \
            2>&1)
        
        TXID=$(echo "$RESULT" | jq -r '.txid // ""')
        if [ ! -z "$TXID" ] && [ "$TXID" != "null" ]; then
            echo "  [Account $ID] ✓ Mint broadcasted (Nonce: $CURRENT_NONCE): $TXID"
            TXIDS+=("$TXID")
            CURRENT_NONCE=$((CURRENT_NONCE + 1))
        else
            echo "  [Account $ID] ✗ FAILED: $RESULT"
            # Stop batch on failure to avoid nonce gaps
            echo "  CRITICAL ERROR: Stopping batch."
            break
        fi
        
        sleep 0.5
    done <<< "$ACCOUNTS_DATA"
    
    echo ""
    echo "Batch $BATCH_LABEL finished broadcasting. Waiting for confirmation..."
    
    while true; do
        PENDING=0
        for TXID in "${TXIDS[@]}"; do
            STATUS=$(curl -s "https://api.mainnet.hiro.so/extended/v1/tx/$TXID" | jq -r '.tx_status // ""')
            if [ "$STATUS" != "success" ]; then
                PENDING=$((PENDING + 1))
            fi
        done
        
        if [ "$PENDING" -eq 0 ]; then
            echo ">>> BATCH $BATCH_LABEL CONFIRMED!"
            break
        fi
        
        echo "  ($PENDING/${#TXIDS[@]} pending...)"
        sleep 60
    done
}

# Run in two batches
run_batch "BATCH A" 1 25
run_batch "BATCH B" 26 50

echo ""
echo "========================================="
echo "MINTING COMPLETE: All accounts topped up!"
echo "========================================="
