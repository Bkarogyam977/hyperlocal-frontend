'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import CartItemRow from '@/components/CartItem';
import { api } from '@/services/api';
import type { EstimateResponse } from '@/types';

const G = '#166534';

// Coords for common cities stored by the home page
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  mumbai:    { lat: 19.0760, lon: 72.8777 },
  delhi:     { lat: 28.6139, lon: 77.2090 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  chennai:   { lat: 13.0827, lon: 80.2707 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  pune:      { lat: 18.5204, lon: 73.8567 },
  kolkata:   { lat: 22.5726, lon: 88.3639 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  jaipur:    { lat: 26.9124, lon: 75.7873 },
  ghazipur:  { lat: 25.5771, lon: 83.5707 },
  varanasi:  { lat: 25.3176, lon: 82.9739 },
  lucknow:   { lat: 26.8467, lon: 80.9462 },
  noida:     { lat: 28.5355, lon: 77.3910 },
  patna:     { lat: 25.5941, lon: 85.1376 },
};

const SPEED_CONFIG: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  Express:  { bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', icon: '⚡' },
  Standard: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', icon: '🚚' },
  Economy:  { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '📦' },
};

const FALLBACK_ESTIMATE: EstimateResponse = {
  source: 'warehouse',
  vendor_id: null,
  delivery_speed: 'Economy',
  delivery_days: '5–7 Days',
  message: 'Standard Delivery (5–7 Business Days)',
  distance_km: null,
};

function parseStoredCity(userCity: string): { lat: number; lon: number; city: string } | null {
  // GPS format stored by home page: "19.0760, 72.8777"
  const m = userCity.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), city: userCity };

  const coords = CITY_COORDS[userCity.toLowerCase().trim()];
  if (coords) return { ...coords, city: userCity };

  return null;
}

export default function CartPage() {
  const { user } = useAuth();
  const { items, totalItems, totalPrice } = useCart();
  const router = useRouter();

  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Auto-trigger estimate on cart load using the forced location from home page
  useEffect(() => {
    if (!items.length) return;

    const userCity = localStorage.getItem('userCity') ?? '';
    const loc = parseStoredCity(userCity);
    if (!loc) return;

    setEstimating(true);
    api.orders
      .estimate({
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        customer_latitude: loc.lat,
        customer_longitude: loc.lon,
        customer_city: loc.city,
      })
      .then(setEstimate)
      .catch(() => setEstimate(FALLBACK_ESTIMATE))
      .finally(() => setEstimating(false));
  }, [items]);

  const handleCheckout = () => {
    if (!user) { router.push('/login'); return; }
    router.push('/checkout');
  };

  if (totalItems === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-4">&#x1F6D2;</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 text-sm mb-6">Add Ayurvedic products from the home page to get started.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-2xl transition-colors" style={{ backgroundColor: G }}>
          Browse Products
        </Link>
      </div>
    );
  }

  const speedCfg = estimate ? (SPEED_CONFIG[estimate.delivery_speed] ?? SPEED_CONFIG.Economy) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        <span className="text-sm text-gray-400">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-4">
        {/* Items */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          {items.map((item) => (
            <CartItemRow key={item.product.id} item={item} />
          ))}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Order Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal ({totalItems} items)</span>
              <span>&#x20B9;{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span className="font-medium" style={{ color: G }}>Free</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>&#x20B9;{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery speed badge */}
          {estimating && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Checking delivery options…
            </div>
          )}
          {!estimating && speedCfg && estimate && (
            <div
              className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border"
              style={{ backgroundColor: speedCfg.bg, borderColor: speedCfg.border, color: speedCfg.color }}
            >
              <span>{speedCfg.icon}</span>
              <span>{estimate.message}</span>
            </div>
          )}
        </div>

        {/* Savings highlight */}
        <div className="rounded-2xl p-3 flex items-center gap-2 text-sm" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <span>&#x1F331;</span>
          <p style={{ color: G }}>
            <span className="font-semibold">Free delivery</span> on all Ayurvedic orders
          </p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full py-4 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base shadow-lg"
          style={{ backgroundColor: G }}
        >
          Proceed to Checkout
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {!user && (
          <p className="text-center text-sm text-gray-400">
            You will be asked to{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: G }}>sign in</Link>
            {' '}before checkout.
          </p>
        )}
      </div>
    </div>
  );
}
