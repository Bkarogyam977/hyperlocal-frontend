'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import type { AdminOrder, AdminOrderDetail } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-gray-100 text-gray-600',
  reserved:         'bg-blue-50 text-blue-700',
  paid:             'bg-yellow-50 text-yellow-700',
  accepted:         'bg-cyan-50 text-cyan-700',
  dispatched:       'bg-indigo-50 text-indigo-700',
  out_for_delivery: 'bg-teal-50 text-teal-700',
  confirmed:        'bg-green-50 text-green-700',
  cancelled:        'bg-red-50 text-red-500',
  failed:           'bg-red-50 text-red-500',
};

const STATUSES = ['', 'pending', 'reserved', 'paid', 'accepted', 'dispatched', 'out_for_delivery', 'confirmed', 'cancelled'];

// ── Routing icon: shows flow User→Vendor (direct) or User→!→Warehouse (fallback)

function SourceIcon({ source }: { source: string }) {
  const Arrow = () => (
    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
  if (source === 'vendor') {
    return (
      <div className="flex items-center gap-1" title="Direct: Customer → Vendor">
        <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[9px] font-black">U</span>
        <Arrow />
        <span className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-[9px] font-black">V</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1" title="Fallback: Customer → ! → Warehouse">
      <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[9px] font-black">U</span>
      <Arrow />
      <span className="w-4 h-4 bg-red-100 rounded flex items-center justify-center text-red-500 text-[9px] font-black">!</span>
      <Arrow />
      <span className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-[9px] font-black">W</span>
    </div>
  );
}

// ── Side Drawer ────────────────────────────────────────────────────────────────

function OrderDrawer({
  order,
  loading,
  onClose,
}: {
  order: AdminOrderDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          {order ? (
            <div>
              <h2 className="text-xl font-bold text-gray-900">Order #{order.id}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-7 w-36 bg-gray-100 rounded-lg animate-pulse" />
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : order ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── Customer ── */}
            <section>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Customer</h3>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{order.customer_name ?? '—'}</p>
                    <p className="text-sm text-gray-500">{order.customer_phone ?? 'No phone on record'}</p>
                  </div>
                </div>
                {(order.delivery_address || order.delivery_city) && (
                  <div className="flex items-start gap-3 pt-3 border-t border-gray-200">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {[order.delivery_address, order.delivery_landmark, order.delivery_city, order.delivery_state, order.delivery_pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Products ── */}
            <section>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Products</h3>
              <div className="bg-gray-50 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-[10px] text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left">Product</th>
                      <th className="px-4 py-2.5 text-center">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {item.product_name ?? `Product #${item.product_id}`}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-500">₹{fmt(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          ₹{fmt(item.unit_price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-100/70">
                      <td colSpan={3} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Order Total</td>
                      <td className="px-4 py-3 text-right font-black text-gray-900">₹{fmt(order.total_price)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* ── Routing Trace ── */}
            <section>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Routing Trace</h3>

              {order.source === 'vendor' ? (
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Customer</span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold">
                      {order.vendor_name ?? 'Vendor'}
                    </span>
                    {order.vendor_city && (
                      <span className="text-xs text-purple-500">({order.vendor_city})</span>
                    )}
                  </div>
                  <p className="text-xs text-purple-600">
                    Direct fulfillment — no fallback required. Vendor had sufficient stock within 25 km.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Flow diagram */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Customer</span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold">
                      ⚠ {order.bypassed_vendors.length} Vendor{order.bypassed_vendors.length !== 1 ? 's' : ''} Bypassed
                    </span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">Warehouse</span>
                  </div>

                  {/* Bypassed vendor cards */}
                  {order.bypassed_vendors.length > 0 ? (
                    <div className="space-y-2">
                      {order.bypassed_vendors.map((bv, i) => (
                        <div key={i} className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {bv.vendor_name ?? `Vendor #${bv.vendor_id}`}
                              </p>
                              <p className="text-xs text-gray-400">{bv.vendor_city ?? '—'}</p>
                            </div>
                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold shrink-0">
                              {bv.reason}
                            </span>
                          </div>
                          {bv.shortage_items.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {bv.shortage_items.map((name, j) => (
                                <span key={j} className="text-[10px] bg-white border border-red-200 text-red-500 px-1.5 py-0.5 rounded">
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic px-1">
                      No vendor bypass records found — order may have been created before loss tracking was enabled.
                    </p>
                  )}

                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <p className="text-xs text-orange-700 font-medium">
                      Fulfilled by Warehouse — central dispatch with extended delivery window.
                    </p>
                  </div>
                </div>
              )}
            </section>

          </div>
        ) : null}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.admin
      .getOrders({
        skip: page * limit,
        limit,
        status: statusFilter || undefined,
        vendor_city: cityFilter || undefined,
        search: search || undefined,
      })
      .then((res) => {
        // alert(res);
  console.log("API RESPONSE:", res);
  setOrders(res.orders);
  setTotal(res.total);
})
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter, cityFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openOrder = async (id: number) => {
    setSelectedOrder(null);
    setDrawerLoading(true);
    try {
      const detail = await api.admin.getOrder(id);
      setSelectedOrder(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const applySearch = () => { setSearch(searchInput.trim()); setPage(0); };
  const applyCity   = () => { setCityFilter(cityInput.trim()); setPage(0); };
  const clearAll    = () => {
    setStatusFilter(''); setCityFilter(''); setCityInput('');
    setSearch(''); setSearchInput(''); setPage(0);
  };

  const hasFilters = statusFilter || cityFilter || search;

  return (
    <>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} orders total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          {/* Customer search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name or phone…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-44"
              />
              <button
                onClick={applySearch}
                className="px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor city */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vendor City</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Mumbai"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCity()}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 w-36"
              />
              <button
                onClick={applyCity}
                className="px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Filter
              </button>
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors self-end"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No orders found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Routing</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openOrder(o.id)}
                        className="font-medium text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                      >
                        #{o.id}
                      </button>
                      <p className="text-xs text-gray-400">User #{o.user_id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <SourceIcon source={o.source} />
                    </td>
                    <td className="px-5 py-4">
                      {o.vendor_name ? (
                        <>
                          <p className="font-medium text-gray-800">{o.vendor_name}</p>
                          <p className="text-xs text-gray-400">{o.vendor_city}</p>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">Warehouse</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{o.items_count}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">₹{o.total_price.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-400">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer — rendered outside table container so it overlays the full viewport */}
      {(drawerLoading || selectedOrder) && (
        <OrderDrawer
          order={selectedOrder}
          loading={drawerLoading}
          onClose={() => { setSelectedOrder(null); setDrawerLoading(false); }}
        />
      )}
    </>
  );
}
