'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Omega-X@2026';
const AUTH_STORAGE_KEY = 'foodorder_admin_authed';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = useMemo(() => username.trim().length > 0 && password.length > 0, [username, password]);

  useEffect(() => {
    try {
      const authed = window.localStorage.getItem(AUTH_STORAGE_KEY) === '1';
      if (authed) router.replace('/admin/dashboard');
    } catch {
      // ignore
    }
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please enter username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
      if (!ok) {
        setError('Invalid admin credentials.');
        return;
      }
      window.localStorage.setItem(AUTH_STORAGE_KEY, '1');
      router.push('/admin/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to access the admin dashboard.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-field"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

