'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/services/api';
import type { VendorStockRow } from '@/types';

export default function AdminVendorStockPage() {
  const [rows, setRows] = useState<VendorStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  useEffect(() => {
    api.admin.getVendorStock().then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.vendor_city).filter(Boolean))).sort() as string[],
    [rows],
  );

  const vendors = useMemo(() => {
    const map = new Map<number, string>();
    rows.forEach((r) => {
      if (r.vendor_id && r.vendor_name) map.set(r.vendor_id, r.vendor_name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (onlyLowStock && !r.is_low_stock) return false;
    if (cityFilter && r.vendor_city !== cityFilter) return false;
    if (vendorFilter && String(r.vendor_id) !== vendorFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.vendor_name?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q) ||
        r.vendor_city?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowCount = rows.filter((r) => r.is_low_stock).length;
  const hasFilters = !!(cityFilter || vendorFilter || search || onlyLowStock);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Stock</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {rows.length} inventory items across all vendors
          {lowCount > 0 && (
            <span className="ml-2 text-red-600 font-semibold">&bull; {lowCount} low stock</span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search product or vendor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-56"
        />

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All vendors</option>
          {vendors.map(([id, name]) => (
            <option key={id} value={String(id)}>{name}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          <span className="text-sm font-medium text-gray-600">Low stock only</span>
        </label>

        {hasFilters && (
          <button
            onClick={() => { setCityFilter(''); setVendorFilter(''); setSearch(''); setOnlyLowStock(false); }}
            className="text-sm text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No stock data found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3">Reserved</th>
                <th className="px-6 py-3">Available</th>
                <th className="px-6 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`transition-colors ${r.is_low_stock ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{r.vendor_name}</td>
                  <td className="px-6 py-4 text-gray-500">{r.vendor_city}</td>
                  <td className="px-6 py-4 text-gray-800">{r.product_name}</td>
                  <td className="px-6 py-4 text-gray-600">₹{r.product_price?.toFixed(2)}</td>
                  <td className="px-6 py-4 font-medium">{r.stock}</td>
                  <td className="px-6 py-4 text-gray-500">{r.reserved_stock}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${r.is_low_stock ? 'text-red-600' : 'text-emerald-600'}`}>
                      {r.available}
                      {r.is_low_stock && (
                        <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                          Low
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(r.updated_at).toLocaleDateString()}
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
