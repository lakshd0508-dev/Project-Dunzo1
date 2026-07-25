// Product catalog for grocery + medicine + small-brand marketplaces
// Prices in INR reflecting current retail benchmarks (~Feb 2026).

export const GROCERY_MEDICINE_CATALOG = [
  // ---- Groceries ----
  { id: "gm_01", name: "Aashirvaad Whole Wheat Atta (5 kg)", price: 285, category: "Grocery", tag: "Staple" },
  { id: "gm_02", name: "Fortune Sunflower Oil (1 L)", price: 165, category: "Grocery", tag: "Cooking" },
  { id: "gm_03", name: "Amul Toned Milk (1 L)", price: 68, category: "Grocery", tag: "Dairy" },
  { id: "gm_04", name: "Britannia Brown Bread (400 g)", price: 55, category: "Grocery", tag: "Bakery" },
  { id: "gm_05", name: "Farm-Fresh Bananas (1 dozen)", price: 60, category: "Grocery", tag: "Fresh" },
  { id: "gm_06", name: "Onions (1 kg)", price: 45, category: "Grocery", tag: "Fresh" },
  { id: "gm_07", name: "Tomatoes (1 kg)", price: 55, category: "Grocery", tag: "Fresh" },
  { id: "gm_08", name: "Basmati Rice India Gate (5 kg)", price: 690, category: "Grocery", tag: "Staple" },
  { id: "gm_09", name: "Tata Salt (1 kg)", price: 28, category: "Grocery", tag: "Staple" },
  { id: "gm_10", name: "Cadbury Dairy Milk Silk (150 g)", price: 220, category: "Grocery", tag: "Snacks" },
  { id: "gm_11", name: "Nescafe Classic Coffee (100 g)", price: 265, category: "Grocery", tag: "Beverage" },
  { id: "gm_12", name: "Maggi 2-Minute Noodles (Pack of 8)", price: 168, category: "Grocery", tag: "Snacks" },

  // ---- Medicines ----
  { id: "gm_20", name: "Paracetamol 500mg Strip (Crocin)", price: 25, category: "Medicine", tag: "OTC" },
  { id: "gm_21", name: "Digene Antacid Tablets (Pack of 15)", price: 40, category: "Medicine", tag: "OTC" },
  { id: "gm_22", name: "Vicks VapoRub (25 ml)", price: 165, category: "Medicine", tag: "Cold & Cough" },
  { id: "gm_23", name: "Dettol Antiseptic Liquid (250 ml)", price: 145, category: "Medicine", tag: "Antiseptic" },
  { id: "gm_24", name: "Band-Aid Assorted (Pack of 20)", price: 90, category: "Medicine", tag: "First Aid" },
  { id: "gm_25", name: "ORS Sachets (Pack of 6)", price: 120, category: "Medicine", tag: "Hydration" },
  { id: "gm_26", name: "Volini Pain Relief Spray (100g)", price: 340, category: "Medicine", tag: "Pain Relief" },
  { id: "gm_27", name: "Cetirizine 10mg Strip (Cetzine)", price: 32, category: "Medicine", tag: "Allergy" },
  { id: "gm_28", name: "Digital Thermometer", price: 260, category: "Medicine", tag: "Device" },
  { id: "gm_29", name: "Face Masks 3-Ply (Pack of 50)", price: 180, category: "Medicine", tag: "Protection" },
  { id: "gm_30", name: "Ashwagandha Tablets (60 caps)", price: 420, category: "Medicine", tag: "Wellness" },
];

// City-scoped local startups / small brands
export const SMALL_BRANDS = {
  Bangalore: [
    { id: "blr_01", name: "Third Wave Coffee Roasters", cuisine: "Coffee", area: "Indiranagar", featured: [
      { id: "twc_01", name: "House Blend Beans (250g)", price: 550 },
      { id: "twc_02", name: "Cold Brew Bottle (300 ml)", price: 220 },
      { id: "twc_03", name: "Filter Coffee Powder (200g)", price: 420 },
    ]},
    { id: "blr_02", name: "SLAY Coffee", cuisine: "Coffee & Snacks", area: "Koramangala", featured: [
      { id: "slay_01", name: "Iced Mocha", price: 199 },
      { id: "slay_02", name: "Cinnamon Bun", price: 149 },
    ]},
    { id: "blr_03", name: "Farmizen Fresh Basket", cuisine: "Organic Groceries", area: "HSR Layout", featured: [
      { id: "frm_01", name: "Organic Veg Basket (5kg)", price: 799 },
      { id: "frm_02", name: "Cold-Pressed Coconut Oil (500 ml)", price: 480 },
    ]},
    { id: "blr_04", name: "Naati Style Kitchen", cuisine: "Karnataka Meals", area: "Jayanagar", featured: [
      { id: "nat_01", name: "Ragi Mudde Thali", price: 260 },
      { id: "nat_02", name: "Bisibele Bath Combo", price: 220 },
    ]},
    { id: "blr_05", name: "The Boutique Cotton Co.", cuisine: "Handloom Apparel", area: "Whitefield", featured: [
      { id: "bcc_01", name: "Handloom Indigo Kurti", price: 1490 },
      { id: "bcc_02", name: "Khadi Cotton Shirt (M)", price: 1290 },
    ]},
  ],
  Chennai: [
    { id: "che_01", name: "Ratna Cafe (Legacy)", cuisine: "South Indian", area: "Triplicane", featured: [
      { id: "rat_01", name: "Sambhar Idli (2 pcs)", price: 90 },
      { id: "rat_02", name: "Ghee Podi Dosa", price: 140 },
    ]},
    { id: "che_02", name: "Writer's Cafe", cuisine: "Continental", area: "Anna Nagar", featured: [
      { id: "wri_01", name: "Belgian Chocolate Torte", price: 320 },
      { id: "wri_02", name: "Iced Long Black", price: 180 },
    ]},
    { id: "che_03", name: "Grand Sweets & Snacks", cuisine: "Traditional Snacks", area: "Adyar", featured: [
      { id: "gsn_01", name: "Mysore Pak (500g)", price: 480 },
      { id: "gsn_02", name: "Murukku Assorted (250g)", price: 220 },
    ]},
    { id: "che_04", name: "Chai Kings", cuisine: "Tea", area: "Nungambakkam", featured: [
      { id: "cki_01", name: "Masala Chai Combo (500ml)", price: 149 },
      { id: "cki_02", name: "Bombay Cutting", price: 79 },
    ]},
    { id: "che_05", name: "Kaadhi Wala", cuisine: "Handloom Apparel", area: "T. Nagar", featured: [
      { id: "kdw_01", name: "Kanchipuram Cotton Shirt", price: 1650 },
      { id: "kdw_02", name: "Silk Blend Kurta", price: 1899 },
    ]},
  ],
};

export const DEFAULT_CITY = "Bangalore";
export const SUPPORTED_CITIES = Object.keys(SMALL_BRANDS);

// Concierge specialties
export const CONCIERGE_SPECIALTIES = [
  { id: "senior_care", label: "Senior Care / Medical Escort", per_hour: 250 },
  { id: "bureaucracy", label: "Bureaucratic Chore Escort (bills, banking)", per_hour: 200 },
  { id: "shopping", label: "Personal Shopping Assistant", per_hour: 220 },
  { id: "pet_care", label: "Pet Care Companion", per_hour: 200 },
];
