'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { WarehouseOrder, WarehouseStats } from '@/types';

// ── Tiny reusable pieces ──────────────────────────────────────────────────────

function Spin() {
  return <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />;
}

function KpiCard({
  label, value, sub, accent, icon,
}: { label: string; value: string | number; sub?: string; accent: string; icon: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '1A' }}>
          <svg className="w-4 h-4" fill="none" stroke={accent} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-3xl font-black text-slate-100">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Inventory Health Ring ─────────────────────────────────────────────────────

function HealthRing({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={90} height={90} className="rotate-[-90deg]">
      <circle cx={45} cy={45} r={r} fill="none" stroke="#1E293B" strokeWidth={10} />
      <circle
        cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={45} y={49} textAnchor="middle" dominantBaseline="middle"
        className="rotate-90"
        style={{ fill: color, fontSize: 16, fontWeight: 800, transform: 'rotate(90deg)', transformOrigin: '45px 45px' }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── City Heatmap Bar ──────────────────────────────────────────────────────────

function HeatmapBar({ city, count, max }: { city: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-300 w-24 truncate shrink-0">{city || 'Unknown'}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#10B981,#34D399)' }}
        />
      </div>
      <span className="text-xs text-amber-400 font-bold w-6 text-right">{count}</span>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  paid: '#F59E0B', accepted: '#3B82F6', dispatched: '#8B5CF6',
  confirmed: '#10B981', cancelled: '#EF4444',
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function WarehouseDashboard() {
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, orders] = await Promise.all([
        api.warehouse.getStats(),
        api.warehouse.getOrders({ limit: 6 }),
      ]);
      setStats(s);
      setRecentOrders(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin />
      </div>
    );
  }

  if (!stats) return null;

  const maxCity = Math.max(...stats.city_heatmap.map((c) => c.count), 1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Control Room</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fallback routing active — Central Warehouse fulfilling orders beyond 100 km
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Fallback system alert */}
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />
        <p className="text-sm text-amber-300 font-medium">
          <span className="font-black">{stats.total_orders}</span> orders system-routed to this warehouse
          &nbsp;·&nbsp; Reason: <span className="italic">No vendor within 100 km</span>
        </p>
        <span className="ml-auto text-xs text-amber-500 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          {stats.pending_action} need action
        </span>
      </div>

      {/* ── KPI Bento Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Fallback Orders"
          value={stats.total_orders}
          sub="All system-routed via warehouse"
          accent="#10B981"
          icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
        <KpiCard
          label="Arrived Today"
          value={stats.today_orders}
          sub="New orders since midnight"
          accent="#3B82F6"
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <KpiCard
          label="Pending Action"
          value={stats.pending_action}
          sub={`${stats.by_status['paid'] ?? 0} new · ${stats.by_status['accepted'] ?? 0} accepted`}
          accent="#F59E0B"
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
        <KpiCard
          label="Dispatched"
          value={stats.by_status['dispatched'] ?? 0}
          sub={`${stats.by_status['confirmed'] ?? 0} delivered total`}
          accent="#8B5CF6"
          icon="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
        />
      </div>

      {/* ── Middle Row: Heatmap + Inventory Health + Order Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Fallback Demand Heatmap */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Fallback Demand by City</h2>
            <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">Top 8</span>
          </div>
          {stats.city_heatmap.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No location data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.city_heatmap.map((row) => (
                <HeatmapBar key={row.city} city={row.city} count={row.count} max={maxCity} />
              ))}
            </div>
          )}
          {stats.city_heatmap.length > 0 && (
            <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-700">
              High-demand cities → Smart replenishment candidates
            </p>
          )}
        </div>

        {/* Inventory Health */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-200">Inventory Health</h2>
          <div className="flex items-center gap-5">
            <HealthRing pct={stats.inventory.health_pct} />
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full shrink-0" />
                <span className="text-xs text-slate-300">{stats.inventory.total_skus} Total SKUs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full shrink-0" />
                <span className="text-xs text-slate-300">{stats.inventory.low_stock} Low Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0" />
                <span className="text-xs text-slate-300">{stats.inventory.out_of_stock} Out of Stock</span>
              </div>
            </div>
          </div>
          {stats.inventory.out_of_stock > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <span className="text-red-400 text-xs font-semibold">⚠ {stats.inventory.out_of_stock} SKU(s) out of stock — replenish immediately</span>
            </div>
          )}
          {stats.inventory.low_stock > 0 && stats.inventory.out_of_stock === 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <span className="text-amber-400 text-xs font-semibold">⚡ {stats.inventory.low_stock} SKU(s) running low</span>
            </div>
          )}
        </div>

        {/* Order Pipeline */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-200">Order Pipeline</h2>
          <div className="space-y-2">
            {(['paid', 'accepted', 'dispatched', 'confirmed', 'cancelled'] as const).map((s) => {
              const count = stats.by_status[s] ?? 0;
              const maxVal = Math.max(...Object.values(stats.by_status), 1);
              const labels: Record<string, string> = {
                paid: 'New / Unprocessed', accepted: 'Accepted', dispatched: 'In Transit',
                confirmed: 'Delivered', cancelled: 'Cancelled',
              };
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_DOT[s] }} />
                  <span className="text-xs text-slate-400 w-32 shrink-0">{labels[s]}</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxVal) * 100}%`, backgroundColor: STATUS_DOT[s] }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-300 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Fallback Tracker + Audit Feed ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Fallback Tracker — recent orders needing attention */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-200">Fallback Tracker</h2>
            <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              System-Routed
            </span>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">No recent orders</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700">
                  <th className="px-5 py-2.5">Order</th>
                  <th className="px-5 py-2.5">Customer</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-xs font-bold text-slate-200">#{o.id}</p>
                      <p className="text-[10px] text-slate-500">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-slate-300">{o.customer_name ?? '—'}</p>
                      <p className="text-[10px] text-slate-500">{o.delivery_city ?? 'Unknown city'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_DOT[o.status] ?? '#94A3B8' }} />
                        <span className="text-xs capitalize text-slate-300">{o.status}</span>
                      </span>
                      <p className="text-[10px] text-amber-500/80 mt-0.5">No vendor within 100km</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-bold text-emerald-400">₹{o.total_price.toFixed(0)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Live Audit Feed */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="text-sm font-bold text-slate-200">Live Audit Trail</h2>
            <span className="text-xs text-slate-500">Last 15 actions</span>
          </div>
          <div className="divide-y divide-slate-700/50 max-h-80 overflow-y-auto">
            {stats.recent_audit.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No audit entries yet</p>
            ) : (
              stats.recent_audit.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] text-slate-300 font-bold">{log.user_name[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200">
                      <span className="font-semibold">{log.user_name}</span>
                      {' '}changed{' '}
                      <span className="text-amber-400 font-mono">{log.field_name}</span>
                    </p>
                    {(log.old_val || log.new_val) && (
                      <p className="text-[10px] text-slate-500 truncate">
                        {log.old_val ?? '∅'} → {log.new_val ?? '∅'}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">
                    {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
