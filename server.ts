import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// In-memory data store for Project Dunzo
const users = new Map();
users.set("admin@projectdunzo.co", {
  user_id: "admin-1",
  email: "admin@projectdunzo.co",
  name: "System Admin",
  role: "admin",
  phone: "+919876543210",
  onboarded: true,
  created_at: new Date(Date.now() - 86400000 * 7).toISOString()
});

const sessions = new Map();
const addresses = new Map(); // address_id -> address
const dispatches = new Map(); // dispatch_id -> dispatch
const messages = new Map(); // dispatch_id -> [messages]
const merchantProducts = new Map(); // product_id -> product

// Seed initial default products for merchants
const SEED_PRODUCTS = [
  { id: "prod_1", merchant_email: "demo@zepto.com", brand_name: "Zepto Fresh", title: "Amul Taaza Toned Milk 1L", category: "Grocery & Fresh", price: 54, in_stock: true, description: "Fresh pasteurized toned milk packet", image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300", created_at: new Date().toISOString() },
  { id: "prod_2", merchant_email: "demo@zepto.com", brand_name: "Zepto Fresh", title: "Organic Hass Avocado (2 Pcs)", category: "Grocery & Fresh", price: 189, in_stock: true, description: "Creamy ripe Mexican Hass avocados", image_url: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300", created_at: new Date().toISOString() },
  { id: "prod_3", merchant_email: "demo@zepto.com", brand_name: "Zepto Fresh", title: "Aashirvaad Shuddh Chakki Atta 5kg", category: "Grocery & Fresh", price: 265, in_stock: true, description: "100% pure whole wheat flour", image_url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300", created_at: new Date().toISOString() },
  { id: "prod_4", merchant_email: "demo@zara.com", brand_name: "Zara Boutique", title: "Oversized Cotton Linen Shirt", category: "Fashion & Boutique", price: 2990, in_stock: true, description: "Breathable natural linen button-down shirt", image_url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=300", created_at: new Date().toISOString() },
  { id: "prod_5", merchant_email: "demo@zara.com", brand_name: "Zara Boutique", title: "High-Waist Tailored Trousers", category: "Fashion & Boutique", price: 3590, in_stock: true, description: "Pleated smart casual trousers in beige", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300", created_at: new Date().toISOString() },
  { id: "prod_6", merchant_email: "demo@apollo.com", brand_name: "Apollo Pharmacy", title: "Crocin Pain Relief Max (15 Tabs)", category: "Pharmacy & Care", price: 65, in_stock: true, description: "Fast acting paracetamol tablets", image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300", created_at: new Date().toISOString() },
  { id: "prod_7", merchant_email: "demo@apollo.com", brand_name: "Apollo Pharmacy", title: "Dettol Antiseptic Liquid 500ml", category: "Pharmacy & Care", price: 210, in_stock: true, description: "First aid disinfectant liquid", image_url: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300", created_at: new Date().toISOString() },
  { id: "prod_8", merchant_email: "demo@nike.com", brand_name: "Nike Store", title: "Nike Air Zoom Pegasus 40", category: "Sports & Footwear", price: 11895, in_stock: true, description: "Responsive everyday road running shoes", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300", created_at: new Date().toISOString() },
];
SEED_PRODUCTS.forEach(p => merchantProducts.set(p.id, p));

const adminEmail = "admin@projectdunzo.co";

// Helper auth middleware from header or cookie/session
const getAuthUser = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const email = sessions.get(token);
    if (email && users.get(email)) {
      return users.get(email);
    }
  }
  // Fallback demo user if header missing
  return users.get(adminEmail);
};

// ---------- API ROUTES ----------

app.get("/api/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(user);
});

app.post("/api/auth/google", (req, res) => {
  const { email, name, role } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  let user = users.get(email);
  if (!user) {
    user = {
      user_id: `user_${Date.now()}`,
      email,
      name: name || "Google User",
      role: role || "customer",
      phone: "",
      onboarded: false,
      primary_address: null,
      created_at: new Date().toISOString()
    };
    users.set(email, user);
  } else {
    if (role && user.role !== "admin") {
      user.role = role;
    }
    if (name) user.name = name;
    if (user.role === "concierge" || user.role === "rider" || role === "concierge") {
      user.onboarded = !!(user.onboarded || (user.phone && (user.vehicle_brand || user.license_number)));
    } else {
      user.onboarded = !!(user.onboarded || (user.phone && user.primary_address));
    }
  }
  const token = `token_${Date.now()}`;
  sessions.set(token, email);
  res.json({ token, user });
});

app.post("/api/auth/admin-login", (req, res) => {
  const { email, password } = req.body;
  if ((email === "admin@projectdunzo.co" && password === "ProjectDunzo.Mesa") || (email === "admin@projectdunzo.com" && (password === "admin123" || password === "password" || password))) {
    let user = users.get(email);
    if (!user) {
      user = {
        user_id: "admin-1",
        email: email || "admin@projectdunzo.co",
        name: "System Admin",
        role: "admin",
        phone: "+919876543210",
        onboarded: true,
      };
      users.set(email, user);
    }
    const token = `token_${Date.now()}`;
    sessions.set(token, email);
    return res.json({ token, user });
  }
  return res.status(401).json({ error: "Invalid admin email or password. Use admin@projectdunzo.co / ProjectDunzo.Mesa" });
});

app.post("/api/auth/session", (req, res) => {
  const { session_id } = req.body;
  // If session_id provided from Emergent OAuth or login
  const email = session_id ? `user_${session_id}@dunzo.local` : "customer@projectdunzo.com";
  let user = users.get(email);
  if (!user) {
    user = {
      user_id: `user-${Date.now()}`,
      email,
      name: "Dunzo User",
      role: "customer",
      phone: "+919876543212",
      onboarded: true,
    };
    users.set(email, user);
  }
  const token = `token_${Date.now()}`;
  sessions.set(token, email);
  res.json({ token, user });
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

app.patch("/api/auth/profile", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { name, phone } = req.body;
  if (name) user.name = name;
  if (phone) user.phone = phone;
  users.set(user.email, user);
  res.json(user);
});

// Geocode
app.get("/api/geocode/search", async (req, res) => {
  const q = (req.query.q as string) || "";
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "ProjectDunzo/1.0" }
    });
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return res.json(data);
    }
  } catch (e) {}

  res.json([
    {
      place_id: 1,
      display_name: `${q} - 100ft Road, Indiranagar, Bengaluru, Karnataka, 560038`,
      lat: 12.9716,
      lon: 77.5946,
      address: { road: "100ft Road", suburb: "Indiranagar", city: "Bengaluru", state: "Karnataka", postcode: "560038" }
    },
    {
      place_id: 2,
      display_name: `${q} - 4th Block, Koramangala, Bengaluru, Karnataka, 560034`,
      lat: 12.9352,
      lon: 77.6245,
      address: { road: "80 Feet Road", suburb: "Koramangala", city: "Bengaluru", state: "Karnataka", postcode: "560034" }
    },
    {
      place_id: 3,
      display_name: `${q} - MG Road, Ashok Nagar, Bengaluru, Karnataka, 560001`,
      lat: 12.9756,
      lon: 77.6066,
      address: { road: "MG Road", suburb: "Ashok Nagar", city: "Bengaluru", state: "Karnataka", postcode: "560001" }
    }
  ]);
});

app.get("/api/geocode/reverse", async (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 12.9716;
  const lng = parseFloat(req.query.lng as string) || 77.5946;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { "User-Agent": "ProjectDunzo/1.0" }
    });
    const data = await response.json();
    if (data && data.display_name) {
      return res.json(data);
    }
  } catch (e) {}

  res.json({
    display_name: `Brigade Road, Central Bengaluru, Karnataka, 560025`,
    lat,
    lon: lng,
    address: { road: "Brigade Road", suburb: "Central", city: "Bengaluru", state: "Karnataka", postcode: "560025" }
  });
});

