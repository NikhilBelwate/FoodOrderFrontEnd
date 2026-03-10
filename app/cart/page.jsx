'use client';

import Link       from 'next/link';
import Image      from 'next/image';
import { useCart } from '@/context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { items, totalPrice, updateQty, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-6">Add some delicious items from our menu!</p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Browse Menu <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div key={item.id} className="card p-4 flex items-center gap-4">

            {/* Image */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
              <p className="text-xs text-gray-400">{item.category}</p>
              <p className="text-sm font-bold text-orange-500 mt-0.5">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>

            {/* Qty Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.id, item.quantity - 1)}
                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:border-orange-400"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => updateQty(item.id, item.quantity + 1)}
                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:border-orange-400"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card p-5">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500 mb-3">
          <span>Delivery</span>
          <span className="text-green-600 font-medium">Free</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-orange-500">${totalPrice.toFixed(2)}</span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Link href="/" className="btn-secondary flex-1 text-center">
            ← Continue Shopping
          </Link>
          <Link href="/checkout" className="btn-primary flex-1 text-center flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
