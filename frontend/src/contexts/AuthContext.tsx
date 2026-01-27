import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../lib/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    const storedEmail = localStorage.getItem('email');

    if (storedToken && storedUserId && storedEmail) {
      setToken(storedToken);
      setUser({ id: storedUserId, email: storedEmail });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { access_token, user_id } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('userId', user_id);
    localStorage.setItem('email', email);

    setToken(access_token);
    setUser({ id: user_id, email });
  };

  const signup = async (email: string, password: string) => {
    const response = await authApi.signup(email, password);
    const { access_token, user_id } = response.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('userId', user_id);
    localStorage.setItem('email', email);

    setToken(access_token);
    setUser({ id: user_id, email });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>
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
