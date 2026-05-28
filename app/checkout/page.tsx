'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { api } from '@/services/api';
import type { EstimateResponse, OrderItem } from '@/types';

const G    = '#166534';
const GOLD = '#D97706';

const PAYMENT_METHODS = [
  { id: 'cod',  label: 'Cash on Delivery', icon: '&#x1F4B5;', desc: 'Pay when your order arrives' },
  { id: 'upi',  label: 'UPI',              icon: '&#x1F4F1;', desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'card', label: 'Card',             icon: '&#x1F4B3;', desc: 'Debit or Credit card' },
];

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

interface FormData {
  name: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  address: string;
  landmark: string;
  payment: string;
}

interface ShippingCoords { lat: number; lon: number; city: string }

interface SuccessData {
  orderId: number;
  total: number;
  items: OrderItem[];
  paymentLabel: string;
  cityName: string;
  deliveryMsg?: string;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-800 focus:border-transparent bg-white';

export default function CheckoutPage() {
  const { user }                              = useAuth();
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const router                                = useRouter();

  const [form, setForm] = useState<FormData>({
    name: user?.name ?? '',
    phone: '',
    pincode: '',
    city: '',
    state: '',
    address: '',
    landmark: '',
    payment: 'cod',
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState<SuccessData | null>(null);

  // ── Delivery state ───────────────────────────────────────────────────────
  // shippingCoords holds ONLY pincode/GPS-derived coordinates.
  // Manual city/state text edits never affect these.
  const [shippingCoords, setShippingCoords] = useState<ShippingCoords>({
    lat: 20.5937, lon: 78.9629, city: '', // center-of-India fallback
  });
  const [hasGeoCoords, setHasGeoCoords]     = useState(false);
  const [estimate, setEstimate]             = useState<EstimateResponse | null>(null);
  const [estimating, setEstimating]         = useState(false);
  const [detectingGPS, setDetectingGPS]     = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  // Track what was auto-filled so we can detect user overrides
  const [autoFilledCity, setAutoFilledCity]   = useState('');
  const [autoFilledState, setAutoFilledState] = useState('');

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Core estimate call ───────────────────────────────────────────────────
  const runEstimate = useCallback(
    async (lat: number, lon: number, city: string) => {
      if (!items.length) return;
      setEstimating(true);
      try {
        const res = await api.orders.estimate({
          items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
          customer_latitude: lat,
          customer_longitude: lon,
          customer_city: city,
        });
        setEstimate(res);
      } catch {
        setEstimate(FALLBACK_ESTIMATE);
      } finally {
        setEstimating(false);
      }
    },
    [items],
  );

  // Seed estimate once from localStorage GPS coords saved by the home page
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current || !items.length) return;
    initDone.current = true;
    const stored = localStorage.getItem('userCity') ?? '';
    const m = stored.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (m) {
      const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
      setShippingCoords({ lat, lon, city: stored });
      setHasGeoCoords(true);
      runEstimate(lat, lon, stored);
    }
  }, [items.length, runEstimate]);

