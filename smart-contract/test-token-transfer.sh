#!/bin/bash

# Configuration
CONTRACT_ADDRESS="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
CONTRACT_NAME="sip010-token"
OWNER_KEY="8a51fdd22d780af5859e7406cf6bec0ff32edd6ede9353ab2afb0894b0be29b401"
OWNER_ADDR="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
RECIPIENT="SP1FPNMWMJR7WT3AH6HMPSEVG0PPSNE7N32ES51K6"
FEE="1000"

# Two test accounts
TEST_ADDR1="SP1WE6P7H5EGPESARYHVF8NZ6KG0884A3Q8VXG0P1"
TEST_KEY1="3d489cd6e45f9492f1ce899557f9273f08ca670a455a7304f51cc2d308b049d501"

TEST_ADDR2="SP2DTV4BG951T04XSTN1Z0NJFHTXYMSYQGCYM04WP"
TEST_KEY2="4ade6c44fd565a2edc07ed481d703c156184d4ac714e01e3be5285241de0b08401"

echo "Running 2-account TEST (Positional Args): OWNER -> ACC -> RECIPIENT"

OWNER_NONCE=$(stx balance "$OWNER_ADDR" | jq -r '.nonce')
echo "Owner nonce: $OWNER_NONCE"

# 1. Owner -> TEST_ADDR1
echo "[1] Owner transferring 1 token to $TEST_ADDR1..."
ARGS1="u1, '$OWNER_ADDR, '$TEST_ADDR1, none"
stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "transfer" "$FEE" "$OWNER_NONCE" "$OWNER_KEY" "$ARGS1"

# 2. Owner -> TEST_ADDR2
echo "[2] Owner transferring 1 token to $TEST_ADDR2..."
ARGS2="u1, '$OWNER_ADDR, '$TEST_ADDR2, none"
stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "transfer" "$FEE" $((OWNER_NONCE + 1)) "$OWNER_KEY" "$ARGS2"

echo "Waiting for Phase 1 to be broadcasted..."
sleep 2

# 3. TEST_ADDR1 -> RECIPIENT
ACC1_NONCE=$(stx balance "$TEST_ADDR1" | jq -r '.nonce')
echo "[3] $TEST_ADDR1 transferring back (Nonce: $ACC1_NONCE)..."
ARGS3="u1, '$TEST_ADDR1, '$RECIPIENT, none"
stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "transfer" "$FEE" "$ACC1_NONCE" "$TEST_KEY1" "$ARGS3"

# 4. TEST_ADDR2 -> RECIPIENT
ACC2_NONCE=$(stx balance "$TEST_ADDR2" | jq -r '.nonce')
echo "[4] $TEST_ADDR2 transferring back (Nonce: $ACC2_NONCE)..."
ARGS4="u1, '$TEST_ADDR2, '$RECIPIENT, none"
stx call_contract_func "$CONTRACT_ADDRESS" "$CONTRACT_NAME" "transfer" "$FEE" "$ACC2_NONCE" "$TEST_KEY2" "$ARGS4"
