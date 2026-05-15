'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { UserProfile, AuthState } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string, displayName?: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
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

  // Create a stable Supabase client reference
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Use a ref to track if we've already initialized
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: false });
      });
      return;
    }

    // Prevent double initialization in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

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

    // Set up auth state change listener - this persists across the lifetime of the component
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Small delay to allow profile trigger to complete
        await new Promise((r) => setTimeout(r, 300));
        const profile = await fetchProfile();
        setState({
          user: profile,
          isAuthenticated: true,
          isLoading: false,
          supabaseConfigured: true,
        });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // On token refresh, just update the profile quietly
        const profile = await fetchProfile();
        if (profile) {
          setState(prev => ({ ...prev, user: profile }));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      initializedRef.current = false;
    };
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Manually refresh profile after sign in (in case onAuthStateChange is slow)
    const profile = await fetchProfile();
    if (profile) {
      setState({ user: profile, isAuthenticated: true, isLoading: false, supabaseConfigured: true });
    }

    return { error: null };
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, username: string, displayName?: string) => {
    if (!supabase) return { error: 'Supabase not configured' };

    // Check username availability server-side
    try {
      const checkRes = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      if (checkRes.ok) {
        const { available } = await checkRes.json();
        if (!available) return { error: 'Käyttäjänimi on jo varattu' };
      }
    } catch {
      // Continue even if check fails - we'll catch conflicts later
    }

    // Create the auth user
    const { data: signUpData, error } = await supabase.auth.signUp({
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

    // Check if email confirmation is required (session is null but user exists)
    const needsEmailConfirmation = !signUpData.session && signUpData.user;

    if (needsEmailConfirmation) {
      // User was created but needs to confirm email before they can sign in
      // The trigger should have created a profile already
      return { error: null, needsEmailConfirmation: true };
    }

    // If we got a session back, the user is automatically signed in
    if (signUpData?.user && signUpData.session) {
      // Small delay to ensure the trigger has completed
      await new Promise((r) => setTimeout(r, 500));

      // Update the profile with the correct username
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName || username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', signUpData.user.id);

      if (profileError) {
        // If update fails (e.g. trigger didn't create profile yet), try upsert via server
        console.error('Failed to update profile client-side:', profileError);
        try {
          const profileRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, displayName: displayName || username }),
          });
          if (!profileRes.ok) {
            const data = await profileRes.json();
            console.error('Server profile creation also failed:', data.error);
          }
        } catch {
          console.error('Failed to call register endpoint');
        }
      }

      // Refresh the profile in state
      const profile = await fetchProfile();
      if (profile) {
        setState({ user: profile, isAuthenticated: true, isLoading: false, supabaseConfigured: true });
      }
    }

    return { error: null, needsEmailConfirmation: false };
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
