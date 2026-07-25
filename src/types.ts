export interface SavedAddress {
  id: string;
  searchAddress: string;
  houseNo: string;
  buildingBlock?: string;
  landmarkArea?: string;
  city?: string;
  state?: string;
  pincode?: string;
  label: string;
  receiverName: string;
  receiverPhone: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  password?: string;
  userRole?: 'customer' | 'rider' | 'concierge' | 'admin' | 'merchant';
  role?: 'customer' | 'concierge' | 'admin' | 'merchant';
  brand_name?: string;
  category?: string;
  vehicles?: string[]; // Max 1 allowed (e.g. Activa 6G or Honda Splendor)
  licenseNumber?: string; // Driving license for verification
  authMethod?: 'google' | 'password';
  onboarded?: boolean;
}

export interface MerchantProfile {
  email: string;
  name: string;
  brand_name: string;
  category: string;
  phone: string;
  onboarded: boolean;
  role: 'merchant';
  store_address: {
    flat?: string;
    building?: string;
    line1?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    searchAddress?: string;
    lat?: number;
    lng?: number;
  };
  created_at?: string;
}

export interface MerchantProduct {
  id: string;
  merchant_email: string;
  brand_name: string;
  title: string;
  category: string;
  price: number;
  in_stock: boolean;
  description: string;
  image_url?: string;
  discount_percent?: number;
  created_at: string;
}

export interface MerchantAnalytics {
  total_revenue: number;
  total_sold: number;
  pending_orders_count: number;
  completed_orders_count: number;
  top_products: { title: string; count: number; revenue: number }[];
}

export type DispatchStatus = 'pending' | 'assigned' | 'collected' | 'transit' | 'delivered';

export interface ErrandDispatch {
  id: string;
  category: 'Grocery' | 'Courier' | 'Boutique' | 'Concierge' | 'Medical' | 'Documents' | 'Tech Gear' | 'Food Crate';
  pickupAddress: string;
  dropAddress: string;
  priority: 'STANDARD' | 'EXPRESS' | 'CRITICAL';
  status: DispatchStatus;
  progress: number; // 0 to 100
  createdAt: string;
  agentName: string;
  agentPhone: string;
  estimatedTime: number; // minutes total
  elapsedTime: number; // minutes elapsed
  pickupCoords: { x: number; y: number };
  dropCoords: { x: number; y: number };
  currentCoords: { x: number; y: number };
}

export interface DispatchZone {
  id: string;
  name: string;
  coords: { x: number; y: number };
  loadLevel: 'LOW' | 'OPTIMAL' | 'HIGH';
  agentsAvailable: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'system' | 'route' | 'agent' | 'success';
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];
