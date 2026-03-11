'use client';

import Link               from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ShoppingCart, ClipboardList, Menu, X, UtensilsCrossed, LogOut } from 'lucide-react';
import { useCart }  from '@/context/CartContext';
import { useAuth }  from '@/context/AuthContext';
import clsx         from 'clsx';

const navLinks = [
  { href: '/',       label: 'Menu'   },
  { href: '/orders', label: 'Orders' },
];

export default function Navbar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { totalItems }                    = useCart();
  const { user, profile, isAuthenticated, signOut } = useAuth();

  const [mobileOpen, setMobileOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setDropdownOpen(false);
    router.push('/login');
  };

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-orange-500 font-bold text-xl">
            <UtensilsCrossed className="w-6 h-6" />
            <span>FoodOrder</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                className={clsx(
                  'text-sm font-medium transition-colors hover:text-orange-500',
                  pathname === href ? 'text-orange-500' : 'text-gray-600'
                )}
              >
                {label}
              </Link>
            ))}

            {/* Cart */}
            <Link href="/cart" className="relative">
              <ShoppingCart className={clsx(
                'w-6 h-6 transition-colors hover:text-orange-500',
                pathname === '/cart' ? 'text-orange-500' : 'text-gray-600'
              )} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px]
                                 font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2 rounded-full border border-gray-200 px-2 py-1
                             hover:border-orange-300 transition-colors"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold
                                    flex items-center justify-center">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm text-gray-700 font-medium max-w-[100px] truncate">
                    {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 card shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {profile?.full_name || 'My Account'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <Link href="/orders" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <ClipboardList className="w-4 h-4" /> My Orders
                    </Link>
                    <button onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"    className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm py-1.5 px-3">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile: Cart + Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/cart" className="relative p-1">
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px]
                                 font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setMobileOpen(o => !o)} className="p-1">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={clsx(
                'block py-2 text-sm font-medium transition-colors hover:text-orange-500',
                pathname === href ? 'text-orange-500' : 'text-gray-600'
              )}>
              {label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <div className="py-2 border-t border-gray-100 mt-1">
                <p className="text-xs text-gray-500 font-medium truncate">
                  {profile?.full_name || user?.email}
                </p>
              </div>
              <button onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-red-600 py-1">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Link href="/login"    onClick={() => setMobileOpen(false)}
                className="btn-secondary flex-1 text-center text-sm py-1.5">Sign In</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}
                className="btn-primary flex-1 text-center text-sm py-1.5">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
