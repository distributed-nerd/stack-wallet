#!/bin/bash

echo "["
for i in {1..50}; do
  # Generate a random mnemonic using stacks-cli
  MNEMONIC=$(stx make_keychain 2>/dev/null | jq -r '.mnemonic')
  ADDRESS=$(stx make_keychain -t | jq -r '.address')
  PRIVATE_KEY=$(stx make_keychain -t | jq -r '.privateKey')
  
  if [ $i -lt 50 ]; then
    echo "  {"
    echo "    \"id\": $i,"
    echo "    \"address\": \"$ADDRESS\","
    echo "    \"privateKey\": \"$PRIVATE_KEY\","
    echo "    \"mnemonic\": \"$MNEMONIC\""
    echo "  },"
  else
    echo "  {"
    echo "    \"id\": $i,"
    echo "    \"address\": \"$ADDRESS\","
    echo "    \"privateKey\": \"$PRIVATE_KEY\","
    echo "    \"mnemonic\": \"$MNEMONIC\""
    echo "  }"
  fi
done
echo "]"
