'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import type { VendorInventoryItem } from '@/types';

export default function VendorInventoryPage() {
  const [items, setItems] = useState<VendorInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.vendor.getInventory()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} products in your store</p>
        </div>
        <Link
          href="/vendor/purchase-orders"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Request Stock
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-3">No products in inventory yet</p>
            <Link href="/vendor/purchase-orders" className="text-blue-600 font-semibold text-sm hover:underline">
              Create a purchase order to get started
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Total Stock</th>
                <th className="px-6 py-3">Reserved</th>
                <th className="px-6 py-3">Available</th>
                <th className="px-6 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const isLow = item.available_stock < 10;
                return (
                  <tr key={item.id} className={`transition-colors ${isLow ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.product_price !== undefined ? `₹${item.product_price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 font-medium">{item.stock}</td>
                    <td className="px-6 py-4 text-gray-500">{item.reserved_stock}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                        {item.available_stock}
                        {isLow && (
                          <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Low</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
