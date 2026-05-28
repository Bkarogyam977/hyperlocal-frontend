'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { PurchaseOrder, Product, POStatus } from '@/types';

const STATUS_COLORS: Record<POStatus, string> = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved:   'bg-blue-50 text-blue-700 border-blue-200',
  dispatched: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered:  'bg-green-50 text-green-700 border-green-200',
  rejected:   'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<POStatus, string> = {
  pending:    'Pending',
  approved:   'Approved',
  dispatched: 'Dispatched',
  delivered:  'Delivered',
  rejected:   'Rejected',
};

type FormRow = { product_id: string; quantity: string };

const emptyRow = (): FormRow => ({ product_id: '', quantity: '' });

export default function VendorPurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FormRow[]>([emptyRow()]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrders = () =>
    api.purchaseOrders.listVendor().then(setOrders).catch(console.error);

  // Dedicated effect: fetch full product catalogue independently of orders
  useEffect(() => {
    api.products
      .list({ limit: 100 })
      .then(setAvailableProducts)
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, []);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, []);

  const addRow = () => setRows((r) => [...r, emptyRow()]);

  const removeRow = (i: number) =>
    setRows((r) => r.length > 1 ? r.filter((_, idx) => idx !== i) : r);

  const updateRow = (i: number, field: keyof FormRow, value: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const invalid = rows.some((r) => !r.product_id || !r.quantity || parseInt(r.quantity) < 1);
    if (invalid) {
      setFormError('All rows must have a product and a quantity ≥ 1.');
      return;
    }

    // Detect duplicate products in the form
    const ids = rows.map((r) => r.product_id);
    if (new Set(ids).size !== ids.length) {
      setFormError('Duplicate products detected. Combine quantities instead.');
      return;
    }

    setSubmitting(true);
    try {
      await api.purchaseOrders.create({
        items: rows.map((r) => ({
          product_id: parseInt(r.product_id),
          quantity: parseInt(r.quantity),
        })),
        notes: notes.trim() || undefined,
      });
      setRows([emptyRow()]);
      setNotes('');
      setSuccess('Purchase order submitted successfully.');
      await loadOrders();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">Request stock from the warehouse</p>
      </div>

      {/* ── Create PO Form ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">New Stock Request</h2>

        {formError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
            {formError}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2 mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_120px_36px] gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              <span>Product</span>
              <span>Quantity</span>
              <span />
            </div>

            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_36px] gap-2 items-center">
                <select
                  required
                  disabled={productsLoading}
                  value={row.product_id}
                  onChange={(e) => updateRow(i, 'product_id', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-wait"
                >
                  <option value="">
                    {productsLoading ? 'Loading products…' : 'Select product…'}
                  </option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} — ₹{p.price.toFixed(2)}
                    </option>
                  ))}
                </select>

                <input
                  required
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Remove row"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add row */}
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add another product
          </button>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the admin…"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>

      {/* ── PO History ── */}
      <h2 className="font-semibold text-gray-800 mb-3">My Purchase Orders</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No purchase orders yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">PO #</th>
                <th className="px-6 py-3">Products</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Admin Notes</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-6 py-4 font-medium text-gray-900">#{po.id}</td>
                  <td className="px-6 py-4 text-gray-800">
                    <div className="space-y-0.5">
                      {po.items.map((item, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">
                            {item.product?.name ?? `Product #${item.product_id}`}
                          </span>
                          <span className="text-gray-400 ml-1">× {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {po.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">{po.notes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[po.status]}`}>
                      {STATUS_LABELS[po.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs italic">
                    {po.admin_notes || '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(po.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
