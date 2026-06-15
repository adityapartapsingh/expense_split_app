'use client';

// Auth context provides login state, user info, and auth actions
// to all components via React context. Persists JWT in localStorage.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { displayName?: string; username?: string; email?: string; phone?: string }) => Promise<void>;
  updatePassword: (data: { currentPassword?: string; newPassword?: string }) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then(({ user }) => setUser(user))
        .catch(() => {
          // Token expired or invalid
          api.setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (login: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.login({ login, password });
      api.setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.register(data);
      api.setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const updateProfile = useCallback(async (data: { displayName?: string; username?: string; email?: string; phone?: string }) => {
    setError(null);
    try {
      const response = await api.updateProfile(data);
      setUser(response.user);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Profile update failed';
      setError(message);
      throw err;
    }
  }, []);

  const updatePassword = useCallback(async (data: { currentPassword?: string; newPassword?: string }) => {
    setError(null);
    try {
      await api.updatePassword(data);
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Password update failed';
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        updatePassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
