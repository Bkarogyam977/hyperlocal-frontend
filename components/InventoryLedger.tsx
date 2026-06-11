'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPI {
  available: number;
  near_expiry: number;
  expired_pool: number;
  pending_approval: number;
}
interface LiveEntry {
  id: string; tx_type: 'IN' | 'OUT'; reason_code: string; quantity: number;
  opening_stock: number; closing_stock: number; approved: boolean;
  created_by: string; description: string | null; reference_id: string | null;
  created_at: string; sku_code: string; product_name: string;
}
interface LedgerRow extends LiveEntry {
  batch_code: string | null; expiry_date: string | null; status?: string;
}
interface Batch {
  id: string; batch_code: string; expiry_date: string | null;
  current_qty: number; rack_no: string | null;
}
interface Product { id: string; sku_code: string; name: string; }

interface TransactForm {
  product_id: string; product_label: string;
  tx_type: 'IN' | 'OUT'; reason_code: string;
  quantity: string; batch_id: string;
  batch_code: string; mfg_date: string; expiry_date: string;
  validity_months: string; rack_no: string;
  reference_id: string; created_by: string; description: string;
}

interface LedgerFilters {
  date_from: string; date_to: string; sku: string; reason: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

//const API = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/wms';
const API = (process.env.NEXT_PUBLIC_API_URL || 'https://hyper-api.arogyamission.com')+ '/wms';

const IN_REASONS  = ['PRODUCTION', 'PO', 'RETURN'] as const;
const OUT_REASONS = ['STOLEN', 'DAMAGED', 'SAMPLE'] as const;
const ALL_REASONS = ['PRODUCTION', 'PO', 'RETURN', 'STOLEN', 'DAMAGED', 'SAMPLE', 'EXPIRED'];

const REASON_LABEL: Record<string, string> = {
  PRODUCTION: 'Production', PO: 'Purchase Order', RETURN: 'Customer Return',
  STOLEN: 'Stolen', DAMAGED: 'Damaged', SAMPLE: 'Sample/Demo', EXPIRED: 'Auto-Expired',
};
const REASON_COLOR: Record<string, string> = {
  PRODUCTION: 'text-emerald-400 bg-emerald-400/10',
  PO:         'text-blue-400 bg-blue-400/10',
  RETURN:     'text-cyan-400 bg-cyan-400/10',
  STOLEN:     'text-red-400 bg-red-400/10',
  DAMAGED:    'text-orange-400 bg-orange-400/10',
  SAMPLE:     'text-purple-400 bg-purple-400/10',
  EXPIRED:    'text-rose-500 bg-rose-500/10',
};

const BLANK_FORM: TransactForm = {
  product_id: '', product_label: '', tx_type: 'IN', reason_code: 'PRODUCTION',
  quantity: '', batch_id: '', batch_code: '', mfg_date: '', expiry_date: '',
  validity_months: '12', rack_no: '', reference_id: '', created_by: 'Operator',
  description: '',
};

// ── Utils ─────────────────────────────────────────────────────────────────────

const fmt  = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const fmtDt = (s: string) =>
  new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const expiryDays = (d: string | null) =>
  d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000) : null;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(API + path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, note, border, textColor, icon }: {
  label: string; value: number; note?: string;
  border: string; textColor: string; icon: React.ReactNode;
}) {
  return (
    <div className={`bg-[#141826] border ${border} rounded-xl p-5 flex gap-4 items-start`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${border.replace('border-', 'bg-').replace('/40', '/10')}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{label}</p>
        <p className={`text-3xl font-black font-mono mt-0.5 ${textColor}`}>{fmt(value)}</p>
        {note && <p className="text-[10px] text-slate-600 mt-1">{note}</p>}
      </div>
    </div>
  );
}

// ── Live Feed ─────────────────────────────────────────────────────────────────

function LiveFeed({ entries, onApprove }: {
  entries: LiveEntry[];
  onApprove: (id: string) => void;
}) {
  return (
    <div className="bg-[#141826] border border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-slate-700/50 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-bold text-slate-200 tracking-tight">Live Event Feed</h2>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-center text-slate-600 text-sm py-12">No events yet</p>
        ) : (
          <div className="relative">
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-slate-700/50" />
            {entries.map((e, i) => {
              const pending = !e.approved;
              return (
                <div
                  key={e.id}
                  className={`flex gap-4 px-5 py-3.5 border-b border-slate-700/30 transition-colors ${pending ? 'bg-red-950/30' : i % 2 === 0 ? '' : 'bg-[#111422]'}`}
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 shrink-0 mt-0.5">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                      e.tx_type === 'IN'
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : pending ? 'border-red-500 bg-red-500/20' : 'border-rose-500 bg-rose-500/20'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${REASON_COLOR[e.reason_code] ?? 'text-slate-400 bg-slate-400/10'}`}>
                          {e.tx_type === 'IN' ? '▲' : '▼'} {REASON_LABEL[e.reason_code] ?? e.reason_code}
                        </span>
                        <p className="text-xs text-slate-300 font-medium mt-1 truncate">{e.product_name}</p>
                        <p className="text-[10px] text-slate-600 font-mono">{e.sku_code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black font-mono ${e.tx_type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {e.tx_type === 'IN' ? '+' : '-'}{fmt(e.quantity)}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">
                          {fmt(e.opening_stock)} → {fmt(e.closing_stock)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <p className="text-[10px] text-slate-600">{fmtDt(e.created_at)} · {e.created_by}</p>
                      {pending && (
                        <button
                          onClick={() => onApprove(e.id)}
                          className="text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded hover:bg-amber-500/30 transition-colors"
                        >
                          APPROVE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product Autocomplete ──────────────────────────────────────────────────────

function ProductSearch({ value, onChange }: {
  value: { id: string; label: string };
  onChange: (p: { id: string; label: string }) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await apiFetch<Product[]>(`/products/search?q=${encodeURIComponent(q)}`);
        setResults(r); setOpen(true);
      } catch { setResults([]); }
    }, 250);
  }, [q]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder="Search SKU or product name…"
        value={value.id ? value.label : q}
        onChange={(e) => {
          if (value.id) onChange({ id: '', label: '' });
          setQ(e.target.value);
        }}
        onFocus={() => q && setOpen(true)}
        className="w-full bg-[#0d0f17] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e2436] border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange({ id: p.id, label: `${p.sku_code} – ${p.name}` }); setQ(''); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-[11px] font-mono text-blue-400">{p.sku_code}</span>
              <span className="text-sm text-slate-300 ml-2">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick-Action Modal ────────────────────────────────────────────────────────

function QuickActionModal({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<TransactForm>(BLANK_FORM);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isIN  = form.tx_type === 'IN';
  const reasons = isIN ? IN_REASONS : OUT_REASONS;

  const set = (k: keyof TransactForm, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(f => ({ ...f, reason_code: isIN ? 'PRODUCTION' : 'DAMAGED', batch_id: '', batch_code: '' }));
  }, [form.tx_type]);

  useEffect(() => {
    if (!isIN && form.product_id) {
      apiFetch<Batch[]>(`/batches/${form.product_id}`)
        .then(setBatches)
        .catch(() => setBatches([]));
    }
  }, [isIN, form.product_id]);

  const submit = async () => {
    setError('');
    if (!form.product_id) return setError('Select a product');
    if (!form.quantity || +form.quantity <= 0) return setError('Enter a valid quantity');
    if (isIN && !form.batch_code) return setError('Batch code required for Stock-IN');
    if (!isIN && !form.batch_id) return setError('Select a batch for Stock-OUT');

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        product_id:   form.product_id,
        tx_type:      form.tx_type,
        reason_code:  form.reason_code,
        quantity:     +form.quantity,
        reference_id: form.reference_id || null,
        created_by:   form.created_by || 'Operator',
        description:  form.description || null,
      };
      if (isIN) {
        body.batch_code      = form.batch_code;
        body.mfg_date        = form.mfg_date || null;
        body.expiry_date     = form.expiry_date || null;
        body.validity_months = form.validity_months ? +form.validity_months : null;
        body.rack_no         = form.rack_no || null;
      } else {
        body.batch_id = form.batch_id;
      }

      await apiFetch('/transact', { method: 'POST', body: JSON.stringify(body) });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-[#0d0f17] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500';
  const labelCls = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#141826] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h2 className="font-bold text-slate-100 text-base">Quick Stock Transaction</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Product */}
          <div>
            <label className={labelCls}>Product / SKU</label>
            <ProductSearch
              value={{ id: form.product_id, label: form.product_label }}
              onChange={({ id, label }) => setForm(f => ({ ...f, product_id: id, product_label: label }))}
            />
          </div>

          {/* IN / OUT toggle */}
          <div>
            <label className={labelCls}>Direction</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-600">
              {(['IN', 'OUT'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => set('tx_type', t)}
                  className={`flex-1 py-2.5 text-sm font-bold tracking-wide transition-colors ${
                    form.tx_type === t
                      ? t === 'IN'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-[#0d0f17] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t === 'IN' ? '▲ STOCK IN' : '▼ STOCK OUT'}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className={labelCls}>Reason Code</label>
            <div className="flex flex-wrap gap-1.5">
              {reasons.map(r => (
                <button
                  key={r}
                  onClick={() => set('reason_code', r)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                    form.reason_code === r
                      ? (REASON_COLOR[r] ?? 'text-slate-200 bg-slate-600') + ' border-current'
                      : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300 bg-transparent'
                  }`}
                >
                  {REASON_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={labelCls}>Quantity</label>
            <input type="number" min={1} placeholder="0" value={form.quantity}
              onChange={e => set('quantity', e.target.value)} className={inputCls} />
          </div>

          {/* ── IN-specific fields ── */}
          {isIN && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Batch Code</label>
                  <input type="text" placeholder="BT-2024-001" value={form.batch_code}
                    onChange={e => set('batch_code', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Rack No.</label>
                  <input type="text" placeholder="A1-B2" value={form.rack_no}
                    onChange={e => set('rack_no', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mfg. Date</label>
                  <input type="date" value={form.mfg_date}
                    onChange={e => set('mfg_date', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" value={form.expiry_date}
                    onChange={e => set('expiry_date', e.target.value)} className={inputCls} />
                </div>
              </div>
              {!form.expiry_date && (
                <div>
                  <label className={labelCls}>Validity (months, if no expiry date)</label>
                  <input type="number" min={1} placeholder="12" value={form.validity_months}
                    onChange={e => set('validity_months', e.target.value)} className={inputCls} />
                </div>
              )}
            </>
          )}

          {/* ── OUT-specific fields ── */}
          {!isIN && (
            <div>
              <label className={labelCls}>Select Batch</label>
              {batches.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">
                  {form.product_id ? 'No available batches for this product.' : 'Select a product first.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {batches.map(b => {
                    const days = expiryDays(b.expiry_date);
                    const expColor = days === null ? 'text-slate-500' : days <= 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400';
                    return (
                      <button
                        key={b.id}
                        onClick={() => set('batch_id', b.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                          form.batch_id === b.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 bg-[#0d0f17] hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-slate-200">{b.batch_code}</span>
                          <span className="text-xs font-bold text-slate-400">{fmt(b.current_qty)} units</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className={`text-[10px] font-mono ${expColor}`}>
                            Exp: {fmtDate(b.expiry_date)}
                            {days !== null && ` (${days}d)`}
                          </span>
                          {b.rack_no && <span className="text-[10px] text-slate-600">Rack: {b.rack_no}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Shared optional fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Reference ID</label>
              <input type="text" placeholder="PO-12345 / DC-789" value={form.reference_id}
                onChange={e => set('reference_id', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Operator Name</label>
              <input type="text" placeholder="Operator" value={form.created_by}
                onChange={e => set('created_by', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes / Description</label>
            <textarea rows={2} placeholder="Optional notes…" value={form.description}
              onChange={e => set('description', e.target.value)}
              className={inputCls + ' resize-none'} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 shrink-0">
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-slate-700 hover:bg-slate-700/50 transition-colors">
              Cancel
            </button>
            <button onClick={submit} disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                isIN ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`}>
              {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {submitting ? 'Processing…' : isIN ? 'Commit Stock IN' : 'Commit Stock OUT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Passbook Ledger ───────────────────────────────────────────────────────────

function PassbookLedger({ refreshKey }: { refreshKey: number }) {
  const [filters, setFilters] = useState<LedgerFilters>({ date_from: '', date_to: '', sku: '', reason: '' });
  const [applied, setApplied] = useState<LedgerFilters>(filters);
  const [rows, setRows]     = useState<LedgerRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (applied.date_from) qs.set('date_from', applied.date_from);
      if (applied.date_to)   qs.set('date_to', applied.date_to);
      if (applied.sku)       qs.set('sku', applied.sku);
      if (applied.reason)    qs.set('reason', applied.reason);
      qs.set('skip',  String(page * limit));
      qs.set('limit', String(limit));
      const res = await apiFetch<{ total: number; items: LedgerRow[] }>(`/ledger?${qs}`);
      setRows(res.items);
      setTotal(res.total);
    } catch { setRows([]); }
    finally  { setLoading(false); }
  }, [applied, page, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => { setApplied(filters); setPage(0); };
  const clearFilters = () => {
    const blank = { date_from: '', date_to: '', sku: '', reason: '' };
    setFilters(blank); setApplied(blank); setPage(0);
  };

  const thCls = 'px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-left';
  const tdCls = 'px-3 py-3 text-sm text-slate-300 font-mono';

  return (
    <div className="bg-[#141826] border border-slate-700/50 rounded-xl overflow-hidden">
      {/* Filters bar */}
      <div className="px-5 py-3.5 border-b border-slate-700/50 flex flex-wrap gap-2 items-end">
        <h2 className="text-sm font-bold text-slate-200 mr-2 self-center">Passbook Ledger</h2>
        <input type="date" value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
          className="bg-[#0d0f17] border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500" />
        <input type="date" value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
          className="bg-[#0d0f17] border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500" />
        <input type="text" placeholder="SKU search…" value={filters.sku}
          onChange={e => setFilters(f => ({ ...f, sku: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className="bg-[#0d0f17] border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 w-32" />
        <select value={filters.reason}
          onChange={e => setFilters(f => ({ ...f, reason: e.target.value }))}
          className="bg-[#0d0f17] border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">All Reasons</option>
          {ALL_REASONS.map(r => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
        </select>
        <button onClick={applyFilters}
          className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
          Apply
        </button>
        {(applied.date_from || applied.date_to || applied.sku || applied.reason) && (
          <button onClick={clearFilters}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-600 text-slate-400 hover:text-slate-200 rounded-lg transition-colors">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600 self-center">{total} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-[#111422]">
              <th className={thCls}>Timestamp</th>
              <th className={thCls}>Product / SKU</th>
              <th className={thCls}>Batch</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Reason</th>
              <th className={thCls + ' text-right'}>Δ Qty</th>
              <th className={thCls}>Stock Balance</th>
              <th className={thCls}>Operator</th>
              <th className={thCls}>Ref / Notes</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-16">
                  <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-slate-600">No ledger entries found</td>
              </tr>
            ) : rows.map((r, i) => {
              const days = expiryDays(r.expiry_date);
              const expColor = days === null ? 'text-slate-500' : days <= 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-emerald-400';
              return (
                <tr key={r.id} className={`transition-colors ${!r.approved ? 'bg-red-950/20' : i % 2 === 0 ? '' : 'bg-[#111422]/50'} hover:bg-slate-700/20`}>
                  <td className={tdCls + ' text-[11px] text-slate-500 whitespace-nowrap'}>{fmtDt(r.created_at)}</td>
                  <td className="px-3 py-3 min-w-[140px]">
                    <p className="text-xs font-semibold text-slate-200">{r.product_name}</p>
                    <p className="text-[10px] font-mono text-slate-600">{r.sku_code}</p>
                  </td>
                  <td className="px-3 py-3 text-[11px]">
                    <p className="font-mono text-slate-400">{r.batch_code ?? '—'}</p>
                    {r.expiry_date && (
                      <p className={`text-[10px] font-mono ${expColor}`}>Exp {fmtDate(r.expiry_date)}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${r.tx_type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {r.tx_type}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${REASON_COLOR[r.reason_code] ?? 'text-slate-400 bg-slate-400/10'}`}>
                      {REASON_LABEL[r.reason_code] ?? r.reason_code}
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-right font-mono font-bold text-sm ${r.tx_type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.tx_type === 'IN' ? '+' : '-'}{fmt(r.quantity)}
                  </td>
                  <td className="px-3 py-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    {fmt(r.opening_stock)} → {fmt(r.closing_stock)}
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">{r.created_by}</td>
                  <td className="px-3 py-3 max-w-[160px]">
                    {r.reference_id && <p className="text-[10px] font-mono text-blue-400 truncate">{r.reference_id}</p>}
                    {r.description && <p className="text-[10px] text-slate-600 truncate">{r.description}</p>}
                  </td>
                  <td className="px-3 py-3">
                    {String(r.status || '').toUpperCase() === 'REJECTED' ? (
                      <span className="text-[10px] font-bold text-rose-400">REJECTED</span>
                    ) : r.approved || String(r.status || '').toUpperCase() === 'POSTED' ? (
                      <span className="text-[10px] font-bold text-emerald-400">POSTED</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 animate-pulse">PENDING</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-600">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-700 text-slate-400 rounded-lg disabled:opacity-30 hover:bg-slate-700/50 transition-colors">
              ← Prev
            </button>
            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-700 text-slate-400 rounded-lg disabled:opacity-30 hover:bg-slate-700/50 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InventoryLedger() {
  const [kpi, setKpi]           = useState<KPI | null>(null);
  const [feed, setFeed]         = useState<LiveEntry[]>([]);
  const [showModal, setModal]   = useState(false);
  const [refreshKey, setRefresh] = useState(0);
  const [kpiLoading, setKpiLoad] = useState(true);

  const loadKpi = useCallback(async () => {
    try {
      const k = await apiFetch<KPI>('/kpis');
      setKpi(k);
    } catch { /* silent */ }
    finally { setKpiLoad(false); }
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      const f = await apiFetch<LiveEntry[]>('/live-feed');
      setFeed(f);
    } catch { /* silent */ }
  }, []);

  const refresh = useCallback(() => {
    loadKpi();
    loadFeed();
    setRefresh(k => k + 1);
  }, [loadKpi, loadFeed]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({ approved_by: 'Admin' }),
      });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Approval failed');
    }
  };

  const kpiSkeleton = (
    <div className="h-16 bg-slate-700/30 rounded-xl animate-pulse" />
  );

  return (
    <div className="min-h-screen bg-[#0d0f17] text-slate-200 font-sans">

      {/* Top Bar */}
      <header className="border-b border-slate-700/50 bg-[#141826]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-slate-100 text-sm tracking-tight">Inventory WMS</span>
            <span className="text-slate-600 text-xs font-mono hidden sm:block">Ledger & Batch Control</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Transaction
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Block 1 – KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiLoading ? (
            [1, 2, 3, 4].map(i => <div key={i}>{kpiSkeleton}</div>)
          ) : kpi ? (
            <>
              <KpiCard
                label="Total Available Stock"
                value={kpi.available}
                note="Approved IN minus approved OUT"
                border="border-emerald-500/40"
                textColor="text-emerald-400"
                icon={<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              />
              <KpiCard
                label="Near Expiry < 30 Days"
                value={kpi.near_expiry}
                note="Needs immediate attention"
                border="border-amber-500/40"
                textColor="text-amber-400"
                icon={<svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
              />
              <KpiCard
                label="Expired Pool"
                value={kpi.expired_pool}
                note="Auto-swept by system"
                border="border-red-500/40"
                textColor="text-red-400"
                icon={<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
              />
              <KpiCard
                label="Pending Approval"
                value={kpi.pending_approval}
                note="Stolen / Damaged — awaiting admin"
                border="border-purple-500/40"
                textColor="text-purple-400"
                icon={<svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </>
          ) : null}
        </div>

        {/* Block 2 + Ledger layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">

          {/* Block 2 – Live Feed */}
          <div className="h-[560px]">
            <LiveFeed entries={feed} onApprove={handleApprove} />
          </div>

          {/* Block 4 – Passbook Ledger */}
          <PassbookLedger refreshKey={refreshKey} />
        </div>
      </div>

      {/* Block 3 – Quick Action Modal */}
      {showModal && (
        <QuickActionModal
          onClose={() => setModal(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
