#!/bin/bash
# master-distribute-tokens.sh - Distribute remaining tokens via transfer

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
MASTER_PRIVATE_KEY="" # YOUR_MASTER_PRIVATE_KEY_HERE
MASTER_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="2000000" # 2 STK
FEE="1000"

echo "Starting Token Distribution Process..."
echo "Transferring: $AMOUNT micro-STK (2 STK) to all accounts"
echo "---"

ACCOUNTS_DATA=$(cat accounts.json | jq -c '.[]')

run_batch() {
    local BATCH_LABEL=$1
    local START_ID=$2
    local END_ID=$3
    echo ">>> EXECUTING $BATCH_LABEL (Accounts $START_ID to $END_ID)"
    
    local TXIDS=()
    local CURRENT_NONCE=$(stx balance "$MASTER_ADDRESS" | jq -r .nonce)
    echo "    Master Nonce: $CURRENT_NONCE"
    
    while read -r ACCOUNT; do
        ID=$(echo "$ACCOUNT" | jq -r '.id')
        ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
        
        if [ "$ID" -lt "$START_ID" ] || [ "$ID" -gt "$END_ID" ] || [ "$ID" -eq 0 ]; then
            continue
        fi
        
        # Broadcast Transfer
        RESULT=$(stx call_contract_func \
            --contract_address "$CONTRACT_ADDRESS" \
            --contract_name "$CONTRACT_NAME" \
            --function_name "transfer" \
            --fee "$FEE" \
            --nonce "$CURRENT_NONCE" \
            --payment_key "$MASTER_PRIVATE_KEY" \
            --function_args "u$AMOUNT, '$MASTER_ADDRESS, '$ADDRESS, none" \
            2>&1)
        
        TXID=$(echo "$RESULT" | jq -r '.txid // ""')
        if [ ! -z "$TXID" ] && [ "$TXID" != "null" ]; then
            echo "  [Account $ID] ✓ Transfer broadcasted (Nonce: $CURRENT_NONCE): $TXID"
            TXIDS+=("$TXID")
            CURRENT_NONCE=$((CURRENT_NONCE + 1))
        else
            echo "  [Account $ID] ✗ FAILED: $RESULT"
            echo "  Stopping batch to prevent nonce gaps."
            break
        fi
        sleep 0.5
    done <<< "$ACCOUNTS_DATA"
    
    echo ""
    echo "Wait for confirmations for $BATCH_LABEL..."
    while true; do
        PENDING=0
        for TXID in "${TXIDS[@]}"; do
            STATUS=$(curl -s "https://api.mainnet.hiro.so/extended/v1/tx/$TXID" | jq -r '.tx_status // ""')
            if [ "$STATUS" != "success" ]; then
                PENDING=$((PENDING + 1))
            fi
        done
        if [ "$PENDING" -eq 0 ]; then
            echo ">>> $BATCH_LABEL CONFIRMED!"
            break
        fi
        echo -n "."
        sleep 60
    done
}

run_batch "DISTRIBUTION BATCH A" 1 25
run_batch "DISTRIBUTION BATCH B" 26 50

echo "--- DISTRIBUTION SUCCESSFUL ---"
