'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { AdminUserDetail } from '@/types';

const TEAL = '#0F766E';

type Role = 'customer' | 'vendor' | 'admin' | 'warehouse';

interface FormState {
  role: Role;
  name: string;
  email: string;
  password: string;
  phone: string;
  is_active: boolean;
  shop_name: string;
  address: string;
  category: string;
  city: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: FormState = {
  role: 'customer',
  name: '',
  email: '',
  password: '',
  phone: '',
  is_active: true,
  shop_name: '',
  address: '',
  category: '',
  city: '',
  latitude: '',
  longitude: '',
};

const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  vendor: 'Vendor',
  admin: 'Admin',
  warehouse: 'Warehouse',
};

const ROLE_COLORS: Record<Role, string> = {
  customer: 'bg-blue-100 text-blue-700',
  vendor: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  warehouse: 'bg-amber-100 text-amber-700',
};

// ── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto transition-all ${
            t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 ml-2">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

function UserModal({
  initial,
  editingUser,
  onClose,
  onSaved,
}: {
  initial?: Partial<FormState>;
  editingUser?: AdminUserDetail | null;
  onClose: () => void;
  onSaved: (user: AdminUserDetail, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editingUser;

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        role: form.role,
        name: form.name,
        email: form.email,
        is_active: form.is_active,
      };
      if (form.phone) payload.phone = form.phone;
      if (form.password) payload.password = form.password;

      if (form.role === 'vendor' || form.role === 'warehouse') {
        if (form.shop_name) payload.shop_name = form.shop_name;
        if (form.address) payload.address = form.address;
      }
      if (form.role === 'vendor') {
        if (form.category) payload.category = form.category;
        if (form.city) payload.city = form.city;
        if (form.latitude) payload.latitude = parseFloat(form.latitude);
        if (form.longitude) payload.longitude = parseFloat(form.longitude);
      }

      let saved: AdminUserDetail;
      if (isEdit && editingUser) {
        // On edit, don't send role (can't change role); send password only if filled
        const updatePayload = { ...payload };
        delete updatePayload.role;
        if (!form.password) delete updatePayload.password;
        saved = await api.admin.updateUser(editingUser.id, updatePayload);
      } else {
        if (!form.password) { setError('Password is required'); setSaving(false); return; }
        saved = await api.admin.createUser(payload as Parameters<typeof api.admin.createUser>[0]);
      }
      onSaved(saved, !isEdit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? `Edit User — ${editingUser?.name}` : 'Create New User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Role — only shown on create */}
          {!isEdit && (
            <div>
              <label className={labelCls}>Role</label>
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) => set('role', e.target.value as Role)}
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Email</label>
              <input className={inputCls} required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className={inputCls} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={isEdit ? '••••••••' : 'min 6 chars'} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                  className="w-4 h-4 accent-teal-600"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Vendor / Warehouse extra fields */}
          {(form.role === 'vendor' || form.role === 'warehouse' || (isEdit && (editingUser?.role === 'vendor' || editingUser?.role === 'warehouse'))) && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                {(form.role === 'vendor' || editingUser?.role === 'vendor') ? 'Vendor Details' : 'Warehouse Details'}
              </p>
              <div>
                <label className={labelCls}>Shop / Warehouse Name</label>
                <input className={inputCls} value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} placeholder="My Shop" />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Main Street" />
              </div>
            </div>
          )}

          {/* Vendor-only geo fields */}
          {(form.role === 'vendor' || (isEdit && editingUser?.role === 'vendor')) && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Category (prepended to address)</label>
                <input className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Ayurveda, Grocery" />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Latitude</label>
                  <input className={inputCls} type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="19.0760" />
                </div>
                <div>
                  <label className={labelCls}>Longitude</label>
                  <input className={inputCls} type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="72.8777" />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: TEAL }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDetail | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const removeToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.listUsers();
      setUsers(data);
    } catch {
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingUser(null); setModalOpen(true); };
  const openEdit = (u: AdminUserDetail) => {
    setEditingUser(u);
    setModalOpen(true);
  };

  const handleSaved = (user: AdminUserDetail, isNew: boolean) => {
    setModalOpen(false);
    if (isNew) {
      setUsers((prev) => [user, ...prev]);
      addToast(`User "${user.name}" created successfully`);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
      addToast(`User "${user.name}" updated successfully`);
    }
  };

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <>
      <ToastContainer toasts={toasts} remove={removeToast} />

      {modalOpen && (
        <UserModal
          editingUser={editingUser}
          initial={
            editingUser
              ? {
                  role: editingUser.role,
                  name: editingUser.name,
                  email: editingUser.email,
                  phone: editingUser.phone ?? '',
                  is_active: editingUser.is_active,
                  shop_name: editingUser.shop_name ?? '',
                  address: editingUser.address ?? '',
                  city: editingUser.vendor_city ?? '',
                  latitude: editingUser.vendor_latitude != null ? String(editingUser.vendor_latitude) : '',
                  longitude: editingUser.vendor_longitude != null ? String(editingUser.vendor_longitude) : '',
                }
              : undefined
          }
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="p-6 sm:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff & Users</h1>
            <p className="text-sm text-gray-400 mt-0.5">{users.length} total users across all roles</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
              style={{ backgroundColor: TEAL }}
            >
              <span className="text-lg leading-none">+</span> Create New User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 w-64"
            style={{ outlineColor: TEAL }}
          />
          <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl px-2 py-1">
            {(['all', 'customer', 'vendor', 'admin', 'warehouse'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  roleFilter === r ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
                style={roleFilter === r ? { backgroundColor: TEAL } : {}}
              >
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <span className="w-7 h-7 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: TEAL }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No users found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Shop / City</th>
                  <th className="px-5 py-3">Password</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{u.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {u.shop_name ?? u.vendor_city ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                      {u.plain_password ? u.plain_password : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
