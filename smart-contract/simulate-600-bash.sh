#!/bin/bash
# simulate-600-bash.sh - Professional-grade sequential SIP-010 token simulation (600 transactions)

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
AMOUNT="1000000"  # 1 token
FEE="1000"        # 0.001 STX
ACCOUNTS_FILE="accounts.json"
LOG_FILE="simulation-600-bash.log"

echo "==================================================================" | tee -a $LOG_FILE
echo "Starting SEQUENTIAL TOKEN Simulation: 600 Transactions" | tee -a $LOG_FILE
echo "Pattern: Account [i] -> Account [i+1] (12 rounds)" | tee -a $LOG_FILE
echo "==================================================================" | tee -a $LOG_FILE
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Read accounts from JSON into an array
ACCOUNTS_JSON=$(cat $ACCOUNTS_FILE)
NUM_ACCOUNTS=$(echo "$ACCOUNTS_JSON" | jq '. | length')
echo "Detected $NUM_ACCOUNTS accounts." | tee -a $LOG_FILE

run_round() {
    local ROUND_NUM=$1
    echo ">>> EXECUTING ROUND $ROUND_NUM (50 Transactions)..." | tee -a $LOG_FILE
    
    local TXIDS=()
    for (( i=0; i<$NUM_ACCOUNTS; i++ )); do
        # Current account (sender)
        SENDER_ADDR=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].address")
        SENDER_KEY=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].privateKey")
        ID=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].id")
        
        # Next account (recipient)
        NEXT_IDX=$(( (i + 1) % NUM_ACCOUNTS ))
        RECIPIENT_ADDR=$(echo "$ACCOUNTS_JSON" | jq -r ".[$NEXT_IDX].address")
        
        # Get reliable nonce with retry if API is busy
        NONCE=""
        for n_attempt in {1..5}; do
            NONCE=$(stx balance "$SENDER_ADDR" | jq -r .nonce 2>/dev/null)
            if [ ! -z "$NONCE" ] && [ "$NONCE" != "null" ]; then break; fi
            sleep 2
        done
        if [ -z "$NONCE" ] || [ "$NONCE" == "null" ]; then NONCE=0; fi
        
        echo "  [Account $ID] $SENDER_ADDR -> $RECIPIENT_ADDR (Nonce: $NONCE)" | tee -a $LOG_FILE
        
        # Broadcast with retries
        RETRY_COUNT=0
        MAX_RETRIES=5
        TXID=""
        
        while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            # Use short timeout for stx command to avoid hanging
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
                echo "    ✓ Broadcasted: $TXID" | tee -a $LOG_FILE
                TXIDS+=("$TXID")
                break
            else
                RETRY_COUNT=$((RETRY_COUNT + 1))
                echo "    ! Broadcast failed (attempt $RETRY_COUNT/$MAX_RETRIES): $RESULT" | tee -a $LOG_FILE
                if [[ $RESULT == *"ConflictingNonceInMempool"* ]]; then
                    echo "    - skipping (already in mempool)" | tee -a $LOG_FILE
                    break
                fi
                if [[ $RESULT == *"429"* ]]; then
                    echo "    - Rate limit hit, waiting 20s..." | tee -a $LOG_FILE
                    sleep 20
                else
                    sleep $((RETRY_COUNT * 5))
                fi
            fi
        done

        if [ -z "$TXID" ]; then
            echo "    ✗ MAX RETRIES REACHED for Account $ID" | tee -a $LOG_FILE
        fi
        
        sleep 2
    done
    
    echo "" | tee -a $LOG_FILE
    echo "Round $ROUND_NUM broadcast finished. Waiting for block confirmation..." | tee -a $LOG_FILE
    
    # Wait for all confirmations to ensure nonces are updated
    local START_TIME=$(date +%s)
    local TOTAL_TX=${#TXIDS[@]}
    while true; do
        PENDING=0
        for TXID in "${TXIDS[@]}"; do
            STATUS=$(curl -s "https://api.mainnet.hiro.so/extended/v1/tx/$TXID" | jq -r '.tx_status // ""' 2>/dev/null)
            if [ "$STATUS" != "success" ]; then
                PENDING=$((PENDING + 1))
            fi
        done
        
        if [ "$PENDING" -eq 0 ]; then
            echo ">>> ROUND $ROUND_NUM CONFIRMED!" | tee -a $LOG_FILE
            break
        fi
        
        ELAPSED=$(( ($(date +%s) - START_TIME) / 60 ))
        echo -ne "  ($PENDING/$TOTAL_TX pending... Elapsed: ${ELAPSED}m)    \r" | tee -a $LOG_FILE
        
        # Timeout after 45 minutes for a round
        if [ $ELAPSED -gt 45 ]; then
            echo "  ! Warning: Confirmation timeout reached. Proceeding to next round." | tee -a $LOG_FILE
            break
        fi
        sleep 60
    done
}

# Executing rounds 11 through 22 for 600 transactions
for r in {11..22}; do
    run_round $r
    echo "Waiting 30 seconds before Round $((r+1))..." | tee -a $LOG_FILE
    sleep 30
done

echo "" | tee -a $LOG_FILE
echo "========================================="
echo "600 TRANSACTION SIMULATION FINISHED" | tee -a $LOG_FILE
echo "========================================="
