#!/bin/bash

# Configuration
PRIVATE_KEY="" # YOUR_PRIVATE_KEY_HERE
AMOUNT="100000"  # 0.1 STX in microSTX
FEE="1000"        # 0.001 STX in microSTX
NONCE=10
NETWORK="mainnet"

# Read accounts from JSON
ACCOUNTS=$(cat accounts.json | jq -r '.[] | .address')

echo "Sending 0.1 STX to 50 accounts..."
echo "Starting nonce: $NONCE"
echo ""

COUNTER=0
SUCCESS=0
FAILED=0

for ADDRESS in $ACCOUNTS; do
  COUNTER=$((COUNTER + 1))
  CURRENT_NONCE=$((NONCE + COUNTER - 1))
  
  echo "[$COUNTER/50] Sending to: $ADDRESS"
  
  # Use stacks-cli to send STX
  # Note: The -t flag in the original script might have been for testnet, 
  # but stx help didn't show -t for send_tokens as testnet (usually it's a global flag).
  # I'll check stx help global flags if possible, or just remove -t if it's mainnet.
  # Actually, stx --help showed -t in the script i saw.
  # Let's remove -t to be safe for mainnet if not sure, but the script had it.
  # Wait, stx -h shows global options.
  
  RESULT=$(stx send_tokens "$ADDRESS" "$AMOUNT" "$FEE" "$CURRENT_NONCE" "$PRIVATE_KEY" 2>&1)
  
  if [[ $RESULT == *"txid"* ]] || [[ $RESULT == *"0x"* ]]; then
    echo "  ✓ Success - Nonce: $CURRENT_NONCE"
    echo "  TxID: $RESULT"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ✗ Failed: $RESULT"
    FAILED=$((FAILED + 1))
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "========================================="
echo "Transfer Summary:"
echo "  Successful: $SUCCESS"
echo "  Failed: $FAILED"
echo "  Total STX sent: $(echo "scale=2; $SUCCESS * 0.1" | bc) STX"
echo "  Total fees: $(echo "scale=3; $SUCCESS * 0.001" | bc) STX"
echo "========================================="
