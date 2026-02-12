import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAuth = useCallback(async () => {
    const token = api.auth.getToken();
    const savedUser = api.auth.getUser();

    if (!token || !savedUser) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      // Connect WebSocket for real-time updates
      api.connectWebSocket(currentUser.id);
    } catch (error) {
      console.error('Auth check failed:', error);
      api.auth.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await api.auth.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logout = useCallback(() => {
    api.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.auth.changePassword(currentPassword, newPassword);
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed';
      throw new Error(message);
    }
  };

  const forceChangePassword = async (newPassword) => {
    try {
      await api.auth.forceChangePassword(newPassword);
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed';
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        authError,
        login,
        logout,
        changePassword,
        forceChangePassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};