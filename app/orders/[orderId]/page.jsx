'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link               from 'next/link';
import Image              from 'next/image';
import { ordersApi }      from '@/lib/api';
import OrderStatusBadge   from '@/components/OrderStatusBadge';
import LoadingSpinner     from '@/components/LoadingSpinner';
import ProtectedRoute     from '@/components/ProtectedRoute';
import { ArrowLeft, Phone, Mail, MapPin, Clock, Package } from 'lucide-react';

const STATUS_TIMELINE = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered'];

function OrderDetailContent() {
  const { orderId } = useParams();
  const router      = useRouter();

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await ordersApi.getById(orderId);
        setOrder(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetch();
  }, [orderId]);

  const formatDate = (ts) =>
    new Date(ts).toLocaleString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const currentStatusIdx = STATUS_TIMELINE.indexOf(order?.status);

  if (loading) return <LoadingSpinner message="Loading order details…" />;

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Order not found</h2>
        <p className="text-gray-400 text-sm mb-1">{error || `Order "${orderId}" does not exist.`}</p>
        <button onClick={() => router.push('/orders')} className="btn-primary mt-5 inline-block">
          ← Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="text-gray-400 hover:text-orange-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono font-bold text-xl text-orange-600">{order.orderId}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status Timeline */}
          {order.status !== 'Cancelled' && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Order Progress</h2>
              <div className="flex items-center">
                {STATUS_TIMELINE.map((s, idx) => {
                  const past    = idx <= currentStatusIdx;
                  const current = idx === currentStatusIdx;
                  const last    = idx === STATUS_TIMELINE.length - 1;
                  return (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs
                          ${current ? 'border-orange-500 bg-orange-500 text-white'
                            : past ? 'border-orange-400 bg-orange-100 text-orange-600'
                            : 'border-gray-200 bg-white text-gray-400'}`}
                        >
                          {past && !current ? '✓' : idx + 1}
                        </div>
                        <span className={`mt-1 text-[10px] text-center leading-tight hidden sm:block
                          ${current ? 'text-orange-600 font-semibold' : past ? 'text-gray-500' : 'text-gray-300'}`}
                        >
                          {s}
                        </span>
                      </div>
                      {!last && (
                        <div className={`flex-1 h-0.5 mx-1 ${idx < currentStatusIdx ? 'bg-orange-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              Items Ordered ({order.order_items?.length || 0})
            </h2>
            <div className="space-y-4">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.food_items?.imageUrl ? (
                      <Image
                        src={item.food_items.imageUrl}
                        alt={item.food_items.name}
                        fill className="object-cover" unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.food_items?.name}</p>
                    <p className="text-xs text-gray-400">{item.food_items?.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      ${parseFloat(item.price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Delivery</span><span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-orange-500">${parseFloat(order.totalPrice).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Customer Details */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Customer Details</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-medium text-gray-900 w-5 mt-0.5">👤</span>
                <span>{order.customerName}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="break-all">{order.customerEmail}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{order.customerPhone}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{order.deliveryAddress}</span>
              </li>
            </ul>
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="card p-5 bg-amber-50 border-amber-100">
              <h2 className="font-semibold text-gray-800 mb-2 text-sm">Special Instructions</h2>
              <p className="text-sm text-gray-700">{order.specialInstructions}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Timeline</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-gray-600">
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-500 w-16 flex-shrink-0">Placed</span>
                {formatDate(order.createdAt)}
              </li>
              {order.updatedAt !== order.createdAt && (
                <li className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-500 w-16 flex-shrink-0">Updated</span>
                  {formatDate(order.updatedAt)}
                </li>
              )}
            </ul>
          </div>

          {/* Support */}
          <div className="card p-5 bg-orange-50 border-orange-100">
            <h2 className="font-semibold text-orange-800 mb-2 text-sm">Need Help?</h2>
            <p className="text-xs text-orange-700 mb-3">
              Contact our support team and quote your Order ID.
            </p>
            <a href="tel:+15551234567" className="flex items-center gap-1.5 text-sm text-orange-600 hover:underline">
              <Phone className="w-3.5 h-3.5" /> +1 (555) 123-4567
            </a>
            <a href="mailto:support@foodorder.app" className="flex items-center gap-1.5 text-sm text-orange-600 hover:underline mt-1">
              <Mail className="w-3.5 h-3.5" /> support@foodorder.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <ProtectedRoute>
      <OrderDetailContent />
    </ProtectedRoute>
  );
}
