'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height, circle }) => {
  return (
    <div 
      className={`bg-glass-bg border border-glass-border animate-pulse ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
      style={{ 
        width: width || '100%', 
        height: height || '20px' 
      }}
    />
  );
};

export default Skeleton;
