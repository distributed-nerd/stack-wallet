#!/bin/bash
# simulate-sequential-transfers.sh - Professional-grade sequential SIP-010 token simulation

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
AMOUNT="1000000"  # 1 token
FEE="1000"        # 0.001 STX
ACCOUNTS_FILE="accounts.json"

echo "=================================================================="
echo "Starting SEQUENTIAL TOKEN Simulation: 100 Transactions"
echo "Pattern: Account [i] -> Account [i+1] (2 rounds)"
echo "=================================================================="
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo ""

# Read accounts from JSON into an array
ACCOUNTS_JSON=$(cat $ACCOUNTS_FILE)
NUM_ACCOUNTS=$(echo "$ACCOUNTS_JSON" | jq '. | length')
echo "Detected $NUM_ACCOUNTS accounts."

run_round() {
    local ROUND_NUM=$1
    echo ">>> EXECUTING ROUND $ROUND_NUM (50 Transactions)..."
    
    local TXIDS=()
    for (( i=0; i<$NUM_ACCOUNTS; i++ )); do
        # Current account (sender)
        SENDER_ADDR=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].address")
        SENDER_KEY=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].privateKey")
        ID=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].id")
        
        # Next account (recipient)
        NEXT_IDX=$(( (i + 1) % NUM_ACCOUNTS ))
        RECIPIENT_ADDR=$(echo "$ACCOUNTS_JSON" | jq -r ".[$NEXT_IDX].address")
        
        # Get reliable nonce
        NONCE=$(stx balance "$SENDER_ADDR" | jq -r .nonce)
        if [ -z "$NONCE" ] || [ "$NONCE" == "null" ]; then NONCE=0; fi
        
        echo "  [Account $ID] $SENDER_ADDR -> $RECIPIENT_ADDR (Nonce: $NONCE)"
        
        # Broadcast with retries
        RETRY_COUNT=0
        MAX_RETRIES=5
        TXID=""
        
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            RESULT=$(stx call_contract_func \
                --contract_address "$CONTRACT_ADDRESS" \
                --contract_name "$CONTRACT_NAME" \
                --function_name "transfer" \
                --fee "$FEE" \
                --nonce "$NONCE" \
                --payment_key "$SENDER_KEY" \
                --function_args "u$AMOUNT, '$SENDER_ADDR, '$RECIPIENT_ADDR, none" \
                2>&1)
            
            TXID=$(echo "$RESULT" | jq -r '.txid // ""' 2>/dev/null)
            if [ -z "$TXID" ] || [ "$TXID" == "null" ]; then
                TXID=$(echo "$RESULT" | grep -o '0x[0-9a-fA-F]\{64\}' | head -n 1)
            fi

            if [ ! -z "$TXID" ] && [ "$TXID" != "null" ]; then
                echo "    ✓ Broadcasted: $TXID"
                TXIDS+=("$TXID")
                break
            else
                RETRY_COUNT=$((RETRY_COUNT + 1))
                echo "    ! Broadcast failed (attempt $RETRY_COUNT/$MAX_RETRIES): $RESULT"
                if [[ $RESULT == *"ConflictingNonceInMempool"* ]]; then
                    echo "    - skipping (already in mempool)"
                    break
                fi
                sleep $((RETRY_COUNT * 5))
            fi
        done

        if [ -z "$TXID" ]; then
            echo "    ✗ MAX RETRIES REACHED for Account $ID"
        fi
        
        sleep 2
    done
    
    echo ""
    echo "Round $ROUND_NUM broadcast finished. Waiting for block confirmation before next round..."
    
    # Wait for all confirmations to ensure nonces are updated
    local START_TIME=$(date +%s)
    local TOTAL_TX=${#TXIDS[@]}
    while true; do
        PENDING=0
        for TXID in "${TXIDS[@]}"; do
            STATUS=$(curl -s "https://api.mainnet.hiro.so/extended/v1/tx/$TXID" | jq -r '.tx_status // ""')
            if [ "$STATUS" != "success" ]; then
                PENDING=$((PENDING + 1))
            fi
        done
        
        if [ "$PENDING" -eq 0 ]; then
            echo ">>> ROUND $ROUND_NUM CONFIRMED!"
            break
        fi
        
        ELAPSED=$(( ($(date +%s) - START_TIME) / 60 ))
        echo "  ($PENDING/$TOTAL_TX pending... Elapsed: ${ELAPSED}m)"
        
        # Timeout after 30 minutes for a round
        if [ $ELAPSED -gt 30 ]; then
            echo "  ! Warning: Confirmation timeout reached. Proceeding to next round anyway."
            break
        fi
        sleep 60
    done
}

# Run 2 more rounds for a total of 100 more transactions
run_round 3
run_round 4

echo ""
echo "========================================="
echo "SIMULATION FINISHED"
echo "========================================="
