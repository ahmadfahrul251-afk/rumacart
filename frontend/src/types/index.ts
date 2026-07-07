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
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "KASIR" | "GUDANG" | "KURIR" | "CUSTOMER";
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}
