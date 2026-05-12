'use client';

import React from 'react';
import AccountList from '@/components/AccountList';
import BatchSimulator from '@/components/BatchSimulator';
import { motion } from 'framer-motion';
import { FlaskConical, Github, Info } from 'lucide-react';

export default function SimulationsPage() {
  return (
    <div className="h-[calc(100vh-160px)] flex flex-col space-y-8">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-4">
            <FlaskConical className="text-primary" size={32} />
            <span className="text-gradient">Account Simulations</span>
          </h1>
          <p className="text-text-muted font-medium">Manage and coordinate batch interactions for all 50 accounts.</p>
        </div>
        
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-xs font-bold hover:bg-glass-bg transition-all">
            <Github size={16} />
            Check Scripts
          </button>
          <button className="p-2 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all">
            <Info size={20} />
          </button>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-8 overflow-hidden">
        {/* Left Column: Account List (3/5) */}
        <div className="xl:col-span-3 h-full overflow-hidden">
          <AccountList />
        </div>

        {/* Right Column: Controls (2/5) */}
        <div className="xl:col-span-2 space-y-6 flex flex-col">
          <BatchSimulator />
          
          <div className="glass-card p-6 flex-1 flex flex-col justify-center gap-4 border-accent-blue/20 bg-accent-blue/5">
            <h4 className="font-bold text-accent-blue flex items-center gap-2">
              <Info size={16} />
              Recent Execution
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted font-medium">Last Run</span>
                <span className="font-bold">20 mins ago</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted font-medium">Type</span>
                <span className="font-bold text-secondary">Token Transfer</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted font-medium">Success Rate</span>
                <span className="font-bold text-green-500">100% (50/50)</span>
              </div>
            </div>
            <button className="w-full mt-2 py-3 border border-accent-blue/30 rounded-xl text-xs font-bold text-accent-blue hover:bg-accent-blue hover:text-background transition-all">
              View Detailed Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
