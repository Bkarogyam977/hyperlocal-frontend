'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Tab = 'customer' | 'vendor';

const inputCls =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPass, setCustPass] = useState('');

  const [vendName, setVendName] = useState('');
  const [vendEmail, setVendEmail] = useState('');
  const [vendShop, setVendShop] = useState('');
  const [vendCity, setVendCity] = useState('');
  const [vendPhone, setVendPhone] = useState('');
  const [vendAddress, setVendAddress] = useState('');
  const [vendTxnId, setVendTxnId] = useState('');
  const [vendQrPreview, setVendQrPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const custDisabled = !custName.trim() || !custEmail.trim() || !custPass.trim() || loading;
  const vendDisabled =
    !vendName.trim() ||
    !vendEmail.trim() ||
    !vendShop.trim() ||
    !vendCity.trim() ||
    !vendPhone.trim() ||
    !vendAddress.trim() ||
    !vendTxnId.trim() ||
    loading;

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVendQrPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'customer') {
        await register(custName, custEmail, custPass, 'customer');
      } else {
        const autoPass = crypto.randomUUID();
        await register(vendName, vendEmail, autoPass, 'vendor', {
          shop_name: vendShop,
          city: vendCity,
          phone: vendPhone,
          address: vendAddress,
          transaction_id: vendTxnId,
        });
      }
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <span className="text-2xl font-bold text-white">H</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-400 text-sm mt-1">Join hyperlocal today</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
            {(['customer', 'vendor'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError('');
                }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'customer' ? 'Customer' : 'Vendor'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 mb-4 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'customer' ? (
              <>
                <div>
                  <label className={labelCls}>Full name</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="John Doe"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    required
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={custPass}
                    onChange={(e) => setCustPass(e.target.value)}
                    placeholder="Min. 6 characters"
                    className={inputCls}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Full name</label>
                    <input
                      type="text"
                      required
                      value={vendName}
                      onChange={(e) => setVendName(e.target.value)}
                      placeholder="Jane Doe"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      required
                      value={vendEmail}
                      onChange={(e) => setVendEmail(e.target.value)}
                      placeholder="shop@email.com"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Shop name</label>
                    <input
                      type="text"
                      required
                      value={vendShop}
                      onChange={(e) => setVendShop(e.target.value)}
                      placeholder="My Shop"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <input
                      type="text"
                      required
                      value={vendCity}
                      onChange={(e) => setVendCity(e.target.value)}
                      placeholder="Mumbai"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      type="tel"
                      required
                      value={vendPhone}
                      onChange={(e) => setVendPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Address</label>
                    <input
                      type="text"
                      required
                      value={vendAddress}
                      onChange={(e) => setVendAddress(e.target.value)}
                      placeholder="Street, Area"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Transaction ID</label>
                  <input
                    type="text"
                    required
                    value={vendTxnId}
                    onChange={(e) => setVendTxnId(e.target.value)}
                    placeholder="UPI / bank reference number"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment QR screenshot</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 transition-colors"
                  >
                    {vendQrPreview ? (
                      <img
                        src={vendQrPreview}
                        alt="QR preview"
                        className="max-h-32 mx-auto rounded-lg object-contain"
                      />
                    ) : (
                      <div className="text-gray-400 text-sm space-y-1">
                        <svg
                          className="w-8 h-8 mx-auto text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4-4m0 0l4 4m-4-4v8M4 4h16M4 8h16"
                          />
                        </svg>
                        <span>Click to upload QR / screenshot</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrChange}
                    className="hidden"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={tab === 'customer' ? custDisabled : vendDisabled}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
