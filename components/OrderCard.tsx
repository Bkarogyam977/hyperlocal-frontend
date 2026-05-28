import type { Order } from '@/types';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-800' },
  reserved: { label: 'Reserved', cls: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-indigo-100 text-indigo-800' },
  paid: { label: 'Paid', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
};

export default function OrderCard({ order }: { order: Order }) {
  const status = STATUS[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600' };
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Order #{order.id}</p>
          <p className="text-xs text-gray-400 mt-0.5">{date}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
            order.source === 'vendor'
              ? 'bg-purple-50 text-purple-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {order.source === 'vendor' ? '🏪 Vendor' : '🏭 Warehouse'}
        </span>
        {order.vendor_name && (
          <span className="text-xs text-gray-500">{order.vendor_name}</span>
        )}
        {order.vendor_distance_km !== undefined && (
          <span className="text-xs text-gray-400">{order.vendor_distance_km.toFixed(1)} km</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <span className="text-sm text-gray-400">
          {order.items
            ? `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`
            : 'Order total'}
        </span>
        <span className="font-bold text-gray-900">₹{order.total_price.toFixed(2)}</span>
      </div>
    </div>
  );
}
