'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { AdminVendorUser } from '@/types';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 break-all">{value || <span className="text-gray-300 italic">—</span>}</p>
    </div>
  );
}

function VendorModal({ vendor, onClose }: { vendor: AdminVendorUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{vendor.name}</h2>
            <p className="text-xs text-emerald-600">{vendor.email}</p>
          </div>
          <div className="flex items-center gap-2">
            
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${vendor.is_active ? 'bg-emerald-100 text-emerald-700' : (vendor.plain_password ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}`}>
              {vendor.is_active ? 'Active' : (vendor.plain_password ? 'Deactivated' : 'Pending')}
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Identity */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Identity</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" value={vendor.name} />
              <Field label="Email" value={vendor.email} />
            </div>
          </section>

          {/* Shop */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Shop Details</p>
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
              <Field label="Shop Name" value={vendor.shop_name} />
              <Field label="Phone" value={vendor.phone} />
              <div className="col-span-2">
                <Field label="Address" value={vendor.address} />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Verification</p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <Field label="Transaction ID" value={vendor.transaction_id} />
            </div>
          </section>

          {/* Credentials */}
          <section>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Access Credentials</p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
              <Field label="Login Email" value={vendor.email} />
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Plain Password</p>
                {vendor.plain_password ? (
                  <code className="text-sm font-mono font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg select-all">
                    {vendor.plain_password}
                  </code>
                ) : (
                  <p className="text-xs text-gray-400 italic">Generated on approval</p>
                )}
              </div>
            </div>
          </section>

          {/* Meta */}
          <p className="text-xs text-gray-400 text-center pt-1">
            Registered {new Date(vendor.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${on ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function AdminVendorManagePage() {
  const [vendors, setVendors] = useState<AdminVendorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminVendorUser | null>(null);

  useEffect(() => {
    api.admin.getVendorUsers().then(setVendors).catch(console.error).finally(() => setLoading(false));
  }, []);


  // 1. Pending sirf wo hain jo inactive hain AUR jinka password abhi tak nahi bana
const pending = vendors.filter((v) => !v.is_active && (!v.plain_password || v.plain_password === ""));

// 2. Approved vendors wo hain jinka password ban chuka hai (chahe wo abhi ON hon ya OFF)
const active = vendors.filter((v) => v.plain_password && v.plain_password !== "");


  const runAction = async (vendor: AdminVendorUser, newStatus: boolean) => {
    setActionId(vendor.id);
    try {
      const updated = await api.admin.updateVendorUserStatus(vendor.id, newStatus);
      setVendors((prev) => prev.map((v) => (v.id === vendor.id ? updated : v)));
      if (selected?.id === vendor.id) setSelected(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {selected && <VendorModal vendor={selected} onClose={() => setSelected(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {pending.length} pending &bull; {active.length} active
        </p>
      </div>

      {/* ── Pending Requests ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Pending Requests</h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {pending.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No pending vendor requests</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Shop</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Txn ID</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.map((v) => (
                  <tr key={v.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{v.shop_name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{v.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-[140px] truncate">{v.address ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      {v.transaction_id ? (
                        <code className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">
                          {v.transaction_id}
                        </code>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => runAction(v, true)}
                          disabled={actionId === v.id}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          {actionId === v.id ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => setSelected(v)}
                          className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Active Vendors ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Active Vendors</h2>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {active.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No approved vendors yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Shop</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Active</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {active.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{v.shop_name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{v.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-[140px] truncate">{v.address ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Toggle
                        on={v.is_active}
                        onChange={() => runAction(v, !v.is_active)}
                        disabled={actionId === v.id}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelected(v)}
                        className="text-xs text-emerald-600 font-semibold hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
