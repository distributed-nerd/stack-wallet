#!/bin/bash
# robust-sim.sh - Robust sequential SIP-010 token interaction simulation

CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
AMOUNT="1000000"
FEE="1000"

# Read accounts and process a subset for demonstration (e.g., first 3 active)
ACCOUNTS_DATA=$(cat accounts.json | jq -c '.[]')

echo "Starting robust SIP-010 simulation..."
echo "Contract: $CONTRACT_ADDRESS.$CONTRACT_NAME"
echo "Fee: 0.001 STX"
echo ""

COUNTER=0
MAX_DEMO=2

while read -r ACCOUNT; do
    ADDRESS=$(echo "$ACCOUNT" | jq -r '.address')
    PRIVATE_KEY=$(echo "$ACCOUNT" | jq -r '.privateKey')
    ID=$(echo "$ACCOUNT" | jq -r '.id')
    
    # Check balance first
    BAL_DATA=$(curl -s "https://api.mainnet.hiro.so/extended/v1/address/$ADDRESS/balances")
    STK_BAL=$(echo "$BAL_DATA" | jq -r ".fungible_tokens.\"$CONTRACT_ADDRESS.$CONTRACT_NAME::stack-token\".balance // 0")
    STX_BAL=$(echo "$BAL_DATA" | jq -r ".stx.balance // 0")
    
    if [ "$STK_BAL" -lt "$AMOUNT" ] || [ "$STX_BAL" -lt "$FEE" ]; then
        echo "[-] [Account $ID] $ADDRESS skipped (STK: $STK_BAL, STX: $STX_BAL)"
        continue
    fi
    
    echo "[+] [Account $ID] $ADDRESS starting interaction..."
    
    # Get proper nonce using stx balance
    NONCE=$(stx balance "$ADDRESS" | jq -r .nonce)
    echo "    Using nonce: $NONCE"
    
    # Broadcast transaction
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
        echo "    ✓ Broadcast successful. TxID: $TXID"
        
        # Wait for confirmation
        echo "    Waiting for confirmation (polling Hiro API)..."
        while true; do
            POLL_RESULT=$(curl -s "https://api.mainnet.hiro.so/extended/v1/tx/$TXID")
            STATUS=$(echo "$POLL_RESULT" | jq -r '.tx_status // ""')
            if [ "$STATUS" == "success" ]; then
                echo "    ✓ Confirmed!"
                break
            elif [ "$STATUS" == "failed" ] || [ "$STATUS" == "dropped_replace_by_fee" ]; then
                echo "    ✗ Transaction failed: $STATUS"
                exit 1
            fi
            echo -n "."
            sleep 60
        done
    else
        echo "    ✗ Broadcast Failed: $RESULT"
        exit 1
    fi
    
    COUNTER=$((COUNTER + 1))
    if [ $COUNTER -ge $MAX_DEMO ]; then
        echo ""
        echo "Demo limit reached ($MAX_DEMO accounts). Success."
        exit 0
    fi
    
done <<< "$ACCOUNTS_DATA"
