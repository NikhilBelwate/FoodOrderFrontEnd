'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { getSupabaseClient }   from '@/lib/supabase';
import LoadingSpinner          from '@/components/LoadingSpinner';

/**
 * OAuth Callback Page — handles both PKCE and implicit flows.
 *
 * PKCE flow (default in @supabase/ssr):
 *   Google → Supabase → /auth/callback?code=XXXX
 *   We must call exchangeCodeForSession(code) to get a session.
 *
 * Implicit flow (legacy):
 *   Google → Supabase → /auth/callback#access_token=XXXX
 *   onAuthStateChange fires automatically.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const supabase = getSupabaseClient();

    const handleCallback = async () => {
      // Read the current URL to inspect what Supabase returned
      const url    = new URL(window.location.href);
      const code   = url.searchParams.get('code');
      const error  = url.searchParams.get('error');
      const errDesc = url.searchParams.get('error_description');

      // ── Supabase returned an OAuth error ──────────────────────────
      if (error) {
        console.error('OAuth error:', error, errDesc);
        setErrorMsg(errDesc || error);
        setTimeout(() => router.replace('/login?error=oauth_failed'), 2500);
        return;
      }

      // ── PKCE flow: exchange the one-time code for a session ───────
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('exchangeCodeForSession failed:', exchangeError.message);
          setErrorMsg('Sign-in failed. Please try again.');
          setTimeout(() => router.replace('/login?error=exchange_failed'), 2500);
          return;
        }

        if (data.session) {
          // Clean the ?code= out of the URL, then navigate to the app
          const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
          sessionStorage.removeItem('auth_redirect');
          router.replace(redirectTo);
          return;
        }
      }

      // ── Implicit flow: token is in the URL hash ───────────────────
      // onAuthStateChange picks this up automatically; we just wait.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();
          const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
          sessionStorage.removeItem('auth_redirect');
          router.replace(redirectTo);
        }
      });

      // Fallback: if neither code nor hash token is found after 4s, give up
      const timeout = setTimeout(async () => {
        subscription.unsubscribe();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/');
        } else {
          setErrorMsg('Sign-in timed out. Please try again.');
          setTimeout(() => router.replace('/login?error=timeout'), 2000);
        }
      }, 4000);

      // Cleanup on unmount
      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    handleCallback();
  }, [router]);

  if (errorMsg) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Sign-in failed</h2>
          <p className="text-sm text-gray-500 mb-5">{errorMsg}</p>
          <p className="text-xs text-gray-400">Redirecting you back to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <LoadingSpinner message="Completing sign-in…" />
    </div>
  );
}
