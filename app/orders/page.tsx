'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { Order, OrderItem } from '@/types';

const G = '#166534';

const STEPS = [
  { key: 'pending',          label: 'Pending',      icon: '📋' },
  { key: 'paid',             label: 'Accepted',     icon: '👍' },
  { key: 'dispatched',       label: 'Dispatched',   icon: '🚚' },
  { key: 'out_for_delivery', label: 'On the Way',   icon: '📍' },
  { key: 'confirmed',        label: 'Delivered',    icon: '🏠' },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, reserved: 0, paid: 0, accepted: 1, dispatched: 2, out_for_delivery: 3, confirmed: 4,
};

const EMOJI_MAP: Record<string, string> = {
  milk: '🥛', bread: '🍞', egg: '🥚', eggs: '🥚', rice: '🍚', oil: '🫙',
  water: '💧', juice: '🧃', coffee: '☕', tea: '🍵', sugar: '🍬', salt: '🧂',
  butter: '🧈', cheese: '🧀', yogurt: '🥛', fruit: '🍎', vegetable: '🥦',
  chicken: '🍗', meat: '🥩', fish: '🐟',
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '🛒';
}

function ProductThumb({ image, name }: { image?: string; name: string }) {
  const [err, setErr] = useState(false);
  const BASE_URL = 'http://localhost:8000'; 

  const getFullImageUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    // 1. Agar path mein pehle se '/static' nahi hai, toh usey joḍein
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Agar aapka backend images ko /static/ folder mein rakhta hai:
    if (!cleanPath.startsWith('/static')) {
        cleanPath = `/static${cleanPath}`;
    }

    return `${BASE_URL}${cleanPath}`;
  };

  const finalSrc = getFullImageUrl(image);

  // Debugging: Ye aapke browser console (F12) mein dikhayega ki URL kya ban raha hai
  useEffect(() => {
    if (finalSrc) console.log("Final Image URL:", finalSrc);
  }, [finalSrc]);

  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm transition-transform active:scale-95">
      {finalSrc && !err ? (
        <img 
          src={finalSrc} 
          alt={name} 
          className="w-full h-full object-cover" 
          onError={(e) => {
            console.error("❌ Image Failed to load:", finalSrc);
            setErr(true);
          }} 
        />
      ) : (
        <div className="flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 w-full h-full border border-orange-200/50">
           <span className="text-xl filter drop-shadow-sm">{getEmoji(name)}</span>
        </div>
      )}
    </div>
  );
}