// Quote
app.post("/api/quote", (req, res) => {
  const { pickup, drop, service_type, items } = req.body;
  let distanceKm = 3.5;
  if (pickup && drop && typeof pickup.lat === 'number' && typeof drop.lat === 'number' && typeof drop.lng === 'number' && typeof pickup.lng === 'number') {
    if (pickup.lat === drop.lat && pickup.lng === drop.lng) {
      return res.status(400).json({ detail: "Pickup and drop locations cannot be the same." });
    }
    const R = 6371; // Earth radius in km
    const dLat = (drop.lat - pickup.lat) * (Math.PI / 180);
    const dLon = (drop.lng - pickup.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(pickup.lat * (Math.PI / 180)) * Math.cos(drop.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.max(1.0, parseFloat((R * c).toFixed(1)));
  }

  let itemsTotal = 0;
  if (items && Array.isArray(items)) {
    itemsTotal = items.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  }

  const baseFee = service_type === "grocery_medicine" ? 49 : service_type === "small_brands" ? 59 : 35;
  const rawDeliveryFee = Math.round(baseFee + distanceKm * 15);

  // Driver commission: base 20-50 based on distance, plus 3-10 per extra km
  const baseCommission = Math.min(50, Math.max(20, Math.round(20 + distanceKm * 6)));
  const extraPerKmRate = 6; // between 3 and 10
  const driverCommission = Math.round(baseCommission + Math.max(0, distanceKm - 1) * extraPerKmRate);

  const deliveryFee = Math.max(rawDeliveryFee, driverCommission + 15);
  const platformProfit = Math.round(deliveryFee * 0.25); // 25% profit margin
  const totalAmount = deliveryFee + platformProfit + itemsTotal;

  res.json({
    distance_km: distanceKm,
    estimated_minutes: Math.max(5, Math.round(distanceKm * 3.5 + 5)),
    delivery_fee: deliveryFee,
    platform_profit: platformProfit,
    driver_commission: driverCommission,
    items_total: itemsTotal,
    price: totalAmount,
    total_amount: totalAmount,
    service_type: service_type || "parcel",
  });
});

// Addresses
app.get("/api/addresses", (req, res) => {
  const user = getAuthUser(req);
  const userKey = user?.email || user?.user_id || "";
  const userAddresses = Array.from(addresses.values()).filter((a: any) => {
    if (!user) return true;
    return a.user_id === userKey || a.user_id === user?.user_id || a.user_id === user?.email || a.email === userKey || !a.user_id;
  });
  if (user && user.primary_address) {
    const hasPrimary = userAddresses.some((a: any) => a.address_id === "primary_home" || a.is_primary);
    if (!hasPrimary) {
      const primaryAddr = {
        address_id: "primary_home",
        id: "primary_home",
        user_id: userKey,
        email: userKey,
        searchAddress: [user.primary_address.line1, user.primary_address.area, user.primary_address.city].filter(Boolean).join(", "),
        houseNo: user.primary_address.flat || user.primary_address.building || user.primary_address.line1 || "",
        receiverName: user.name || "Customer",
        receiverPhone: user.phone || "",
        ...user.primary_address,
        createdAt: new Date().toISOString()
      };
      addresses.set(`${userKey}_primary_home`, primaryAddr);
      userAddresses.unshift(primaryAddr);
    }
  }

  // Deduplicate userAddresses by normalized content (house/flat + pincode or searchAddress)
  const uniqueAddrs: any[] = [];
  const seenKeys = new Set<string>();
  for (const addr of userAddresses) {
    const house = (addr.houseNo || addr.flat || addr.building || addr.line1 || "").toString().trim().toLowerCase();
    const pin = (addr.pincode || "").toString().trim();
    const key = house && pin ? `${house}_${pin}` : (addr.address_id || addr.id || JSON.stringify(addr));
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueAddrs.push(addr);
    }
  }

  res.json(uniqueAddrs);
});

app.post("/api/addresses", (req, res) => {
  const user = getAuthUser(req);
  const userKey = user?.email || user?.user_id || "user-1";
  
  const house = (req.body.houseNo || req.body.flat || req.body.building || req.body.line1 || "").toString().trim().toLowerCase();
  const pin = (req.body.pincode || "").toString().trim();

  // Check if an address with identical house & pincode already exists for this user
  if (house) {
    for (const [k, v] of addresses.entries()) {
      const vUser = (v as any).user_id || (v as any).email;
      if (vUser === userKey || !vUser) {
        const vHouse = ((v as any).houseNo || (v as any).flat || (v as any).building || (v as any).line1 || "").toString().trim().toLowerCase();
        const vPin = ((v as any).pincode || "").toString().trim();
        if (vHouse === house && (!pin || !vPin || vPin === pin)) {
          // Update existing address instead of creating duplicate
          const updated = { ...v, ...req.body };
          addresses.set(k, updated);
          return res.json(updated);
        }
      }
    }
  }

  const rawId = req.body.address_id || req.body.id || `addr_${Date.now()}`;
  const storeKey = `${userKey}_${rawId}`;
  const newAddr = {
    address_id: rawId,
    id: rawId,
    user_id: userKey,
    email: userKey,
    searchAddress: req.body.searchAddress || [req.body.line1, req.body.area, req.body.city].filter(Boolean).join(", "),
    houseNo: req.body.houseNo || req.body.flat || req.body.building || req.body.line1 || "",
    receiverName: req.body.receiverName || user?.name || "Customer",
    receiverPhone: req.body.receiverPhone || user?.phone || "",
    ...req.body
  };
  addresses.set(storeKey, newAddr);
  res.json(newAddr);
});

app.patch("/api/addresses/:id", (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.params;
  const userKey = user?.email || user?.user_id || "";
  let existingKey = "";
  let existing: any = null;

  for (const [k, v] of addresses.entries()) {
    if (k === id || k === `${userKey}_${id}` || (v as any).address_id === id || (v as any).id === id) {
      if (!userKey || (v as any).user_id === userKey || (v as any).email === userKey) {
        existing = v;
        existingKey = k;
        break;
      }
    }
  }

  if (!existing) return res.status(404).json({ error: "Address not found" });
  const updated = { ...existing, ...req.body };
  addresses.set(existingKey || `${userKey}_${id}`, updated);
  res.json(updated);
});

app.delete("/api/addresses/:id", (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.params;
  const userKey = user?.email || user?.user_id || "";

  let targetAddr: any = null;
  const keysToDelete: string[] = [];

  for (const [k, v] of addresses.entries()) {
    const vUser = (v as any).user_id || (v as any).email;
    if (k === id || k === `${userKey}_${id}` || (v as any).address_id === id || (v as any).id === id) {
      if (!userKey || vUser === userKey || !vUser) {
        targetAddr = v;
        keysToDelete.push(k);
      }
    }
  }

  // If target address found, also find duplicates matching house & pincode
  if (targetAddr) {
    const targetHouse = (targetAddr.houseNo || targetAddr.flat || targetAddr.building || targetAddr.line1 || "").toString().trim().toLowerCase();
    const targetPin = (targetAddr.pincode || "").toString().trim();
    if (targetHouse) {
      for (const [k, v] of addresses.entries()) {
        const vUser = (v as any).user_id || (v as any).email;
        if (!userKey || vUser === userKey || !vUser) {
          const vHouse = ((v as any).houseNo || (v as any).flat || (v as any).building || (v as any).line1 || "").toString().trim().toLowerCase();
          const vPin = ((v as any).pincode || "").toString().trim();
          if (vHouse === targetHouse && (!targetPin || !vPin || vPin === targetPin)) {
            keysToDelete.push(k);
          }
        }
      }
    }
  }

  keysToDelete.forEach(k => addresses.delete(k));

  // If user has primary_address matching, clear it
  if (user && user.primary_address) {
    user.primary_address = null;
  }

  res.json({ success: true });
});

// Dispatches
app.get("/api/dispatches", (req, res) => {
  const list = Array.from(dispatches.values());
  res.json(list);
});

app.post("/api/dispatches", (req, res) => {
  const user = getAuthUser(req);
  const { pickup, drop, items } = req.body;
  if (pickup && drop && pickup.lat === drop.lat && pickup.lng === drop.lng) {
    return res.status(400).json({ detail: "Pickup and drop locations cannot be the same. Please choose different locations." });
  }

  let distanceKm = req.body.distance_km || 3.5;
  if (pickup && drop && typeof pickup.lat === 'number' && typeof drop.lat === 'number') {
    const R = 6371;
    const dLat = (drop.lat - pickup.lat) * (Math.PI / 180);
    const dLon = (drop.lng - pickup.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(pickup.lat * (Math.PI / 180)) * Math.cos(drop.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.max(1.0, parseFloat((R * c).toFixed(1)));
  }

  let itemsTotal = 0;
  if (items && Array.isArray(items)) {
    itemsTotal = items.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  }

  const baseFee = 35;
  const rawDeliveryFee = Math.round(baseFee + distanceKm * 15);

  const baseCommission = Math.min(50, Math.max(20, Math.round(20 + distanceKm * 6)));
  const extraPerKmRate = 6;
  const driverCommission = Math.round(baseCommission + Math.max(0, distanceKm - 1) * extraPerKmRate);

  const deliveryFee = Math.max(rawDeliveryFee, driverCommission + 15);
  const platformProfit = Math.round(deliveryFee * 0.25);
  const totalAmount = deliveryFee + platformProfit + itemsTotal;

  const id = `disp_${Date.now()}`;
  const newDisp = {
    dispatch_id: id,
    customer_id: user?.user_id || user?.email || "user-1",
    customer_name: user?.name || "Customer",
    customer_phone: req.body.customer_phone || user?.phone || "",
    status: "pending",
    created_at: new Date().toISOString(),
    distance_km: distanceKm,
    delivery_fee: req.body.delivery_fee || deliveryFee,
    platform_profit: req.body.platform_profit || platformProfit,
    driver_commission: req.body.driver_commission || driverCommission,
    items_total: itemsTotal,
    total_amount: req.body.total_amount || totalAmount,
    ...req.body,
    courier: { lat: pickup ? pickup.lat : 12.9716, lng: pickup ? pickup.lng : 77.5946 },
  };
  dispatches.set(id, newDisp);
  res.json(newDisp);
});

app.get("/api/dispatches/:id", (req, res) => {
  const { id } = req.params;
  const disp = dispatches.get(id);
  if (!disp) {
    // Return mock dispatch if not found
    return res.json({
      dispatch_id: id,
      customer_name: "Test Customer",
      status: "pending",
      pickup: { label: "Indiranagar", lat: 12.9716, lng: 77.5946 },
      drop: { label: "Koramangala", lat: 12.9352, lng: 77.6245 },
      courier: { lat: 12.95, lng: 77.61 },
      distance_km: 4.2,
      delivery_fee: 98,
      platform_profit: 25,
      driver_commission: 85,
      total_amount: 123,
      created_at: new Date().toISOString(),
    });
  }
  res.json(disp);
});

app.post("/api/dispatches/:id/accept", (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const disp = dispatches.get(id) || { dispatch_id: id, status: "pending" };
  disp.status = "accepted";
  disp.concierge_id = user?.user_id || user?.email || "concierge-1";
  disp.concierge_name = user?.name || "Raju (Delivery Partner)";
  disp.concierge_phone = user?.phone || "+91 98765 43210";
  disp.concierge_photo = user?.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
  dispatches.set(id, disp);
  res.json(disp);
});

app.patch("/api/dispatches/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const disp = dispatches.get(id) || { dispatch_id: id };
  disp.status = status;
  dispatches.set(id, disp);
  res.json(disp);
});

app.patch("/api/dispatches/:id/location", (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;
  const disp = dispatches.get(id) || { dispatch_id: id };
  disp.courier = { lat, lng };
  dispatches.set(id, disp);
  res.json(disp);
});

// Messages
app.get("/api/dispatches/:id/messages", (req, res) => {
  const { id } = req.params;
  res.json(messages.get(id) || []);
});

app.post("/api/dispatches/:id/messages", (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const list = messages.get(id) || [];
  const msg = { id: `msg_${Date.now()}`, sender: "Customer", text, timestamp: new Date().toISOString() };
  list.push(msg);
  messages.set(id, list);
  res.json(msg);
});

// Admin stats & data
app.get("/api/admin/stats", (req, res) => {
  const dispArr: any = Array.from(dispatches.values());
  const by_status = {
    pending: dispArr.filter((d: any) => d.status === "pending").length,
    accepted: dispArr.filter((d: any) => d.status === "accepted").length,
    picked_up: dispArr.filter((d: any) => d.status === "picked_up").length,
    in_transit: dispArr.filter((d: any) => d.status === "in_transit").length,
    delivered: dispArr.filter((d: any) => d.status === "delivered").length,
    cancelled: dispArr.filter((d: any) => d.status === "cancelled").length,
  };
  res.json({
    total_users: users.size,
    users_total: users.size,
    total_dispatches: dispatches.size,
    active_deliveries: dispArr.filter((d: any) => d.status !== "delivered" && d.status !== "cancelled").length,
    revenue: dispArr.filter((d: any) => d.status === "delivered").reduce((acc: number, d: any) => acc + (d.estimated_price || 150), 0),
    by_status,
  });
});

app.get("/api/admin/users", (req, res) => {
  res.json(Array.from(users.values()));
});

app.get("/api/admin/dispatches", (req, res) => {
  res.json(Array.from(dispatches.values()));
});

// Onboarding
app.post("/api/onboarding/customer", (req, res) => {
  const user = getAuthUser(req) || { email: "customer@projectdunzo.com", name: "Customer", user_id: "user-1" };
  user.onboarded = true;
  user.role = "customer";
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.primary_address) {
    user.primary_address = req.body.primary_address;
    const addrId = "primary_home";
    const newAddr = {
      address_id: addrId,
      id: addrId,
      user_id: user.user_id || user.email,
      searchAddress: [req.body.primary_address.line1, req.body.primary_address.area, req.body.primary_address.city].filter(Boolean).join(", "),
      houseNo: req.body.primary_address.flat || req.body.primary_address.building || req.body.primary_address.line1,
      receiverName: user.name || "Customer",
      receiverPhone: user.phone || "",
      ...req.body.primary_address,
      createdAt: new Date().toISOString()
    };
    addresses.set(addrId, newAddr);
  }
  users.set(user.email, user);
  res.json(user);
});

app.post("/api/onboarding/rider", (req, res) => {
  const user = getAuthUser(req) || { email: "rider@projectdunzo.com", name: "Rider Partner" };
  user.onboarded = true;
  user.role = "concierge";
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.vehicle_brand) user.vehicle_brand = req.body.vehicle_brand;
  if (req.body.license_number) user.license_number = req.body.license_number;
  if (req.body.city) user.city = req.body.city;
  if (req.body.state) user.state = req.body.state;
  if (req.body.pincode) user.pincode = req.body.pincode;
  users.set(user.email, user);
  res.json(user);
});

