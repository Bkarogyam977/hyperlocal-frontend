export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin' | 'warehouse';
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  total_available: number;
  vendor_available: number;
  warehouse_available: number;
  available_vendors_count: number;
  image_url?: string; // <--- Bas ye ek line yahan add kar do
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: number;
  order_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_image?: string;
}

export interface Order {
  id: number;
  user_id: number;
  vendor_id: number | null;
  source: 'vendor' | 'warehouse';
  status: 'pending' | 'reserved' | 'paid' | 'accepted' | 'dispatched' | 'out_for_delivery' | 'confirmed' | 'cancelled' | 'failed';
  total_price: number;
  payment_id: string | null;
  items?: OrderItem[];
  items_count?: number;
  vendor_name?: string;
  vendor_city?: string;
  vendor_distance_km?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  delivery_address?: string;
  delivery_landmark?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_pincode?: string;
  delivery_lat?: number;
  delivery_lon?: number;
  created_at: string;
  updated_at: string;
}

export interface CheckoutResponse {
  order_id: number;
  vendor_id: number | null;
  source: 'vendor' | 'warehouse';
  total_price: number;
  items: OrderItem[];
  status: string;
  reservation_expires_at: string;
  message: string;
  delivery_date?: string;
  delivery_speed?: string;
  delivery_message?: string;
}

export interface OrdersResponse {
  total: number;
  skip: number;
  limit: number;
  orders: Order[];
}

// ── Delivery Estimate ────────────────────────────────────────────────────────

export interface EstimateResponse {
  source: string;
  vendor_id: number | null;
  delivery_speed: string;
  delivery_days: string;
  message: string;
  distance_km: number | null;
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

export type POStatus = 'pending' | 'approved' | 'dispatched' | 'delivered' | 'rejected';

export interface POItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: { id: number; name: string; price: number };
}

export interface PurchaseOrder {
  id: number;
  vendor_id: number;
  status: POStatus;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  items: POItem[];
  vendor?: { id: number; city: string };
}

// ── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name?: string;
  product_id: number | null;
  field_name: string;
  old_val: string | null;
  new_val: string | null;
  is_read: boolean;
  created_at: string;
}

// ── Warehouse ─────────────────────────────────────────────────────────────────

export interface WarehouseOrder {
  id: number;
  user_id: number;
  status: string;
  total_price: number;
  items_count: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_landmark: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_pincode: string | null;
  delivery_lat: number | null;
  delivery_lon: number | null;
  delivery_date: string | null;
  rider_name: string | null;
  tracking_id: string | null;
  items: { id: number; product_id: number; quantity: number; unit_price: number; product_name?: string; product_image?: string }[];
  created_at: string;
  updated_at: string;
}

export interface WarehouseStats {
  total_orders: number;
  today_orders: number;
  pending_action: number;
  by_status: Record<string, number>;
  inventory: { total_skus: number; low_stock: number; out_of_stock: number; health_pct: number };
  city_heatmap: { city: string; count: number }[];
  recent_audit: { id: number; user_name: string; field_name: string; old_val: string | null; new_val: string | null; created_at: string }[];
}

export interface WarehouseInventoryRow {
  product_id:     number;
  product_name:   string | null;
  stock:          number;
  reserved_stock: number;
  available:      number;
  sku:            string | null;
  batch_no:       string | null;
  expiry_date:    string | null;
  cost_price:     number | null;
}

// ── Vendor ───────────────────────────────────────────────────────────────────

export interface VendorProfile {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  city: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorInventoryItem {
  id: number;
  vendor_id: number;
  product_id: number;
  stock: number;
  reserved_stock: number;
  available_stock: number;
  product_name?: string;
  product_price?: number;
  created_at: string;
  updated_at: string;
}

export interface VendorStockRow {
  id: number;
  vendor_id: number;
  vendor_city: string;
  vendor_name: string;
  product_id: number;
  product_name: string;
  product_price: number;
  stock: number;
  reserved_stock: number;
  available: number;
  is_low_stock: boolean;
  updated_at: string;
}

export interface AdminOrder {
  id: number;
  user_id: number;
  vendor_id: number | null;
  vendor_name: string | null;
  vendor_city: string | null;
  source: 'vendor' | 'warehouse';
  status: string;
  total_price: number;
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  users: { total: number; customers: number; vendors: number; active_vendors: number };
  products: { total: number; active: number };
  orders: { total: number; pending: number; paid: number };
}

export interface AdminVendorUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  transaction_id: string | null;
  shop_name: string | null;
  phone: string | null;
  address: string | null;
  plain_password: string | null;
  created_at: string;
  updated_at: string;
}

// ── Vendor Loss Analytics ─────────────────────────────────────────────────────

export interface LossItem {
  name: string;
  required_qty: number;
  available_qty: number;
  price: number;
}

export interface LossNotification {
  id: number;
  order_id: number | null;
  items_data: LossItem[];
  total_loss: number;
  is_read: boolean;
  created_at: string;
}

export interface LossNotificationsResponse {
  total: number;
  skip: number;
  limit: number;
  items: LossNotification[];
}

export interface BypassedVendor {
  vendor_id: number;
  vendor_name: string | null;
  vendor_city: string | null;
  reason: string;
  shortage_items: string[];
}

export interface AdminOrderDetail {
  id: number;
  user_id: number;
  vendor_id: number | null;
  vendor_name: string | null;
  vendor_city: string | null;
  source: 'vendor' | 'warehouse';
  status: string;
  total_price: number;
  items_count: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_landmark: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_pincode: string | null;
  items: { product_id: number; product_name: string | null; quantity: number; unit_price: number }[];
  bypassed_vendors: BypassedVendor[];
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin' | 'warehouse';
  is_active: boolean;
  phone: string | null;
  shop_name: string | null;
  address: string | null;
  plain_password: string | null;
  created_at: string;
  updated_at: string;
  vendor_city: string | null;
  vendor_latitude: number | null;
  vendor_longitude: number | null;
  vendor_is_active: boolean | null;
}
