'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import type { VendorInventoryItem, Order } from '@/types';

export default function VendorDashboard() {
  const [inventory, setInventory] = useState<VendorInventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.vendor.getInventory(),
      api.vendor.getOrders({ limit: 5 }),
    ])
      .then(([inv, ord]) => {
        setInventory(inv);
        setOrders(ord);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalStock = inventory.reduce((s, i) => s + i.available_stock, 0);
  const lowStock = inventory.filter((i) => i.available_stock < 10).length;
  const pendingOrders = orders.filter((o) => o.status === 'paid').length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your store overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Products in Stock</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{inventory.length}</p>
          <p className="text-xs text-gray-400 mt-1">{totalStock} total units available</p>
        </div>
        <div className={`bg-white rounded-2xl border p-5 shadow-sm ${lowStock > 0 ? 'border-red-200' : 'border-gray-100'}`}>
          <p className="text-sm text-gray-500 font-medium">Low Stock Items</p>
          <p className={`text-3xl font-bold mt-1 ${lowStock > 0 ? 'text-red-600' : 'text-gray-400'}`}>{lowStock}</p>
          <p className="text-xs text-gray-400 mt-1">Items below 10 units</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Awaiting Confirmation</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{pendingOrders}</p>
          <p className="text-xs text-gray-400 mt-1">Paid orders to confirm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/vendor/inventory" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Inventory</h3>
          <p className="text-sm text-gray-400 mt-1">View your product stock levels</p>
        </Link>

        <Link href="/vendor/purchase-orders" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-yellow-200 transition-colors">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Request Stock</h3>
          <p className="text-sm text-gray-400 mt-1">Create a purchase order</p>
        </Link>

        <Link href="/vendor/orders" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Customer Orders</h3>
          <p className="text-sm text-gray-400 mt-1">Confirm and manage orders</p>
        </Link>
      </div>
    </div>
  );
}
