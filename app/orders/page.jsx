'use client';

import { useState, useEffect, useCallback } from 'react';
import Link                from 'next/link';
import { ordersApi }       from '@/lib/api';
import OrderStatusBadge    from '@/components/OrderStatusBadge';
import LoadingSpinner      from '@/components/LoadingSpinner';
import { Search, RefreshCw, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';

const STATUSES = ['All', 'Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];

export default function OrdersPage() {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [status,    setStatus]    = useState('All');
  const [email,     setEmail]     = useState('');
  const [search,    setSearch]    = useState('');
  const [expanded,  setExpanded]  = useState({});
  const [page,      setPage]      = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (status !== 'All') params.status = status;
      if (email.trim())     params.email  = email.trim();
      const res = await ordersApi.getAll(params);
      setOrders(res.data || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, email, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = search.trim()
    ? orders.filter(o =>
        o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const formatDate = (ts) =>
    new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Orders</h1>
        <button
          onClick={fetchOrders}
          className="btn-secondary flex items-center gap-2 text-sm py-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        {/* Order ID / Name search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search by Order ID or name…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        {/* Email filter */}
        <input
          type="email" placeholder="Filter by email…"
          value={email} onChange={e => { setEmail(e.target.value); setPage(1); }}
          className="input-field sm:w-56"
        />
        {/* Status filter */}
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input-field sm:w-40"
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && <LoadingSpinner message="Loading orders…" />}

      {error && (
        <div className="card p-6 text-center">
          <p className="text-red-500 font-medium">⚠️ {error}</p>
        </div>
      )}

      {!loading && !error && filteredOrders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No orders found</p>
          <p className="text-sm mt-1">Try adjusting your filters.</p>
        </div>
      )}

      {/* Orders Table */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <div key={order.id} className="card overflow-hidden">

              {/* Order Header Row */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Link
                      href={`/orders/${order.orderId}`}
                      className="font-mono font-bold text-orange-600 hover:underline text-sm"
                    >
                      {order.orderId}
                    </Link>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-gray-600">{order.customerName} · {order.customerEmail}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg text-gray-900">
                    ${parseFloat(order.totalPrice).toFixed(2)}
                  </span>
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    {expanded[order.id]
                      ? <ChevronUp className="w-5 h-5" />
                      : <ChevronDown className="w-5 h-5" />
                    }
                  </button>
                </div>
              </div>

              {/* Expandable Items */}
              {expanded[order.id] && order.order_items && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                  <ul className="space-y-1.5">
                    {order.order_items.map(item => (
                      <li key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.food_items?.name || `Item ${item.foodItemId.slice(0,8)}`}
                          <span className="text-gray-400 ml-1">×{item.quantity}</span>
                        </span>
                        <span className="font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span className="text-orange-500">${parseFloat(order.totalPrice).toFixed(2)}</span>
                  </div>
                  <Link
                    href={`/orders/${order.orderId}`}
                    className="mt-3 inline-block text-sm text-orange-500 hover:underline font-medium"
                  >
                    View full details →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="btn-secondary py-1.5 text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages} · {pagination.total} orders
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="btn-secondary py-1.5 text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
