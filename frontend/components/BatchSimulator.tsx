'use client';

import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

const BatchSimulator = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const startSimulation = () => {
    setIsRunning(true);
    setProgress(0);
    
    // Mock simulation progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  return (
    <GlassCard className="h-full border-primary/20 bg-primary/5">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
          <Cpu size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Batch Simulator</h3>
          <p className="text-xs text-text-muted font-medium">Coordinate 50 accounts simultaneously</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 glass rounded-2xl">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <p className="text-sm font-bold">{isRunning ? 'Interacting...' : 'Ready'}</p>
            </div>
          </div>
          <div className="p-4 glass rounded-2xl">
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1">Queue</p>
            <p className="text-sm font-bold">50 Operations</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold">Overall Progress</p>
            <span className="text-primary font-bold">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-glass-bg rounded-full overflow-hidden p-0.5 border border-glass-border">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent-blue rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={startSimulation}
            disabled={isRunning}
            className="group relative flex items-center justify-center gap-3 w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary/10 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
          >
            <Play size={20} fill="currentColor" />
            <span>Execute Batch Interaction</span>
            <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          
          <button 
            disabled={isRunning}
            className="flex items-center justify-center gap-3 w-full py-4 glass hover:bg-glass-bg text-text-muted hover:text-white font-bold rounded-2xl transition-all"
          >
            <RotateCcw size={20} />
            <span>Reset Simulation</span>
          </button>
        </div>

        {/* Info Box */}
        <div className="p-4 glass-card bg-orange-500/5 border-orange-500/20 flex gap-4">
          <AlertTriangle className="text-orange-500 shrink-0" size={20} />
          <p className="text-xs font-medium text-text-muted leading-relaxed">
            Operations will be performed with a <span className="text-white font-bold">0.001 STX</span> fee per account. Ensure all accounts have sufficient balance before proceeding.
          </p>
        </div>
      </div>
    </GlassCard>
  );
};

export default BatchSimulator;
