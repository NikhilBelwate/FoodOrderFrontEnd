'use client';

import Link               from 'next/link';
import { usePathname }    from 'next/navigation';
import { useState }       from 'react';
import { ShoppingCart, ClipboardList, Menu, X, UtensilsCrossed } from 'lucide-react';
import { useCart }        from '@/context/CartContext';
import clsx               from 'clsx';

const navLinks = [
  { href: '/',       label: 'Menu',   icon: null },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
];

export default function Navbar() {
  const pathname    = usePathname();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

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
              <Link
                key={href}
                href={href}
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
              <ShoppingCart
                className={clsx(
                  'w-6 h-6 transition-colors hover:text-orange-500',
                  pathname === '/cart' ? 'text-orange-500' : 'text-gray-600'
                )}
              />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold
                                 rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile: Cart + Hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/cart" className="relative p-1">
              <ShoppingCart className="w-6 h-6 text-gray-600" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold
                                 rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button onClick={() => setOpen(o => !o)} className="p-1">
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={clsx(
                'block py-2 text-sm font-medium transition-colors hover:text-orange-500',
                pathname === href ? 'text-orange-500' : 'text-gray-600'
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
