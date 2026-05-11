'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  id: string;
  type: NotificationType;
  message: string;
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ id, type, message, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="text-green-500" />,
    error: <XCircle className="text-red-500" />,
    warning: <AlertCircle className="text-orange-500" />,
    info: <Info className="text-primary" />,
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-orange-500/10 border-orange-500/20',
    info: 'bg-primary/10 border-primary/20',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`glass-card p-4 min-w-[320px] flex items-center justify-between pointer-events-auto ${bgColors[type]}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-glass-bg rounded-xl">
          {icons[type]}
        </div>
        <p className="text-sm font-bold tracking-tight">{message}</p>
      </div>
      <button 
        onClick={() => onClose(id)}
        className="p-1.5 text-text-muted hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

export default Notification;
