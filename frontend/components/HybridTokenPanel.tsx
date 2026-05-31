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
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-text-muted">STK</p>
            </div>
          ))}
        </div>
      )}

      {/* Yield Rate */}
      {stats && (
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted font-medium">Yield Rate</p>
            <p className="text-lg font-bold text-green-400">
              {(Number(stats.yieldRate) / 100).toFixed(2)}% <span className="text-xs text-text-muted">per block</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted font-medium">Token Cap</p>
            <p className="text-lg font-bold">{fmt(stats.tokenCap)} STK</p>
          </div>
        </div>
      )}

      {/* User Position */}
      {userAddress && (
        <div className="glass-card p-5 border-primary/20 bg-primary/5">
          <h3 className="font-bold mb-4 text-sm uppercase tracking-widest text-text-muted">
            Your Position
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-muted">Staked</p>
              <p className="text-xl font-bold text-primary">{fmt(userStake)} STK</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Pending Yield</p>
              <p className="text-xl font-bold text-green-400">{fmt(pendingYield)} STK</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => claimYield()}
              disabled={loading || pendingYield === '0'}
              className="flex-1 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-xs font-bold text-green-400 hover:bg-green-500 hover:text-white transition-all disabled:opacity-40"
            >
              Claim Yield
            </button>
            <button
              onClick={() => compoundYield()}
              disabled={loading || pendingYield === '0'}
              className="flex-1 py-2 bg-primary/10 border border-primary/30 rounded-xl text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-40"
            >
              Compound
            </button>
            <button
              onClick={() => takeSnapshot()}
              disabled={loading}
              className="px-4 py-2 glass rounded-xl text-xs font-bold hover:bg-glass-bg transition-all disabled:opacity-40"
            >
              Snapshot
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
    </motion.div>
  );
}
