'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link          from 'next/link';
import { useAuth }   from '@/context/AuthContext';
import { UtensilsCrossed, User, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

// Password strength rules
const RULES = [
  { id: 'length',  label: 'At least 8 characters',   test: (p) => p.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter',     test: (p) => /[A-Z]/.test(p) },
  { id: 'number',  label: 'One number',               test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character',    test: (p) => /[!@#$%^&*]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, isAuthenticated, loading } = useAuth();

  const [form, setForm]         = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]     = useState({});
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/');
  }, [loading, isAuthenticated, router]);

  const passStrength = RULES.map(r => ({ ...r, pass: r.test(form.password) }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())  e.fullName = 'Full name is required';
    if (!form.email.trim())     e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)         e.password = 'Password is required';
    else if (!passStrength.every(r => r.pass)) e.password = 'Password does not meet all requirements';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => { const n = {...er}; delete n[name]; return n; });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');
    const { error } = await signUpWithEmail(form.email, form.password, form.fullName);
    setSubmitting(false);

    if (error) {
      setApiError(error.message);
    } else {
      setSuccess(true);
    }
  };

  const handleGoogleSignup = async () => {
    setApiError('');
    const { error } = await signInWithGoogle();
    if (error) setApiError(error.message);
  };

  if (loading) return null;

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account created!</h2>
          <p className="text-gray-500 text-sm mb-5">
            Check your inbox and click the confirmation link, then sign in.
          </p>
          <Link href="/login" className="btn-primary inline-block">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-orange-500 font-bold text-2xl mb-2">
            <UtensilsCrossed className="w-7 h-7" />
            FoodOrder
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Start ordering in under a minute</p>
        </div>

        <div className="card p-8">

          {/* Google sign-up */}
          <button
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 border border-gray-300
                       rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700
                       hover:bg-gray-50 transition-colors mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or register with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" name="fullName" value={form.fullName}
                  onChange={handleChange} placeholder="Jane Smith"
                  autoComplete="name"
                  className={`input-field pl-9 ${errors.fullName ? 'border-red-400' : ''}`}
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="you@example.com"
                  autoComplete="email"
                  className={`input-field pl-9 ${errors.email ? 'border-red-400' : ''}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password" value={form.password}
                  onChange={handleChange} placeholder="••••••••"
                  autoComplete="new-password"
                  className={`input-field pl-9 pr-9 ${errors.password ? 'border-red-400' : ''}`}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {form.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {passStrength.map(r => (
                    <div key={r.id} className={`flex items-center gap-1 text-xs ${r.pass ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{r.pass ? '✓' : '○'}</span>
                      <span>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="confirm" value={form.confirm}
                  onChange={handleChange} placeholder="••••••••"
                  autoComplete="new-password"
                  className={`input-field pl-9 ${errors.confirm ? 'border-red-400' : ''}`}
                />
              </div>
              {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
            </div>

            {apiError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                ⚠️ {apiError}
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : 'Create Account'
              }
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-orange-500 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
