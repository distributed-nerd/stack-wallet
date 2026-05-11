'use client';

import React from 'react';

export type StatusType = 'success' | 'error' | 'pending' | 'warning';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const styles = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.15)]',
    error: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
    pending: 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse',
    warning: 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.15)]',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${styles[status]}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
