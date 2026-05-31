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
          getPendingYield(userAddress),
        ]);
        setUserStake(stake?.value?.value ?? '0');
        setPendingYield(py?.value?.value ?? '0');
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddress]);

  function fmt(raw: string, decimals = 6): string {
    const n = Number(raw) / Math.pow(10, decimals);
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  const statCards = stats
    ? [
        { label: 'Total Minted', value: fmt(stats.totalMinted), icon: Coins, color: 'text-primary' },
        { label: 'Total Burned', value: fmt(stats.totalBurned), icon: Flame, color: 'text-red-400' },
        { label: 'Pool Deposits', value: fmt(stats.totalPoolDeposits), icon: Lock, color: 'text-accent-blue' },
        { label: 'Yield Paid', value: fmt(stats.totalYieldPaid), icon: TrendingUp, color: 'text-green-400' },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Zap className="text-primary" size={24} />
            <span className="text-gradient">Hybrid Token Contract</span>
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {stats?.initialized ? (
              <span className="text-green-400 font-semibold">● Initialized</span>
            ) : (
              <span className="text-yellow-400 font-semibold">○ Not Initialized</span>
            )}
            {stats?.paused && (
              <span className="ml-3 text-red-400 font-semibold">⏸ Paused</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="p-2 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon size={16} className={card.color} />
                <span className="text-xs text-text-muted font-medium">{card.label}</span>
              </div>
