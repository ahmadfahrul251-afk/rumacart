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
  variantId: string;
  pointId: string;
  stock: number;
  minStock: number;
  maxStock?: number | null;
  safetyStock?: number | null;
  // Harga per lokasi — basePrice cuma diatur RDH, sellPrice/discountPrice
  // cuma diatur Mart/Point. Lihat komentar di schema.prisma model Inventory.
  basePrice?: number | null;
  sellPrice?: number | null;
  discountPrice?: number | null;
  point?: FulfillmentPoint;
  variant?: ProductVariant;
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
  variantId: string;
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
  variant?: ProductVariant;
}

// Round 18: fitur Varian Produk. Product cuma "induk" (nama, kategori, brand,
// kata kunci) — SKU/barcode/dimensi/harga/stok ada di ProductVariant &
// Inventory di bawahnya. Tiap Product minimal punya 1 varian (kalau produknya
// tidak punya rasa/ukuran lain, variannya cuma 1 dan dinamai "Default").
export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // contoh: "Original", "Pedas", "85g", "Karton isi 40", atau "Default"
  sku: string;
  barcode?: string | null;
  weightGram: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  minStock: number;
  image?: string | null;
  isActive?: boolean;
  createdAt?: string;
  product?: Product;
  inventory?: Inventory[];
  totalStock?: number;
  // Rentang harga lintas lokasi (dihitung backend dari Inventory.sellPrice/
  // discountPrice tiap lokasi yang sudah klaim & atur harga varian ini) — null
  // kalau belum ada satupun Mart/Point yang klaim+atur harga varian ini.
  priceMin?: number | null;
  priceMax?: number | null;
  // Cuma terisi kalau request-nya point-scoped (?pointId= atau lewat
  // /points/:id/products) — harga & stok spesifik 1 lokasi itu.
  currentPoint?: { pointId: string; stock: number; basePrice: number | null; sellPrice: number | null; discountPrice: number | null } | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  categoryId?: string;
  searchKeywords?: string | null;
  minStock?: number; // nilai default dipakai saat bikin ProductVariant baru
  images: string[];
  category?: Category;
  variants?: ProductVariant[];
  totalStock?: number;
  // Rentang harga GABUNGAN lintas semua varian x semua lokasi — null kalau
  // belum ada satupun varian yang diklaim+diatur harganya.
  priceMin?: number | null;
  priceMax?: number | null;
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
  // Cuma terisi kalau keranjang 1 produk (lihat point.controller.ts#eligiblePoints) —
  // harga produk itu di lokasi ini, buat dibandingkan sebelum customer pilih lokasi.
  price?: number | null;
  originalPrice?: number | null;
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
  variantId: string;
  name: string;
  qtySold: number;
  revenue: number;
}

export interface CitySales {
  city: string;
  orderCount: number;
  revenue: number;
}

// Data wilayah resmi Indonesia (Kemendagri) — dipakai dropdown bertingkat
// Provinsi -> Kota/Kabupaten -> Kecamatan di semua form alamat.
export interface Province {
  kode: string;
  nama: string;
}

export interface Regency {
  kode: string;
  kode_provinsi: string;
  nama: string;
}

export interface District {
  kode: string;
  kode_kabupaten: string;
  nama: string;
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
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt?: string;
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
  variantId: string;
  qty: number;
  price: number;
  subtotal: number;
  variant?: ProductVariant;
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
  image?: string | null;
  role: Role;
  managedPointId?: string | null;
  managedPoint?: { id: string; name: string; code: string; type: LocationType; parentHubId?: string | null } | null;
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
  variantId: string;
  qty: number;
  costPrice: number;
  subtotal: number;
  variant?: ProductVariant;
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
  variantId: string;
  qty: number;
  variant?: ProductVariant;
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
// Round 18: menyimpan variantId (bukan productId) karena harga/stok sekarang
// per varian — `name` sudah digabung "Nama Produk (Nama Varian)" oleh
// pemanggil saat item ditambahkan (kecuali varian "Default", cukup nama produknya).
export interface CartItem {
  variantId: string;
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
