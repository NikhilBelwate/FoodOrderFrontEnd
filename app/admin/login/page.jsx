'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Admin login is now handled directly in /admin/dashboard.
 * This page redirects immediately to avoid dead routes.
 */
export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400">Redirecting to admin dashboard…</p>
    </div>
  );
}
