'use client';

import React from 'react';
import GlassCard from './GlassCard';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';

const activities = [
  { id: 1, type: 'Send', amount: '20.0', symbol: 'STACK', status: 'Confirmed', date: '2 mins ago', icon: <ArrowUpRight className="text-secondary" /> },
  { id: 2, type: 'Receive', amount: '0.1', symbol: 'STX', status: 'Confirmed', date: '1 hour ago', icon: <ArrowDownLeft className="text-green-500" /> },
  { id: 3, type: 'Mint', amount: '1000', symbol: 'STACK', status: 'Failed', date: '3 hours ago', icon: <CheckCircle2 className="text-primary" /> },
];

const TransactionList = () => {
  return (
    <GlassCard className="flex-1 min-w-[400px]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg">Recent Activity</h3>
        <button className="text-xs font-bold text-text-muted hover:text-white transition-colors">View History</button>
      </div>

      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 glass rounded-2xl group-hover:bg-glass-bg transition-all">
                {activity.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm tracking-tight">{activity.type} {activity.symbol}</p>
                  {activity.status === 'Confirmed' ? (
                    <CheckCircle2 size={12} className="text-green-500" />
                  ) : (
                    <XCircle size={12} className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted font-medium mt-0.5">
                  <Clock size={12} />
                  <span>{activity.date}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${activity.type === 'Receive' ? 'text-green-500' : ''}`}>
                {activity.type === 'Receive' ? '+' : '-'}{activity.amount}
              </p>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{activity.symbol}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default TransactionList;
