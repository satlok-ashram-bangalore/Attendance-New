'use client';

import type React from 'react';

import { createContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { SignInWithPasswordCredentials } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { User, role } from '@/types/login';
import { NotificationContextType } from './notification-context';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, notification:NotificationContextType) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {
    throw new Error('AuthContext not initialized');
  },
  logout: () => {
    throw new Error('AuthContext not initialized');
  },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: userSession, error } = await supabase.auth.getSession();

        if (error) {
          throw new Error('Unauthorized access');
        }

        if (userSession.session) {
          const token = userSession.session.access_token;

          const checkValidity = await fetch('/api/verify-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_token: token,
              currentPath: pathname,
            }),
          });

          if (checkValidity.status === 200) {
            const data = await checkValidity.json();

            if (data.redirectUrl) {
              const user = userSession.session.user;

              if (user?.email && user.role) {
                const refreshedUser: User = {
                  role: user.role as role,
                  email: user.email,
                };
                setUser(refreshedUser);
              }

              if (pathname !== data.redirectUrl) {
                console.log('Pushing');
                router.push(data.redirectUrl);
              }
            }
          } else {
            throw new Error('Failed to check authorization of session');
          }
        } else {
          throw new Error('User session not found');
        }
      } catch (error) {
        if (error) {
          await logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, notification:NotificationContextType): Promise<User> => {
    try {
      const credentials: SignInWithPasswordCredentials = { email, password };
      const { data, error: _error } = await supabase.auth.signInWithPassword(credentials);

      if (_error) {
        throw new Error('Invalid credentials');
      }

      if (data) {
        if (data.user.email && data.user.role) {
          const user: User = {
            role: data.user.role as role,
            email: data.user.email,
          };
          setUser(user);
          notification.success("Login successfull")
          return user;
        }
      }

      throw new Error('Invalid credentials');
    } catch (_error) {
      console.error('Login failed', _error);
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
