'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { WarehouseOrder } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  paid:       { label: 'New',        color: '#F59E0B', bg: '#F59E0B1A' },
  accepted:   { label: 'Accepted',   color: '#3B82F6', bg: '#3B82F61A' },
  dispatched: { label: 'In Transit', color: '#8B5CF6', bg: '#8B5CF61A' },
  confirmed:  { label: 'Delivered',  color: '#10B981', bg: '#10B9811A' },
  cancelled:  { label: 'Cancelled',  color: '#EF4444', bg: '#EF44441A' },
};

// Workflow stages shown as a stepper
const STEPS = ['Accept', 'Pick', 'Pack', 'Dispatch', 'Deliver'];
const STEP_STATUS: Record<string, number> = {
  paid: 0, accepted: 1, dispatched: 3, confirmed: 4,
};

function Spin() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}

// ── OTP Generator ─────────────────────────────────────────────────────────────

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Print Packing Slip ────────────────────────────────────────────────────────

function printSlip(order: WarehouseOrder) {
  const lines = order.items.map((i) =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1e293b">${i.product_name ?? '#' + i.product_id}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1e293b;text-align:center">${i.quantity}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1e293b;text-align:right">₹${(i.unit_price * i.quantity).toFixed(2)}</td>
    </tr>`,
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Packing Slip — #${order.id}</title>
    <style>
      body{font-family:system-ui,sans-serif;font-size:13px;color:#0f172a;padding:28px;max-width:520px;margin:auto}
      h1{font-size:20px;font-weight:900;margin:0 0 2px}
      .sub{color:#64748b;font-size:12px;margin-bottom:24px}
      .badge{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:700;color:#0f766e;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;padding:8px 10px;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}
      th:last-child,td:last-child{text-align:right}
      th:nth-child(2),td:nth-child(2){text-align:center}
      .total{font-weight:900;font-size:15px;text-align:right;margin-top:14px;color:#0f172a}
      .block{margin:16px 0;padding:14px;border:1px solid #e2e8f0;border-radius:10px}
      .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:5px}
      hr{border:none;border-top:1px dashed #cbd5e1;margin:18px 0}
      .footer{font-size:11px;color:#94a3b8;text-align:center}
    </style></head><body>
    <h1>BK Arogyam — Packing Slip</h1>
    <p class="sub">Order #${order.id} &nbsp;·&nbsp; ${new Date(order.created_at).toLocaleString('en-IN')}</p>
    <span class="badge">🏭 Central Warehouse · Fallback Route</span>
    <div class="block">
      <div class="lbl">Deliver To</div>
      <strong>${order.customer_name ?? 'Customer'}</strong><br>
      ${order.customer_phone ? `📞 ${order.customer_phone}<br>` : ''}
      ${order.delivery_address ? order.delivery_address + '<br>' : ''}
      ${order.delivery_landmark ? 'Near ' + order.delivery_landmark + '<br>' : ''}
      ${[order.delivery_city, order.delivery_state, order.delivery_pincode].filter(Boolean).join(', ')}
    </div>
    ${order.rider_name ? `<div class="block"><div class="lbl">Rider</div><strong>${order.rider_name}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Tracking: <strong>${order.tracking_id ?? '—'}</strong></div>` : ''}
    <hr>
    <table><thead><tr><th>Product</th><th>Qty</th><th>Amount</th></tr></thead>
    <tbody>${lines}</tbody></table>
    <p class="total">Total &nbsp; ₹${order.total_price.toFixed(2)}</p>
    <hr>
    <p class="footer">Thank you · BK Arogyam Healthcare</p>
    </body></html>`;

  const win = window.open('', '_blank', 'width=560,height=750');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ── Dispatch Modal ────────────────────────────────────────────────────────────

function DispatchModal({
  order,
  onDispatch,
  onClose,
}: {
  order: WarehouseOrder;
  onDispatch: (rider: string, tracking: string, notes: string, otp: string) => Promise<void>;
  onClose: () => void;
}) {
  const [riderName, setRiderName] = useState('');
  const [tracking, setTracking]   = useState(`BKA-${order.id}-${Date.now().toString().slice(-4)}`);
  const [notes, setNotes]         = useState('');
  const [otp]                     = useState(generateOTP);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;
    setSaving(true);
    try { await onDispatch(riderName, tracking, notes, otp); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h3 className="font-bold text-slate-100">Dispatch Order #{order.id}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Assign rider &amp; generate OTP handover</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 text-slate-400 hover:text-slate-200">✕</button>
        </div>

        {/* OTP Box */}
        <div className="mx-6 mt-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">OTP — Handover Code</p>
            <p className="text-2xl font-black text-emerald-300 tracking-widest mt-0.5">{otp}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500">Share with</p>
            <p className="text-xs text-slate-300 font-semibold">rider before dispatch</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Rider Name <span className="text-red-400">*</span></label>
            <input required value={riderName} onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Ramesh Kumar" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tracking ID</label>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Handle with care…" className={`${inputCls} resize-none`} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-emerald-500" />
            <span className="text-xs text-slate-300">I have shared the OTP with the rider</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-sm font-semibold text-slate-400 hover:bg-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={!confirmed || saving || !riderName}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {saving ? <Spin /> : null}
              {saving ? 'Dispatching…' : '🚚 Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Workflow Stepper ──────────────────────────────────────────────────────────

function Stepper({ status }: { status: string }) {
  const current = STEP_STATUS[status] ?? (status === 'cancelled' ? -1 : 0);
  return (
    <div className="flex items-center gap-0 py-1">
      {STEPS.map((step, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                done  ? 'bg-emerald-500 border-emerald-500 text-slate-900' :
                active ? 'bg-amber-500 border-amber-500 text-slate-900' :
                         'bg-slate-700 border-slate-600 text-slate-500'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-semibold ${done ? 'text-emerald-400' : active ? 'text-amber-400' : 'text-slate-600'}`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 mx-0.5 mb-4 transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onRefresh }: { order: WarehouseOrder; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const cfg = STATUS_CFG[order.status] ?? { label: order.status, color: '#94A3B8', bg: '#94A3B81A' };

  const act = async (status: string) => {
    setLoading(true);
    try { await api.warehouse.updateOrderStatus(order.id, status); onRefresh(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  const handleDispatch = async (rider: string, tracking: string, notes: string) => {
    await api.warehouse.updateOrderStatus(order.id, 'dispatched', {
      rider_name: rider || undefined,
      tracking_id: tracking || undefined,
      notes: notes || undefined,
    });
    setShowDispatch(false);
    onRefresh();
  };

  return (
    <>
      {showDispatch && (
        <DispatchModal order={order} onDispatch={handleDispatch} onClose={() => setShowDispatch(false)} />
      )}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 hover:border-slate-600 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-100">#{order.id}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
                {cfg.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {/* Fallback badge */}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 whitespace-nowrap">
            No vendor 100km
          </span>
        </div>

        {/* Stepper */}
        {order.status !== 'cancelled' && <Stepper status={order.status} />}

        {/* Customer + Delivery */}
        {(order.customer_name || order.delivery_city) && (
          <div className="bg-slate-900 rounded-xl px-3 py-2.5 space-y-1.5 text-xs">
            {order.customer_name && (
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-slate-200 font-medium">{order.customer_name}</span>
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`} className="text-blue-400 hover:text-blue-300 ml-auto">{order.customer_phone}</a>
                )}
              </div>
            )}
            {order.delivery_address && (
              <p className="text-slate-400">{order.delivery_address}</p>
            )}
            {(order.delivery_city || order.delivery_pincode) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{[order.delivery_city, order.delivery_state, order.delivery_pincode].filter(Boolean).join(', ')}</span>
                {order.delivery_lat && order.delivery_lon && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lon}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    📍 Map
                  </a>
                )}
              </div>
            )}
            {order.rider_name && (
              <div className="flex items-center gap-1.5 text-violet-400 font-medium">
                <span>🏍</span>
                <span>{order.rider_name}</span>
                {order.tracking_id && <span className="text-slate-500">· {order.tracking_id}</span>}
              </div>
            )}
          </div>
        )}

        {/* Items */}
        {order.items.length > 0 && (
          <div className="space-y-1">
            {order.items.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-700 rounded-md flex items-center justify-center shrink-0 text-xs overflow-hidden">
                  {item.product_image ? <img src={item.product_image} alt="" className="w-full h-full object-cover" /> : '📦'}
                </div>
                <span className="text-xs text-slate-300 flex-1 truncate">{item.product_name ?? `#${item.product_id}`}</span>
                <span className="text-xs text-slate-500">×{item.quantity}</span>
                <span className="text-xs text-slate-400">₹{(item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
            {order.items.length > 3 && <p className="text-[10px] text-slate-600 pl-8">+{order.items.length - 3} more items</p>}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">{order.items_count} item{order.items_count !== 1 ? 's' : ''}</span>
          <span className="font-black text-emerald-400">₹{order.total_price.toFixed(2)}</span>
        </div>

        {/* Action row */}
        <div className="flex gap-2">
          <button onClick={() => printSlip(order)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Slip
          </button>

          {order.status === 'paid' && (
            <>
              <button onClick={() => act('cancelled')} disabled={loading}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 transition-colors">
                {loading ? <Spin /> : 'Reject'}
              </button>
              <button onClick={() => act('accepted')} disabled={loading}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50 transition-colors">
                {loading ? <Spin /> : '✓ Accept'}
              </button>
            </>
          )}
          {order.status === 'accepted' && (
            <button onClick={() => setShowDispatch(true)} disabled={loading}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
              {loading ? <Spin /> : '🚚 Dispatch'}
            </button>
          )}
          {order.status === 'dispatched' && (
            <button onClick={() => act('confirmed')} disabled={loading}
              className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
              {loading ? <Spin /> : '✅ Delivered'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'paid' | 'accepted' | 'dispatched' | 'confirmed' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'paid',      label: 'New' },
  { key: 'accepted',  label: 'Accepted' },
  { key: 'dispatched',label: 'In Transit' },
  { key: 'confirmed', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function FulfillmentHub() {
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await api.warehouse.getOrders({ limit: 100 })); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = Object.fromEntries(
    TABS.map(({ key }) => [key, key === 'all' ? orders.length : orders.filter((o) => o.status === key).length]),
  );

  const filtered = orders.filter((o) => {
    const matchTab = tab === 'all' || o.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q || String(o.id).includes(q) || (o.customer_name ?? '').toLowerCase().includes(q) || (o.delivery_city ?? '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Fulfillment Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">Accept → Pick → Pack → Dispatch → Deliver</p>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === key ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {label}
              {counts[key] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === key ? 'bg-slate-900/30 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order ID, customer, city…"
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors w-64"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <p className="text-lg font-bold">No orders</p>
          <p className="text-sm mt-1">Try changing the filter or refreshing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((o) => <OrderCard key={o.id} order={o} onRefresh={load} />)}
        </div>
      )}
    </div>
  );
}
