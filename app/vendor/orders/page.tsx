'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { Order, VendorProfile } from '@/types';

const G = '#166534';
const GOLD = '#D97706';
const BLUE = '#2563EB';
const RED = '#DC2626';

type Tab = 'pending' | 'ongoing' | 'completed' | 'cancelled';

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  paid:             { label: 'New Order',        bg: '#FEF3C7', color: '#92400E' },
  accepted:         { label: 'Accepted',         bg: '#D1FAE5', color: '#065F46' },
  dispatched:       { label: 'Dispatched',       bg: '#EDE9FE', color: '#5B21B6' },
  out_for_delivery: { label: 'Out for Delivery', bg: '#DBEAFE', color: '#1D4ED8' },
  confirmed:        { label: 'Delivered',        bg: '#D1FAE5', color: '#065F46' },
  cancelled:        { label: 'Cancelled',        bg: '#F3F4F6', color: '#6B7280' },
  failed:           { label: 'Failed',           bg: '#FEE2E2', color: '#991B1B' },
  pending:          { label: 'Pending',          bg: '#F3F4F6', color: '#6B7280' },
  reserved:         { label: 'Awaiting Payment', bg: '#DBEAFE', color: '#1D4ED8' },
};

function DetailsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
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
          {/* Customer Info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Customer</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {/* Name */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-800">
                  {order.customer_name ?? 'Name not available'}
                </span>
              </div>
              {/* Phone — clickable */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {order.customer_phone ? (
                  <a href={`tel:${order.customer_phone}`} className="text-sm font-medium" style={{ color: '#2563EB' }}>
                    {order.customer_phone}
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">Phone not provided</span>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Delivery Address</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {/* House / Street */}
              {order.delivery_address && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-sm text-gray-700">{order.delivery_address}</span>
                </div>
              )}
              {/* Landmark */}
              {order.delivery_landmark && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="text-sm text-gray-500">Near {order.delivery_landmark}</span>
                </div>
              )}
              {/* City / State / Pincode */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-700">
                  {[order.delivery_city, order.delivery_state, order.delivery_pincode].filter(Boolean).join(', ') || (order.customer_address ?? 'Address not provided')}
                </span>
              </div>
              {/* Map link */}
              {order.delivery_lat && order.delivery_lon && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold mt-1 w-fit px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  View on Map
                </a>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Order Items</p>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">🛒</span>
                      )}
                    </div>
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
              <p className="text-sm text-gray-400">
                {order.items_count != null ? `${order.items_count} item(s)` : 'Item details not available.'}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-gray-100 pt-4 flex justify-between font-bold">
            <span className="text-gray-700">Order Total</span>
            <span style={{ color: G }}>₹{order.total_price.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  order: Order;
  onStatusChange: (id: number, status: string) => void;
  actionLoading: boolean;
  onViewDetails: (order: Order) => void;
}

function VendorOrderCard({ order, onStatusChange, actionLoading, onViewDetails }: CardProps) {
  const cfg = STATUS_CFG[order.status] ?? { label: order.status, bg: '#F3F4F6', color: '#6B7280' };
  const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const time = new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const previewItems = order.items?.slice(0, 3) ?? [];
  const extraCount = (order.items?.length ?? 0) - previewItems.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Order header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900">Order #{order.id}</p>
          <p className="text-xs text-gray-400">{date} · {time}</p>
          {order.customer_name && (
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{order.customer_name}</p>
          )}
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {order.status === 'paid' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
          )}
          {cfg.label}
        </span>
      </div>

      {/* Delivery block */}
      {(order.customer_phone || order.delivery_city || order.delivery_pincode) && (
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
          {order.customer_phone && (
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${order.customer_phone}`} className="text-xs font-semibold" style={{ color: '#2563EB' }}>
                {order.customer_phone}
              </a>
            </div>
          )}
          {(order.delivery_city || order.delivery_pincode) && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs text-gray-600 truncate">
                  {[order.delivery_city, order.delivery_pincode].filter(Boolean).join(' – ')}
                </span>
              </div>
              {order.delivery_lat && order.delivery_lon && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
                >
                  📍 Map
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Product thumbnails + names */}
      {previewItems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {previewItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">🛒</span>
                )}
              </div>
              <span className="text-xs text-gray-700 truncate flex-1">
                {item.product_name ?? `Product #${item.product_id}`}
              </span>
              <span className="text-xs text-gray-400 shrink-0">×{item.quantity}</span>
            </div>
          ))}
          {extraCount > 0 && (
            <p className="text-xs text-gray-400 pl-10">+{extraCount} more item{extraCount > 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between border-t border-gray-50 pt-2">
        <span className="text-sm text-gray-500">
          {order.items_count != null
            ? `${order.items_count} item${order.items_count !== 1 ? 's' : ''}`
            : order.items
            ? `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`
            : ''}
        </span>
        <span className="font-bold text-base" style={{ color: G }}>₹{order.total_price.toFixed(2)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(order)}
          className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>

        {/* paid → accept / reject */}
        {order.status === 'paid' && (
          <>
            <button
              onClick={() => onStatusChange(order.id, 'cancelled')}
              disabled={actionLoading}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: RED }}
            >
              {actionLoading ? <Spinner /> : 'Reject'}
            </button>
            <button
              onClick={() => onStatusChange(order.id, 'accepted')}
              disabled={actionLoading}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: GOLD }}
            >
              {actionLoading ? <Spinner /> : 'Accept'}
            </button>
          </>
        )}

        {/* accepted → dispatched */}
        {order.status === 'accepted' && (
          <button
            onClick={() => onStatusChange(order.id, 'dispatched')}
            disabled={actionLoading}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: '#7C3AED' }}
          >
            {actionLoading ? <Spinner /> : '🚚 Mark Dispatched'}
          </button>
        )}

        {/* dispatched → out_for_delivery */}
        {order.status === 'dispatched' && (
          <button
            onClick={() => onStatusChange(order.id, 'out_for_delivery')}
            disabled={actionLoading}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: BLUE }}
          >
            {actionLoading ? <Spinner /> : '📍 Out for Delivery'}
          </button>
        )}

        {/* out_for_delivery → confirmed */}
        {order.status === 'out_for_delivery' && (
          <button
            onClick={() => onStatusChange(order.id, 'confirmed')}
            disabled={actionLoading}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: G }}
          >
            {actionLoading ? <Spinner /> : '✅ Mark Delivered'}
          </button>
        )}

        {/* confirmed — no action */}
        {order.status === 'confirmed' && (
          <div
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center"
            style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
          >
            ✅ Delivered
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
  );
}

