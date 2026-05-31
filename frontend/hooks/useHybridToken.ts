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
      }
    },
    [userSession, network]
  );

  // ── read-only helpers ──────────────────────────────────────────────────────

  const getAdmin = useCallback(() => readOnly('get-admin'), [readOnly]);
  const isInitialized = useCallback(() => readOnly('is-initialized'), [readOnly]);
  const isContractPaused = useCallback(() => readOnly('is-contract-paused'), [readOnly]);
  const getTokenCap = useCallback(() => readOnly('get-token-cap'), [readOnly]);
  const getYieldRate = useCallback(() => readOnly('get-yield-rate'), [readOnly]);
  const getCounterCost = useCallback(() => readOnly('get-counter-cost'), [readOnly]);
  const getTotalMinted = useCallback(() => readOnly('get-total-minted'), [readOnly]);
  const getTotalBurned = useCallback(() => readOnly('get-total-burned'), [readOnly]);
  const getTotalPoolDeposits = useCallback(() => readOnly('get-total-pool-deposits'), [readOnly]);
  const getTotalYieldPaid = useCallback(() => readOnly('get-total-yield-paid'), [readOnly]);
  const getActionNonce = useCallback(() => readOnly('get-action-nonce'), [readOnly]);
  const getSnapshotNonce = useCallback(() => readOnly('get-snapshot-nonce'), [readOnly]);

  const getAllowance = useCallback(
    (owner: string, spender: string) =>
      readOnly('get-allowance', [principalCV(owner), principalCV(spender)]),
    [readOnly]
  );

  const getWalletPool = useCallback(
    (walletId: number) => readOnly('get-wallet-pool', [uintCV(BigInt(walletId))]),
    [readOnly]
  );

  const getDepositorStake = useCallback(
    (walletId: number, depositor: string) =>
      readOnly('get-depositor-stake', [uintCV(BigInt(walletId)), principalCV(depositor)]),
    [readOnly]
  );

  const getStake = useCallback(
    (who: string) => readOnly('get-stake', [principalCV(who)]),
    [readOnly]
  );

  const getPendingYield = useCallback(
    (who: string) => readOnly('get-pending-yield', [principalCV(who)]),
    [readOnly]
  );

  const getMemberActionCount = useCallback(
    (who: string) => readOnly('get-member-action-count', [principalCV(who)]),
    [readOnly]
  );

  const getSnapshot = useCallback(
    (snapId: number) => readOnly('get-snapshot', [uintCV(BigInt(snapId))]),
    [readOnly]
  );

  // ── write helpers ──────────────────────────────────────────────────────────

  const initialize = useCallback(
    () => callContract('initialize', []),
    [callContract]
  );

  const setPaused = useCallback(
    (paused: boolean) => callContract('set-paused', [boolCV(paused)]),
    [callContract]
  );

  const mintTo = useCallback(
    (amount: bigint, recipient: string) =>
      callContract('mint-to', [uintCV(amount), principalCV(recipient)]),
