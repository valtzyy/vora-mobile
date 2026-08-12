import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@vora/types';
import { client, registerUnauthorizedHandler } from './voraClient';

type AuthContextType = {
  user: User | null;
  /** Current Bearer token, if logged in — e.g. to forward into the splat viewer WebView. */
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'vora_access_token';
const USER_KEY = 'vora_user_data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    client.setBearerToken(null);
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    // Ensure a 401 anywhere in the app (expired/revoked token) logs the user
    // out consistently, not just on screens that happen to check it.
    registerUnauthorizedHandler(() => {
      clearSession();
    });
  }, [clearSession]);

  useEffect(() => {
    // Boot: load persisted token, then REVALIDATE against the server instead
    // of trusting stale local data — a stale/revoked token should not look
    // "logged in" forever.
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!storedToken) {
          setIsLoading(false);
          return;
        }
        client.setBearerToken(storedToken);
        const me = await client.auth.getMe();
        if (me) {
          setUser(me);
          setToken(storedToken);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(me));
        } else {
          await clearSession();
        }
      } catch (error) {
        console.error('Failed to restore auth session', error);
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  const login = async (username: string, password: string) => {
    const result = await client.auth.loginToken(username, password);
    await SecureStore.setItemAsync(TOKEN_KEY, result.access_token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
    setToken(result.access_token);
  };

  const register = async (username: string, password: string, displayName: string) => {
    await client.auth.register(username, password, displayName);
  };

  const logout = async () => {
    try {
      await client.auth.logout();
    } catch {
      // Ignore network errors on logout — still clear local session below.
    }
    await clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
