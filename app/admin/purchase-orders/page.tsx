'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { PurchaseOrder, POStatus } from '@/types';

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

const FILTER_TABS: { value: string; label: string }[] = [
  { value: 'pending',    label: 'Pending' },
  { value: 'approved',   label: 'Approved' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered',  label: 'Delivered' },
  { value: 'rejected',   label: 'Rejected' },
  { value: '',           label: 'All' },
];

interface RejectModalState { poId: number }

export default function AdminPurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<RejectModalState | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const load = (status?: string) => {
    setLoading(true);
    api.purchaseOrders.listAdmin(status || undefined)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  // Client-side gate: even if the API returns stray records, each tab only
  // shows orders whose status exactly matches the active filter.
  const visibleOrders = filter
    ? orders.filter((po) => po.status === filter)
    : orders;

  const doAction = async (poId: number, status: POStatus, notes?: string) => {
    setActionId(poId);
    try {
      await api.purchaseOrders.updateStatus(poId, { status, admin_notes: notes });
      setRejectModal(null);
      setAdminNotes('');
      load(filter);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">Review and manage vendor stock requests</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No purchase orders found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">PO #</th>
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Products</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition-colors align-top">
                  <td className="px-6 py-4 font-medium text-gray-900">#{po.id}</td>

                  <td className="px-6 py-4 text-gray-600">
                    {po.vendor?.city ?? `Vendor #${po.vendor_id}`}
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      {po.items.map((item, i) => (
                        <div key={i}>
                          <span className="font-medium text-gray-900">
                            {item.product?.name ?? `Product #${item.product_id}`}
                          </span>
                          <span className="text-gray-400 ml-1 text-xs">× {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {po.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">{po.notes}</p>
                    )}
                    {po.admin_notes && po.status !== 'pending' && (
                      <p className="text-xs text-gray-400 mt-1 italic">Note: {po.admin_notes}</p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[po.status]}`}>
                      {STATUS_LABELS[po.status]}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(po.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* pending → approve / reject */}
                      {po.status === 'pending' && (
                        <>
                          <button
                            disabled={actionId === po.id}
                            onClick={() => doAction(po.id, 'approved')}
                            className="text-xs font-semibold text-green-600 hover:text-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actionId === po.id}
                            onClick={() => { setRejectModal({ poId: po.id }); setAdminNotes(''); }}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* approved → dispatch */}
                      {po.status === 'approved' && (
                        <button
                          disabled={actionId === po.id}
                          onClick={() => doAction(po.id, 'dispatched')}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionId === po.id && (
                            <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          )}
                          🚚 Dispatch
                        </button>
                      )}

                      {/* dispatched → delivered */}
                      {po.status === 'dispatched' && (
                        <button
                          disabled={actionId === po.id}
                          onClick={() => doAction(po.id, 'delivered')}
                          className="text-xs font-semibold text-green-600 hover:text-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionId === po.id && (
                            <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          )}
                          ✅ Mark Delivered
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-1">Reject Purchase Order #{rejectModal.poId}</h3>
            <p className="text-sm text-gray-500 mb-4">Optionally provide a reason.</p>
            <textarea
              rows={3}
              placeholder="Reason for rejection…"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={actionId === rejectModal.poId}
                onClick={() => doAction(rejectModal.poId, 'rejected', adminNotes || undefined)}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {actionId === rejectModal.poId && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
