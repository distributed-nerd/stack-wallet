'use client';

import React from 'react';
import GlassCard from './GlassCard';
import { Coins, MoreVertical, ExternalLink } from 'lucide-react';

const tokens = [
  { name: 'Stacks', symbol: 'STX', balance: '0.1', price: '$0.24', icon: <Coins className="text-primary" /> },
  { name: 'Stack Token', symbol: 'STACK', balance: '20.0', price: '$1.00', icon: <Coins className="text-secondary" /> },
];

const TokenList = () => {
  return (
    <GlassCard className="flex-1 min-w-[300px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg">Your Assets</h3>
        <button className="text-xs font-bold text-primary hover:underline">View All</button>
      </div>

      <div className="space-y-4">
        {tokens.map((token) => (
          <div key={token.symbol} className="flex items-center justify-between p-3 hover:bg-glass-bg rounded-xl transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-2.5 glass rounded-xl group-hover:scale-110 transition-transform">
                {token.icon}
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{token.name}</p>
                <p className="text-xs text-text-muted font-medium">{token.price}</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <p className="font-bold text-sm">{token.balance}</p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{token.symbol}</p>
              </div>
              <button className="p-1.5 text-text-muted hover:text-white transition-colors">
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 py-3 glass rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all">
        Manage Assets
      </button>
    </GlassCard>
  );
};

export default TokenList;
