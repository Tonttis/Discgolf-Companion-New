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

// Create a fallback profile from Supabase auth user metadata
function createFallbackProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): UserProfile {
  return {
    id: authUser.id,
    username: (authUser.user_metadata?.username as string) || authUser.email?.split('@')[0] || 'user',
    displayName: (authUser.user_metadata?.display_name as string) || null,
    avatarUrl: (authUser.user_metadata?.avatar_url as string) || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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

  // Track the subscription so we can clean it up
  const subscriptionRef = useRef<ReturnType<typeof supabase extends null ? never : NonNullable<unknown>> | null>(null);

  useEffect(() => {
    if (!supabase) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: false });
      });
      return;
    }

    let cancelled = false;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session?.user) {
          const profile = await fetchProfile();
          if (cancelled) return;

          if (profile) {
            setState({
              user: profile,
              isAuthenticated: true,
              isLoading: false,
              supabaseConfigured: true,
            });
          } else {
            // Profile doesn't exist yet — use fallback from auth metadata
            // and try to create the profile on the server
            const fallback = createFallbackProfile(session.user);
            setState({
              user: fallback,
              isAuthenticated: true,
              isLoading: false,
              supabaseConfigured: true,
            });

            // Try to create the profile on the server
            try {
              await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: fallback.username,
                  displayName: fallback.displayName || fallback.username,
                }),
              });
              // Re-fetch the profile after creation
              const newProfile = await fetchProfile();
              if (newProfile && !cancelled) {
                setState(prev => ({ ...prev, user: newProfile }));
              }
            } catch {
              // Profile creation failed — fallback profile is still usable
            }
          }
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
        }
      } catch {
        if (!cancelled) {
          setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
        }
      }
    };

    initAuth();

    // Set up auth state change listener — this persists across the lifetime of the component
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_IN' && session?.user) {
        // Small delay to allow profile trigger to complete
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;

        const profile = await fetchProfile();
        if (cancelled) return;

        if (profile) {
          setState({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            supabaseConfigured: true,
          });
        } else {
          // Profile doesn't exist — use fallback
          const fallback = createFallbackProfile(session.user);
          setState({
            user: fallback,
            isAuthenticated: true,
            isLoading: false,
            supabaseConfigured: true,
          });

          // Try to create profile
          try {
            await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: fallback.username,
                displayName: fallback.displayName || fallback.username,
              }),
            });
            const newProfile = await fetchProfile();
            if (newProfile && !cancelled) {
              setState(prev => ({ ...prev, user: newProfile }));
            }
          } catch {
            // Fallback profile is still usable
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isAuthenticated: false, isLoading: false, supabaseConfigured: true });
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const profile = await fetchProfile();
        if (profile && !cancelled) {
          setState(prev => ({ ...prev, user: profile }));
        }
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase not configured' };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      // IMPORTANT: Always update state after successful sign-in
      // Even if profile fetch fails, we use the auth data as fallback
      if (data.user) {
        // Small delay for cookies to propagate
        await new Promise(r => setTimeout(r, 300));

        const profile = await fetchProfile();

        if (profile) {
          setState({ user: profile, isAuthenticated: true, isLoading: false, supabaseConfigured: true });
        } else {
          // Profile doesn't exist — use fallback and try to create it
          const fallback = createFallbackProfile(data.user);
          setState({ user: fallback, isAuthenticated: true, isLoading: false, supabaseConfigured: true });

          try {
            await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: fallback.username,
                displayName: fallback.displayName || fallback.username,
              }),
            });
            const newProfile = await fetchProfile();
            if (newProfile) {
              setState(prev => ({ ...prev, user: newProfile }));
            }
          } catch {
            // Fallback is still usable
          }
        }
      }

      return { error: null };
    } catch {
      return { error: 'Kirjautuminen epäonnistui' };
    }
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
      // Continue even if check fails
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
      return { error: null, needsEmailConfirmation: true };
    }

    // If we got a session back, the user is automatically signed in
    if (signUpData?.user && signUpData.session) {
      // Wait for the trigger to create the profile
      await new Promise((r) => setTimeout(r, 1000));

      // Try to create/update the profile via the server endpoint
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, displayName: displayName || username }),
        });
      } catch {
        // Continue even if server profile creation fails
      }

      // Wait a bit more then fetch the profile
      await new Promise(r => setTimeout(r, 500));

      const profile = await fetchProfile();
      if (profile) {
        setState({ user: profile, isAuthenticated: true, isLoading: false, supabaseConfigured: true });
      } else {
        // Use fallback profile
        const fallback = createFallbackProfile(signUpData.user);
        setState({ user: fallback, isAuthenticated: true, isLoading: false, supabaseConfigured: true });
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
