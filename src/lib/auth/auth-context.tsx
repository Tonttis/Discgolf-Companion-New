'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { UserProfile, AuthState } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Standalone fetchProfile function - no hook dependencies
async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/auth/profile');
    if (res.ok) {
      const data = await res.json();
      return data.profile;
    }
  } catch {
    // ignore
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    supabaseConfigured: false,
  });

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: false });
      });
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile();
          setState({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            supabaseConfigured: true,
          });
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
        }
      } catch {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchProfile();
        setState({
          user: profile,
          isAuthenticated: true,
          isLoading: false,
          supabaseConfigured: true,
        });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, username: string, displayName?: string) => {
    if (!supabase) return { error: 'Supabase not configured' };

    const checkRes = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
    if (checkRes.ok) {
      const { available } = await checkRes.json();
      if (!available) return { error: 'Käyttäjänimi on jo varattu' };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });

    if (error) return { error: error.message };

    const profileRes = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName: displayName || username }),
    });

    if (!profileRes.ok) {
      const data = await profileRes.json();
      return { error: data.error || 'Profiilin luonti epäonnistui' };
    }

    return { error: null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchProfile();
    if (profile) {
      setState(prev => ({ ...prev, user: profile }));
    }
  }, []);

  const updateProfile = useCallback(async (updates: { displayName?: string; avatarUrl?: string }) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        return { error: data.error || 'Profiilin päivitys epäonnistui' };
      }
      await refreshProfile();
      return { error: null };
    } catch {
      return { error: 'Profiilin päivitys epäonnistui' };
    }
  }, [refreshProfile]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
