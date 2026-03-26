'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { useCart }    from '@/context/CartContext';
import { useAuth }    from '@/context/AuthContext';
import { ordersApi, paymentsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  CheckCircle2, ArrowLeft, Loader2, ShoppingBag,
  Truck, CreditCard, AlertCircle, Lock,
} from 'lucide-react';

// ── Stripe publishable key ────────────────────────────────────────────────────
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const INITIAL_FORM = {
  customerName: '', customerEmail: '', customerPhone: '',
  deliveryAddress: '', specialInstructions: '',
};

// ── Payment method option cards ───────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  {
    id: 'pay_on_delivery', label: 'Pay on Delivery',
    description: 'Cash or card when your order arrives',
    Icon: Truck, color: 'text-green-600', bg: 'bg-green-50',
    border: 'border-green-500', borderIdle: 'border-gray-200',
  },
  {
    id: 'stripe', label: 'Pay Now with Card',
    description: 'Secure Stripe payment — Visa, Mastercard, Amex',
    Icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50',
    border: 'border-blue-500', borderIdle: 'border-gray-200',
  },
];

// ── Stripe card element style ─────────────────────────────────────────────────
const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px', color: '#374151', fontFamily: 'system-ui, sans-serif',
      '::placeholder': { color: '#9CA3AF' },
    },
    invalid: { color: '#EF4444' },
  },
};

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ orderId, isPaid }) {
  const router = useRouter();
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isPaid ? 'Order Placed & Paid! 🎉' : 'Order Placed! 🎉'}
      </h2>
      <p className="text-gray-500 mb-4">
        {isPaid
          ? 'Your payment was successful. We are preparing your order!'
          : 'Your order has been received and is being processed.'}
      </p>
      <div className="card p-4 mb-6 bg-orange-50 border-orange-200">
        <p className="text-xs text-gray-500 mb-1">Your Order ID</p>
        <p className="font-mono font-bold text-orange-600 text-lg">{orderId}</p>
        <p className="text-xs text-gray-400 mt-1">Save this to track your order</p>
      </div>
      <div className="flex flex-col gap-3">
        <button onClick={() => router.push('/orders')} className="btn-primary">
          Track My Order
        </button>
        <Link href="/" className="btn-secondary">Order More</Link>
      </div>
    </div>
  );
}

