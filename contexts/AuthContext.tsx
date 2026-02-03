/**
 * AuthContext
 * 
 * @description Global authentication state yönetimi
 * @usage const { user, login, logout, updateUser } = useAuth();
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Sayfa yenilendiğinde session'ı restore et
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          // Token'ı verify et
          const userData = await api.auth.verifyToken();
          if (userData) {
            setUser(userData);
          } else {
            // Token geçersiz
            localStorage.removeItem('token');
            localStorage.removeItem('cafe_user');
          }
        }
      } catch (err) {
        console.error('Session restore failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('cafe_user');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Login işlemi
   */
  const login = useCallback((userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('cafe_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  /**
   * Logout işlemi
   */
  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('cafe_user');
      setUser(null);
    }
  }, []);

  /**
   * Kullanıcı bilgilerini güncelle (local)
   */
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('cafe_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  /**
   * Kullanıcı bilgilerini server'dan yenile
   */
  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const userData = await api.users.get(user.id.toString());
      if (userData) {
        setUser(userData);
        localStorage.setItem('cafe_user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [user?.id]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * AuthContext kullanım hook'u
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
