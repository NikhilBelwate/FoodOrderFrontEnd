'use client';

import { useState }     from 'react';
import { useRouter }    from 'next/navigation';
import Link             from 'next/link';
import { useCart }      from '@/context/CartContext';
import { ordersApi }    from '@/lib/api';
import { CheckCircle2, ArrowLeft, Loader2, ShoppingBag } from 'lucide-react';

const INITIAL_FORM = {
  customerName:        '',
  customerEmail:       '',
  customerPhone:       '',
  deliveryAddress:     '',
  specialInstructions: '',
};

const ERRORS_INIT = {};

export default function CheckoutPage() {
  const router  = useRouter();
  const { items, totalPrice, clearCart } = useCart();

  const [form,      setForm]      = useState(INITIAL_FORM);
  const [errors,    setErrors]    = useState(ERRORS_INIT);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');
  const [orderId,   setOrderId]   = useState(null); // success state

  if (items.length === 0 && !orderId) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
        <Link href="/" className="btn-primary inline-block mt-4">Go to Menu</Link>
      </div>
    );
  }

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.customerName.trim())    e.customerName    = 'Full name is required';
    if (!form.customerEmail.trim())   e.customerEmail   = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.customerEmail)) e.customerEmail = 'Enter a valid email';
    if (!form.customerPhone.trim())   e.customerPhone   = 'Phone number is required';
    else if (form.customerPhone.replace(/\D/g,'').length < 7) e.customerPhone = 'Enter a valid phone number';
    if (!form.deliveryAddress.trim()) e.deliveryAddress = 'Delivery address is required';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => { const n = {...e}; delete n[name]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const payload = {
        ...form,
        items: items.map(i => ({ foodItemId: i.id, quantity: i.quantity })),
      };
      const res = await ordersApi.create(payload);
      setOrderId(res.data.orderId);
      clearCart();
    } catch (err) {
      setApiError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (orderId) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed! 🎉</h2>
        <p className="text-gray-500 mb-4">Your order has been received and is being processed.</p>
        <div className="card p-4 mb-6 bg-orange-50 border-orange-200">
          <p className="text-xs text-gray-500 mb-1">Your Order ID</p>
          <p className="font-mono font-bold text-orange-600 text-lg">{orderId}</p>
          <p className="text-xs text-gray-400 mt-1">Save this to track your order</p>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => router.push('/orders')} className="btn-primary">
            Track My Order
          </button>
          <Link href="/" className="btn-secondary">
            Order More
          </Link>
        </div>
      </div>
    );
  }

  // ─── Checkout Form ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </Link>
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Delivery Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="customerName" value={form.customerName}
                  onChange={handleChange} placeholder="Jane Smith"
                  className={`input-field ${errors.customerName ? 'border-red-400' : ''}`}
                />
                {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email" name="customerEmail" value={form.customerEmail}
                  onChange={handleChange} placeholder="jane@example.com"
                  className={`input-field ${errors.customerEmail ? 'border-red-400' : ''}`}
                />
                {errors.customerEmail && <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel" name="customerPhone" value={form.customerPhone}
                  onChange={handleChange} placeholder="+1 555 123 4567"
                  className={`input-field ${errors.customerPhone ? 'border-red-400' : ''}`}
                />
                {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="deliveryAddress" value={form.deliveryAddress}
                  onChange={handleChange} placeholder="123 Main St, City, State, ZIP"
                  className={`input-field ${errors.deliveryAddress ? 'border-red-400' : ''}`}
                />
                {errors.deliveryAddress && <p className="text-xs text-red-500 mt-1">{errors.deliveryAddress}</p>}
              </div>

              {/* Special Instructions */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="specialInstructions" value={form.specialInstructions}
                  onChange={handleChange} rows={3}
                  placeholder="Allergies, gate codes, delivery preferences…"
                  className="input-field resize-none"
                />
              </div>
            </div>
          </div>

          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              ⚠️ {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
            ) : (
              'Place Order'
            )}
          </button>
        </form>

        {/* Order Summary */}
        <aside className="card p-5 h-fit sticky top-24">
          <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700 flex-1 truncate pr-2">
                  {item.name} <span className="text-gray-400">×{item.quantity}</span>
                </span>
                <span className="font-medium text-gray-900 flex-shrink-0">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Delivery</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-500">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
