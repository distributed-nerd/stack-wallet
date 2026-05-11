'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', animate = true }) => {
  const content = (
    <div className={`glass-card p-6 ${className}`}>
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

export default GlassCard;