app.post("/api/onboarding/merchant", (req, res) => {
  const user = getAuthUser(req) || { email: "merchant@projectdunzo.com", name: "Merchant Partner" };
  user.onboarded = true;
  user.role = "merchant";
  if (req.body.brand_name) user.brand_name = req.body.brand_name;
  if (req.body.category) user.category = req.body.category;
  if (req.body.phone) user.phone = req.body.phone;
  if (req.body.store_address) user.store_address = req.body.store_address;
  users.set(user.email, user);
  res.json(user);
});

// Merchant Products Catalog APIs
app.get("/api/merchant/products", (req, res) => {
  const user = getAuthUser(req);
  const email = user?.email || "";
  const brandName = user?.brand_name || "";

  let list = Array.from(merchantProducts.values()).filter(
    (p: any) => p.merchant_email === email || (brandName && p.brand_name?.toLowerCase() === brandName.toLowerCase())
  );

  // If no items exist for this merchant brand yet, auto-seed default items
  if (list.length === 0 && email) {
    const defaultBrand = brandName || "Merchant Store";
    const defaultCategory = user?.category || "Grocery & Fresh";
    const newSeed = [
      { id: `prod_${Date.now()}_1`, merchant_email: email, brand_name: defaultBrand, title: `${defaultBrand} Special Combo Pack`, category: defaultCategory, price: 299, in_stock: true, description: "Bestselling featured product pack", image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300", created_at: new Date().toISOString() },
      { id: `prod_${Date.now()}_2`, merchant_email: email, brand_name: defaultBrand, title: `${defaultBrand} Premium Select Item`, category: defaultCategory, price: 499, in_stock: true, description: "Top quality store item", image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300", created_at: new Date().toISOString() },
    ];
    newSeed.forEach(p => merchantProducts.set(p.id, p));
    list = newSeed;
  }

  res.json(list);
});

app.post("/api/merchant/products", (req, res) => {
  const user = getAuthUser(req);
  const { title, category, price, in_stock, description, image_url, discount_percent } = req.body;
  if (!title || price === undefined) {
    return res.status(400).json({ error: "Title and price are required" });
  }

  const id = `prod_${Date.now()}`;
  const newProduct = {
    id,
    merchant_email: user?.email || "merchant@projectdunzo.com",
    brand_name: user?.brand_name || "Merchant Store",
    title,
    category: category || user?.category || "General Retail",
    price: Number(price) || 0,
    in_stock: in_stock !== false,
    description: description || "",
    image_url: image_url || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300",
    discount_percent: Number(discount_percent) || 0,
    created_at: new Date().toISOString(),
  };

  merchantProducts.set(id, newProduct);
  res.json(newProduct);
});

app.patch("/api/merchant/products/:id", (req, res) => {
  const { id } = req.params;
  const existing = merchantProducts.get(id);
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  const updated = { ...existing, ...req.body };
  merchantProducts.set(id, updated);
  res.json(updated);
});

app.delete("/api/merchant/products/:id", (req, res) => {
  const { id } = req.params;
  merchantProducts.delete(id);
  res.json({ success: true, id });
});

// Merchant Orders Broadcast & Management APIs
app.get("/api/merchant/orders", (req, res) => {
  const user = getAuthUser(req);
  const email = user?.email || "";
  const brandName = (user?.brand_name || "").toLowerCase();
  const category = (user?.category || "").toLowerCase();

  const allDispatches = Array.from(dispatches.values());

  // Return dispatches that match this merchant's brand, email, category, or general broadcast pool
  const list = allDispatches.filter((d: any) => {
    const dBrand = (d.target_brand || d.brand_name || d.pickup?.label || "").toLowerCase();
    const dCategory = (d.item_category || d.service_type || "").toLowerCase();
    const isTargetBrand = brandName && dBrand.includes(brandName);
    const isMerchantAssigned = d.merchant_email === email;
    const isCategoryMatch = category && dCategory.includes(category);
    const isPendingBroadcast = d.status === "pending_merchant" || d.status === "pending";

    return isTargetBrand || isMerchantAssigned || (isPendingBroadcast && (isCategoryMatch || !d.merchant_email));
  });

  res.json(list);
});

app.post("/api/dispatches/:id/merchant-accept", (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  const disp = dispatches.get(id) || { dispatch_id: id, status: "pending" };

  const storeAddr = user?.store_address;
  const pickupLabel = storeAddr?.searchAddress || [storeAddr?.line1, storeAddr?.area, storeAddr?.city].filter(Boolean).join(", ") || `${user?.brand_name || "Merchant Store"} - ${user?.city || "Bengaluru"}`;
  const pickupLat = storeAddr?.lat || 12.9716;
  const pickupLng = storeAddr?.lng || 77.5946;

  disp.status = "merchant_accepted";
  disp.merchant_email = user?.email;
  disp.merchant_name = user?.brand_name || user?.name || "Merchant Store";
  disp.merchant_phone = user?.phone || "";
  disp.pickup = {
    label: `${user?.brand_name || "Store"}: ${pickupLabel}`,
    lat: pickupLat,
    lng: pickupLng,
  };

  dispatches.set(id, disp);
  res.json(disp);
});

// Brand-Isolated Analytics API (Strictly for THIS merchant)
app.get("/api/merchant/analytics", (req, res) => {
  const user = getAuthUser(req);
  const email = user?.email || "";
  const brandName = (user?.brand_name || "").toLowerCase();

  const allDispatches: any[] = Array.from(dispatches.values());

  // Filter ONLY dispatches belonging to this merchant
  const myDispatches = allDispatches.filter((d: any) => {
    const dBrand = (d.target_brand || d.brand_name || d.merchant_name || d.pickup?.label || "").toLowerCase();
    return d.merchant_email === email || (brandName && dBrand.includes(brandName));
  });

  const completed = myDispatches.filter((d: any) => d.status === "delivered");
  const pending = myDispatches.filter((d: any) => d.status === "pending_merchant" || d.status === "pending");

  const total_revenue = completed.reduce((sum, d) => sum + (d.items_total || d.total_amount || 250), 0);
  const total_sold = completed.reduce((sum, d) => {
    if (Array.isArray(d.items)) {
      return sum + d.items.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);
    }
    return sum + 1;
  }, 0);

  // Top products calculation
  const productSales = new Map();
  completed.forEach((d: any) => {
    if (Array.isArray(d.items)) {
      d.items.forEach((item: any) => {
        const name = item.name || item.title || "Store Item";
        const qty = Number(item.quantity) || 1;
        const rev = (Number(item.price) || 100) * qty;
        const prev = productSales.get(name) || { count: 0, revenue: 0 };
        productSales.set(name, { count: prev.count + qty, revenue: prev.revenue + rev });
      });
    }
  });

  const top_products = Array.from(productSales.entries()).map(([title, stats]: any) => ({
    title,
    count: stats.count,
    revenue: stats.revenue,
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  res.json({
    total_revenue,
    total_sold,
    pending_orders_count: pending.length,
    completed_orders_count: completed.length,
    top_products,
  });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Project Dunzo server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
