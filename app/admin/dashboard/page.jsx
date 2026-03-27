'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import adminApi, { ADMIN_KEY_STORAGE } from '@/lib/adminApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Sandwiches', 'Pizza', 'Cake', 'Desserts', 'Drinks', 'Main Course', 'Burgers'];

// Status values must match the DB CHECK constraint in 01_schema.sql (Title Case)
const ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];

const STATUS_COLORS = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-indigo-100 text-indigo-800',
  Preparing: 'bg-blue-100 text-blue-800',
  Ready:     'bg-purple-100 text-purple-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const EMPTY_ITEM = {
  name: '', description: '', category: 'Sandwiches',
  price: '', imageUrl: '', available: true, is_veg: false,
  discount_percent: 0, offer_label: '',
};

// ─── Small reusable components ────────────────────────────────────────────────

function StatCard({ label, value, icon, sub, color }) {
  const palette = {
    blue:   'from-blue-500 to-blue-600',
    green:  'from-green-500 to-green-600',
    yellow: 'from-yellow-400 to-yellow-500',
    purple: 'from-purple-500 to-purple-600',
    red:    'from-red-500 to-red-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${palette[color] || palette.blue} flex items-center justify-center text-white text-xl shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Badge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Payment status helpers ───────────────────────────────────────────────────
const PAYMENT_STATUS_STYLES = {
  pending:          'bg-gray-100 text-gray-600',
  awaiting_payment: 'bg-yellow-100 text-yellow-800',
  confirmed:        'bg-green-100 text-green-800',
  failed:           'bg-red-100 text-red-800',
  refunded:         'bg-purple-100 text-purple-800',
};

const PAYMENT_STATUS_LABELS = {
  pending:          'Pending',
  awaiting_payment: 'Awaiting Payment',
  confirmed:        'Confirmed ✓',
  failed:           'Failed',
  refunded:         'Refunded',
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose, onStatusChange, statusUpdating }) {
  const [localStatus, setLocalStatus] = useState(order.status);
  const [paymentAction, setPaymentAction] = useState(null); // 'verifying' | 'refunding' | null
  const [paymentActionError, setPaymentActionError] = useState('');
  const [paymentData, setPaymentData] = useState(
    Array.isArray(order.payments) ? order.payments[0] : order.payments
  );

  const handleVerifyPayment = async () => {
    if (!paymentData?.id) return;
    setPaymentAction('verifying');
    setPaymentActionError('');
    try {
      const res = await adminApi.put(`/payments/admin/${paymentData.id}/verify`, {});
      setPaymentData(res.data?.data || { ...paymentData, payment_status: 'confirmed', paid_at: new Date().toISOString() });
    } catch (err) {
      setPaymentActionError(err.message || 'Verification failed');
    } finally {
      setPaymentAction(null);
    }
  };

  const handleRefundPayment = async () => {
    if (!paymentData?.id) return;
    if (!window.confirm('Mark this payment as refunded?')) return;
    setPaymentAction('refunding');
    setPaymentActionError('');
    try {
      const res = await adminApi.put(`/payments/admin/${paymentData.id}/refund`, {});
      setPaymentData(res.data?.data || { ...paymentData, payment_status: 'refunded' });
    } catch (err) {
      setPaymentActionError(err.message || 'Refund failed');
    } finally {
      setPaymentAction(null);
    }
  };

  const items       = order.order_items || [];
  const address     = order['deliveryAddress'] || '';
  const mapsUrl     = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  const handleStatusSave = () => {
    if (localStatus !== order.status) onStatusChange(order.id, localStatus);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Order Details</h2>
            <span className="font-mono text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded mt-0.5 inline-block">
              {order['orderId'] || order.id}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">&times;</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">

          {/* ── Customer info ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</h3>
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="font-semibold text-gray-800">{order['customerName'] || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="text-gray-700 break-all">{order['customerEmail'] || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                <p className="text-gray-700">{order['customerPhone'] || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Ordered on</p>
                <p className="text-gray-700 text-sm">
                  {order['createdAt']
                    ? new Date(order['createdAt']).toLocaleString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </section>

          {/* ── Delivery address ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Delivery Address</h3>
            <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">📍</span>
              <div className="flex-1">
                <p className="text-gray-800">{address || 'No address provided'}</p>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1.5 font-medium">
                    🗺️ Open in Google Maps ↗
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── Special instructions ── */}
          {order['specialInstructions'] && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Special Instructions</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                {order['specialInstructions']}
              </div>
            </section>
          )}

          {/* ── Order items ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Items ({items.length})</h3>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-4 py-2.5 font-semibold text-gray-600">Item</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-600 text-center">Qty</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-600 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, idx) => {
                    const unitPrice  = parseFloat(item.price || 0);
                    const subtotal   = unitPrice * (item.quantity || 1);
                    const foodInfo   = item.items || {};
                    const discountPct = foodInfo.discount_percent || 0;
                    const offerLabel  = foodInfo.offer_label || null;
                    return (
                      <tr key={item.id || idx} className="bg-white">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{foodInfo.name || 'Unknown item'}</p>
                          <p className="text-xs text-gray-400">{foodInfo.category || ''}</p>
                          {discountPct > 0 && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                              {offerLabel || `${discountPct}% off`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 font-medium">{item.quantity || 1}</td>
                        <td className="px-4 py-3 text-right text-gray-700">${unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">${subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Total row */}
              <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-t border-orange-100">
                <span className="font-bold text-gray-700">Total</span>
                <span className="text-xl font-bold text-orange-600">
                  ${parseFloat(order['totalPrice'] || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          {/* ── Payment ── */}
          {paymentData ? (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">

                {/* Method + status row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Method</p>
                    <p className="font-semibold text-gray-800">
                      {paymentData.payment_method === 'stripe'
                        ? '💳 Card (Stripe)'
                        : '🚚 Pay on Delivery'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${PAYMENT_STATUS_STYLES[paymentData.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                      {PAYMENT_STATUS_LABELS[paymentData.payment_status] || paymentData.payment_status}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="font-bold text-gray-800">
                    {paymentData.currency} {parseFloat(paymentData.amount || 0).toFixed(2)}
                  </p>
                </div>

                {/* Stripe-specific fields */}
                {paymentData.payment_method === 'stripe' && (
                  <>
                    {paymentData.stripe_payment_intent_id && (
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                        <p className="text-xs text-gray-400">Payment Intent</p>
                        <p className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded truncate max-w-[55%]">
                          {paymentData.stripe_payment_intent_id}
                        </p>
                      </div>
                    )}
                    {paymentData.paid_at && (
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                        <p className="text-xs text-gray-400">Paid at</p>
                        <p className="text-sm text-gray-700">
                          {new Date(paymentData.paid_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}

                    {/* Admin actions */}
                    {paymentActionError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                        ⚠️ {paymentActionError}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                      {!['confirmed', 'refunded'].includes(paymentData.payment_status) && (
                        <button
                          onClick={handleVerifyPayment}
                          disabled={paymentAction !== null}
                          className="flex-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                          {paymentAction === 'verifying' ? 'Verifying…' : '✓ Verify Payment'}
                        </button>
                      )}
                      {paymentData.payment_status !== 'refunded' && (
                        <button
                          onClick={handleRefundPayment}
                          disabled={paymentAction !== null}
                          className="flex-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                          {paymentAction === 'refunding' ? 'Processing…' : '↩ Mark Refunded'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          ) : null}

          {/* ── Update status ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Status</h3>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Current:</span>
                <Badge status={order.status} />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={localStatus}
                  onChange={e => setLocalStatus(e.target.value)}
                  disabled={statusUpdating === order.id}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white disabled:opacity-50">
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={handleStatusSave}
                  disabled={localStatus === order.status || statusUpdating === order.id}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {statusUpdating === order.id ? 'Saving…' : 'Save Status'}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
          <button onClick={onClose} className="btn-secondary px-5">Close</button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InlineAlert({ type, message, onClose }) {
  if (!message) return null;
  const styles = type === 'error'
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-green-50 border-green-200 text-green-800';
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${styles} mb-4`}>
      <span className="shrink-0">{type === 'error' ? '⚠️' : '✅'}</span>
      <span className="flex-1">{message}</span>
      {onClose && <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">&times;</button>}
    </div>
  );
}

// ─── Food Item Form ───────────────────────────────────────────────────────────
function FoodItemForm({ item, onSave, onClose, loading, categories }) {
  const [form, setForm] = useState({ ...EMPTY_ITEM, ...item });
  const [err, setErr]   = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) return setErr('Name is required.');
    const price = parseFloat(form.price);
    if (!price || price <= 0) return setErr('Enter a valid price.');
    onSave({ ...form, price });
  };

  const categoryList = categories || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InlineAlert type="error" message={err} onClose={() => setErr('')} />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Item name" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
            {categoryList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
          <input type="number" step="0.01" min="0.01" className="input-field" value={form.price}
            onChange={e => set('price', e.target.value)} placeholder="0.00" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input-field resize-none h-20" value={form.description}
            onChange={e => set('description', e.target.value)} placeholder="Short description…" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input className="input-field" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
          <input type="number" min="0" max="100" step="0.01" className="input-field" value={form.discount_percent}
            onChange={e => set('discount_percent', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Offer Label</label>
          <input className="input-field" value={form.offer_label} onChange={e => set('offer_label', e.target.value)} placeholder="e.g. 20% OFF" />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="avail" checked={form.available} onChange={e => set('available', e.target.checked)}
            className="w-4 h-4 accent-orange-500" />
          <label htmlFor="avail" className="text-sm text-gray-700">Available for ordering</label>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="is_veg" checked={form.is_veg} onChange={e => set('is_veg', e.target.checked)}
            className="w-4 h-4 accent-green-500" />
          <label htmlFor="is_veg" className="text-sm text-gray-700">🟢 Vegetarian item</label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
          {loading ? 'Saving…' : item?.id ? 'Update Item' : 'Create Item'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ─── Offer Form ───────────────────────────────────────────────────────────────
function OfferForm({ item, onSave, onClose, loading }) {
  const [discount, setDiscount] = useState(item?.discount_percent || 0);
  const [label, setLabel]       = useState(item?.offer_label || '');
  const [err, setErr]           = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    const d = parseFloat(discount);
    if (isNaN(d) || d < 0 || d > 100) return setErr('Discount must be 0–100.');
    onSave({ discount_percent: d, offer_label: label });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InlineAlert type="error" message={err} onClose={() => setErr('')} />
      <p className="text-sm text-gray-500">Editing offer for: <strong>{item?.name}</strong></p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
        <input type="number" min="0" max="100" step="0.01" className="input-field"
          value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
        <p className="text-xs text-gray-400 mt-1">Set to 0 to remove the discount.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Offer Label</label>
        <input className="input-field" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. 20% OFF, Happy Hour" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
          {loading ? 'Saving…' : 'Apply Offer'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ─── Bulk Price Form ──────────────────────────────────────────────────────────
function BulkPriceForm({ onSave, onClose, loading, categories }) {
  const [category,   setCategory]   = useState(categories && categories.length > 0 ? categories[0] : 'Sandwiches');
  const [changeType, setChangeType] = useState('percent_increase');
  const [value,      setValue]      = useState('');
  const [err,        setErr]        = useState('');

  const categoryList = categories || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    const v = parseFloat(value);
    if (!v || v <= 0 || v > 100) return setErr('Value must be 0.01–100.');
    onSave({ category, change_type: changeType, value: v });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InlineAlert type="error" message={err} onClose={() => setErr('')} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select className="input-field" value={category} onChange={e => setCategory(e.target.value)}>
          {categoryList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
        <select className="input-field" value={changeType} onChange={e => setChangeType(e.target.value)}>
          <option value="percent_increase">Increase price by %</option>
          <option value="percent_decrease">Decrease price by %</option>
          <option value="set_percent_discount">Set category-wide discount %</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Value (%)</label>
        <input type="number" min="0.01" max="100" step="0.01" className="input-field"
          value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 10" required />
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
        This will update prices for all items in the selected category.
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
          {loading ? 'Applying…' : 'Apply Bulk Change'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ─── Price Edit Form ──────────────────────────────────────────────────────────
function PriceEditForm({ item, onSave, onClose, loading }) {
  const [price, setPrice] = useState(item?.price || '');
  const [err, setErr]     = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const p = parseFloat(price);
    if (!p || p <= 0) return setErr('Enter a valid price.');
    onSave({ price: p });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InlineAlert type="error" message={err} onClose={() => setErr('')} />
      <p className="text-sm text-gray-500">Updating price for: <strong>{item?.name}</strong></p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Price ($)</label>
        <input type="number" step="0.01" min="0.01" className="input-field"
          value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" required />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
          {loading ? 'Saving…' : 'Update Price'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ─── Category Form ────────────────────────────────────────────────────────────
function CategoryForm({ category, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_veg_only: false,
    sort_order: 0,
    active: true,
    ...category,
  });
  const [err, setErr] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) return setErr('Category name is required.');
    onSave({ ...form, sort_order: parseInt(form.sort_order) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InlineAlert type="error" message={err} onClose={() => setErr('')} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Burgers" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input className="input-field" value={form.description || ''} onChange={e => set('description', e.target.value)}
          placeholder="Short description (optional)" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" min="0" className="input-field" value={form.sort_order}
            onChange={e => set('sort_order', e.target.value)} placeholder="0" />
          <p className="text-xs text-gray-400 mt-1">Lower numbers appear first.</p>
        </div>
        <div className="flex flex-col justify-center gap-2 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_veg_only} onChange={e => set('is_veg_only', e.target.checked)}
              className="w-4 h-4 accent-green-500" />
            <span className="text-sm text-gray-700">🟢 Veg-only category</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 accent-orange-500" />
            <span className="text-sm text-gray-700">Active (visible on menu)</span>
          </label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
          {loading ? 'Saving…' : category?.id ? 'Update Category' : 'Create Category'}
        </button>
        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main Dashboard Page
// ═══════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
  const router = useRouter();

  // ── Authentication state ──────────────────────────────────────────
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [authError, setAuthError]         = useState('');
  const [authLoading, setAuthLoading]     = useState(false);

  // ── Active tab ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');

  // ── Toast notification ────────────────────────────────────────────
  const [toast, setToast] = useState({ type: '', msg: '' });
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: '', msg: '' }), 4000);
  };

  // ── Overview stats ────────────────────────────────────────────────
  const [stats, setStats]             = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Food items ────────────────────────────────────────────────────
  const [items, setItems]               = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch]     = useState('');
  const [itemCategory, setItemCategory] = useState('');

  // Item modals
  const [showItemForm,  setShowItemForm]  = useState(false);
  const [editItem,      setEditItem]      = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerItem,     setOfferItem]     = useState(null);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceItem,     setPriceItem]     = useState(null);
  const [showBulk,      setShowBulk]      = useState(false);
  const [formLoading,   setFormLoading]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Orders ────────────────────────────────────────────────────────
  const [orders, setOrders]                   = useState([]);
  const [ordersLoading, setOrdersLoading]     = useState(false);
  const [orderPage, setOrderPage]             = useState(1);
  const [orderPagination, setOrderPagination] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderSearch, setOrderSearch]         = useState('');
  const [statusUpdating, setStatusUpdating]   = useState(null);
  const [selectedOrder,  setSelectedOrder]    = useState(null);  // order shown in detail modal

  // ── Categories ─────────────────────────────────────────────────────
  const [adminCategories, setAdminCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState(null);

  // ─────────────────────────────────────────────────────────────────
  // Derived category names for forms
  // ─────────────────────────────────────────────────────────────────
  const adminCategoryNames = useMemo(
    () => adminCategories.filter(c => c.active).map(c => c.name),
    [adminCategories]
  );

  // ─────────────────────────────────────────────────────────────────
  // Check saved key on mount
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (stored) setAuthenticated(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Auth handlers
  // ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      localStorage.setItem(ADMIN_KEY_STORAGE, adminKeyInput);
      await adminApi.get('/admin/stats');
      setAuthenticated(true);
    } catch (err) {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      setAuthError(err.status === 403 ? 'Invalid admin key.' : (err.message || 'Connection failed.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAuthenticated(false);
    setStats(null);
    setItems([]);
    setOrders([]);
    setAdminCategories([]);
  };

  // ─────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await adminApi.get('/admin/stats');
      setStats(data.data);
    } catch (err) {
      showToast('error', 'Failed to load stats: ' + err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const params = {};
      if (itemCategory) params.category = itemCategory;
      if (itemSearch)   params.search   = itemSearch;
      const { data } = await adminApi.get('/items/admin', { params });
      
      setItems(data.data? data.data.filter(i => allowedSet.has(i.category)) : []);
    } catch (err) {
      showToast('error', 'Failed to load items: ' + err.message);
    } finally {
      setItemsLoading(false);
    }
  }, [itemCategory, itemSearch]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = { page: orderPage, limit: 15 };
      if (orderStatusFilter) params.status = orderStatusFilter;
      if (orderSearch)       params.search = orderSearch;
      const { data } = await adminApi.get('/admin/orders', { params });
      setOrders(data.data || []);
      setOrderPagination(data.pagination || null);
    } catch (err) {
      showToast('error', 'Failed to load orders: ' + err.message);
    } finally {
      setOrdersLoading(false);
    }
  }, [orderPage, orderStatusFilter, orderSearch]);
  const allowedEnv = process.env.NEXT_PUBLIC_ALLOWED_CATEGORIES;
  const allowedSet = allowedEnv
      ? new Set(allowedEnv.split(',').map(s => s.trim()).filter(Boolean))
      : [];
  const fetchAdminCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const { data } = await adminApi.get('/categories/all');
      
      setAdminCategories(allowedSet ? data.data.filter(c => allowedSet.has(c.name)) : []);
    } catch (err) {
      showToast('error', 'Failed to load categories: ' + err.message);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch when tab changes
  useEffect(() => {
    if (!authenticated) return;
    if (activeTab === 'overview')   fetchStats();
    if (activeTab === 'items')      fetchItems();
    if (activeTab === 'orders')     fetchOrders();
    if (activeTab === 'categories') fetchAdminCategories();
  }, [authenticated, activeTab]);

  // Re-fetch items on filter change
  useEffect(() => {
    if (authenticated && activeTab === 'items') fetchItems();
  }, [itemSearch, itemCategory]);

  // Re-fetch orders on filter/page change
  useEffect(() => {
    if (authenticated && activeTab === 'orders') fetchOrders();
  }, [orderPage, orderStatusFilter, orderSearch]);

  // Load categories on auth
  useEffect(() => {
    if (authenticated && adminCategories.length === 0) {
      fetchAdminCategories();
    }
  }, [authenticated]);

  // ─────────────────────────────────────────────────────────────────
  // Food Item handlers
  // ─────────────────────────────────────────────────────────────────
  const handleSaveItem = async (formData) => {
    setFormLoading(true);
    try {
      if (editItem?.id) {
        await adminApi.put(`/items/${editItem.id}`, formData);
        showToast('success', `"${formData.name}" updated.`);
      } else {
        await adminApi.post('/items', formData);
        showToast('success', `"${formData.name}" created.`);
      }
      setShowItemForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      showToast('error', 'Save failed: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await adminApi.delete(`/items/${id}`);
      showToast('success', 'Item deleted.');
      setDeleteConfirm(null);
      fetchItems();
    } catch (err) {
      showToast('error', 'Delete failed: ' + err.message);
    }
  };

  const handleToggle = async (item) => {
    try {
      const { data } = await adminApi.patch(`/items/${item.id}/toggle`);
      showToast('success', data.message);
      fetchItems();
    } catch (err) {
      showToast('error', 'Toggle failed: ' + err.message);
    }
  };

  const handleSaveOffer = async (offerData) => {
    setFormLoading(true);
    try {
      await adminApi.patch(`/items/${offerItem.id}/offer`, offerData);
      showToast('success', 'Offer applied.');
      setShowOfferForm(false);
      setOfferItem(null);
      fetchItems();
    } catch (err) {
      showToast('error', 'Offer failed: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSavePrice = async (priceData) => {
    setFormLoading(true);
    try {
      await adminApi.patch(`/items/${priceItem.id}/price`, priceData);
      showToast('success', 'Price updated.');
      setShowPriceForm(false);
      setPriceItem(null);
      fetchItems();
    } catch (err) {
      showToast('error', 'Price failed: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulkPrice = async (bulkData) => {
    setFormLoading(true);
    try {
      const { data } = await adminApi.post('/items/bulk-price', bulkData);
      showToast('success', data.message);
      setShowBulk(false);
      fetchItems();
    } catch (err) {
      showToast('error', 'Bulk update failed: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Order status handler
  // ─────────────────────────────────────────────────────────────────
  const handleOrderStatus = async (orderId, newStatus) => {
    setStatusUpdating(orderId);
    try {
      const { data: resp } = await adminApi.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      // When marked Delivered the backend sends an email — surface the result in the toast
      if (newStatus === 'Delivered' && resp?.emailSent) {
        showToast('success', `Order marked Delivered. 📧 Notification email sent to customer.`);
      } else if (newStatus === 'Delivered' && resp?.emailError) {
        showToast('error', `Status updated, but email failed: ${resp.emailError}`);
      } else {
        showToast('success', `Order updated to "${newStatus}".`);
      }
      fetchOrders();
    } catch (err) {
      showToast('error', 'Status update failed: ' + err.message);
    } finally {
      setStatusUpdating(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Category handlers
  // ─────────────────────────────────────────────────────────────────
  const handleSaveCategory = async (formData) => {
    setCatFormLoading(true);
    try {
      if (editCategory?.id) {
        await adminApi.put(`/categories/${editCategory.id}`, formData);
        showToast('success', `"${formData.name}" updated.`);
      } else {
        await adminApi.post('/categories', formData);
        showToast('success', `"${formData.name}" created.`);
      }
      setShowCategoryForm(false);
      setEditCategory(null);
      fetchAdminCategories();
    } catch (err) {
      showToast('error', 'Save failed: ' + err.message);
    } finally {
      setCatFormLoading(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    try {
      const { data } = await adminApi.delete(`/categories/${cat.id}`);
      showToast('success', data.message);
      setDeleteCatConfirm(null);
      fetchAdminCategories();
    } catch (err) {
      showToast('error', 'Delete failed: ' + err.message);
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    try {
      await adminApi.put(`/categories/${cat.id}`, { active: !cat.active });
      showToast('success', `"${cat.name}" ${!cat.active ? 'activated' : 'deactivated'}.`);
      fetchAdminCategories();
    } catch (err) {
      showToast('error', 'Toggle failed: ' + err.message);
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // RENDER: Login screen
  // ═════════════════════════════════════════════════════════════════
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Enter your admin key to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <InlineAlert type="error" message={authError} onClose={() => setAuthError('')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Key</label>
              <input type="password" className="input-field" value={adminKeyInput}
                onChange={e => setAdminKeyInput(e.target.value)} placeholder="Enter admin secret key" required autoFocus />
            </div>
            <button type="submit" disabled={authLoading} className="w-full btn-primary disabled:opacity-50">
              {authLoading ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">
            Set <code>ADMIN_SECRET_KEY</code> in backend <code>.env</code>
          </p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER: Dashboard
  // ═════════════════════════════════════════════════════════════════
  const navItems = [
    { id: 'overview', label: 'Overview',   icon: '📊' },
    { id: 'items',    label: 'Food Items', icon: '🍔' },
    { id: 'orders',   label: 'Orders',     icon: '📋' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span className="font-bold text-gray-800">FoodOrder Admin</span>
          </div>
          <button onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Toast */}
        {toast.msg && (
          <div className={`fixed top-16 right-4 z-50 max-w-sm shadow-lg rounded-xl px-4 py-3 text-sm font-medium border
            ${toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
          </div>
        )}

        {/* Tab nav */}
        <nav className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
          {navItems.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Dashboard Overview</h2>
              <button onClick={fetchStats} className="text-sm text-orange-500 hover:text-orange-600 font-medium">↻ Refresh</button>
            </div>

            {statsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-24 animate-pulse">
                    <div className="flex gap-3"><div className="w-12 h-12 bg-gray-200 rounded-xl" /><div className="flex-1 space-y-2 pt-1"><div className="h-3 bg-gray-200 rounded w-2/3" /><div className="h-5 bg-gray-200 rounded w-1/2" /></div></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Revenue"   value={`$${stats.totalRevenue.toFixed(2)}`}  icon="💰" sub={`$${stats.revenueLast30d.toFixed(2)} last 30 days`} color="green" />
                  <StatCard label="Total Orders"    value={stats.totalOrders}                     icon="📦" sub={`${stats.pendingOrders} pending`} color="blue" />
                  <StatCard label="Food Items"      value={stats.totalItems}                      icon="🍔" sub={`${stats.availableItems} available`} color="purple" />
                  <StatCard label="Pending"         value={stats.pendingOrders}                   icon="⏳" sub="Awaiting action" color="yellow" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Confirmed"  value={stats.confirmedOrders}                    icon="✔️" color="purple" />
                  <StatCard label="Preparing"  value={stats.preparingOrders}                    icon="👨‍🍳" color="blue" />
                  <StatCard label="Delivered"  value={stats.deliveredOrders}                    icon="✅" color="green" />
                  <StatCard label="Cancelled"  value={stats.cancelledOrders}                    icon="❌" color="red" />
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => { setActiveTab('items'); setEditItem(null); setShowItemForm(true); }}
                      className="btn-primary text-sm px-4 py-2">+ Add Food Item</button>
                    <button onClick={() => { setActiveTab('items'); setShowBulk(true); }}
                      className="btn-secondary text-sm px-4 py-2">📈 Bulk Price Update</button>
                    <button onClick={() => setActiveTab('orders')}
                      className="btn-secondary text-sm px-4 py-2">📋 Manage Orders</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <p className="text-4xl mb-2">📊</p>
                <p>No data. <button onClick={fetchStats} className="text-orange-500 font-medium">Retry</button></p>
              </div>
            )}
          </div>
        )}

        {/* ── FOOD ITEMS TAB ───────────────────────────────────────── */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h2 className="text-xl font-bold text-gray-800">Food Items</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowBulk(true)} className="btn-secondary text-sm px-3 py-2">📈 Bulk Price</button>
                <button onClick={() => { setEditItem(null); setShowItemForm(true); }} className="btn-primary text-sm px-3 py-2">+ Add Item</button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <input className="input-field max-w-xs text-sm" placeholder="Search by name…"
                value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
              <select className="input-field w-auto text-sm" value={itemCategory} onChange={e => setItemCategory(e.target.value)}>
                <option value="">All Categories</option>
                {adminCategoryNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={fetchItems} className="text-sm text-orange-500 hover:text-orange-600 font-medium">↻ Refresh</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {itemsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading items…</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-3xl mb-2">🍽️</p><p>No items found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Item</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Price</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Discount</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-lg">🍔</div>
                              )}
                              <div>
                                <p className="font-medium text-gray-800">{item.name}</p>
                                {item.offer_label && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">{item.offer_label}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.category}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-800">${parseFloat(item.price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            {parseFloat(item.discount_percent || 0) > 0
                              ? <span className="text-green-600 font-medium">{item.discount_percent}%</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleToggle(item)}
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors
                                ${(item.available ?? item.is_available)
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                              {(item.available ?? item.is_available) ? 'Available' : 'Unavailable'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setPriceItem(item); setShowPriceForm(true); }} title="Update price"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-base">💲</button>
                              <button onClick={() => { setOfferItem(item); setShowOfferForm(true); }} title="Apply offer"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors text-base">🏷️</button>
                              <button onClick={() => { setEditItem(item); setShowItemForm(true); }} title="Edit"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors text-base">✏️</button>
                              <button onClick={() => setDeleteConfirm(item.id)} title="Delete"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-base">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ───────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h2 className="text-xl font-bold text-gray-800">Orders</h2>
              <button onClick={fetchOrders} className="text-sm text-orange-500 hover:text-orange-600 font-medium">↻ Refresh</button>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <input className="input-field max-w-xs text-sm" placeholder="Search by order ID…"
                value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }} />
              <select className="input-field w-auto text-sm" value={orderStatusFilter}
                onChange={e => { setOrderStatusFilter(e.target.value); setOrderPage(1); }}>
                <option value="">All Statuses</option>
                {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {ordersLoading ? (
                <div className="p-8 text-center text-gray-500">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-3xl mb-2">📋</p><p>No orders found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Order ID</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Items</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            {/* Clickable order ID — opens the detail modal */}
                            <button
                              onClick={() => setSelectedOrder(order)}
                              title="View order details"
                              className="group flex items-center gap-1.5 text-left hover:text-orange-600 transition-colors">
                              <span className="font-mono text-xs bg-gray-100 group-hover:bg-orange-50 group-hover:text-orange-700 px-2 py-0.5 rounded transition-colors">
                                {order['orderId'] || order.id}
                              </span>
                              <span className="text-gray-400 group-hover:text-orange-500 text-sm leading-none" title="View details">ℹ️</span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {/* Column names are camelCase as defined in 01_schema.sql */}
                            <p className="font-medium text-gray-800 truncate max-w-[130px]">{order['customerName']}</p>
                            <p className="text-gray-400 text-xs truncate max-w-[130px]">{order['customerEmail']}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {(order.order_items || []).length} item{(order.order_items || []).length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">
                            {/* "totalPrice" is the column name in DB — not "total_amount" */}
                            ${parseFloat(order['totalPrice'] || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center"><Badge status={order.status} /></td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {order['createdAt']
                              ? new Date(order['createdAt']).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select value={order.status}
                              onChange={e => handleOrderStatus(order.id, e.target.value)}
                              disabled={statusUpdating === order.id}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white disabled:opacity-50">
                              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {orderPagination && orderPagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {Math.min((orderPage - 1) * 15 + 1, orderPagination.total)}–{Math.min(orderPage * 15, orderPagination.total)} of {orderPagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    <span className="px-3 py-1.5 text-sm text-gray-600">{orderPage} / {orderPagination.pages}</span>
                    <button onClick={() => setOrderPage(p => Math.min(orderPagination.pages, p + 1))} disabled={orderPage >= orderPagination.pages}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CATEGORIES TAB ──────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h2 className="text-xl font-bold text-gray-800">Categories</h2>
              <div className="flex gap-2">
                <button onClick={fetchAdminCategories} className="text-sm text-orange-500 hover:text-orange-600 font-medium">↻ Refresh</button>
                <button onClick={() => { setEditCategory(null); setShowCategoryForm(true); }} className="btn-primary text-sm px-3 py-2">+ Add Category</button>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Categories are dynamic — add any category here and it will immediately appear in the menu filter and food item forms.
              If a category has food items assigned, deleting it will deactivate it instead.
            </p>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {categoriesLoading ? (
                <div className="p-8 text-center text-gray-500">Loading categories…</div>
              ) : adminCategories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-3xl mb-2">🏷️</p>
                  <p>No categories yet. <button onClick={() => { setEditCategory(null); setShowCategoryForm(true); }} className="text-orange-500 font-medium">Add one</button></p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Veg Only</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Sort</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {adminCategories.map(cat => (
                        <tr key={cat.id} className={`hover:bg-gray-50/50 transition-colors ${!cat.active ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-800">{cat.name}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                            {cat.description || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cat.is_veg_only ? <span className="text-green-600 font-medium">🟢 Yes</span> : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{cat.sort_order ?? 0}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleToggleCategoryActive(cat)}
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors
                                ${cat.active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                              {cat.active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => { setEditCategory(cat); setShowCategoryForm(true); }}
                                title="Edit" className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors text-base">✏️</button>
                              <button onClick={() => setDeleteCatConfirm(cat)}
                                title="Delete" className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-base">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ───────────────────────────────────────── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={async (orderId, newStatus) => {
            await handleOrderStatus(orderId, newStatus);
            // Update the in-modal status badge immediately after save
            setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
          }}
          statusUpdating={statusUpdating}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showItemForm && (
        <Modal title={editItem?.id ? 'Edit Food Item' : 'Add New Food Item'} onClose={() => { setShowItemForm(false); setEditItem(null); }}>
          <FoodItemForm item={editItem} onSave={handleSaveItem} onClose={() => { setShowItemForm(false); setEditItem(null); }} loading={formLoading} categories={adminCategoryNames} />
        </Modal>
      )}

      {showOfferForm && offerItem && (
        <Modal title="Apply Offer" onClose={() => { setShowOfferForm(false); setOfferItem(null); }}>
          <OfferForm item={offerItem} onSave={handleSaveOffer} onClose={() => { setShowOfferForm(false); setOfferItem(null); }} loading={formLoading} />
        </Modal>
      )}

      {showPriceForm && priceItem && (
        <Modal title="Update Price" onClose={() => { setShowPriceForm(false); setPriceItem(null); }}>
          <PriceEditForm item={priceItem} onSave={handleSavePrice} onClose={() => { setShowPriceForm(false); setPriceItem(null); }} loading={formLoading} />
        </Modal>
      )}

      {showBulk && (
        <Modal title="Bulk Price Update" onClose={() => setShowBulk(false)}>
          <BulkPriceForm onSave={handleBulkPrice} onClose={() => setShowBulk(false)} loading={formLoading} categories={adminCategoryNames} />
        </Modal>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this item?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteItem(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <Modal title={editCategory?.id ? 'Edit Category' : 'Add New Category'} onClose={() => { setShowCategoryForm(false); setEditCategory(null); }}>
          <CategoryForm category={editCategory} onSave={handleSaveCategory} onClose={() => { setShowCategoryForm(false); setEditCategory(null); }} loading={catFormLoading} />
        </Modal>
      )}

      {deleteCatConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">🗑️</p>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete "{deleteCatConfirm.name}"?</h3>
            <p className="text-sm text-gray-500 mb-2">
              If food items use this category it will be <strong>deactivated</strong> instead of deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteCategory(deleteCatConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors">
                Delete / Deactivate
              </button>
              <button onClick={() => setDeleteCatConfirm(null)} className="flex-1 btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
