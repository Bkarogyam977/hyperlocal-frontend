'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import type { WarehouseInventoryRow } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WmsKPI {
  available: number;
  near_expiry: number;
  expired_pool: number;
  pending_approval: number;
}

interface WmsBatch {
  id: string;
  batch_code: string;
  expiry_date: string | null;
  current_qty: number;
  rack_no: string | null;
}

interface LedgerRow {
  id: string;
  tx_type: 'IN' | 'OUT';
  reason_code: string;
  quantity: number;
  opening_stock: number;
  closing_stock: number;
  approved: boolean;
  status?: string;
  created_by: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  sku_code: string;
  product_name: string;
  batch_code: string | null;
  expiry_date: string | null;
  invoice_no: string | null;
  mfg_date: string | null;
  lab_tested: boolean | null;
  packaging_type: string | null;
  destination_vendor_id: string | null;
  online_order_id: string | null;
}

interface VendorOption { id: number; name: string; city: string; }
interface LedgerFilters { date_from: string; date_to: string; sku: string; reason: string; }
interface RowSegment { green: number; amber: number; red: number; total_batches: number; }
interface ProductOption { sku: string; name: string; }

interface TxForm {
  sku: string;
  batch_no: string;
  typeGroup: 'IN' | 'OUT';
  txType: string;
  reason: string;
  delta_qty: string;
  operator: string;
  invoice_no: string;
  mfg_date: string;
  expiry_date: string;
  lab_tested: boolean;
  packaging_type: string;
  destination_vendor_id: string;
  online_order_id: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const IN_OPTIONS = [
  { label: 'Production Receipt', value: 'PRODUCTION_IN' },
  { label: 'Customer Return',    value: 'CUSTOMER_RETURN_IN' },
];

const OUT_OPTIONS = [
  { label: 'Vendor Distribution', value: 'VENDOR_SALE_OUT' },
  { label: 'Online Order',        value: 'ONLINE_ORDER_OUT' },
  { label: 'Damage Scrap',        value: 'DAMAGE_SCRAP' },
  { label: 'Expiry Scrap',        value: 'EXPIRY_SCRAP' },
];

const PACKAGING_OPTIONS = ['Bottle', 'Jar', 'Blister Pack', 'Pouch'];

const TX_LABEL: Record<string, string> = {
  PRODUCTION_IN:     'Production Receipt',
  CUSTOMER_RETURN_IN:'Customer Return',
  VENDOR_SALE_OUT:   'Vendor Distribution',
  ONLINE_ORDER_OUT:  'Online Order',
  DAMAGE_SCRAP:      'Damage Scrap',
  EXPIRY_SCRAP:      'Expiry Scrap',
  SAMPLE_DEMO:       'Sample / Demo',
};

const TX_COLOR: Record<string, string> = {
  PRODUCTION_IN:     'text-emerald-400 bg-emerald-400/10',
  CUSTOMER_RETURN_IN:'text-cyan-400 bg-cyan-400/10',
  VENDOR_SALE_OUT:   'text-blue-400 bg-blue-400/10',
  ONLINE_ORDER_OUT:  'text-violet-400 bg-violet-400/10',
  DAMAGE_SCRAP:      'text-orange-400 bg-orange-400/10',
  EXPIRY_SCRAP:      'text-rose-500 bg-rose-500/10',
  SAMPLE_DEMO:       'text-purple-400 bg-purple-400/10',
};

const ALL_WORKFLOW_TYPES = [
  'PRODUCTION_IN', 'CUSTOMER_RETURN_IN',
  'VENDOR_SALE_OUT', 'ONLINE_ORDER_OUT',
  'DAMAGE_SCRAP', 'EXPIRY_SCRAP', 'SAMPLE_DEMO',
];

const BLANK_TX: TxForm = {
  sku: '', batch_no: '', typeGroup: 'IN', txType: 'PRODUCTION_IN',
  reason: '', delta_qty: '', operator: 'Operator',
  invoice_no: '', mfg_date: '', expiry_date: '', lab_tested: true,
  packaging_type: '', destination_vendor_id: '', online_order_id: '',
};

// ── Expiry colour-coding ──────────────────────────────────────────────────────

const FIXED_DATE = new Date('2026-05-18T00:00:00.000Z');

function batchState(expiryDate: string | null): { label: string; color: string; bg: string } {
  if (!expiryDate) return { label: 'Good', color: '#10B981', bg: '#10B9811A' };
  const exp  = new Date(expiryDate);
  const diff = Math.ceil((exp.getTime() - FIXED_DATE.getTime()) / 86_400_000);
  if (diff <= 0)  return { label: 'Expired / Quarantined', color: '#F43F5E', bg: '#F43F5E1A' };
  if (diff <= 30) return { label: 'Near-expiry',           color: '#F97316', bg: '#F973161A' };
  return               { label: 'Good',                    color: '#10B981', bg: '#10B9811A' };
}

// ── Utils ─────────────────────────────────────────────────────────────────────

const fmt      = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const fmtRupee = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtDt = (s: string) =>
  new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

async function wmsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}/wms${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchVendors(): Promise<VendorOption[]> {
  try {
    const data = await apiFetch<{ id: number; name: string; shop_name?: string | null }[]>('/admin/vendor-users');
    return data.map(v => ({ id: v.id, name: v.shop_name || v.name, city: '' }));
  } catch {
    return [];
  }
}

function batchesToSegment(batches: WmsBatch[]): RowSegment {
  const now = Date.now();
  let green = 0, amber = 0, red = 0;
  for (const b of batches) {
    if (!b.expiry_date) { green += b.current_qty; continue; }
    const days = Math.ceil((new Date(b.expiry_date).getTime() - now) / 86_400_000);
    if (days <= 0)       red   += b.current_qty;
    else if (days <= 30) amber += b.current_qty;
    else                 green += b.current_qty;
  }
  return { green, amber, red, total_batches: batches.length };
}

function stockToSegment(row: WarehouseInventoryRow): RowSegment {
  const quarantined = Math.max(0, row.stock - row.available - row.reserved_stock);
  return { green: row.available, amber: row.reserved_stock, red: quarantined, total_batches: 0 };
}

// ── Segmented Progress Bar ────────────────────────────────────────────────────

function SegmentBar({ seg }: { seg: RowSegment }) {
  const total = seg.green + seg.amber + seg.red;
  if (total === 0) return <span className="text-xs text-slate-600 font-mono">—</span>;
  const gp = (seg.green / total) * 100;
  const ap = (seg.amber / total) * 100;
  const rp = (seg.red   / total) * 100;
  return (
    <div className="space-y-1.5 min-w-32">
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-700 w-32">
        {gp > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${gp}%` }} />}
        {ap > 0 && <div className="h-full bg-amber-500 transition-all"   style={{ width: `${ap}%` }} />}
        {rp > 0 && <div className="h-full bg-rose-600 transition-all"    style={{ width: `${rp}%` }} />}
      </div>
      <div className="flex gap-2 text-[9px] font-mono leading-none">
        {seg.green > 0 && <span className="text-emerald-400">{fmt(seg.green)}</span>}
        {seg.amber > 0 && <span className="text-amber-400">{fmt(seg.amber)} ⚠</span>}
        {seg.red   > 0 && <span className="text-rose-500">{fmt(seg.red)} ✕</span>}
      </div>
    </div>
  );
}

// ── Inline Stock Editor ───────────────────────────────────────────────────────

function StockCell({ row, onSaved }: { row: WarehouseInventoryRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(String(row.stock));
  const [saving, setSaving]   = useState(false);
  const ref                   = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = async () => {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.warehouse.updateStock(row.product_id, n);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating stock');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={ref} type="number" min={0} value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 bg-slate-900 border border-emerald-500 rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none"
        />
        <button onClick={save} disabled={saving}
          className="text-xs font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 px-2 py-1 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? '…' : '✓'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-slate-600 hover:text-slate-400 px-1">✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => { setValue(String(row.stock)); setEditing(true); }}
      className="flex items-center gap-1.5 group text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
      <span>{row.stock}</span>
      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

// ── SKU Searchable Combobox ───────────────────────────────────────────────────

function SkuCombobox({ options, onSelect, inputCls }: {
  options: ProductOption[];
  onSelect: (sku: string) => void;
  inputCls: string;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hits = options.filter(o =>
    !text ||
    o.name.toLowerCase().includes(text.toLowerCase()) ||
    o.sku.toLowerCase().includes(text.toLowerCase())
  ).slice(0, 40);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text" value={text}
        onChange={e => { setText(e.target.value); setOpen(true); onSelect(''); }}
        onFocus={() => setOpen(true)}
        placeholder="Search product name or SKU…"
        className={inputCls}
        autoComplete="off"
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-slate-900 border border-slate-600 rounded-xl shadow-2xl py-1">
          {hits.map(o => (
            <li key={o.sku}>
              <button type="button"
                onMouseDown={() => { setText(o.name); onSelect(o.sku); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors border-b border-slate-700/30 last:border-0">
                <p className="text-sm font-medium text-slate-200 truncate">{o.name}</p>
                <p className="text-[10px] font-mono text-slate-500">{o.sku}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Transaction Modal ─────────────────────────────────────────────────────────

function TransactionModal({ onClose, onSuccess, inventoryRows }: {
  onClose: () => void;
  onSuccess: () => void;
  inventoryRows: WarehouseInventoryRow[];
}) {
  const [form, setForm]       = useState<TxForm>(BLANK_TX);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [busy, setBusy]       = useState(false);
  const [err,  setErr]        = useState('');
  const [ok,   setOk]         = useState('');

  useEffect(() => {
    if (form.txType === 'VENDOR_SALE_OUT') {
      fetchVendors().then(setVendors);
    }
  }, [form.txType]);

  const set = <K extends keyof TxForm>(k: K, v: TxForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const switchGroup = (g: 'IN' | 'OUT') =>
    setForm(f => ({
      ...f,
      typeGroup:            g,
      txType:               g === 'IN' ? IN_OPTIONS[0].value : OUT_OPTIONS[0].value,
      destination_vendor_id:'',
      online_order_id:      '',
    }));

  const productOptions: ProductOption[] = inventoryRows.map(r => ({
    sku:  r.sku ?? `SKU-${String(r.product_id).padStart(4, '0')}`,
    name: r.product_name ?? `Product #${r.product_id}`,
  }));

  const submit = async () => {
    setErr(''); setOk('');
    if (!form.sku.trim())                    return setErr('Select a product / SKU');
    if (!form.delta_qty || +form.delta_qty <= 0) return setErr('Quantity must be > 0');
    setBusy(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const payload: Record<string, unknown> = {
        sku:       form.sku,
        batch_no:  form.batch_no || undefined,
        type:      form.txType,
        reason:    form.reason || undefined,
        delta_qty: +form.delta_qty,
        operator:  form.operator,
        invoice_no:            form.invoice_no   || undefined,
        mfg_date:              form.mfg_date     || undefined,
        expiry_date:           form.expiry_date  || undefined,
        lab_tested:            form.lab_tested,
        packaging_type:        form.packaging_type        || undefined,
        destination_vendor_id: form.destination_vendor_id || undefined,
        online_order_id:       form.online_order_id       || undefined,
      };
      // ─── ISI COFFE KO PURA SAAF CHIPKAO (Line 389-393) ───
const res = await fetch('http://localhost:8000/inventory/transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(payload),
});
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setOk(data.message || (form.typeGroup === 'IN' ? 'Stock IN posted.' : 'Submitted for approval.'));
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  };

  const inp = 'w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500';
  const isIn  = form.typeGroup === 'IN';
  const isOut = form.typeGroup === 'OUT';
  const isVendor = form.txType === 'VENDOR_SALE_OUT';
  const isOnline = form.txType === 'ONLINE_ORDER_OUT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h2 className="font-bold text-slate-100 text-base">New Stock Transaction</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Direction Toggle */}
          <div className="flex gap-2 p-1 bg-slate-900 border border-slate-700 rounded-xl">
            {(['IN', 'OUT'] as const).map(g => (
              <button key={g} type="button" onClick={() => switchGroup(g)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  form.typeGroup === g
                    ? g === 'IN'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-red-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                {g === 'IN' ? '▲ STOCK IN' : '▼ STOCK OUT'}
              </button>
            ))}
          </div>

          {/* Product */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product / SKU</label>
            <SkuCombobox options={productOptions} onSelect={sku => set('sku', sku)} inputCls={inp} />
            {form.sku && <p className="text-[10px] font-mono text-emerald-500 mt-1">{form.sku}</p>}
          </div>

          {/* Workflow Type + Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
              <select value={form.txType} onChange={e => set('txType', e.target.value)}
                className={inp + ' cursor-pointer'}>
                {(isIn ? IN_OPTIONS : OUT_OPTIONS).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
              <input type="number" min={1} placeholder="0" value={form.delta_qty}
                onChange={e => set('delta_qty', e.target.value)} className={inp} />
            </div>
          </div>

          {/* Batch No */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Batch No.</label>
            <input type="text" placeholder="e.g. B-AROG-2026" value={form.batch_no}
              onChange={e => set('batch_no', e.target.value)} className={inp} />
          </div>

          {/* ── IN-specific fields ──────────────────────────────────────────── */}
          {isIn && (
            <div className="space-y-3 border border-emerald-700/30 bg-emerald-900/10 rounded-xl px-4 py-4">
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Inbound Details</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice No.</label>
                  <input type="text" placeholder="INV-2026-001" value={form.invoice_no}
                    onChange={e => set('invoice_no', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mfg. Date</label>
                  <input type="date" value={form.mfg_date}
                    onChange={e => set('mfg_date', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date}
                    onChange={e => set('expiry_date', e.target.value)} className={inp} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Packaging</label>
                <select value={form.packaging_type} onChange={e => set('packaging_type', e.target.value)}
                  className={inp + ' cursor-pointer'}>
                  <option value="">Select packaging…</option>
                  {PACKAGING_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <input type="checkbox" checked={form.lab_tested}
                  onChange={e => set('lab_tested', e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded" />
                <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                  Lab Tested / QC Passed
                </span>
                {form.lab_tested && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    ✓ QC PASSED
                  </span>
                )}
              </label>
            </div>
          )}

          {/* ── OUT-specific fields ─────────────────────────────────────────── */}
          {isOut && (
            <div className="space-y-3 border border-red-700/30 bg-red-900/10 rounded-xl px-4 py-4">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Outbound Details</p>

              {isVendor && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Vendor</label>
                  <select value={form.destination_vendor_id}
                    onChange={e => set('destination_vendor_id', e.target.value)}
                    className={inp + ' cursor-pointer'}>
                    <option value="">— Choose vendor —</option>
                    {vendors.map(v => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name}{v.city ? ` · ${v.city}` : ''}
                      </option>
                    ))}
                    {vendors.length === 0 && (
                      <option disabled value="">Loading vendors…</option>
                    )}
                  </select>
                </div>
              )}

              {isOnline && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Online Order ID</label>
                  <input type="text" placeholder="ORD-20260001" value={form.online_order_id}
                    onChange={e => set('online_order_id', e.target.value)} className={inp} />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Packaging</label>
                <select value={form.packaging_type} onChange={e => set('packaging_type', e.target.value)}
                  className={inp + ' cursor-pointer'}>
                  <option value="">Select packaging…</option>
                  {PACKAGING_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Operator + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Operator</label>
              <input type="text" placeholder="Operator name" value={form.operator}
                onChange={e => set('operator', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Notes (optional)</label>
              <input type="text" placeholder="Free-text notes" value={form.reason}
                onChange={e => set('reason', e.target.value)} className={inp} />
            </div>
          </div>

          {err && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>}
          {ok  && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">{ok}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex gap-2 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-slate-700 hover:bg-slate-700/50 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isIn ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
            }`}>
            {busy && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {busy ? 'Processing…' : isIn ? 'Commit Stock IN' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Smart Replenishment Alert ─────────────────────────────────────────────────

function ReplenishAlert({ rows }: { rows: WarehouseInventoryRow[] }) {
  const critical = rows.filter(r => r.available < 10);
  if (critical.length === 0) return null;
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <p className="text-sm font-bold text-amber-300">Smart Replenishment Alerts</p>
        <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
          {critical.length} SKU{critical.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {critical.slice(0, 6).map(r => (
          <div key={r.product_id} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-300 truncate flex-1">{r.product_name ?? `SKU #${r.product_id}`}</span>
            <span className={`text-xs font-bold ml-3 px-2 py-0.5 rounded-full ${r.available === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {r.available === 0 ? 'OUT' : `${r.available} left`}
            </span>
          </div>
        ))}
      </div>
      {critical.length > 6 && (
        <p className="text-xs text-amber-500/70">+{critical.length - 6} more SKUs need replenishment</p>
      )}
    </div>
  );
}

// ── Passbook Audit Trail (Accordion) ─────────────────────────────────────────

function PassbookAuditTrail({ refreshKey }: { refreshKey: number }) {
  const [filters, setFilters]   = useState<LedgerFilters>({ date_from: '', date_to: '', sku: '', reason: '' });
  const [applied, setApplied]   = useState<LedgerFilters>(filters);
  const [rows, setRows]         = useState<LedgerRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const limit = 50;

  const toggleRow = (id: string) =>
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (applied.date_from) qs.set('date_from', applied.date_from);
      if (applied.date_to)   qs.set('date_to',   applied.date_to);
      if (applied.sku)       qs.set('sku',        applied.sku);
      if (applied.reason)    qs.set('reason',     applied.reason);
      qs.set('skip',  String(page * limit));
      qs.set('limit', String(limit));

      const res = await wmsFetch<{ total: number; items: LedgerRow[] }>(`/ledger?${qs}`);
      if (res && typeof res === 'object' && 'items' in res) {
        setRows(Array.isArray(res.items) ? res.items : []);
        setTotal(res.total ?? 0);
      } else {
        setRows([]); setTotal(0);
      }
    } catch {
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [applied, page, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => { setApplied(filters); setPage(0); setExpandedRows(new Set()); };
  const clearFilters = () => {
    const blank = { date_from: '', date_to: '', sku: '', reason: '' };
    setFilters(blank); setApplied(blank); setPage(0); setExpandedRows(new Set());
  };

  const thCls = 'px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap';
  const tdCls = 'px-4 py-3 text-sm text-slate-300';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
      {/* Filters */}
      <div className="px-5 py-3.5 border-b border-slate-700 flex flex-wrap gap-2 items-end">
        <div className="flex items-center gap-2 mr-2 self-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-sm font-bold text-slate-200">Passbook Audit Trail</h2>
        </div>

        <input type="date" value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500" />
        <input type="date" value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500" />
        <input type="text" placeholder="SKU search…" value={filters.sku}
          onChange={e => setFilters(f => ({ ...f, sku: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 w-32" />
        <select value={filters.reason}
          onChange={e => setFilters(f => ({ ...f, reason: e.target.value }))}
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
          <option value="">All Types</option>
          {ALL_WORKFLOW_TYPES.map(t => (
            <option key={t} value={t}>{TX_LABEL[t] ?? t}</option>
          ))}
        </select>
        <button onClick={applyFilters}
          className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">Apply</button>
        {(applied.date_from || applied.date_to || applied.sku || applied.reason) && (
          <button onClick={clearFilters}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors">Clear</button>
        )}
        <span className="ml-auto text-xs text-slate-600 self-center">{total} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/50">
              <th className={thCls}>Date / Time</th>
              <th className={thCls}>Product</th>
              <th className={thCls + ' text-right'}>Δ Qty</th>
              <th className={thCls}>Action Type</th>
              <th className={thCls}>Operator</th>
              <th className={thCls}>Status</th>
              <th className={thCls + ' w-8'}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-slate-600 text-sm">
                  No ledger entries yet — submit a transaction to see history here.
                </td>
              </tr>
            ) : (
              rows.map(r => {
                const isExpanded = expandedRows.has(r.id);
                const isin       = r.tx_type === 'IN';
                const colorCls   = TX_COLOR[r.reason_code] ?? 'text-slate-400 bg-slate-400/10';

                return (
                  <Fragment key={r.id}>
                   {/* ── Warehouse Primary row ─────────────────────────────────────── */}
                    <tr
                      onClick={() => toggleRow(r.id)}
                      className="border-b border-slate-700/30 hover:bg-slate-700/25 cursor-pointer transition-colors"
                    >
                      <td className={tdCls + ' text-[11px] text-slate-500 whitespace-nowrap font-mono'}>
                        {fmtDt(r.created_at)}
                      </td>
                      <td className="px-4 py-3 min-w-40">
                        <p className="text-xs font-semibold text-slate-200 truncate">{r.product_name}</p>
                        <p className="text-[10px] font-mono text-slate-600">{r.sku_code}</p>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold text-base ${isin ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isin ? '+' : '−'}{fmt(r.quantity)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colorCls}`}>
                          {TX_LABEL[r.reason_code] ?? r.reason_code}
                        </span>
                      </td>
                      <td className={tdCls + ' text-[11px] text-slate-500'}>{r.created_by}</td>
                      
                     {/* 🎨 Warehouse Status Column (Foolproof Version) */}
<td className="px-4 py-3">
  {String(r.approved || '').toUpperCase() === '' || String(r.status || '').toUpperCase() === 'REJECTED' || (r as any).approved_status === 'REJECTED' ? (
    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
      REJECTED 
    </span>
  ) : r.approved || String(r.status || '').toUpperCase() === 'APPROVED' || String(r.status || '').toUpperCase() === 'POSTED' ? (
    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
      POSTED 
    </span>
  ) : (
    /* Agar upar ke dono niyam fail ho gaye, tabhi PENDING dikhayega */
    <span className="text-[10px] font-bold text-amber-400 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded">
      PENDING 
    </span>
  )}
</td>

                      <td className="px-4 py-3 text-slate-500">
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                    {/* ── Expandable sub-panel ─────────────────────────────── */}
                    <tr className="border-b border-slate-700/20">
                      <td colSpan={7} className="p-0">
                        <div
                          className="overflow-hidden transition-all duration-200 ease-in-out"
                          style={{ maxHeight: isExpanded ? '260px' : '0px', opacity: isExpanded ? 1 : 0 }}
                        >
                          <div className="px-6 py-4 bg-slate-900/60 flex flex-wrap gap-6">
                            {isin ? (
                              <>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Invoice No.</p>
                                  <p className="text-xs font-mono text-slate-300">{r.invoice_no ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Mfg. Date</p>
                                  <p className="text-xs font-mono text-slate-300">{fmtDate(r.mfg_date)}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Packaging</p>
                                  <p className="text-xs text-slate-300">{r.packaging_type ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Batch</p>
                                  <p className="text-xs font-mono text-slate-300">{r.batch_code ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Stock Balance</p>
                                  <p className="text-xs font-mono text-slate-400">{fmt(r.opening_stock)} → {fmt(r.closing_stock)}</p>
                                </div>
                                <div className="flex items-center">
                                  {r.lab_tested === true ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                                      ✓ QC Passed / Lab Tested
                                    </span>
                                  ) : r.lab_tested === false ? (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full">
                                      ✕ Lab Test Pending
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-600">QC status unknown</span>
                                  )}
                                </div>
                                {r.description && (
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Notes</p>
                                    <p className="text-xs text-slate-400 italic">{r.description}</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {r.destination_vendor_id && (
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Destination Vendor ID</p>
                                    <p className="text-xs font-mono text-blue-400">{r.destination_vendor_id}</p>
                                  </div>
                                )}
                                {r.online_order_id && (
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Online Order ID</p>
                                    <p className="text-xs font-mono text-violet-400">{r.online_order_id}</p>
                                  </div>
                                )}
                                {r.reference_id && !r.destination_vendor_id && !r.online_order_id && (
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Reference</p>
                                    <p className="text-xs font-mono text-slate-300">{r.reference_id}</p>
                                  </div>
                                )}
                                {r.packaging_type && (
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Packaging</p>
                                    <p className="text-xs text-slate-300">{r.packaging_type}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Stock Balance</p>
                                  <p className="text-xs font-mono text-slate-400">{fmt(r.opening_stock)} → {fmt(r.closing_stock)}</p>
                                </div>
                                {r.description && (
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Notes</p>
                                    <p className="text-xs text-slate-400 italic">{r.description}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryCommand() {
  const [rows, setRows]         = useState<WarehouseInventoryRow[]>([]);
  const [segments, setSegments] = useState<Record<number, RowSegment>>({});
  const [wmsKpi, setWmsKpi]     = useState<WmsKPI | null>(null);
  const [priceMap, setPriceMap] = useState<Record<number, number>>({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<'all' | 'critical' | 'out' | 'clearance'>('all');
  const [ledgerKey, setLedgerKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let inventory: WarehouseInventoryRow[] = [];
      try {
        inventory = await api.warehouse.getInventory();
        setRows(inventory);
      } catch (err) {
        console.error('warehouse/inventory fetch failed:', (err as Error)?.message);
        setRows([]);
      }

      setPriceMap(Object.fromEntries(inventory.map(r => [r.product_id, r.cost_price ?? 0])));

      wmsFetch<WmsKPI>('/kpis')
        .then(setWmsKpi)
        .catch(() => {});

      const virtualBatch = (qty: number, expiry: string | null): WmsBatch[] => [
        { id: 'virtual', batch_code: 'B-AROG-2026', expiry_date: expiry ?? '2028-12-31', current_qty: qty || 0, rack_no: null },
      ];

      const segMap: Record<number, RowSegment> = {};
      await Promise.all(inventory.map(async row => {
        try {
          const batches = await wmsFetch<WmsBatch[]>(`/batches/${row.product_id}`);
          const effective = Array.isArray(batches) && batches.length > 0
            ? batches : virtualBatch(row.stock, row.expiry_date);
          segMap[row.product_id] = batchesToSegment(effective);
        } catch {
          segMap[row.product_id] = batchesToSegment(virtualBatch(row.stock, row.expiry_date));
        }
      }));
      setSegments(segMap);
    } catch (err) {
      console.error('load error:', (err as Error)?.message);
      setRows([]); setPriceMap({}); setSegments({});
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => { load(); setLedgerKey(k => k + 1); }, [load]);
  useEffect(() => { refresh(); }, [refresh]);

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const totalSkus  = rows.length;
  const outOfStock = rows.filter(r => r.available === 0).length;
  const lowStock   = rows.filter(r => r.available > 0 && r.available < 10).length;

  const totalGreen = Object.values(segments).reduce((s, g) => s + g.green, 0);
  const totalUnits = rows.reduce((s, r) => s + r.stock, 0);
  const healthPct  = totalUnits > 0 ? Math.round((totalGreen / totalUnits) * 100) : 100;

  const lossExposure = rows.reduce((sum, row) => {
    const seg   = segments[row.product_id];
    const price = priceMap[row.product_id] ?? 0;
    return sum + (seg ? seg.red * price : 0);
  }, 0);

  // ── Filter logic ─────────────────────────────────────────────────────────────

  const filtered = rows.filter(r => {
    const matchSearch = !search || (r.product_name ?? '').toLowerCase().includes(search.toLowerCase());
    const seg = segments[r.product_id];
    const matchFilter =
      filter === 'out'       ? r.available === 0 :
      filter === 'critical'  ? r.available > 0 && r.available < 10 :
      filter === 'clearance' ? (seg ? seg.amber > 0 || seg.red > 0 : false) :
      true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Inventory Command</h1>
          <p className="text-sm text-slate-500 mt-0.5">SKU management · click stock values to edit inline</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total SKUs',    value: fmt(totalSkus),    color: '#10B981' },
          { label: 'Health Score',  value: `${healthPct}%`,   color: healthPct >= 75 ? '#10B981' : healthPct >= 50 ? '#F59E0B' : '#EF4444', note: 'Green units / total stock' },
          { label: 'Low Stock',     value: fmt(lowStock),     color: '#F59E0B' },
          { label: 'Out of Stock',  value: fmt(outOfStock),   color: '#EF4444' },
          { label: 'Loss Exposure', value: fmtRupee(lossExposure), color: lossExposure > 0 ? '#F43F5E' : '#6B7280', note: 'Expired / quarantined units' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-xl font-black mt-1 truncate" style={{ color: kpi.color }}>{kpi.value}</p>
            {kpi.note && <p className="text-[9px] text-slate-600 mt-0.5">{kpi.note}</p>}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Safe (&gt;30 days)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Near-expiry (≤30 days)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Expired / Quarantined</span>
      </div>

      {!loading && <ReplenishAlert rows={rows} />}

      {/* Filters + Search + New Transaction */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
          {([
            { key: 'all',      label: 'All SKUs' },
            { key: 'critical', label: '⚡ Critical (<10)' },
            { key: 'out',      label: '🔴 Out of Stock' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f.label}
            </button>
          ))}
          <button onClick={() => setFilter(f => f === 'clearance' ? 'all' : 'clearance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'clearance' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-400'
            }`}>
            ⚠️ Requires Clearance
          </button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product…"
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors w-52" />
        <button onClick={() => setModalOpen(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/30">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Transaction
        </button>
      </div>

      {modalOpen && (
        <TransactionModal onClose={() => setModalOpen(false)} onSuccess={refresh} inventoryRows={rows} />
      )}

      {/* Product Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-slate-600 text-sm">No products found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">SKU / Product</th>
                <th className="px-5 py-3" title="Click to edit">Stock ✎</th>
                <th className="px-5 py-3">Total Batches</th>
                <th className="px-5 py-3">Stock Segmentation</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(row => {
                const seg = segments[row.product_id] ?? stockToSegment(row);
                const available = row.available;
                const st = available === 0
                  ? { label: 'Out',      color: '#EF4444', bg: '#EF44441A' }
                  : available < 10
                  ? { label: 'Critical', color: '#F59E0B', bg: '#F59E0B1A' }
                  : available < 30
                  ? { label: 'Low',      color: '#FBBF24', bg: '#FBBF241A' }
                  : { label: 'Good',     color: '#10B981', bg: '#10B9811A' };
                const hasClearanceIssue = seg.amber > 0 || seg.red > 0;
                return (
                  <tr key={row.product_id}
                    className={`hover:bg-slate-700/30 transition-colors ${hasClearanceIssue && filter === 'clearance' ? 'bg-rose-950/10' : ''}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-200">{row.product_name ?? `Product #${row.product_id}`}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5">{row.sku ?? `SKU-${String(row.product_id).padStart(4, '0')}`}</p>
                    </td>
                    <td className="px-5 py-3.5"><StockCell row={row} onSaved={refresh} /></td>
                    <td className="px-5 py-3.5">
                      {seg.total_batches > 0
                        ? <span className="text-sm font-bold text-blue-400 font-mono">{seg.total_batches}</span>
                        : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><SegmentBar seg={seg} /></td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </span>
                      {seg.red > 0 && <p className="text-[9px] text-rose-500 mt-0.5 font-semibold">🔴 {fmt(seg.red)} expired</p>}
                      {seg.amber > 0 && seg.red === 0 && <p className="text-[9px] text-amber-500 mt-0.5 font-semibold">⚠ {fmt(seg.amber)} near-exp</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Passbook Audit Trail */}
      <div>
        <h2 className="text-base font-bold text-slate-300 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historical Ledger
        </h2>
        <PassbookAuditTrail refreshKey={ledgerKey} />
      </div>

    </div>
  );
}
