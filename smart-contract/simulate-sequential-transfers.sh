#!/bin/bash
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSSE7N32ES51K6"
CONTRACT_NAME="sip010-token"
AMOUNT="1000000"
FEE="1000"
ACCOUNTS_JSON=$(cat accounts.json)
NUM_ACCOUNTS=$(echo "$ACCOUNTS_JSON" | jq ". | length")
run_round() {
    local ROUND_NUM=$1
    for (( i=0; i<$NUM_ACCOUNTS; i++ )); do
        SENDER_ADDR=$(echo "$ACCOUNTS_JSON" | jq -r ".[$i].address")
        NONCE=$(stx balance "$SENDER_ADDR" | jq -r .nonce)
        RESULT=$(stx call_contract_func --contract_address "$CONTRACT_ADDRESS" 2>&1)
    done
}
