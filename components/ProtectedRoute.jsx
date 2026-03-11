'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth }   from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Wraps a page so that unauthenticated users are redirected to /login.
 * Usage: wrap page content with <ProtectedRoute>...</ProtectedRoute>
 */
export default function ProtectedRoute({ children, redirectTo = '/login' }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [loading, isAuthenticated, router, redirectTo]);

  if (loading) return <LoadingSpinner message="Checking authentication…" />;
  if (!isAuthenticated) return null;

  return children;
}