function StatusTracker({ status }: { status: string }) {
  if (status === 'cancelled' || status === 'failed') {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-red-50 text-red-600">
        <span>❌</span>
        <span className="font-medium">{status === 'cancelled' ? 'Order Cancelled' : 'Order Failed'}</span>
      </div>
    );
  }

  const activeIdx = STATUS_INDEX[status] ?? 0;

  return (
    <div className="mt-3 relative">
      <div className="flex items-start justify-between relative">
        <div
          className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"
          style={{ zIndex: 0, margin: '0 16px' }}
        />
        <div
          className="absolute top-4 left-0 h-0.5 transition-all duration-700"
          style={{
            zIndex: 0,
            marginLeft: 16,
            backgroundColor: G,
            width: activeIdx === 0 ? 0 : `calc(${(activeIdx / (STEPS.length - 1)) * 100}% - 16px)`,
          }}
        />
        {STEPS.map((step, i) => {
          const done = i <= activeIdx;
          const active = i === activeIdx;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 relative z-10" style={{ flex: 1 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                style={{
                  backgroundColor: done ? G : '#fff',
                  borderColor: done ? G : '#e5e7eb',
                  color: done ? '#fff' : '#9ca3af',
                  boxShadow: active ? '0 0 0 3px #BBF7D0' : 'none',
                }}
              >
                {done && i < activeIdx ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              <span
                className="text-xs text-center leading-tight font-medium"
                style={{ color: done ? '#374151' : '#9ca3af' }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const activeIdx = STATUS_INDEX[order.status] ?? 0;

  const timelineSteps = [
    { label: 'Order Placed',       done: true },
    { label: 'Accepted by Vendor', done: activeIdx >= 1 },
    { label: 'Dispatched',         done: activeIdx >= 2 },
    { label: 'Out for Delivery',   done: activeIdx >= 3 },
    { label: 'Delivered',          done: activeIdx >= 4 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">Order #{order.id}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(order.created_at).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Items</p>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item: OrderItem, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <ProductThumb image={item.product_image} name={item.product_name ?? `Product ${item.product_id}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product_name ?? `Product #${item.product_id}`}
                      </p>
                      <p className="text-xs text-gray-400">₹{item.unit_price.toFixed(2)} × {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-sm text-gray-900 shrink-0">
                      ₹{(item.unit_price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Item details not available.</p>
            )}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between font-bold">
              <span className="text-gray-700">Order Total</span>
              <span style={{ color: G }}>₹{order.total_price.toFixed(2)}</span>
            </div>
            {order.vendor_name && (
              <p className="text-xs text-gray-400 mt-1">
                Fulfilled by <span className="font-medium text-gray-600">{order.vendor_name}</span>
                {order.vendor_city && ` · ${order.vendor_city}`}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Delivery Timeline</p>
            <div className="space-y-2.5">
              {timelineSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all"
                    style={{
                      backgroundColor: step.done ? G : '#fff',
                      borderColor: step.done ? G : '#e5e7eb',
                    }}
                  >
                    {step.done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm"
                    style={{ color: step.done ? '#374151' : '#9ca3af', fontWeight: step.done ? 500 : 400 }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusOrderCard({ order, onViewOrder }: { order: Order; onViewOrder: (order: Order) => void }) {
  const date = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const time = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  // Items Logic: Pehla item main heading ke liye
  const firstItem = order.items?.[0];
  const previewItems = order.items?.slice(0, 3) ?? [];
  const totalItems = order.items?.length ?? 0;
  const extraCount = totalItems - 1; // Pehle item ke baad kitne bache

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all duration-300">
      {/* Header: Product Name takes Priority */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-gray-900 text-base sm:text-lg leading-tight truncate">
            {firstItem?.product_name || `Order #${order.id}`}
            {extraCount > 0 && (
              <span className="text-sm text-gray-400 font-medium italic"> +{extraCount} more</span>
            )}
          </h3>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
               #{order.id}
             </span>
             <p className="text-[11px] text-gray-400 font-medium">{date} • {time}</p>
          </div>
        </div>
        
        {/* Source Badge */}
        <span
          className="text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider shrink-0"
          style={
            order.source === 'vendor'
              ? { backgroundColor: '#F3E8FF', color: '#7E22CE', border: '1px solid #E9D5FF' }
              : { backgroundColor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }
          }
        >
          {order.source === 'vendor' ? '🏪 Local Store' : '🏭 Warehouse'}
        </span>
      </div>

      {/* Product Thumbnails with Better Layout */}
      {previewItems.length > 0 && (
        <div className="flex items-center gap-2 mb-4 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
          {previewItems.map((item, i) => (
            <ProductThumb key={i} image={item.product_image} name={item.product_name ?? ''} />
          ))}
          {totalItems > 3 && (
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-200 shadow-sm">
              +{totalItems - 3}
            </div>
          )}
        </div>
      )}

      {/* Vendor Info with Icon */}
      {order.vendor_name && (
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs text-gray-500">
            Sold by <span className="font-bold text-gray-700">{order.vendor_name}</span>
          </p>
        </div>
      )}

      {/* Status Tracker Section */}
      <div className="bg-gray-50/30 rounded-xl p-1 mb-2">
         <StatusTracker status={order.status} />
      </div>

      {/* Footer: Price & Action */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-0.5">Bill Amount</p>
          <span className="font-black text-xl text-gray-900 tracking-tight">₹{order.total_price.toFixed(2)}</span>
        </div>
        <button
          onClick={() => onViewOrder(order)}
          className="text-xs font-bold px-5 py-2.5 rounded-xl bg-white border-2 border-gray-100 text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
        >
          Order Details
        </button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const fetchOrders = useCallback(async (skip = 0, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.orders.list({ skip, limit: PAGE_SIZE });
      setOrders(res.orders);
      setTotal(res.total);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchOrders(page * PAGE_SIZE);
  }, [user, page, fetchOrders]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchOrders(page * PAGE_SIZE, true), 30000);
    return () => clearInterval(interval);
  }, [user, page, fetchOrders]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <span className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: G }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && <span className="text-sm text-gray-400">{total} total</span>}
          <button
            onClick={() => fetchOrders(page * PAGE_SIZE)}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 mb-6 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
          <button onClick={() => fetchOrders(page * PAGE_SIZE)} className="ml-auto font-medium hover:underline text-red-600">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
                <div className="h-6 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="flex gap-2 mb-3">
                {[0, 1, 2].map((j) => <div key={j} className="w-10 h-10 bg-gray-100 rounded-lg" />)}
              </div>
              <div className="flex justify-between mt-4 gap-2">
                {[0, 1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-8 h-8 bg-gray-100 rounded-full" />
                    <div className="h-2.5 bg-gray-100 rounded w-10" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-6xl mb-4">📦</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
          <p className="text-gray-400 text-sm mb-6">Your order history will appear here after your first purchase.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
            style={{ backgroundColor: G }}
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <StatusOrderCard key={order.id} order={order} onViewOrder={setModalOrder} />
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-sm text-gray-400">
                {page + 1} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {modalOrder && (
        <OrderDetailModal order={modalOrder} onClose={() => setModalOrder(null)} />
      )}
    </div>
  );
}
