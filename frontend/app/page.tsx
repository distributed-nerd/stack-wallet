'use client';

import React from 'react';
import BalanceCard from '@/components/BalanceCard';
import TokenList from '@/components/TokenList';
import TransactionList from '@/components/TransactionList';
import { motion } from 'framer-motion';

export default function Dashboard() {
  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Welcome back, <span className="text-gradient">Farming Master</span>
        </h1>
        <p className="text-text-muted font-medium">Monitor your 50 accounts and simulate mass-interactions in real-time.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <BalanceCard 
          type="STX" 
          balance="3.36" 
          symbol="STX" 
          label="Total STX Balance" 
          usdValue="8.06"
        />
        <BalanceCard 
          type="TOKEN" 
          balance="1,000" 
          symbol="STACK" 
          label="Total SIP-010 Tokens" 
          usdValue="1,000"
        />
        <div className="glass-card p-6 flex flex-col justify-center border-primary/20 bg-primary/5">
          <p className="text-sm font-medium text-text-muted mb-1 text-center">Active Accounts</p>
          <h2 className="text-6xl font-bold tracking-tighter text-center text-primary">50<span className="text-2xl font-bold opacity-40 ml-2">/50</span></h2>
          <div className="mt-4 flex justify-center">
            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
              All Connected
            </span>
          </div>
        </div>
      </div>

      {/* Activity Section */}
      <div className="flex flex-col xl:flex-row gap-6">
        <TokenList />
        <TransactionList />
      </div>

      {/* Simulation Quick Action */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass p-8 flex items-center justify-between border-primary/20 bg-gradient-to-r from-primary/10 to-accent-purple/10"
      >
        <div>
          <h3 className="text-xl font-bold mb-1">Ready for the next harvest?</h3>
          <p className="text-sm text-text-muted font-medium">Launch a mass-interaction simulation across all 50 accounts with one click.</p>
        </div>
        <button className="px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
          Launch Simulation
        </button>
      </motion.div>
    </div>
  );
}
