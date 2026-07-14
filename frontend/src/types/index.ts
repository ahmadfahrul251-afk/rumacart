// Tipe data bersama, mengikuti bentuk response dari backend Express + Prisma.

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
}

export interface Inventory {
  id: string;
  productId: string;
  pointId: string;
  stock: number;
  minStock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  categoryId?: string;
  sku: string;
  barcode?: string | null;
  weightGram: number;
  costPrice: number;
  sellPrice: number;
  discountPrice?: number | null;
  minStock?: number;
  images: string[];
  category?: Category;
  inventory?: Inventory[];
  totalStock?: number;
  avgRating?: number;
  totalReviews?: number;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: { name: string };
}

// Jaringan distribusi RumaCart (Hub and Spoke):
// RDH = gudang utama per kota (satu-satunya penerima Purchase Order dari supplier)
// MART = outlet retail besar, POINT = pickup point/last-mile kecil.
export type LocationType = "RDH" | "MART" | "POINT";

export interface FulfillmentPoint {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address: string;
  city: string;
  phone?: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusKm?: number | null;
  operatingHours?: string | null;
  isActive?: boolean;
  parentHubId?: string | null;
  parentHub?: { id: string; name: string; code: string } | null;
}

export interface EligiblePoint {
  pointId: string;
  name: string;
  code: string;
  city: string;
  distance: number | null;
}

export interface PointMonitoring {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  city: string;
  isActive: boolean;
  parentHubName: string | null;
  claimedProducts: number;
  totalStockQty: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  orderCount: number;
  revenue: number;
}

export interface NetworkSummary {
  totalCities: number;
  totalRDH: number;
  totalMart: number;
  totalPoint: number;
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  province: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "PROCESSED"
  | "PREPARED"
  | "PICKED_UP"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  productId: string;
  qty: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export type PaymentStatus = "PENDING" | "AWAITING_VERIFICATION" | "PAID" | "FAILED";

export interface Payment {
  id: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: string | null;
}

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  shippingMethod: string;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  costTotal: number;
  belowCost: boolean;
  createdAt: string;
  items: OrderItem[];
  point?: FulfillmentPoint;
  address?: Address;
  payment?: Payment;
  customer?: { name: string; phone?: string | null };
  statusHistory?: OrderStatusHistory[];
}

export type CashflowPocket = "INVESTASI" | "INVENTARIS" | "PROFIT";

export interface Cashflow {
  id: string;
  type: "IN" | "OUT";
  category: string;
  amount: number;
  costAmount?: number | null;
  profitAmount?: number | null;
  pocket?: CashflowPocket | null;
  description?: string | null;
  refType?: string | null;
  refId?: string | null;
  createdAt: string;
  point?: FulfillmentPoint | null;
}

export type Role = "SUPER_ADMIN" | "ADMIN" | "ADMIN_POINT" | "KASIR" | "GUDANG" | "KURIR" | "CUSTOMER";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  managedPointId?: string | null;
  managedPoint?: { id: string; name: string; code: string; type: LocationType } | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  pointId?: string | null;
  point?: FulfillmentPoint | null;
}

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  qty: number;
  costPrice: number;
  subtotal: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  pointId: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  receivedAt?: string | null;
  items: PurchaseOrderItem[];
  supplier?: Supplier;
  point?: FulfillmentPoint;
}

export type StockTransferStatus = "SENT" | "RECEIVED" | "CANCELLED";

export interface StockTransferItem {
  id: string;
  productId: string;
  qty: number;
  product?: Product;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  toPointId: string;
  status: StockTransferStatus;
  notes?: string | null;
  createdAt: string;
  receivedAt?: string | null;
  items: StockTransferItem[];
  toPoint?: FulfillmentPoint;
}

export type VoucherDiscountType = "FLAT" | "PERCENT";

export interface Voucher {
  id: string;
  code: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountAmount: number;
  maxDiscount?: number | null;
  minPurchase: number;
  quota: number;
  used: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  discount?: number; // hanya ada di response /vouchers/validate
}

export type NotificationType = "ORDER" | "PROMO" | "SYSTEM";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  refId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}
