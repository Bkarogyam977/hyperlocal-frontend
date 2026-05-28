'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import type { LossItem, LossNotification } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

// ── Item Table Row ────────────────────────────────────────────────────────────

function ItemRow({ item }: { item: LossItem }) {
  const shortage = item.required_qty - item.available_qty;
  const isShort  = shortage > 0;
  const lineVal  = item.price * item.required_qty;

  return (
    <tr className={`border-b border-slate-700/50 transition-colors ${isShort ? 'bg-red-900/20' : ''}`}>
      <td className="px-4 py-3 text-sm text-slate-200 font-medium">{item.name}</td>
      <td className="px-4 py-3 text-sm text-center text-slate-300">{item.required_qty}</td>
      <td className="px-4 py-3 text-sm text-center">
        <span className={isShort ? 'text-red-400 font-bold' : 'text-emerald-400'}>
          {item.available_qty}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {isShort ? (
          <span className="inline-flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
            ⚠ Shortage: {shortage}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right text-slate-400">₹{fmt(item.price)}</td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-slate-300">₹{fmt(lineVal)}</td>
    </tr>
  );
}

// ── Loss Card ─────────────────────────────────────────────────────────────────

function LossCard({ record, onUpdateStock }: { record: LossNotification; onUpdateStock: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(record.created_at);
  const hasShortage = record.items_data.some((i) => i.available_qty < i.required_qty);

  return (
    <div className={`bg-slate-800 border rounded-2xl overflow-hidden transition-all ${
      !record.is_read ? 'border-red-500/40' : 'border-slate-700'
    }`}>
      {/* Card Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Severity indicator */}
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${hasShortage ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
          <div>
            <p className="text-sm font-bold text-slate-100">
              Order #{record.order_id ?? '—'}
              &nbsp;
              <span className="text-slate-500 font-normal">·</span>
              &nbsp;
              <span className="text-red-400">Potential Revenue Lost: ₹{fmt(record.total_loss)}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {record.items_data.length} product{record.items_data.length !== 1 ? 's' : ''}
              &nbsp;·&nbsp;
              {record.items_data.filter((i) => i.available_qty < i.required_qty).length} shortage item{record.items_data.filter((i) => i.available_qty < i.required_qty).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!record.is_read && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full">NEW</span>
          )}
          <span className="text-xs text-slate-500">
            {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded: item table + footer */}
      {expanded && (
        <>
          <div className="border-t border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Product</th>
                  <th className="px-4 py-2.5 text-center">Required</th>
                  <th className="px-4 py-2.5 text-center">Available</th>
                  <th className="px-4 py-2.5 text-center">Gap</th>
                  <th className="px-4 py-2.5 text-right">Unit Price</th>
                  <th className="px-4 py-2.5 text-right">Line Value</th>
                </tr>
              </thead>
              <tbody>
                {record.items_data.map((item, i) => <ItemRow key={i} item={item} />)}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-700 bg-slate-900/40">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Potential Loss
                  </td>
                  <td className="px-4 py-3 text-right font-black text-red-400 text-base">
                    ₹{fmt(record.total_loss)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 px-5 py-3 flex items-center justify-between bg-slate-900/30">
            <p className="text-xs text-slate-500">
              Missed on&nbsp;
              <span className="text-slate-300 font-semibold">
                {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                &nbsp;at&nbsp;
                {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
            <button
              onClick={onUpdateStock}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Update Stock
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Summary KPI ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LossAnalyticsPage() {
  const router = useRouter();
  const [records, setRecords]     = useState<LossNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fromDate, setFromDate]   = useState(thirtyDaysAgo());
  const [toDate, setToDate]       = useState(today());
  const [filterRead, setFilterRead] = useState<'all' | 'unread'>('all');
  const [total, setTotal]         = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.vendor.getLossNotifications({
        from_date: fromDate || undefined,
        to_date:   toDate   || undefined,
        is_read:   filterRead === 'unread' ? false : undefined,
        limit:     100,
      });
      setRecords(res.items);
      setTotal(res.total);
      // Mark all as read when viewing
      await api.vendor.markLossRead().catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, filterRead]);

  useEffect(() => { load(); }, [load]);

  // Aggregated KPIs from loaded records
  const totalLoss    = records.reduce((s, r) => s + r.total_loss, 0);
  const unreadCount  = records.filter((r) => !r.is_read).length;
  const shortageSkus = new Set(
    records.flatMap((r) => r.items_data.filter((i) => i.available_qty < i.required_qty).map((i) => i.name))
  ).size;

  const inputCls = 'bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors';

  return (
    <div className="bg-slate-900 min-h-full p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Loss Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Orders routed to warehouse because your stock was insufficient — potential revenue missed
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Events"    value={String(total)}           sub="In selected range"     color="#F59E0B" />
        <KpiCard label="Revenue at Risk" value={`₹${fmt(totalLoss)}`}    sub="Sum of lost orders"   color="#EF4444" />
        <KpiCard label="Unread Alerts"   value={String(unreadCount)}     sub="Needs your attention"  color="#F87171" />
        <KpiCard label="Shortage SKUs"   value={String(shortageSkus)}    sub="Unique products short" color="#FBBF24" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
          <div className="flex gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
            {(['all', 'unread'] as const).map((f) => (
              <button key={f} onClick={() => setFilterRead(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterRead === f ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {f === 'all' ? 'All' : '🔴 Unread'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 mb-0.5 ml-auto">
          {[
            { label: '7d',  from: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); } },
            { label: '30d', from: () => thirtyDaysAgo() },
            { label: '90d', from: () => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); } },
          ].map(({ label, from }) => (
            <button key={label} onClick={() => { setFromDate(from()); setToDate(today()); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 bg-slate-800 border border-slate-700 rounded-2xl">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-lg font-bold text-slate-300">No loss events in this period</p>
          <p className="text-sm text-slate-600 mt-1">
            Your stock levels were sufficient for all orders — great work!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold">
            Showing {records.length} of {total} events · Click a card to expand item breakdown
          </p>
          {records.map((r) => (
            <LossCard
              key={r.id}
              record={r}
              onUpdateStock={() => router.push('/vendor/inventory')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
