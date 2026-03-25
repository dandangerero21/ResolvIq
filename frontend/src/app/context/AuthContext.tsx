// Feature: Auth - Authentication and role management context

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import authService from '../../services/authService';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = authService.getCurrentUser();
      if (savedUser) {
        console.log('Restored user from localStorage:', savedUser);
        setCurrentUser(savedUser);
      } else {
        console.log('No user found in localStorage');
      }
    } catch (error) {
      console.error('Error restoring user from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    authService.setUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    authService.logout();
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
