'use client';

import React from 'react';
import GlassCard from './GlassCard';
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';

interface BalanceCardProps {
  type: 'STX' | 'TOKEN';
  balance: string;
  symbol: string;
  label: string;
  usdValue?: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ type, balance, symbol, label, usdValue }) => {
  const isSTX = type === 'STX';
  
  return (
    <GlassCard className="flex flex-col gap-6 min-w-[300px]">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${isSTX ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
          <Wallet size={24} />
        </div>
        <div className="flex gap-2">
          <button className="p-2 glass rounded-lg hover:bg-glass-bg transition-colors">
            <ArrowUpRight size={18} className="text-text-muted" />
          </button>
          <button className="p-2 glass rounded-lg hover:bg-glass-bg transition-colors">
            <ArrowDownLeft size={18} className="text-text-muted" />
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-text-muted mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-4xl font-bold tracking-tight">{balance}</h2>
          <span className="text-lg font-bold opacity-60">{symbol}</span>
        </div>
        {usdValue && (
          <p className="text-sm font-semibold text-green-500 mt-2">
            ≈ ${usdValue} <span className="text-xs opacity-70 ml-1">+2.4%</span>
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-glass-border flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-glass-bg flex items-center justify-center text-[10px] font-bold">
              {i}
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted font-medium">Last updated: Just now</p>
      </div>
    </GlassCard>
  );
};

export default BalanceCard;
