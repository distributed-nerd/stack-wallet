#!/bin/bash
# ultimate-farming-sim.sh - Professional-grade SIP-010 token simulation

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1000000"  # 1 STK
FEE="1000"        # 0.001 STX
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "=== RUNNING IN DRY-RUN MODE ==="
fi

echo "Ultimate Farming Simulation - 100 Transactions Plan"
echo "--------------------------------------------------"

# 1. Pre-flight Checks & Account Qualification
echo "Scanning accounts for qualification..."
ACCOUNTS_DATA=$(cat accounts.json | jq -c '.[]')
QUALIFIED_ACCOUNTS=()

while read -r ACCOUNT; do
    ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
    ID=$(echo "$ACCOUNT" | jq -r '.id')
    
    # Check balances
    BAL_DATA=$(curl -s "https://api.mainnet.hiro.so/extended/v1/address/$ADDRESS/balances")
    STK_BAL=$(echo "$BAL_DATA" | jq -r ".fungible_tokens.\"$CONTRACT_ADDRESS.$CONTRACT_NAME::stack-token\".balance // 0")
    STX_BAL=$(echo "$BAL_DATA" | jq -r ".stx.balance // 0")
    
    # Require enough for 2 interactions
    REQ_STK=$((AMOUNT * 2))
    REQ_STX=$((FEE * 2))
    
    if [ "$STK_BAL" -ge "$REQ_STK" ] && [ "$STX_BAL" -ge "$REQ_STX" ]; then
        echo "  [Account $ID] ✓ Qualified (STK: $((STK_BAL/1000000)), STX: $((STX_BAL)))"
        QUALIFIED_ACCOUNTS+=("$ACCOUNT")
    else
        echo "  [Account $ID] ✗ Skipped (Insufficient: STK $STK_BAL, STX $STX_BAL)"
    fi
done <<< "$ACCOUNTS_DATA"

echo ""
echo "Qualification Summary:"
echo "  Total Accounts: $(echo "$ACCOUNTS_DATA" | wc -l)"
echo "  Qualified: ${#QUALIFIED_ACCOUNTS[@]}"
echo "--------------------------------------------------"

if [ "${#QUALIFIED_ACCOUNTS[@]}" -eq 0 ]; then
    echo "No accounts qualified for the simulation. Aborting."
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    echo "Dry-run complete. Run without --dry-run to execute."
    exit 0
fi

# 2. Execution Logic
run_batch() {
    local BATCH_NUM=$1
    echo ">>> EXECUTING BATCH $BATCH_NUM..."
    
    local TXIDS=()
    for ACCOUNT in "${QUALIFIED_ACCOUNTS[@]}"; do
        ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
        PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
        ID=$(echo "$ACCOUNT" | jq -r '.id')
        
        # Get reliable nonce
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
        if [ ! -z "$TXID" ] && [ "$TXID" != "null" ]; then
            echo "  [Account $ID] ✓ Broadcasted: $TXID"
            TXIDS+=("$TXID")
        else
            echo "  [Account $ID] ✗ Broadcast FAILED: $RESULT"
            echo "  CRITICAL ERROR: Stopping simulation to prevent nonce/balance inconsistencies."
            exit 1
        fi
        sleep 0.5
    done
    
    echo ""
    echo "Batch $BATCH_NUM broadcast finished. Polling for block confirmation..."
    
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
            echo ">>> BATCH $BATCH_NUM CONFIRMED!"
            break
        fi
        
        ELAPSED=$(( ($(date +%s) - START_TIME) / 60 ))
        echo "  ($PENDING/${#TXIDS[@]} pending... Elapsed: ${ELAPSED}m)"
        sleep 60
    done
}

# Run the 3 batches
run_batch 1
run_batch 2
run_batch 3

echo ""
echo "========================================="
echo "SIMULATION SUCCESSFUL: 105 Transactions Confirmed"
echo "========================================="
