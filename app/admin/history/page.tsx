'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalItem {
  id: number; sku: string; batch_no: string | null; type: string;
  reason: string | null; delta_qty: number; operator: string;
  status: string; created_at: string;
}
interface LedgerItem {
  id: number; timestamp: string; sku: string; batch_no: string | null;
  type: string; reason: string | null; delta_qty: number;
  old_balance: number; new_balance: number; operator: string; status: string; // 👈 Status field ensure kiye
}
interface LedgerFilters { sku: string; date_from: string; date_to: string; reason: string; }
interface ProductOption  { sku: string; name: string; }

const TRANSACTION_REASONS = ['Initial Stock', 'Restock', 'Damaged', 'Customer Sale', 'Expiry Scrap'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://hyper-api.arogyamission.com';

// Safely handle window check
function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, cache: 'no-store', headers: { ...authHeaders(), ...init?.headers } });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(e.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

const fmtDt = (s: string) =>
  new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// ── Product Combobox (light admin theme) ─────────────────────────────────────

function ProductCombobox({ products, onSelect, inputCls, resetKey }: {
  products: ProductOption[];
  onSelect: (sku: string, label: string) => void;
  inputCls: string;
  resetKey: number;
}) {
  const [text, setText]   = useState('');
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(''); }, [resetKey]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hits = products.filter(p =>
    !text ||
    p.name.toLowerCase().includes(text.toLowerCase()) ||
    p.sku.toLowerCase().includes(text.toLowerCase())
  ).slice(0, 40);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={text}
        onChange={e => { setText(e.target.value); setOpen(true); if (!e.target.value) onSelect('', ''); }}
        onFocus={() => setOpen(true)}
        placeholder="Filter by product…"
        className={inputCls}
        autoComplete="off"
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-50 mt-1 w-56 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1">
          {hits.map(p => (
            <li key={p.sku}>
              <button
                type="button"
                onMouseDown={() => { setText(p.name); onSelect(p.sku, p.name); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-[10px] font-mono text-gray-400">{p.sku}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Section A: Pending Approval Queue ────────────────────────────────────────

function PendingQueue({ onAction }: { onAction: () => void }) {
  const [items, setItems]   = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState<number | null>(null);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ total: number; items: ApprovalItem[] }>('/inventory/approval-queue?status=PENDING');
      setItems(res.items);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    setError(''); setActing(id);
    try {
      await apiFetch('/inventory/admin/approval-action', {
        method: 'POST',
        body: JSON.stringify({ approval_id: id, action }),
      });
      await load();
      onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="font-bold text-gray-900 text-sm">Pending Action Queue</h2>
        </div>
        <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
          {items.length} pending
        </span>
      </div>

      {error && (
        <div className="mx-6 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-400">No pending approvals</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Batch</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3 text-right">Δ Qty</th>
              <th className="px-5 py-3">Operator</th>
              <th className="px-5 py-3">Submitted</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-amber-50/50 transition-colors">
                <td className="px-5 py-3.5 text-xs font-mono text-gray-500">#{item.id}</td>
                <td className="px-5 py-3.5">
                  <span className="font-bold text-gray-900">{item.sku}</span>
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{item.batch_no ?? '—'}</td>
                <td className="px-5 py-3.5 text-xs text-gray-600">{item.reason ?? '—'}</td>
                <td className="px-5 py-3.5 text-right font-bold text-red-600 font-mono">−{item.delta_qty}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{item.operator}</td>
                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDt(item.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button
                      disabled={acting === item.id}
                      onClick={() => act(item.id, 'APPROVED')}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-40 transition-colors">
                      {acting === item.id ? '…' : 'Approve'}
                    </button>
                    <button
                      disabled={acting === item.id}
                      onClick={() => act(item.id, 'REJECTED')}
                      className="px-3 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg disabled:opacity-40 transition-colors">
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Section B: Passbook Audit Trail ───────────────────────────────────────────

function PassbookAudit({ refreshKey }: { refreshKey: number }) {
  const [filters, setFilters]   = useState<LedgerFilters>({ sku: '', date_from: '', date_to: '', reason: '' });
  const [applied, setApplied]   = useState<LedgerFilters>(filters);
  const [rows, setRows]         = useState<LedgerItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [comboKey, setComboKey] = useState(0);
  const limit = 50;

  useEffect(() => {
    apiFetch<any>('/admin/products')
      .then(res => {
        const list = Array.isArray(res) ? res : (res.items ?? res.products ?? []);
        setProducts(list.map((p: any) => ({
          sku:  p.sku || `SKU-${String(p.id).padStart(4, '0')}`,
          name: p.name || p.product_name || `Product #${p.id}`,
        })));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (applied.sku)       qs.set('sku',       applied.sku);
      if (applied.date_from) qs.set('date_from', applied.date_from);
      if (applied.date_to)   qs.set('date_to',   applied.date_to);
      if (applied.reason)    qs.set('reason',    applied.reason);
      qs.set('skip', String(page * limit));
      qs.set('limit', String(limit));
      const res = await apiFetch<{ total: number; items: LedgerItem[] }>(`/inventory/ledger-history?${qs}`);
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [applied, page, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const apply = () => { setApplied(filters); setPage(0); };
  const clear  = () => {
    const blank = { sku: '', date_from: '', date_to: '', reason: '' };
    setFilters(blank); setApplied(blank); setPage(0);
    setComboKey(k => k + 1);
  };

  const inputCls = 'bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500';

  // ⚡ Filtered rows count check for admin panel history exclusion
  const activeRows = rows.filter(r => String(r.status).toUpperCase() !== 'PENDING');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Filter bar */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap gap-2 items-end bg-gray-50">
        <div className="flex items-center gap-2 mr-2 self-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-sm font-bold text-gray-800">Passbook Audit Trail</h2>
        </div>
        <ProductCombobox
          products={products}
          resetKey={comboKey}
          onSelect={(sku) => {
            setFilters(f => ({ ...f, sku }));
            setApplied(f => ({ ...f, sku }));
            setPage(0);
          }}
          inputCls={inputCls + ' w-48'}
        />
        <input type="date" value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
          className={inputCls} />
        <span className="text-xs text-gray-400 self-center">to</span>
        <input type="date" value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
          className={inputCls} />
        <select
          value={filters.reason}
          onChange={e => {
            const reason = e.target.value;
            setFilters(f => ({ ...f, reason }));
            setApplied(f => ({ ...f, reason }));
            setPage(0);
          }}
          className={inputCls + ' cursor-pointer'}
        >
          <option value="">All Reasons</option>
          {TRANSACTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={apply}
          className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
          Apply
        </button>
        {(applied.sku || applied.date_from || applied.date_to || applied.reason) && (
          <button onClick={clear}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 hover:text-gray-800 rounded-lg transition-colors">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{total} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Batch</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3 text-right">Δ Qty</th>
              <th className="px-5 py-3">Stock Balance</th>
              <th className="px-5 py-3">Operator</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-14">
                  <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : activeRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-14 text-gray-400 text-sm">No ledger entries found</td>
              </tr>
            ) : activeRows.map((r, i) => (
              <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDt(r.timestamp)}</td>
                <td className="px-5 py-3.5 font-bold text-gray-900">{r.sku}</td>
                <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{r.batch_no ?? '—'}</td>
                <td className="px-5 py-3.5">
                 <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                    r.type === 'IN' || r.type === 'PRODUCTION_IN' || r.type === 'CUSTOMER_RETURN_IN'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {r.type}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-600">{r.reason ?? '—'}</td>
                <td className={`px-5 py-3.5 text-right font-bold font-mono text-sm ${
                  r.type === 'IN' || r.type === 'PRODUCTION_IN' || r.type === 'CUSTOMER_RETURN_IN' 
                    ? 'text-emerald-600' 
                    : 'text-red-600'
                }`}>
                  {r.type === 'IN' || r.type === 'PRODUCTION_IN' || r.type === 'CUSTOMER_RETURN_IN' ? '+' : '−'}{Math.abs(r.delta_qty)}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono text-gray-500">
                    {r.old_balance}
                    <span className="mx-1.5 text-gray-300">→</span>
                    <span className={`font-bold ${r.new_balance < r.old_balance ? 'text-red-600' : 'text-emerald-600'}`}>
                      {r.new_balance}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{r.operator}</td>
                
                {/* 🎨 Dynamic Admin History Status Column - Fixed Hardcoding */}
                <td className="px-5 py-3.5">
                  {String(r.status).toUpperCase() === 'REJECTED' ? (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                      REJECTED
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      POSTED
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">
              ← Prev
            </button>
            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Inventory History</h1>
        <p className="text-sm text-gray-500 mt-0.5">Approval queue and full stock ledger audit trail</p>
      </div>

      <PendingQueue onAction={() => setRefreshKey(k => k + 1)} />
      <PassbookAudit refreshKey={refreshKey} />
    </div>
  );
}