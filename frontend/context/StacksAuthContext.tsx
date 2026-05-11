'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { createNetwork, StacksNetwork } from '@stacks/network';

interface StacksAuthContextType {
  userSession: UserSession;
  userData: any | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  isLoading: boolean;
  network: StacksNetwork;
}

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const StacksAuthContext = createContext<StacksAuthContextType | undefined>(undefined);

export const StacksAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const network = createNetwork(process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet');

  const handleAuthRedirect = useCallback(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
        setIsLoading(false);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    handleAuthRedirect();
  }, [handleAuthRedirect]);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'StackWallet',
        icon: window.location.origin + '/logo.png',
      },
      userSession,
      onFinish: () => {
        window.location.reload();
      },
      onCancel: () => {
        console.log('User cancelled login');
      },
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setUserData(null);
    window.location.reload();
  };

  return (
    <StacksAuthContext.Provider value={{ 
      userSession, 
      userData, 
      connectWallet, 
      disconnectWallet, 
      isLoading,
      network
    }}>
      {children}
    </StacksAuthContext.Provider>
  );
};

export const useStacks = () => {
  const context = useContext(StacksAuthContext);
  if (context === undefined) {
    throw new Error('useStacks must be used within a StacksAuthProvider');
  }
  return context;
};
