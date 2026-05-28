import type {
  AdminOrder,
  AdminOrderDetail,
  AdminStats,
  AdminUserDetail,
  AdminVendorUser,
  AuditLog,
  LossNotificationsResponse,
  WarehouseStats,
  AuthResponse,
  CheckoutResponse,
  EstimateResponse,
  Order,
  OrdersResponse,
  Product,
  PurchaseOrder,
  User,
  VendorInventoryItem,
  VendorProfile,
  VendorStockRow,
  WarehouseInventoryRow,
  WarehouseOrder,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }

  const data = await res.json();

  return (data.data ?? data) as T; // ✅ FINAL FIX
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string; role: string; transaction_id?: string; shop_name?: string; city?: string; phone?: string; address?: string }) =>
      request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<User>('/auth/me'),
  },

  products: {
    // 👇 Yahan 'city' parameter add kiya gaya hai
    list: (params?: { skip?: number; limit?: number; search?: string; city?: string }) => {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set('skip', String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      if (params?.search) qs.set('search', params.search);
      
      // ✅ FIX: Agar city hai, toh URL query string mein add karo
      if (params?.city) qs.set('city', params.city); 
      
      const query = qs.toString();
      return request<Product[]>(`/products${query ? `?${query}` : ''}`);
    },
    
    // 👇 Single product ke liye bhi city add kar do (taaki product page pe bhi stock dikhe)
    get: (id: number, city?: string) => {
      const url = city ? `/products/${id}?city=${city}` : `/products/${id}`;
      return request<Product>(url);
    },

    create: (data: FormData) => 
      request<Product>('/products', { 
        method: 'POST', 
        body: data 
      }),
      
    update: (id: number, data: FormData) => 
      request<Product>(`/products/${id}`, { 
        method: 'PUT', 
        body: data 
      }),
    delete: (id: number) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  },

  orders: {
    checkout: (data: {
      items: { product_id: number; quantity: number }[];
      customer_latitude: number;
      customer_longitude: number;
      customer_city: string;
      address_line?: string;
      landmark?: string;
      city?: string;
      state?: string;
      pincode?: string;
    }) =>
      request<CheckoutResponse>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    confirmPayment: (data: { order_id: number; payment_id: string }) =>
      request<{ order_id: number; status: string; message: string }>('/orders/payment/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    estimate: (data: {
      items: { product_id: number; quantity: number }[];
      customer_latitude: number;
      customer_longitude: number;
      customer_city: string;
    }) =>
      request<EstimateResponse>('/orders/estimate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set('skip', String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<OrdersResponse>(`/orders${query ? `?${query}` : ''}`);
    },
    get: (id: number) => request<Order>(`/orders/${id}`),
  },

  vendor: {
    getCities: () => request<{ cities: string[] }>('/vendor/cities'),
    getProfile: () => request<VendorProfile>('/vendor/profile'),
    createProfile: (data: { latitude: number; longitude: number; city: string }) =>
      request<VendorProfile>('/vendor/profile', { method: 'POST', body: JSON.stringify(data) }),
    updateProfile: (data: Partial<{ latitude: number; longitude: number; city: string; is_active: boolean }>) =>
      request<VendorProfile>('/vendor/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    getInventory: () => request<VendorInventoryItem[]>('/vendor/inventory'),
    getOrders: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set('skip', String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<Order[]>(`/vendor/orders${query ? `?${query}` : ''}`);
    },
    updateOrderStatus: (orderId: number, status: string) =>
      request<{ order_id: number; status: string }>(`/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    getLossNotifications: (params?: { from_date?: string; to_date?: string; is_read?: boolean; skip?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.from_date) qs.set('from_date', params.from_date);
      if (params?.to_date)   qs.set('to_date',   params.to_date);
      if (params?.is_read !== undefined) qs.set('is_read', String(params.is_read));
      if (params?.skip  !== undefined) qs.set('skip',  String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<LossNotificationsResponse>(`/vendor/loss-notifications${query ? `?${query}` : ''}`);
    },
    getLossUnreadCount: () => request<{ count: number }>('/vendor/loss-notifications/unread-count'),
    markLossRead: () => request<{ status: string }>('/vendor/loss-notifications/mark-read', { method: 'POST' }),
  },

  purchaseOrders: {
    create: (data: { items: { product_id: number; quantity: number }[]; notes?: string }) =>
      request<PurchaseOrder>('/vendor/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listVendor: () => request<PurchaseOrder[]>('/vendor/purchase-orders'),
    listAdmin: (status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return request<PurchaseOrder[]>(`/admin/purchase-orders${qs}`);
    },
    updateStatus: (poId: number, data: { status: string; admin_notes?: string }) =>
      request<PurchaseOrder>(`/admin/purchase-orders/${poId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  admin: {
    getStats: () => request<AdminStats>('/admin/stats'),
    getVendorUsers: () => request<AdminVendorUser[]>('/admin/vendor-users'),
    updateVendorUserStatus: (userId: number, is_active: boolean) =>
      request<AdminVendorUser>(`/admin/vendor-users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      }),
    getVendorStock: () => request<VendorStockRow[]>('/admin/vendor-stock'),
    getOrders: (params?: { skip?: number; limit?: number; status?: string; vendor_city?: string; vendor_id?: number; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set('skip', String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      if (params?.status) qs.set('status', params.status);
      if (params?.vendor_city) qs.set('vendor_city', params.vendor_city);
      if (params?.vendor_id !== undefined) qs.set('vendor_id', String(params.vendor_id));
      if (params?.search) qs.set('search', params.search);
      const query = qs.toString();
      return request<{ total: number; skip: number; limit: number; orders: AdminOrder[] }>(`/admin/orders${query ? `?${query}` : ''}`);
    },
    getOrder: (orderId: number) => request<AdminOrderDetail>(`/admin/orders/${orderId}`),
    getUnreadCount: () => request<{ count: number }>('/admin/notifications/unread-count'),
    markAllRead: () => request<{ status: string }>('/admin/notifications/mark-all-read', { method: 'POST' }),
    getAuditLogs: (productId?: number, params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (productId !== undefined) qs.set('product_id', String(productId));
      if (params?.skip !== undefined) qs.set('skip', String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<AuditLog[]>(`/admin/audit-logs${query ? `?${query}` : ''}`);
    },
    patchWarehouseInventory: (productId: number, stock: number) =>
      request<{ product_id: number; stock: number; available: number }>(`/admin/warehouse-inventory/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock }),
      }),
    listUsers: () => request<AdminUserDetail[]>('/admin/users'),
    createUser: (data: {
      role: string;
      name: string;
      email: string;
      password: string;
      phone?: string;
      is_active?: boolean;
      shop_name?: string;
      address?: string;
      category?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    }) => request<AdminUserDetail>('/admin/users/create', { method: 'POST', body: JSON.stringify(data) }),
    updateUser: (userId: number, data: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      is_active?: boolean;
      shop_name?: string;
      address?: string;
      category?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    }) => request<AdminUserDetail>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  warehouse: {
    getOrders: (params?: { skip?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set('skip', String(params.skip));
      if (params?.limit !== undefined) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<WarehouseOrder[]>(`/warehouse/orders${query ? `?${query}` : ''}`);
    },
    updateOrderStatus: (
      orderId: number,
      status: string,
      extra?: { rider_name?: string; tracking_id?: string; notes?: string },
    ) =>
      request<{ order_id: number; status: string; rider_name?: string; tracking_id?: string }>(
        `/warehouse/orders/${orderId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status, ...extra }) },
      ),
    getStats: () => request<WarehouseStats>('/warehouse/stats'),
    getInventory: () => request<WarehouseInventoryRow[]>('/warehouse/inventory'),
    updateStock: (productId: number, stock: number) =>
      request<{ product_id: number; stock: number; available: number }>(`/warehouse/inventory/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock }),
      }),
  },
};
