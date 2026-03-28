'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  // ── Fetch profile from DB (auto-create if missing) ──────────────
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }

    // 1. Try to read existing profile
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 2. If no row yet (trigger hasn't fired, or Google OAuth edge case),
    //    create one on the fly with app_name = 'FoodApp'.
    if (!data) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const meta = currentUser?.user_metadata || {};

      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          id:         userId,
          full_name:  meta.full_name || meta.name || '',
          avatar_url: meta.avatar_url || meta.picture || '',
          app_name:   'FoodApp',
        }, { onConflict: 'id' })
        .select()
        .single();

      data = newProfile;
    }

    setProfile(data || null);
  }, [supabase]);

  // ── Bootstrap on mount ───────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user?.id);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchProfile(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // ── Get current access token (for API calls) ─────────────────────
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  // ── Auth actions ─────────────────────────────────────────────────
  const signUpWithEmail = useCallback(async (email, password, fullName) => {
    // Sign up user (email verification disabled on most Supabase projects,
    // or requires confirmation depending on settings)
    // Store redirect path for after email confirmation (if enabled)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_redirect', '/');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, app_name: 'FoodApp' },
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });

    if (error) return { data, error };

    // Immediately create/upsert profile row after signup succeeds.
    // This ensures profile exists even if trigger hasn't fired yet.
    if (data?.user?.id) {
      try {
        await supabase
          .from('profiles')
          .upsert({
            id:         data.user.id,
            full_name:  fullName || '',
            avatar_url: '',
            app_name:   'FoodApp',
          }, { onConflict: 'id' })
          .select()
          .single();
      } catch (profileErr) {
        // Log but don't fail signup if profile creation fails
        console.warn('Profile creation after signup failed:', profileErr);
      }
    }

    return { data, error };
  }, [supabase]);

  const signInWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    // Store current page so we can redirect back after OAuth completes
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('auth_redirect', window.location.pathname || '/');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    return { data, error };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, [supabase]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  }, [supabase, user]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      getToken,
      signUpWithEmail, signInWithEmail, signInWithGoogle,
      signOut, updateProfile,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
