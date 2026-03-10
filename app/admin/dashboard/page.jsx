'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_STORAGE_KEY = 'foodorder_admin_authed';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const authed = window.localStorage.getItem(AUTH_STORAGE_KEY) === '1';
      if (!authed) {
        router.replace('/admin/login');
        return;
      }
      setReady(true);
    } catch {
      router.replace('/admin/login');
    }
  }, [router]);

  function logout() {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    router.replace('/admin/login');
  }

  if (!ready) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="card p-6">
          <p className="text-sm text-gray-500">Checking admin session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Work in progress.</p>
        </div>
        <button onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>

      <div className="card p-6">
        <div className="text-center py-10 text-gray-500">
          <p className="text-lg font-semibold text-gray-800">Work in progress</p>
          <p className="text-sm mt-1">Admin dashboard features will be added here.</p>
        </div>
      </div>
    </div>
  );
}

