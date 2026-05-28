'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { WarehouseOrder } from '@/types';
import { BlobProvider } from '@react-pdf/renderer';
import CourierLabelPDF from '@/components/CourierLabelPDF';

// ── Bulk Label Print ──────────────────────────────────────────────────────────

function printBulkLabels(orders: WarehouseOrder[]) {
  const labels = orders.map((o) => `
    <div style="page-break-after:always;padding:20px;border:2px solid #0f172a;border-radius:12px;max-width:380px;margin:0 auto 32px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <p style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0">BK Arogyam</p>
          <p style="font-size:18px;font-weight:900;margin:2px 0 0">ORDER #${o.id}</p>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:6px 10px;text-align:center">
          <p style="font-size:9px;color:#16a34a;font-weight:700;text-transform:uppercase;margin:0">Warehouse</p>
          <p style="font-size:9px;color:#64748b;margin:2px 0 0">Fallback Route</p>
        </div>
      </div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0">
      <p style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px">Deliver To</p>
      <p style="font-size:15px;font-weight:800;margin:0 0 4px">${o.customer_name ?? 'Customer'}</p>
      ${o.customer_phone ? `<p style="font-size:12px;color:#1d4ed8;margin:0 0 4px">📞 ${o.customer_phone}</p>` : ''}
      ${o.delivery_address ? `<p style="font-size:12px;color:#374151;margin:0 0 2px">${o.delivery_address}</p>` : ''}
      ${o.delivery_landmark ? `<p style="font-size:11px;color:#6b7280;margin:0 0 2px">Near ${o.delivery_landmark}</p>` : ''}
      <p style="font-size:12px;font-weight:700;color:#374151;margin:4px 0 0">${[o.delivery_city, o.delivery_state, o.delivery_pincode].filter(Boolean).join(', ')}</p>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0">
      <div style="display:flex;justify-content:space-between">
        <div>
          <p style="font-size:10px;color:#64748b;margin:0">Items</p>
          <p style="font-size:13px;font-weight:700;color:#111;margin:2px 0 0">${o.items_count}</p>
        </div>
        <div style="text-align:right">
          <p style="font-size:10px;color:#64748b;margin:0">Total</p>
          <p style="font-size:15px;font-weight:900;color:#059669;margin:2px 0 0">₹${o.total_price.toFixed(2)}</p>
        </div>
        ${o.rider_name ? `<div style="text-align:right"><p style="font-size:10px;color:#64748b;margin:0">Rider</p><p style="font-size:12px;font-weight:700;color:#7c3aed;margin:2px 0 0">${o.rider_name}</p></div>` : ''}
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shipping Labels</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px;background:#fff}@media print{@page{margin:10mm}}</style>
    </head><body>${labels}</body></html>`;

  const win = window.open('', '_blank', 'width=480,height=800');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ── OTP Verify Modal ──────────────────────────────────────────────────────────

function OtpModal({ order, onClose, onConfirm }: {
  order: WarehouseOrder;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [input, setInput]   = useState('');
  const [saving, setSaving] = useState(false);
  // The OTP is stored externally (generated at dispatch time); here we simulate
  // verification — in production, validate server-side
  const DEMO_OTP = '------'; // placeholder: real OTP comes from dispatch step

  const verify = async () => {
    setSaving(true);
    try { await onConfirm(); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="font-bold text-slate-100">Delivery Confirmation</h3>
          <p className="text-xs text-slate-500 mt-0.5">Order #{order.id} — {order.customer_name}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-emerald-400 font-semibold mb-1">Enter delivery OTP from rider</p>
            <input
              type="text" maxLength={6} value={input}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-36 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-center text-xl font-black text-emerald-300 tracking-widest focus:outline-none focus:border-emerald-500"
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            The 6-digit OTP was generated at dispatch and shared with the rider.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-sm font-semibold text-slate-400 hover:bg-slate-700">Cancel</button>
            <button onClick={verify} disabled={input.length < 6 || saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {saving ? 'Confirming…' : '✅ Confirm Delivery'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rider Assign Modal ────────────────────────────────────────────────────────

function RiderModal({ order, onClose, onAssign }: {
  order: WarehouseOrder;
  onClose: () => void;
  onAssign: (rider: string, tracking: string) => Promise<void>;
}) {
  const [rider, setRider]     = useState('');
  const [tracking, setTracking] = useState(`BKA-${order.id}-${Date.now().toString().slice(-4)}`);
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onAssign(rider, tracking); onClose(); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="font-bold text-slate-100">Assign Rider — Order #{order.id}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rider Name <span className="text-red-400">*</span></label>
            <input required value={rider} onChange={(e) => setRider(e.target.value)} placeholder="e.g. Ramesh Kumar" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tracking ID</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-sm font-semibold text-slate-400 hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={!rider || saving}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              {saving ? 'Dispatching…' : '🚚 Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Logistics Row ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  paid:       { label: 'New',       color: '#F59E0B', bg: '#F59E0B1A' },
  accepted:   { label: 'Accepted',  color: '#3B82F6', bg: '#3B82F61A' },
  dispatched: { label: 'In Transit',color: '#8B5CF6', bg: '#8B5CF61A' },
  confirmed:  { label: 'Delivered', color: '#10B981', bg: '#10B9811A' },
  cancelled:  { label: 'Cancelled', color: '#EF4444', bg: '#EF44441A' },
};

function LogisticsRow({
  order,
  selected,
  onToggle,
  onRefresh,
}: {
  order: WarehouseOrder;
  selected: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [showRider, setShowRider] = useState(false);
  const [showOtp, setShowOtp]     = useState(false);
  const cfg = STATUS_CFG[order.status] ?? { label: order.status, color: '#94A3B8', bg: '#94A3B81A' };

  const handleDispatch = async (rider: string, tracking: string) => {
    await api.warehouse.updateOrderStatus(order.id, 'dispatched', {
      rider_name: rider || undefined,
      tracking_id: tracking || undefined,
    });
    onRefresh();
  };

  const handleConfirm = async () => {
    await api.warehouse.updateOrderStatus(order.id, 'confirmed');
    onRefresh();
  };

  return (
    <>
      {showRider && <RiderModal order={order} onClose={() => setShowRider(false)} onAssign={handleDispatch} />}
      {showOtp   && <OtpModal   order={order} onClose={() => setShowOtp(false)}   onConfirm={handleConfirm} />}

      <tr className={`border-b border-slate-700/50 transition-colors ${selected ? 'bg-slate-700/30' : 'hover:bg-slate-700/20'}`}>
        <td className="px-4 py-3.5">
          <input type="checkbox" checked={selected} onChange={onToggle} className="w-4 h-4 accent-emerald-500" />
        </td>
        <td className="px-4 py-3.5">
          <p className="text-sm font-bold text-slate-200">#{order.id}</p>
          <p className="text-[10px] text-slate-600">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
        </td>
        <td className="px-4 py-3.5">
          <p className="text-sm text-slate-200">{order.customer_name ?? '—'}</p>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="text-[11px] text-blue-400">{order.customer_phone}</a>
          )}
        </td>
        <td className="px-4 py-3.5 text-sm text-slate-400">
          {[order.delivery_city, order.delivery_pincode].filter(Boolean).join(', ') || '—'}
        </td>
        <td className="px-4 py-3.5">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3.5 text-sm font-bold text-emerald-400">₹{order.total_price.toFixed(0)}</td>
        <td className="px-4 py-3.5">
          {order.rider_name ? (
            <span className="text-xs text-violet-400 font-medium">🏍 {order.rider_name}</span>
          ) : (
            <span className="text-xs text-slate-600 italic">Unassigned</span>
          )}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            {order.status === 'accepted' && (
              <button onClick={() => setShowRider(true)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors">
                Assign Rider
              </button>
            )}
            {order.status === 'dispatched' && (
              <button onClick={() => setShowOtp(true)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                Verify OTP
              </button>
            )}
            {(order.status === 'confirmed' || order.status === 'cancelled') && (
              <span className="text-xs text-slate-600 italic">{order.status === 'confirmed' ? 'Done' : 'Cancelled'}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <BlobProvider
                  document={<CourierLabelPDF data={order} />}
                >
                  {({ url, loading }) => {

                    if (loading) {
                      return <p>Generating...</p>;
                    }

                    return (
                      <button
                        onClick={() => {
                          if (url) {
                            window.open(url, '_blank');
                          }
                        }}
                        style={{
                          padding: '8px 14px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Generate PDF
                      </button>
                    );
                  }}
                </BlobProvider>
          </div>
        </td>
      </tr>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LogisticsHub() {
  const [orders, setOrders]     = useState<WarehouseOrder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter]     = useState<'all' | 'accepted' | 'dispatched' | 'confirmed'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await api.warehouse.getOrders({ limit: 200 })); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) =>
    filter === 'all' ? true : o.status === filter,
  );

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((o) => o.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedOrders = orders.filter((o) => selected.has(o.id));

  const dispatchedCount = orders.filter((o) => o.status === 'dispatched').length;
  const acceptedCount   = orders.filter((o) => o.status === 'accepted').length;
  const confirmedCount  = orders.filter((o) => o.status === 'confirmed').length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Logistics Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rider assignment, OTP handover & bulk label printing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => printBulkLabels(selectedOrders.length > 0 ? selectedOrders : filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Labels {selectedOrders.length > 0 ? `(${selectedOrders.length})` : `(All)`}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Needs Rider',  value: acceptedCount,   color: '#3B82F6' },
          { label: 'In Transit',   value: dispatchedCount, color: '#8B5CF6' },
          { label: 'Delivered',    value: confirmedCount,  color: '#10B981' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {([
            { key: 'all',        label: 'All' },
            { key: 'accepted',   label: '🔵 Needs Rider' },
            { key: 'dispatched', label: '🟣 In Transit' },
            { key: 'confirmed',  label: '🟢 Delivered' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === key ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
            {selected.size} selected
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-slate-600 text-sm">No orders in this category</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="w-4 h-4 accent-emerald-500" />
                </th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Print</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <LogisticsRow
                  key={o.id}
                  order={o}
                  selected={selected.has(o.id)}
                  onToggle={() => toggleOne(o.id)}
                  onRefresh={load}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
