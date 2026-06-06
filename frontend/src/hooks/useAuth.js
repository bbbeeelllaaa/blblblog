import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('token', res.data.access_token);
    await loadUser();
  };

  const register = async (username, email, password) => {
    const res = await authAPI.register({ username, email, password });
    localStorage.setItem('token', res.data.access_token);
    await loadUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await userAPI.updateMe(data);
    setUser((prev) => ({ ...prev, ...res.data }));
    return res.data;
  };

  const uploadAvatar = async (file) => {
    const res = await userAPI.uploadAvatar(file);
    setUser((prev) => ({ ...prev, avatar: res.data.avatar_url }));
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, uploadAvatar, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
