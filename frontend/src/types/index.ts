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
  maxStock?: number | null;
  safetyStock?: number | null;
}

export type InventoryMoveType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRED";

export interface InventoryHistory {
  id: string;
  inventoryId: string;
  type: InventoryMoveType;
  qty: number;
  note?: string | null;
  refId?: string | null;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export type RestockRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";

export interface RestockRequest {
  id: string;
  requestNumber: string;
  pointId: string;
  productId: string;
  qty: number;
  status: RestockRequestStatus;
  sourceHubId?: string | null;
  isAuto: boolean;
  note?: string | null;
  transferId?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  fulfilledAt?: string | null;
  point?: FulfillmentPoint;
  sourceHub?: FulfillmentPoint | null;
  product?: Product;
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
  type?: "MART" | "POINT" | "RDH";
  distance?: number | null;
  isBackOrder?: boolean;
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
  profit: number;
}

export interface NetworkSummary {
  totalCities: number;
  totalRDH: number;
  totalMart: number;
  totalPoint: number;
  totalCustomers: number;
  totalKurir: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  qtySold: number;
  revenue: number;
}

export interface CitySales {
  city: string;
  orderCount: number;
  revenue: number;
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  kecamatan?: string | null; // dipakai cocokkan jangkauan pengiriman (DeliveryArea) tiap Point
  city: string;
  province: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

// Area jangkauan kurir 1 Point (per kecamatan) + biayanya — diatur Admin
// Lokasi/Admin Pusat, dipakai buat tentuin opsi & biaya DELIVERY saat checkout.
export interface DeliveryArea {
  id: string;
  pointId: string;
  kecamatan: string;
  city: string;
  cost: number;
  isActive: boolean;
  createdAt: string;
  point?: { id: string; name: string; code: string; city: string };
}

export interface DeliveryQuote {
  available: boolean;
  cost: number;
}

// Dipakai halaman "Semua Point" & detail Point customer.
export interface NearbyPoint {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  city: string;
  address: string;
  distance: number | null;
}

export interface PointPublic {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  city: string;
  address: string;
  phone?: string | null;
  operatingHours?: string | null;
  isActive: boolean;
  latitude: number;
  longitude: number;
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
  isBackOrder: boolean;
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
  fromPointId?: string | null;
  toPointId: string;
  status: StockTransferStatus;
  notes?: string | null;
  createdAt: string;
  receivedAt?: string | null;
  items: StockTransferItem[];
  toPoint?: FulfillmentPoint;
  fromPoint?: FulfillmentPoint | null;
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

// Dipakai Keranjang Terencana (belum pilih Point, cuma daftar rencana belanja).
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

// Dipakai Keranjang Beli Sekarang — Point dipilih per item saat "Tambah ke
// Keranjang" (bukan pas checkout lagi). Karena tiap Order cuma bisa 1 Point,
// keranjang ini bisa berisi campuran Point berbeda; checkout otomatis
// memecahnya jadi beberapa pesanan (lihat app/checkout/page.tsx).
export interface BuyNowItem extends CartItem {
  pointId: string;
  pointName: string;
  pointCode: string;
}
