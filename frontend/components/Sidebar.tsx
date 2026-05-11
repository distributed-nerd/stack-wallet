'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  Settings, 
  FlaskConical,
  Wallet 
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Transfer', icon: <Send size={20} />, path: '/transfer' },
    { name: 'History', icon: <History size={20} />, path: '/history' },
    { name: 'Simulations', icon: <FlaskConical size={20} />, path: '/simulations' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass m-4 border-none hidden lg:flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="p-2 bg-primary rounded-xl">
          <Wallet size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">StackWallet</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-text-muted hover:text-white hover:bg-glass-bg'
              }`}
            >
              <span className={`${isActive ? 'text-white' : 'text-text-muted group-hover:text-primary transition-colors'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <div className="p-4 glass-card bg-primary/5 border-primary/20">
          <p className="text-xs text-text-muted mb-2 uppercase tracking-widest font-bold">Network</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <p className="text-sm font-semibold">Stacks Mainnet</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
