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

export function useHybridToken() {
  const { userSession, network } = useStacks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = useCallback(
    async (functionName: string, functionArgs: any[] = []) => {
      const result = await callReadOnlyFunction({
        contractAddress: DEPLOYER,
        contractName: CONTRACT,
        functionName,
        functionArgs,
        network,
        senderAddress: DEPLOYER,
      });
      return cvToJSON(result);
    },
    [network]
  );

  const callContract = useCallback(
    async (functionName: string, functionArgs: any[]) => {
      setLoading(true);
      setError(null);
      try {
        const userData = userSession.loadUserData();
        const senderAddress = userData.profile.stxAddress.mainnet;

        await makeContractCall({
          contractAddress: DEPLOYER,
          contractName: CONTRACT,
          functionName,
          functionArgs,
          network,
          anchorMode: AnchorMode.Any,
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            console.log('TX broadcast:', data.txId);
          },
          onCancel: () => {
            setError('Transaction cancelled');
          },
        } as any);
      } catch (e: any) {
        setError(e.message ?? 'Unknown error');
      } finally {
        setLoading(false);