// ── Main checkout content ─────────────────────────────────────────────────────
function CheckoutContent() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, profile } = useAuth();

  const [form, setForm]                     = useState(INITIAL_FORM);
  const [errors, setErrors]                 = useState({});
  const [paymentMethod, setPaymentMethod]   = useState('pay_on_delivery');

  // Loading / error states
  const [loading, setLoading]               = useState(false);
  const [apiError, setApiError]             = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError]     = useState('');

  // Post-order state
  const [orderResult, setOrderResult]       = useState(null);
  const [paymentDone, setPaymentDone]       = useState(false);

  // Stripe refs
  const stripeRef      = useRef(null);   // Stripe instance
  const elementsRef    = useRef(null);   // Stripe.elements()
  const cardElemRef    = useRef(null);   // card element instance
  const cardMountRef   = useRef(null);   // DOM node to mount card into
  const [cardError, setCardError]           = useState('');
  const [stripeReady, setStripeReady]       = useState(false);

  // Pre-fill form from user profile
  useEffect(() => {
    if (user || profile) {
      setForm(f => ({
        ...f,
        customerName:    profile?.full_name || user?.user_metadata?.full_name || f.customerName,
        customerEmail:   user?.email || f.customerEmail,
        customerPhone:   profile?.phone || f.customerPhone,
        deliveryAddress: profile?.address || f.deliveryAddress,
      }));
    }
  }, [user, profile]);

  // Initialise Stripe when Stripe.js CDN has loaded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const init = () => {
      if (window.Stripe && !stripeRef.current) {
        stripeRef.current   = window.Stripe(STRIPE_PK);
        elementsRef.current = stripeRef.current.elements();
        cardElemRef.current = elementsRef.current.create('card', CARD_STYLE);
        cardElemRef.current.on('change', e => setCardError(e.error?.message || ''));
        setStripeReady(true);
      }
    };
    if (window.Stripe) { init(); return; }
    // Poll until Stripe.js CDN script has loaded (max ~10s)
    const timer = setInterval(() => { if (window.Stripe) { clearInterval(timer); init(); } }, 200);
    return () => clearInterval(timer);
  }, []);

  // Mount / unmount card element based on selected payment method
  useEffect(() => {
    if (!cardElemRef.current) return;
    if (paymentMethod === 'stripe' && cardMountRef.current) {
      try { cardElemRef.current.mount(cardMountRef.current); } catch (_) {}
    } else {
      try { cardElemRef.current.unmount(); } catch (_) {}
    }
  }, [paymentMethod, stripeReady]);

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (items.length === 0 && !orderResult) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Your cart is empty</h2>
        <Link href="/" className="btn-primary inline-block mt-4">Go to Menu</Link>
      </div>
    );
  }

  // ── Validation ──────────────────────────────────────────────────────────────
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

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = {...prev}; delete n[name]; return n; });
  };

  // ── Submit: create order + trigger Stripe payment if needed ─────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    if (paymentMethod === 'stripe' && !stripeReady) {
      setApiError('Stripe has not loaded yet. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setApiError('');

    let res;
    try {
      res = await ordersApi.create({
        ...form,
        paymentMethod,
        items: items.map(i => ({ itemId: i.id, quantity: i.quantity })),
      });
    } catch (err) {
      setApiError(err.message || 'Failed to place order. Please try again.');
      setLoading(false);
      return;
    }

    const result = res.data;

    if (paymentMethod === 'pay_on_delivery') {
      clearCart();
      setOrderResult(result);
      setLoading(false);
      return;
    }

    // ── Stripe: confirm card payment ──────────────────────────────────────────
    const { clientSecret } = result.stripeDetails || {};
    if (!clientSecret) {
      setApiError('Payment could not be initiated. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    setPaymentLoading(true);
    setPaymentError('');

    const { paymentIntent, error: stripeErr } = await stripeRef.current.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElemRef.current, billing_details: { name: form.customerName, email: form.customerEmail } } },
    );

    if (stripeErr) {
      setPaymentError(stripeErr.message || 'Card payment failed. Please check your details and try again.');
      setPaymentLoading(false);
      // Keep orderResult so user sees the form with error; they can fix and retry card
      setOrderResult(result);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Notify backend to verify + update DB
      try {
        await paymentsApi.stripeConfirm(result.payment.id, paymentIntent.id);
      } catch (confirmErr) {
        console.warn('Backend stripe-confirm failed (webhook will handle it):', confirmErr.message);
      }
      clearCart();
      setOrderResult(result);
      setPaymentDone(true);
    } else {
      setPaymentError(`Unexpected payment status: ${paymentIntent?.status}. Contact support.`);
    }

    setPaymentLoading(false);
  };

  // ── Post-order: success screens ─────────────────────────────────────────────
  if (orderResult && (paymentMethod === 'pay_on_delivery' || paymentDone)) {
    return <SuccessScreen orderId={orderResult.orderId} isPaid={paymentDone} />;
  }

  // ── Stripe retry screen (order created, card failed) ─────────────────────────
  if (orderResult && paymentMethod === 'stripe' && !paymentDone) {
    const { clientSecret } = orderResult.stripeDetails || {};
    const handleRetry = async () => {
      if (!clientSecret || !stripeReady) return;
      setPaymentLoading(true);
      setPaymentError('');
      const { paymentIntent, error: stripeErr } = await stripeRef.current.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElemRef.current, billing_details: { name: form.customerName, email: form.customerEmail } } },
      );
      if (stripeErr) {
        setPaymentError(stripeErr.message || 'Card payment failed.');
      } else if (paymentIntent?.status === 'succeeded') {
        try { await paymentsApi.stripeConfirm(orderResult.payment.id, paymentIntent.id); } catch (_) {}
        clearCart();
        setPaymentDone(true);
      }
      setPaymentLoading(false);
    };

    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="card p-6 mb-5 bg-orange-50 border-orange-200 text-center">
          <p className="text-xs text-gray-500 mb-1">Order created — Order ID</p>
          <p className="font-mono font-bold text-orange-600 text-lg">{orderResult.orderId}</p>
          <p className="text-sm text-gray-600 mt-1">Complete your card payment below to confirm the order.</p>
        </div>

        {paymentError && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Payment failed</p>
              <p>{paymentError}</p>
            </div>
          </div>
        )}

        <div className="card p-5 mb-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" /> Card Details
          </h3>
          <div ref={cardMountRef} id="stripe-card-retry" className="border border-gray-300 rounded-lg px-3 py-3" />
        </div>

        <button
          onClick={handleRetry}
          disabled={paymentLoading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {paymentLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing Payment…</>
            : <><Lock className="w-4 h-4" /> Retry Payment — ${parseFloat(orderResult.totalPrice).toFixed(2)}</>
          }
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">
          Secured by Stripe · No card data touches our servers
        </p>
      </div>
    );
  }

  // ── Checkout form ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-orange-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </Link>
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">

          {/* Delivery Details */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Delivery Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="customerName" value={form.customerName} onChange={handleChange}
                  placeholder="Jane Smith" className={`input-field ${errors.customerName ? 'border-red-400' : ''}`} />
                {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" name="customerEmail" value={form.customerEmail} onChange={handleChange}
                  placeholder="jane@example.com" className={`input-field ${errors.customerEmail ? 'border-red-400' : ''}`} />
                {errors.customerEmail && <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                <input type="tel" name="customerPhone" value={form.customerPhone} onChange={handleChange}
                  placeholder="+1 555 123 4567" className={`input-field ${errors.customerPhone ? 'border-red-400' : ''}`} />
                {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address <span className="text-red-500">*</span></label>
                <input type="text" name="deliveryAddress" value={form.deliveryAddress} onChange={handleChange}
                  placeholder="123 Main St, City, State, ZIP" className={`input-field ${errors.deliveryAddress ? 'border-red-400' : ''}`} />
                {errors.deliveryAddress && <p className="text-xs text-red-500 mt-1">{errors.deliveryAddress}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea name="specialInstructions" value={form.specialInstructions} onChange={handleChange}
                  rows={3} placeholder="Allergies, gate codes, delivery preferences…" className="input-field resize-none" />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAYMENT_OPTIONS.map(opt => {
                const selected = paymentMethod === opt.id;
                return (
                  <button key={opt.id} type="button" onClick={() => setPaymentMethod(opt.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left
                      ${selected ? `${opt.bg} ${opt.border} shadow-sm` : `bg-white ${opt.borderIdle} hover:border-gray-300`}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selected ? opt.bg : 'bg-gray-100'}`}>
                      <opt.Icon className={`w-5 h-5 ${selected ? opt.color : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${selected ? 'text-gray-900' : 'text-gray-700'}`}>{opt.label}</p>
                        {selected && <span className={`text-xs font-bold ${opt.color}`}>✓</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stripe card element (shown only when stripe is selected) */}
            {paymentMethod === 'stripe' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Secured by Stripe — your card info never touches our servers</span>
                </div>

                {!stripeReady ? (
                  <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading secure card form…
                  </div>
                ) : (
                  <div
                    ref={cardMountRef}
                    id="stripe-card-element"
                    className="border border-gray-300 focus-within:border-blue-400 rounded-lg px-3 py-3 bg-white transition-colors"
                  />
                )}

                {cardError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {cardError}
                  </p>
                )}

                {/* Test card hint for sandbox */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                  <span className="font-semibold">Test mode</span> · Use card{' '}
                  <span className="font-mono font-bold">4242 4242 4242 4242</span>,
                  any future date, any CVC.
                </div>
              </div>
            )}
          </div>

          {apiError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || paymentLoading || (paymentMethod === 'stripe' && !stripeReady)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60"
          >
            {(loading || paymentLoading) ? (
              <><Loader2 className="w-4 h-4 animate-spin" />
                {paymentLoading ? 'Processing Payment…' : 'Placing Order…'}</>
            ) : paymentMethod === 'stripe' ? (
              <><Lock className="w-4 h-4" /> Place Order &amp; Pay ${totalPrice.toFixed(2)}</>
            ) : (
              'Place Order'
            )}
          </button>
        </form>

        {/* Order Summary sidebar */}
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
              <span>Delivery</span><span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Payment</span>
              <span className={paymentMethod === 'stripe' ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                {paymentMethod === 'stripe' ? 'Stripe · Card' : 'Pay on Delivery'}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-500">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
          {paymentMethod === 'stripe' && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <Lock className="w-3 h-3" /> SSL encrypted · Powered by Stripe
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