export default function VendorOrdersPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ordersData, profileData] = await Promise.all([
        api.vendor.getOrders({ limit: 100 }),
        api.vendor.getProfile().catch(() => null),
      ]);
      setOrders(ordersData);
      if (profileData) setProfile(profileData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [load]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setActionLoading(orderId);
    try {
      await api.vendor.updateOrderStatus(orderId, newStatus);
      await load(true);
      if (newStatus === 'accepted') setTab('ongoing');
      if (newStatus === 'cancelled') setTab('cancelled');
      if (newStatus === 'dispatched' || newStatus === 'out_for_delivery' || newStatus === 'confirmed') setTab('ongoing');
      if (newStatus === 'confirmed') setTab('completed');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingOrders   = orders.filter((o) => o.status === 'paid');
  const ongoingOrders   = orders.filter((o) => ['accepted', 'dispatched', 'out_for_delivery'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'confirmed');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
  const hasPendingAlert = pendingOrders.length > 0;

  const visibleOrders =
    tab === 'pending'   ? pendingOrders :
    tab === 'ongoing'   ? ongoingOrders :
    tab === 'cancelled' ? cancelledOrders :
    completedOrders;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending',   label: 'Pending',   count: pendingOrders.length },
    { key: 'ongoing',   label: 'Ongoing',   count: ongoingOrders.length },
    { key: 'completed', label: 'Completed', count: completedOrders.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledOrders.length },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Orders</h1>
          {profile?.city && (
            <p className="text-sm text-gray-500 mt-0.5">
              Serving{' '}
              <span className="font-semibold" style={{ color: G }}>{profile.city}</span>
            </p>
          )}
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-0">
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          const showDot = key === 'pending' && hasPendingAlert;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all rounded-t-xl"
              style={{
                color: active ? G : '#6B7280',
                borderBottom: active ? `2px solid ${G}` : '2px solid transparent',
                backgroundColor: active ? '#F0FDF4' : 'transparent',
              }}
            >
              {showDot && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              )}
              {label}
              {count > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center"
                  style={{
                    backgroundColor: active ? G : '#E5E7EB',
                    color: active ? '#fff' : '#374151',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: G }} />
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-gray-700">
            {tab === 'pending'   ? 'No new orders' :
             tab === 'ongoing'   ? 'No active orders' :
             tab === 'cancelled' ? 'No cancelled orders' :
             'No completed orders'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === 'pending' ? 'New customer orders will appear here' : ''}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleOrders.map((o) => (
            <VendorOrderCard
              key={o.id}
              order={o}
              onStatusChange={handleStatusChange}
              actionLoading={actionLoading === o.id}
              onViewDetails={setDetailsOrder}
            />
          ))}
        </div>
      )}

      {detailsOrder && (
        <DetailsModal order={detailsOrder} onClose={() => setDetailsOrder(null)} />
      )}
    </div>
  );
}
