'use client';

import { useCallback, useState } from 'react';
import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  boolCV,
  principalCV,
  contractPrincipalCV,
  AnchorMode,
  PostConditionMode,
  callReadOnlyFunction,
  cvToJSON,
} from '@stacks/transactions';
import { useStacks } from '@/context/StacksAuthContext';

const DEPLOYER = process.env.NEXT_PUBLIC_STX_CONTRACT_ADDRESS ?? '';
const CONTRACT = 'hybrid-token-contract';
const TOKEN_CONTRACT = 'sip010-token';

function tokenCV() {
  return contractPrincipalCV(DEPLOYER, TOKEN_CONTRACT);
}
