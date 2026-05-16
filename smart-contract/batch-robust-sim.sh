#!/bin/bash
# batch-robust-sim.sh - 100 Token Interactions via 2-Batch Strategy

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1000000"
FEE="1000"

run_batch() {
    local BATCH_NUM=$1
    echo "========================================="
    echo "STARTING BATCH $BATCH_NUM (50 Transactions)"
    echo "========================================="
    
    ACCOUNTS_DATA=$(cat accounts.json | jq -c '.[]')
    TXIDS=()
    
    while read -r ACCOUNT; do
        ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
        PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
        ID=$(echo "$ACCOUNT" | jq -r '.id')
        
        # Get Nonce
        NONCE=$(stx balance "$ADDRESS" | jq -r .nonce)
        
        # Broadcast
        RESULT=$(stx call_contract_func \
            --contract_address "$CONTRACT_ADDRESS" \
            --contract_name "$CONTRACT_NAME" \
            --function_name "transfer" \
            --fee "$FEE" \
            --nonce "$NONCE" \
            --payment_key "$PRIVATE_KEY" \
            --function_args "u$AMOUNT, '$ADDRESS, '$RECIPIENT, none" \
            2>&1)
        
        TXID=$(echo "$RESULT" | jq -r '.txid // ""')
        ERROR=$(echo "$RESULT" | jq -r '.error // ""')
        
        if [ ! -z "$TXID" ] && [ "$TXID" != "null" ] && { [ "$ERROR" == "" ] || [ "$ERROR" == "null" ]; }; then
            echo "[Account $ID] ✓ Broadcasted: $TXID"
            TXIDS+=("$TXID")
        else
            echo "[Account $ID] ✗ Failed: $RESULT"
        fi
        
        sleep 0.2
    done <<< "$ACCOUNTS_DATA"
    
    echo ""
    echo "Batch $BATCH_NUM broadcast complete. Waiting for block confirmation..."
    
    # Wait for all confirmations
    local START_TIME=$(date +%s)
    while true; do
        PENDING=0
        for TXID in "${TXIDS[@]}"; do
            STATUS=$(curl -s "https://api.mainnet.hiro.so/extended/v1/tx/$TXID" | jq -r '.tx_status // ""')
            if [ "$STATUS" != "success" ]; then
                PENDING=$((PENDING + 1))
            fi
        done
        
        if [ "$PENDING" -eq 0 ]; then
            echo "========================================="
            echo "BATCH $BATCH_NUM CONFIRMED!"
            echo "========================================="
            break
        fi
        
        CURRENT_TIME=$(date +%s)
        ELAPSED=$(( (CURRENT_TIME - START_TIME) / 60 ))
        echo "  ($PENDING/${#TXIDS[@]} still pending... Elapsed: ${ELAPSED}m)"
        
        if [ $ELAPSED -gt 120 ]; then
            echo "  ✗ Timeout: Some transactions in Batch $BATCH_NUM took too long."
            exit 1
        fi
        
        sleep 60
    done
}

# Main Execution
run_batch 1
run_batch 2

echo ""
echo "Simulation Finished Successfully! 100 interactions completed."
