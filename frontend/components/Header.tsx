'use client';

import React from 'react';
import { Search, Bell, ChevronDown, User } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-40 bg-background/50 backdrop-blur-md border-b border-glass-border">
      <div className="flex-1 max-w-xl hidden md:block">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search transactions, accounts..." 
            className="w-full bg-glass-bg border border-glass-border rounded-full py-2.5 pl-12 pr-4 outline-none focus:border-primary transition-all font-medium text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-auto">
        <button className="relative p-2 text-text-muted hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full border-2 border-background"></span>
        </button>

        <div className="h-8 w-[1px] bg-glass-border"></div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold">Main Account</p>
            <p className="text-xs text-text-muted font-medium">SP1FP...51K6</p>
          </div>
          <button className="flex items-center gap-2 p-1.5 pl-1.5 pr-3 glass rounded-full hover:bg-glass-bg transition-colors border-glass-border">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <ChevronDown size={14} className="text-text-muted" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
