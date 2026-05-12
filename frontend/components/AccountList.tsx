'use client';

import React, { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
import { User, Activity, ExternalLink, Search } from 'lucide-react';

interface Account {
  address: string;
  privateKey: string;
}

const AccountList = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/accounts.json')
      .then(res => res.json())
      .then(data => setAccounts(data));
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <GlassCard className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Farming Accounts</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input 
            type="text" 
            placeholder="Filter accounts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-glass-bg border border-glass-border rounded-full py-1.5 pl-9 pr-4 outline-none focus:border-primary text-xs font-medium w-48"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {filteredAccounts.map((account, index) => (
          <div key={account.address} className="flex items-center justify-between p-3 glass-card bg-glass-bg/50 border-glass-border hover:border-primary/50 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-glass-bg flex items-center justify-center font-bold text-xs text-primary">
                {index + 1}
              </div>
              <div>
                <p className="text-xs font-bold tracking-tight">{account.address.slice(0, 12)}...{account.address.slice(-4)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <p className="text-[10px] text-text-muted font-bold uppercase">Ready</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 glass rounded-lg hover:bg-primary hover:text-white transition-all">
                <Activity size={14} />
              </button>
              <button className="p-1.5 glass rounded-lg hover:bg-glass-bg transition-colors">
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-glass-border flex items-center justify-between">
        <p className="text-xs text-text-muted font-medium">Total: <span className="text-white font-bold">{accounts.length}</span> accounts</p>
        <button className="text-xs font-bold text-primary hover:underline">Export Keys</button>
      </div>
    </GlassCard>
  );
};

export default AccountList;
