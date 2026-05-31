'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Flame, TrendingUp, Lock, RefreshCw, Zap } from 'lucide-react';
import { useHybridToken } from '@/hooks/useHybridToken';
import { useStacks } from '@/context/StacksAuthContext';

interface ContractStats {
  totalMinted: string;
  totalBurned: string;
  totalPoolDeposits: string;
  totalYieldPaid: string;
  yieldRate: string;
  tokenCap: string;
  paused: boolean;
  initialized: boolean;
}

export default function HybridTokenPanel() {
  const { userData } = useStacks();
  const {
    loading,
    error,
    getTotalMinted,
    getTotalBurned,
    getTotalPoolDeposits,
    getTotalYieldPaid,
    getYieldRate,
    getTokenCap,
    isContractPaused,
    isInitialized,
    getStake,
    getPendingYield,
    claimYield,
    compoundYield,
    takeSnapshot,
  } = useHybridToken();

  const [stats, setStats] = useState<ContractStats | null>(null);
  const [userStake, setUserStake] = useState<string>('0');
  const [pendingYield, setPendingYield] = useState<string>('0');
  const [refreshing, setRefreshing] = useState(false);

  const userAddress = userData?.profile?.stxAddress?.mainnet ?? '';

  async function fetchStats() {
    setRefreshing(true);
    try {
      const [minted, burned, pool, yield_, rate, cap, paused, init] = await Promise.all([
        getTotalMinted(),
        getTotalBurned(),
        getTotalPoolDeposits(),
        getTotalYieldPaid(),
        getYieldRate(),
        getTokenCap(),
        isContractPaused(),
        isInitialized(),
      ]);

      setStats({
        totalMinted: minted?.value?.value ?? '0',
        totalBurned: burned?.value?.value ?? '0',
        totalPoolDeposits: pool?.value?.value ?? '0',
        totalYieldPaid: yield_?.value?.value ?? '0',
        yieldRate: rate?.value?.value ?? '0',
        tokenCap: cap?.value?.value ?? '0',
        paused: paused?.value?.value ?? false,
        initialized: init?.value?.value ?? false,
      });

      if (userAddress) {
        const [stake, py] = await Promise.all([
          getStake(userAddress),
