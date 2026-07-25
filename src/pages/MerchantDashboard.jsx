import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  ShoppingBag,
  TrendingUp,
  Search,
  Filter,
  Check,
  X,
  ArrowRight,
  Bike,
  MapPin,
  RefreshCw,
  Eye,
  DollarSign,
  Package,
  AlertCircle,
  Tag,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";

export default function MerchantDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("orders"); // orders | products | analytics

  // Products state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    title: "",
    price: "",
    category: user?.category || "Grocery & Fresh",
    description: "",
    image_url: "",
    in_stock: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    total_revenue: 0,
    total_sold: 0,
    pending_orders_count: 0,
    completed_orders_count: 0,
    top_products: [],
  });

  const brandName = user?.brand_name || user?.name || "Merchant Store";
  const storeCategory = user?.category || "Retail";
  const storeAddress = user?.store_address;

  // Load Products
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data } = await api.get("/merchant/products");
      setProducts(data || []);
    } catch (e) {
      console.error("Error fetching merchant products:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load Orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const { data } = await api.get("/merchant/orders");
      setOrders(data || []);
    } catch (e) {
      console.error("Error fetching merchant orders:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load Analytics
  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get("/merchant/analytics");
      setAnalytics(data || {});
    } catch (e) {
      console.error("Error fetching merchant analytics:", e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
    fetchAnalytics();

    // Set up Firestore real-time listener for dispatches matching this merchant/brand
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, "dispatches"));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const liveDispatches = [];
        snapshot.forEach((doc) => {
          const d = { id: doc.id, dispatch_id: doc.id, ...doc.data() };
          const dBrand = (d.target_brand || d.brand_name || d.merchant_name || d.pickup?.label || "").toLowerCase();
          const dCategory = (d.item_category || d.service_type || "").toLowerCase();
          const myBrand = brandName.toLowerCase();
          const myCategory = storeCategory.toLowerCase();

          if (
            d.merchant_email === user?.email ||
            (myBrand && dBrand.includes(myBrand)) ||
            (d.status === "pending_merchant" && (myCategory.includes(dCategory) || !d.merchant_email)) ||
            d.status === "pending"
          ) {
            liveDispatches.push(d);
          }
        });

        if (liveDispatches.length > 0) {
          setOrders(liveDispatches);
        }
      }, (err) => console.warn("Firestore order snapshot error:", err));
    } catch (err) {
      console.warn("Firestore order subscription error:", err);
    }

    return () => unsubscribe();
  }, [user?.email, user?.brand_name]);

  // Handle Order Accept (Merchant Accepts Order)
  const handleAcceptOrder = async (order) => {
    const orderId = order.dispatch_id || order.id;
    setAcceptingId(orderId);
    try {
      const { data } = await api.post(`/dispatches/${orderId}/merchant-accept`);
      
      // Sync to Firestore
      try {
        const pickupLabel = storeAddress?.searchAddress || [storeAddress?.line1, storeAddress?.area, storeAddress?.city].filter(Boolean).join(", ") || `${brandName} Store`;
        await updateDoc(doc(db, "dispatches", orderId), {
          status: "merchant_accepted",
          merchant_email: user?.email,
          merchant_name: brandName,
          merchant_phone: user?.phone || "",
          pickup: {
            label: `${brandName}: ${pickupLabel}`,
            lat: storeAddress?.lat || 12.9716,
            lng: storeAddress?.lng || 77.5946,
          },
        }).catch(() => {});
      } catch (err) {
        console.warn("Firestore update error:", err);
      }

      toast.success(`Order #${orderId.slice(-6)} accepted! Store set as pickup location. Broadcast sent to Delivery Partners.`);
      fetchOrders();
      fetchAnalytics();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to accept order");
    } finally {
      setAcceptingId(null);
    }
  };

  // Handle Add/Edit Product Modal Submit
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.title.trim() || !productForm.price) {
      return toast.error("Please enter product title and price");
    }

    setSavingProduct(true);
    try {
      if (editingProduct) {
        const { data } = await api.patch(`/merchant/products/${editingProduct.id}`, productForm);
        
        // Sync to Firestore
        await setDoc(doc(db, "merchant_products", editingProduct.id), {
          ...editingProduct,
          ...productForm,
          price: Number(productForm.price),
        }, { merge: true }).catch(() => {});

        toast.success("Product updated successfully");
      } else {
        const { data } = await api.post("/merchant/products", productForm);
        
        // Sync to Firestore
        await setDoc(doc(db, "merchant_products", data.id), {
          ...data,
          merchant_email: user?.email,
          brand_name: brandName,
        }).catch(() => {});

        toast.success("New product added to catalog!");
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        title: "",
        price: "",
        category: storeCategory,
        description: "",
        image_url: "",
        in_stock: true,
      });
      fetchProducts();
      fetchAnalytics();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  // Quick Stock Toggle
  const handleToggleStock = async (product) => {
    try {
      const updatedStock = !product.in_stock;
      await api.patch(`/merchant/products/${product.id}`, { in_stock: updatedStock });
      
      await setDoc(doc(db, "merchant_products", product.id), { in_stock: updatedStock }, { merge: true }).catch(() => {});

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, in_stock: updatedStock } : p))
      );
      toast.info(`${product.title} is now ${updatedStock ? "In Stock" : "Out of Stock"}`);
    } catch (e) {
      toast.error("Failed to update stock status");
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product from your catalog?")) return;
    try {
      await api.delete(`/merchant/products/${productId}`);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product deleted from catalog");
      fetchAnalytics();
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category)))];

  const pendingOrders = orders.filter((o) => o.status === "pending_merchant" || o.status === "pending");
  const activeOrders = orders.filter((o) => o.status === "merchant_accepted" || o.status === "accepted" || o.status === "picked_up" || o.status === "in_transit");
  const completedOrders = orders.filter((o) => o.status === "delivered");

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-neutral-900 pb-16">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Merchant Header Card */}
        <div className="dz-card p-6 md:p-8 bg-white mb-6 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#22C55E] text-black border-2 border-black flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_0px_#000]">
                <Store className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="dz-chip dz-chip-brand font-bold text-xs">
                    <Tag className="w-3 h-3" /> {storeCategory}
                  </span>
                  <span className="dz-chip bg-[#22C55E] text-black font-bold text-xs border border-black">
                    ONLINE & RECEIVING ORDERS
                  </span>
                </div>
                <h1 className="font-display font-black text-2xl md:text-3xl text-neutral-900">
                  {brandName}
                </h1>
                <p className="text-xs font-semibold text-neutral-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                  {storeAddress?.searchAddress || [storeAddress?.line1, storeAddress?.area, storeAddress?.city].filter(Boolean).join(", ") || "Store Location Set"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchProducts();
                  fetchOrders();
                  fetchAnalytics();
                  toast.success("Merchant Portal data refreshed");
                }}
                className="dz-btn-dark inline-flex items-center gap-2 !py-2.5 !px-4 !text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync Data
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    title: "",
                    price: "",
                    category: storeCategory,
                    description: "",
                    image_url: "",
                    in_stock: true,
                  });
                  setShowProductModal(true);
                }}
                className="dz-btn inline-flex items-center gap-2 !bg-[#22C55E] !text-black !py-2.5 !px-5 !text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000]"
              >
                <Plus className="w-4 h-4" strokeWidth={3} /> Add Product
              </button>
            </div>
          </div>
        </div>

        {/* Brand Analytics Cards Row (STRICTLY Isolated to THIS Merchant) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="dz-card p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="dz-overline text-[10px]">Brand Revenue</span>
              <DollarSign className="w-4 h-4 text-[#22C55E]" strokeWidth={2.5} />
            </div>
            <div className="font-mono font-black text-2xl md:text-3xl text-neutral-900">
              ₹{(analytics.total_revenue || 0).toLocaleString("en-IN")}
            </div>
            <span className="text-[10px] font-bold text-neutral-500 mt-1 block">
              Direct earnings for {brandName}
            </span>
          </div>

          <div className="dz-card p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="dz-overline text-[10px]">Products Sold</span>
              <Package className="w-4 h-4 text-[#FFC700]" strokeWidth={2.5} />
            </div>
            <div className="font-mono font-black text-2xl md:text-3xl text-neutral-900">
              {analytics.total_sold || completedOrders.length}
            </div>
            <span className="text-[10px] font-bold text-neutral-500 mt-1 block">
              Units fulfilled & delivered
            </span>
          </div>

          <div className="dz-card p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="dz-overline text-[10px]">Pending Orders</span>
              <AlertCircle className="w-4 h-4 text-[#EF4444]" strokeWidth={2.5} />
            </div>
            <div className="font-mono font-black text-2xl md:text-3xl text-neutral-900">
              {pendingOrders.length}
            </div>
            <span className="text-[10px] font-bold text-[#EF4444] mt-1 block">
              Requires merchant accept
            </span>
          </div>

          <div className="dz-card p-5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="dz-overline text-[10px]">Active Products</span>
              <ShoppingBag className="w-4 h-4 text-[#3B82F6]" strokeWidth={2.5} />
            </div>
            <div className="font-mono font-black text-2xl md:text-3xl text-neutral-900">
              {products.length}
            </div>
            <span className="text-[10px] font-bold text-neutral-500 mt-1 block">
              In store catalog
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-black mb-6 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`dz-tab flex items-center gap-2 !py-3 !px-5 font-bold ${
              activeTab === "orders" ? "dz-tab-active" : "bg-white text-neutral-700"
            }`}
          >
            <Clock className="w-4 h-4" /> Live Orders Broadcast
            {pendingOrders.length > 0 && (
              <span className="ml-1 bg-[#EF4444] text-white text-[10px] font-mono px-2 py-0.5 rounded-full border border-black animate-pulse">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`dz-tab flex items-center gap-2 !py-3 !px-5 font-bold ${
              activeTab === "products" ? "dz-tab-active" : "bg-white text-neutral-700"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Product Catalog ({products.length})
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`dz-tab flex items-center gap-2 !py-3 !px-5 font-bold ${
              activeTab === "analytics" ? "dz-tab-active" : "bg-white text-neutral-700"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Brand Analytics & Sales
          </button>
        </div>

        {/* TAB 1: LIVE ORDERS BROADCAST */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Pending Customer Orders awaiting Merchant Acceptance */}
            <div className="dz-card p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-black text-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[#EF4444]" /> Incoming Customer Orders ({pendingOrders.length})
                  </h2>
                  <p className="text-xs text-neutral-600 font-medium mt-1">
                    Accept order to confirm store pickup location and broadcast dispatch to Delivery Partners.
                  </p>
                </div>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="text-center py-10 bg-[#F5F5F5] border-2 border-dashed border-neutral-300 rounded-xl">
                  <CheckCircle2 className="w-10 h-10 text-[#22C55E] mx-auto mb-2" />
                  <h3 className="font-bold text-base">No pending orders</h3>
                  <p className="text-xs text-neutral-500">New customer orders matching {brandName} will appear here live.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingOrders.map((order) => {
                    const orderId = order.dispatch_id || order.id;
                    const isAccepting = acceptingId === orderId;

                    return (
                      <motion.div
                        key={orderId}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="dz-card p-5 bg-[#FFFBEB] border-2 border-black shadow-[3px_3px_0px_0px_#000]"
                      >
                        <div className="flex items-center justify-between border-b-2 border-dashed border-black pb-3 mb-3">
                          <div>
                            <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 rounded">
                              #{orderId.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-neutral-600 ml-2">
                              {new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span className="dz-chip bg-[#FFC700] text-black font-bold text-[10px] border border-black">
                            AWAITING MERCHANT
                          </span>
                        </div>

                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-neutral-500">Customer:</span>
                            <span className="font-bold text-neutral-900">{order.customer_name || "Customer"}</span>
                          </div>

                          {order.items && Array.isArray(order.items) && (
                            <div>
                              <span className="font-bold text-neutral-500 block mb-1">Items Requested:</span>
                              <div className="bg-white p-2 border border-black rounded text-[11px] font-mono space-y-1">
                                {order.items.map((it, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{it.quantity || 1}x {it.name || it.title}</span>
                                    <span>₹{(Number(it.price) || 0) * (Number(it.quantity) || 1)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-start justify-between pt-1">
                            <span className="font-bold text-neutral-500">Drop Address:</span>
                            <span className="font-medium text-neutral-800 text-right max-w-[200px]">
                              {order.drop?.label || order.dropAddress || "Customer Delivery Address"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-300 font-bold text-sm">
                            <span>Order Total:</span>
                            <span className="font-mono font-black text-[#22C55E]">₹{order.items_total || order.total_amount || 350}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAcceptOrder(order)}
                          disabled={isAccepting}
                          className="w-full dz-btn inline-flex items-center justify-center gap-2 !bg-[#22C55E] !text-black !py-3 font-bold text-xs border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                        >
                          {isAccepting ? "Assigning Pickup Location…" : "Accept & Prepare Order"} <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Orders in Fulfillment / Transit */}
            <div className="dz-card p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000]">
              <h2 className="font-display font-black text-xl mb-4 flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#3B82F6]" /> Active Orders in Delivery ({activeOrders.length})
              </h2>

              {activeOrders.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs font-medium">
                  No active deliveries currently in progress.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => {
                    const orderId = order.dispatch_id || order.id;
                    return (
                      <div
                        key={orderId}
                        className="p-4 bg-[#F8FAFC] border-2 border-black rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded text-[10px]">
                              #{orderId.slice(-6).toUpperCase()}
                            </span>
                            <span className="font-bold text-neutral-800">{order.customer_name || "Customer"}</span>
                          </div>
                          <p className="text-neutral-600 font-medium">
                            Pickup: <strong className="text-neutral-900">{order.pickup?.label || brandName}</strong> → Drop: <strong className="text-neutral-900">{order.drop?.label || "Customer Location"}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`dz-chip font-bold text-[10px] ${
                            order.status === "merchant_accepted" ? "bg-[#FFC700] text-black" : "bg-[#3B82F6] text-white"
                          }`}>
                            {order.status === "merchant_accepted" ? "WAITING FOR RIDER" : order.status.toUpperCase()}
                          </span>
                          <span className="font-mono font-black text-sm">₹{order.items_total || order.total_amount || 250}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT CATALOG MANAGEMENT */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="dz-card p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display font-black text-2xl">Brand Catalog Management</h2>
                  <p className="text-xs text-neutral-600 font-medium">
                    Add, edit, or toggle stock status for products offered by {brandName}.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({
                      title: "",
                      price: "",
                      category: storeCategory,
                      description: "",
                      image_url: "",
                      in_stock: true,
                    });
                    setShowProductModal(true);
                  }}
                  className="dz-btn inline-flex items-center gap-2 !bg-[#22C55E] !text-black !py-2.5 !px-5 !text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} /> Add New Product
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search products in your store…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="dz-input pl-10 text-xs w-full"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`dz-chip text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat ? "dz-chip-brand" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              {loadingProducts ? (
                <div className="py-12 text-center text-xs font-bold animate-pulse">Loading catalog…</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-[#F5F5F5] border-2 border-dashed border-neutral-300 rounded-xl">
                  <Package className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                  <h3 className="font-bold text-base">No products found</h3>
                  <p className="text-xs text-neutral-500 mb-4">Add products to your catalog so customers can order from {brandName}.</p>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        title: "",
                        price: "",
                        category: storeCategory,
                        description: "",
                        image_url: "",
                        in_stock: true,
                      });
                      setShowProductModal(true);
                    }}
                    className="dz-btn-brand inline-flex items-center gap-2 !py-2 !px-4 !text-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Product Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="dz-card p-4 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative w-full h-36 bg-neutral-100 rounded-lg overflow-hidden mb-3 border border-neutral-300">
                          <img
                            src={p.image_url || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300"}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300";
                            }}
                          />
                          <button
                            onClick={() => handleToggleStock(p)}
                            className={`absolute top-2 right-2 dz-chip text-[10px] font-bold border border-black shadow-[1px_1px_0px_0px_#000] cursor-pointer ${
                              p.in_stock ? "bg-[#22C55E] text-black" : "bg-[#EF4444] text-white"
                            }`}
                          >
                            {p.in_stock ? "IN STOCK" : "OUT OF STOCK"}
                          </button>
                        </div>

                        <span className="dz-chip bg-neutral-100 text-neutral-700 text-[9px] font-bold mb-1 inline-block">
                          {p.category}
                        </span>
                        <h3 className="font-bold text-sm text-neutral-900 line-clamp-1 mb-1">{p.title}</h3>
                        <p className="text-xs text-neutral-600 line-clamp-2 mb-3 font-medium">{p.description || "No description provided."}</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between border-t border-neutral-200 pt-3 mb-3">
                          <span className="font-mono font-black text-lg text-neutral-900">₹{p.price}</span>
                          <button
                            onClick={() => handleToggleStock(p)}
                            className="text-xs font-bold text-neutral-600 hover:text-black flex items-center gap-1"
                          >
                            {p.in_stock ? (
                              <ToggleRight className="w-5 h-5 text-[#22C55E]" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-neutral-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setProductForm({
                                title: p.title,
                                price: p.price,
                                category: p.category || storeCategory,
                                description: p.description || "",
                                image_url: p.image_url || "",
                                in_stock: p.in_stock !== false,
                              });
                              setShowProductModal(true);
                            }}
                            className="flex-1 dz-btn-dark inline-flex items-center justify-center gap-1 !py-1.5 !text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="dz-btn !bg-[#EF4444] !text-white !p-2 border-2 border-black shadow-[1px_1px_0px_0px_#000]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BRAND ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="dz-card p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000]">
              <div className="mb-6 border-b border-neutral-200 pb-4">
                <h2 className="font-display font-black text-2xl">Brand Analytics & Sales Performance</h2>
                <p className="text-xs text-neutral-600 font-medium mt-1">
                  Analytics strictly isolated to <strong className="text-black">{brandName}</strong>. Total system metrics are not shared.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <div>
                  <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#22C55E]" /> Top Selling Items ({brandName})
                  </h3>

                  {analytics.top_products && analytics.top_products.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.top_products.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#F8FAFC] border border-black rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-[10px]">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-neutral-900">{item.title}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-neutral-900 block">{item.count} Sold</span>
                            <span className="text-[10px] text-neutral-500 font-mono">₹{item.revenue} Revenue</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-neutral-50 border border-dashed border-neutral-300 rounded-lg text-center text-xs text-neutral-500">
                      Top product rankings will update dynamically as customer orders are completed.
                    </div>
                  )}
                </div>

                {/* Fulfillment Metrics */}
                <div>
                  <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" /> Fulfillment Summary
                  </h3>

                  <div className="space-y-3 text-xs font-medium">
                    <div className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex justify-between items-center">
                      <span>Total Revenue Earned:</span>
                      <span className="font-mono font-black text-base text-[#22C55E]">
                        ₹{(analytics.total_revenue || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex justify-between items-center">
                      <span>Total Orders Delivered:</span>
                      <span className="font-mono font-black text-base text-neutral-900">
                        {analytics.completed_orders_count || completedOrders.length}
                      </span>
                    </div>

                    <div className="p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex justify-between items-center">
                      <span>Pending Acceptance:</span>
                      <span className="font-mono font-black text-base text-[#EF4444]">
                        {pendingOrders.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Add/Edit Modal */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="dz-card p-6 bg-white w-full max-w-lg border-2 border-black shadow-[6px_6px_0px_0px_#000]"
            >
              <div className="flex items-center justify-between border-b-2 border-dashed border-black pb-3 mb-4">
                <h2 className="font-display font-black text-xl flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#22C55E]" />
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h2>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="dz-btn !p-1.5 !bg-neutral-100 border border-black hover:bg-neutral-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div>
                  <label className="dz-overline block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Hass Avocado 2 Pcs"
                    value={productForm.title}
                    onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                    className="dz-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="dz-overline block mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="189"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="dz-input text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="dz-overline block mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="Category"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="dz-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="dz-overline block mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of product features..."
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="dz-input text-xs"
                  />
                </div>

                <div>
                  <label className="dz-overline block mb-1">Product Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                    className="dz-input text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-300 rounded-lg">
                  <span className="text-xs font-bold text-neutral-800">In Stock & Ready for Orders</span>
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, in_stock: !productForm.in_stock })}
                    className="dz-chip text-xs font-bold cursor-pointer"
                  >
                    {productForm.in_stock ? (
                      <span className="text-[#22C55E] flex items-center gap-1"><Check className="w-4 h-4" /> IN STOCK</span>
                    ) : (
                      <span className="text-[#EF4444] flex items-center gap-1"><X className="w-4 h-4" /> OUT OF STOCK</span>
                    )}
                  </button>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="dz-btn-dark !py-2 !px-4 !text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="dz-btn inline-flex items-center gap-2 !bg-[#22C55E] !text-black !py-2 !px-5 !text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                  >
                    {savingProduct ? "Saving…" : "Save Product"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
