import Link from 'next/link';
import { UtensilsCrossed, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-orange-400 font-bold text-lg mb-3">
              <UtensilsCrossed className="w-5 h-5" />
              FoodOrder
            </div>
            <p className="text-sm text-gray-400">
              Delicious food delivered fast and fresh to your door. Sandwiches, pizza, and cake – all just a click away.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/"       className="hover:text-orange-400 transition-colors">Menu</Link></li>
              <li><Link href="/cart"   className="hover:text-orange-400 transition-colors">Cart</Link></li>
              <li><Link href="/orders" className="hover:text-orange-400 transition-colors">Order Tracking</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-3">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>support@foodorder.app</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>123 Food Street, NY 10001</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} FoodOrder. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
