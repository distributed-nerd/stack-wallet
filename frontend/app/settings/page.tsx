'use client';

import React from 'react';
import GlassCard from '@/components/GlassCard';
import { Settings, Shield, Globe, Cpu, Save } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-glass-bg rounded-2xl text-primary">
          <Settings size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-text-muted font-medium">Configure your wallet and simulation preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Network Settings */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <Globe size={20} className="text-primary" />
            <h3 className="font-bold">Network Configuration</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Default Network</label>
              <select className="w-full bg-glass-bg border border-glass-border rounded-xl py-2.5 px-4 outline-none focus:border-primary text-sm font-medium">
                <option>Stacks Mainnet</option>
                <option>Stacks Testnet</option>
                <option>Devnet (Local)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">API Provider</label>
              <input type="text" value="https://api.mainnet.hiro.so" className="w-full bg-glass-bg border border-glass-border rounded-xl py-2.5 px-4 text-sm font-medium" readOnly />
            </div>
          </div>
        </GlassCard>

        {/* Security Settings */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <Shield size={20} className="text-secondary" />
            <h3 className="font-bold">Security & Privacy</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-glass-bg rounded-xl">
              <div>
                <p className="text-sm font-bold">Auto-Lock Wallet</p>
                <p className="text-[10px] text-text-muted font-medium">Lock after 30 minutes of inactivity</p>
              </div>
              <div className="w-10 h-5 bg-primary rounded-full relative p-1 cursor-pointer">
                <div className="w-3 h-3 bg-white rounded-full absolute right-1"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-glass-bg rounded-xl">
              <div>
                <p className="text-sm font-bold">Privacy Mode</p>
                <p className="text-[10px] text-text-muted font-medium">Hide balances from header</p>
              </div>
              <div className="w-10 h-5 bg-glass-border rounded-full relative p-1 cursor-pointer">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Simulation Settings */}
        <GlassCard className="md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Cpu size={20} className="text-accent-blue" />
            <h3 className="font-bold">Simulation Defaults</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Default Gas Fee (STX)</label>
              <input type="number" placeholder="0.001" className="w-full bg-glass-bg border border-glass-border rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Safe Batch Limit</label>
              <input type="number" placeholder="50" className="w-full bg-glass-bg border border-glass-border rounded-xl py-2.5 px-4 text-sm font-medium outline-none focus:border-primary" />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="pt-4 flex justify-end">
        <button className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary/20 hover:scale-105">
          <Save size={20} />
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