  // ── GPS auto-detect: fills pincode + city + state ────────────────────────
  const handleGPSDetect = () => {
    if (!navigator.geolocation) return;
    setDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'en' } },
          );
          const data = await res.json();
          const addr = data.address ?? {};

          const city     = addr.city || addr.county || addr.state_district || addr.town || 'Current Location';
          const state    = addr.state || '';
          const postcode = (addr.postcode ?? '').replace(/\D/g, '').slice(0, 6);

          setForm((prev) => ({ ...prev, pincode: postcode, city, state }));
          setAutoFilledCity(city);
          setAutoFilledState(state);
          setShippingCoords({ lat, lon, city });
          setHasGeoCoords(true);
          runEstimate(lat, lon, city);
        } catch {
          setShippingCoords({ lat, lon, city: 'Current Location' });
          setHasGeoCoords(true);
          runEstimate(lat, lon, 'Current Location');
        } finally {
          setDetectingGPS(false);
        }
      },
      () => setDetectingGPS(false),
      { timeout: 10000 },
    );
  };

  // ── Pincode change: auto-fills city + state on 6 digits ─────────────────
  const handlePincodeChange = async (value: string) => {
    set('pincode', value);
    if (value.length !== 6) return;
    setPincodeLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${value}&country=India&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await res.json();
      if (data?.[0]) {
        const lat  = parseFloat(data[0].lat);
        const lon  = parseFloat(data[0].lon);
        const addr = data[0].address ?? {};

        const city  = addr.city || addr.county || addr.state_district || addr.town || '';
        const state = addr.state || '';

        setForm((prev) => ({ ...prev, city, state }));
        setAutoFilledCity(city);
        setAutoFilledState(state);
        setShippingCoords({ lat, lon, city });
        setHasGeoCoords(true);
        runEstimate(lat, lon, city);
      }
    } catch {
      // Keep existing coords silently
    } finally {
      setPincodeLoading(false);
    }
  };

  // Mismatch: user manually edited city/state after auto-fill
  const cityMismatch  = autoFilledCity  !== '' && form.city.toLowerCase().trim()  !== autoFilledCity.toLowerCase().trim();
  const stateMismatch = autoFilledState !== '' && form.state.toLowerCase().trim() !== autoFilledState.toLowerCase().trim();
  const showMismatch  = cityMismatch || stateMismatch;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Please sign in to continue.</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-2xl" style={{ backgroundColor: G }}>
          Sign In
        </Link>
      </div>
    );
  }

  // ── Success receipt ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#F0FDF4' }}>
              <svg className="w-12 h-12" style={{ color: G }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 text-3xl">&#x1F389;</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-4 mb-1">Order Placed!</h1>
          <p className="text-gray-500 text-sm">Your vendor will accept &amp; dispatch it shortly.</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Order Receipt</span>
            <span className="font-bold text-gray-900">#{success.orderId}</span>
          </div>
          <div className="space-y-2 mb-4">
            {success.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {items.find((ci) => ci.product.id === item.product_id)?.product.name ?? `Product #${item.product_id}`}
                  <span className="text-gray-400 ml-1">× {item.quantity}</span>
                </span>
                <span className="font-medium text-gray-900">&#x20B9;{(item.unit_price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 pt-3 border-t border-gray-100 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span>
              <span className="font-medium" style={{ color: G }}>Free</span>
            </div>
            {success.deliveryMsg && (
              <div className="flex justify-between text-gray-500">
                <span>Estimated</span>
                <span className="font-medium text-gray-700">{success.deliveryMsg}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Payment</span>
              <span className="font-medium text-gray-700">{success.paymentLabel}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Deliver to</span>
              <span className="font-medium text-gray-700">{success.cityName}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
              <span>Total</span>
              <span style={{ color: G }}>&#x20B9;{success.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Link
          href="/orders"
          className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: G }}
        >
          Track Your Order &#x2192;
        </Link>
        <p className="mt-4 text-xs text-center text-gray-400">
          <Link href="/" className="hover:underline" style={{ color: GOLD }}>Continue Shopping</Link>
        </p>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link href="/" className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-2xl" style={{ backgroundColor: G }}>
          Browse Products
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.pincode.trim() || !form.address.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^\d{6}$/.test(form.pincode)) {
      setError('Enter a valid 6-digit pincode.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Always use coords from pincode/GPS — never from manual city text
      const reservation = await api.orders.checkout({
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        customer_latitude:  shippingCoords.lat,
        customer_longitude: shippingCoords.lon,
        customer_city:      shippingCoords.city || form.city || 'India',
        address_line: form.address  || undefined,
        landmark:     form.landmark || undefined,
        city:         form.city     || undefined,
        state:        form.state    || undefined,
        pincode:      form.pincode  || undefined,
      });

      const paymentId =
        form.payment === 'cod'
          ? `cod_${Date.now()}`
          : `${form.payment}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await api.orders.confirmPayment({ order_id: reservation.order_id, payment_id: paymentId });

      clearCart();
      setSuccess({
        orderId:       reservation.order_id,
        total:         reservation.total_price,
        items:         reservation.items,
        paymentLabel:  PAYMENT_METHODS.find((m) => m.id === form.payment)?.label ?? form.payment,
        cityName:      shippingCoords.city || form.city,
        deliveryMsg:   reservation.delivery_message ?? undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order placement failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const speedCfg = estimate ? (SPEED_CONFIG[estimate.delivery_speed] ?? SPEED_CONFIG.Economy) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* ── Delivery Details ──────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">&#x1F4CD;</span> Delivery Details
              </p>

              {/* Auto-Detect GPS button */}
              <button
                type="button"
                onClick={handleGPSDetect}
                disabled={detectingGPS}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all disabled:opacity-60"
                style={{ borderColor: G, color: G }}
              >
                {detectingGPS ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                )}
                {detectingGPS ? 'Detecting…' : '📍 Auto-Detect'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <Field label="Full Name" required>
                <input
                  className={INPUT}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ramesh Kumar"
                />
              </Field>

              {/* Phone */}
              <Field label="Mobile Number" required>
                <input
                  className={INPUT}
                  type="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="98XXXXXXXX"
                />
              </Field>

              {/* Pincode — triggers city/state auto-fill */}
              <Field label="Pincode" required>
                <div className="relative">
                  <input
                    className={INPUT}
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ''))}
                    placeholder="400001"
                  />
                  {pincodeLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </Field>

              {/* State — auto-filled; edits trigger mismatch warning */}
              <Field label="State">
                <input
                  className={INPUT}
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  placeholder="Maharashtra"
                />
              </Field>

              {/* City — auto-filled; edits trigger mismatch warning (full width) */}
              <div className="sm:col-span-2">
                <Field label="City" required>
                  <input
                    className={INPUT}
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="Mumbai (auto-filled from Pincode / GPS)"
                  />
                </Field>
                {/* Mismatch warning — shown when user overrides auto-filled value */}
                {showMismatch && (
                  <p className="mt-1 text-xs font-medium" style={{ color: GOLD }}>
                    ⚠️ Note: This differs from Pincode&apos;s default area. Please verify.
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <Field label="House / Flat / Building No. &amp; Street" required>
                  <input
                    className={INPUT}
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="B-12, Green Park Society, MG Road"
                  />
                </Field>
              </div>

              {/* Landmark */}
              <div className="sm:col-span-2">
                <Field label="Landmark">
                  <input
                    className={INPUT}
                    value={form.landmark}
                    onChange={(e) => set('landmark', e.target.value)}
                    placeholder="Near HDFC Bank / Opposite City Mall"
                  />
                </Field>
              </div>
            </div>

            {/* Delivery estimate badge */}
            {estimating && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                Calculating delivery speed…
              </div>
            )}
            {!estimating && speedCfg && estimate && (
              <div
                className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border"
                style={{ backgroundColor: speedCfg.bg, borderColor: speedCfg.border, color: speedCfg.color }}
              >
                <span>{speedCfg.icon}</span>
                <span>{estimate.message}</span>
                {estimate.distance_km !== null && (
                  <span className="ml-auto text-xs opacity-70">{estimate.distance_km.toFixed(1)} km</span>
                )}
              </div>
            )}
            {!hasGeoCoords && !estimating && (
              <p className="mt-3 text-xs text-gray-400">
                Enter your Pincode or use Auto-Detect for an accurate delivery estimate.
              </p>
            )}
          </div>

          {/* ── Payment ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <p className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">&#x1F4B3;</span> Payment Method
            </p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor:     form.payment === m.id ? G : '#e5e7eb',
                    backgroundColor: form.payment === m.id ? '#F0FDF4' : 'transparent',
                  }}
                >
                  <input type="radio" name="payment" value={m.id} checked={form.payment === m.id} onChange={() => set('payment', m.id)} className="sr-only" />
                  <span className="text-xl" dangerouslySetInnerHTML={{ __html: m.icon }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                    <p className="text-xs text-gray-400">{m.desc}</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: form.payment === m.id ? G : '#d1d5db' }}
                  >
                    {form.payment === m.id && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: G }} />
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Order summary sidebar ─────────────────────────────────────── */}
        <div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sticky top-20">
            <p className="font-semibold text-gray-900 mb-4">Order Summary</p>
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate flex-1 pr-2">{item.product.name} ×{item.quantity}</span>
                  <span className="font-medium text-gray-900 shrink-0">&#x20B9;{(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>&#x20B9;{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span className="font-medium" style={{ color: G }}>Free</span>
              </div>
              {estimate && speedCfg && (
                <div className="flex justify-between text-xs font-medium" style={{ color: speedCfg.color }}>
                  <span>{speedCfg.icon} {estimate.delivery_days}</span>
                  <span>{estimate.delivery_speed}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span style={{ color: G }}>&#x20B9;{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}

            {/* Place Order — never disabled based on location */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full py-3.5 mt-4 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: G }}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing Order...</>
              ) : (
                'Place Order'
              )}
            </button>

            <p className="text-xs text-gray-400 mt-2 text-center">
              By placing the order you agree to our terms &amp; conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
