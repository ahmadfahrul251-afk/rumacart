// Tipe data bersama, mengikuti bentuk response dari backend Express + Prisma.

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  brand?: string | null;
  sku: string;
  weightGram: number;
  costPrice: number;
  sellPrice: number;
  discountPrice?: number | null;
  images: string[];
  category?: Category;
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

export interface FulfillmentPoint {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
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

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface Payment {
  id: string;
  method: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: string | null;
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
  createdAt: string;
  items: OrderItem[];
  point?: FulfillmentPoint;
  payment?: Payment;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "KASIR" | "GUDANG" | "KURIR" | "CUSTOMER";
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
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

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}
