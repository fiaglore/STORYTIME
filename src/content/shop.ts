import type { StatDelta } from "./lifeEvents";

// Items a Lagos Life character can buy with naira. StatDelta here never
// includes naira — price is the separate cost deducted on purchase (see
// buyItem in lifeSim.ts) — so delta is purely the one-time stat boost
// from owning the thing. Bought items are tracked in
// LifeCharacter.inventory and can't be bought twice.
export type ShopCategory =
  | "clothing"
  | "electronics"
  | "furniture"
  | "lifestyle"
  | "vehicles"
  | "jewelry"
  | "real-estate"
  | "food";

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  description: string;
  delta: StatDelta;
}

// 600 genuinely distinct items (15 product types x 5 real brand/quality
// tiers x 8 categories), not the same product re-labeled "(Dirt Cheap)"
// / "(Standard)" / etc — each combination reads as its own product (e.g.
// "Yaba Market T-shirt" vs "Gucci T-shirt" vs "No-Name Smartphone" vs
// "Apple Smartphone"), spanning dirt-cheap to "super duper luxurious" per
// the design ask. Prices stay on the same real-Naira scale as the rest of
// the economy (see lifeEvents.ts's fuel-price-anchored header comment).
interface BrandTier {
  label: string;
  priceMult: number;
  statMult: number;
}

// Cheapest to priciest, per category — the brand name itself carries the
// "tier" rather than a literal price-tier label.
const BRAND_TIERS: Record<ShopCategory, BrandTier[]> = {
  clothing: [
    { label: "Yaba Market", priceMult: 0.15, statMult: 0.4 },
    { label: "Local Tailor", priceMult: 0.45, statMult: 0.7 },
    { label: "Zara", priceMult: 1, statMult: 1 },
    { label: "Gucci", priceMult: 3.5, statMult: 1.6 },
    { label: "Custom Couture", priceMult: 9, statMult: 2.3 },
  ],
  electronics: [
    { label: "No-Name", priceMult: 0.2, statMult: 0.5 },
    { label: "Itel", priceMult: 0.5, statMult: 0.75 },
    { label: "Samsung", priceMult: 1, statMult: 1 },
    { label: "Apple", priceMult: 2.2, statMult: 1.4 },
    { label: "Vertu", priceMult: 7, statMult: 2 },
  ],
  furniture: [
    { label: "Tokunbo", priceMult: 0.2, statMult: 0.5 },
    { label: "Flat-Pack", priceMult: 0.5, statMult: 0.75 },
    { label: "Mouka", priceMult: 1, statMult: 1 },
    { label: "Italian Design", priceMult: 3, statMult: 1.6 },
    { label: "Custom Bespoke", priceMult: 8, statMult: 2.2 },
  ],
  lifestyle: [
    { label: "No-Frills", priceMult: 0.25, statMult: 0.5 },
    { label: "Standard", priceMult: 0.6, statMult: 0.8 },
    { label: "Premium", priceMult: 1, statMult: 1 },
    { label: "VIP", priceMult: 2.5, statMult: 1.5 },
    { label: "Ultra-Exclusive", priceMult: 6, statMult: 2.1 },
  ],
  vehicles: [
    { label: "Okay-Okay", priceMult: 0.15, statMult: 0.5 },
    { label: "Tokunbo", priceMult: 0.45, statMult: 0.75 },
    { label: "Brand New", priceMult: 1, statMult: 1 },
    { label: "Imported", priceMult: 2, statMult: 1.4 },
    { label: "Limited Edition", priceMult: 4.5, statMult: 1.9 },
  ],
  jewelry: [
    { label: "Costume", priceMult: 0.1, statMult: 0.4 },
    { label: "Silver-Plated", priceMult: 0.35, statMult: 0.7 },
    { label: "9-Karat Gold", priceMult: 1, statMult: 1 },
    { label: "18-Karat Gold", priceMult: 2.8, statMult: 1.5 },
    { label: "Diamond-Encrusted", priceMult: 8, statMult: 2.3 },
  ],
  "real-estate": [
    { label: "Shared", priceMult: 0.15, statMult: 0.5 },
    { label: "Face-Me-I-Face-You", priceMult: 0.4, statMult: 0.75 },
    { label: "Standard Estate", priceMult: 1, statMult: 1 },
    { label: "Gated Estate", priceMult: 2.5, statMult: 1.5 },
    { label: "Ultra-Luxury", priceMult: 6, statMult: 2.1 },
  ],
  food: [
    { label: "Roadside", priceMult: 0.2, statMult: 0.5 },
    { label: "Local Buka", priceMult: 0.5, statMult: 0.75 },
    { label: "Mid-Range Restaurant", priceMult: 1, statMult: 1 },
    { label: "Fine Dining", priceMult: 2.5, statMult: 1.5 },
    { label: "Michelin-Style", priceMult: 6, statMult: 2 },
  ],
};

interface ProductLine {
  id: string;
  name: string;
  category: ShopCategory;
  basePrice: number;
  baseDelta: StatDelta;
  blurb: string;
}

const PRODUCT_LINES: ProductLine[] = [
  // clothing
  { id: "tshirt", name: "T-shirt", category: "clothing", basePrice: 4000, baseDelta: { looks: 2 }, blurb: "Everyday wear" },
  { id: "jeans", name: "Jeans", category: "clothing", basePrice: 9000, baseDelta: { looks: 2 }, blurb: "A reliable pair" },
  { id: "sneakers", name: "Sneakers", category: "clothing", basePrice: 15000, baseDelta: { looks: 4, happiness: 2 }, blurb: "For the street and the gym" },
  { id: "ankara-outfit", name: "Ankara Outfit", category: "clothing", basePrice: 12000, baseDelta: { looks: 5, happiness: 2 }, blurb: "Fresh ankara, tailored to fit" },
  { id: "suit", name: "Three-Piece Suit", category: "clothing", basePrice: 40000, baseDelta: { looks: 7, smarts: 1 }, blurb: "For interviews and owambe alike" },
  { id: "evening-dress", name: "Evening Dress", category: "clothing", basePrice: 35000, baseDelta: { looks: 7, happiness: 2 }, blurb: "For the big night out" },
  { id: "leather-jacket", name: "Leather Jacket", category: "clothing", basePrice: 30000, baseDelta: { looks: 6 }, blurb: "A timeless layer" },
  { id: "agbada", name: "Agbada", category: "clothing", basePrice: 45000, baseDelta: { looks: 8, happiness: 3 }, blurb: "Full regalia for a big occasion" },
  { id: "handbag", name: "Handbag", category: "clothing", basePrice: 20000, baseDelta: { looks: 4 }, blurb: "Carries everything, says a lot" },
  { id: "leather-belt", name: "Leather Belt", category: "clothing", basePrice: 8000, baseDelta: { looks: 2 }, blurb: "A small finishing touch" },
  { id: "sunglasses", name: "Sunglasses", category: "clothing", basePrice: 10000, baseDelta: { looks: 3, happiness: 1 }, blurb: "Shades for the Lagos sun" },
  { id: "trench-coat", name: "Trench Coat", category: "clothing", basePrice: 25000, baseDelta: { looks: 5 }, blurb: "Sharp in any weather" },
  { id: "sports-jersey", name: "Sports Jersey", category: "clothing", basePrice: 12000, baseDelta: { happiness: 3, looks: 2 }, blurb: "Rep your team" },
  { id: "wedding-gown", name: "Wedding Gown", category: "clothing", basePrice: 150000, baseDelta: { looks: 10, happiness: 5 }, blurb: "For the biggest day" },
  { id: "designer-scarf", name: "Designer Scarf", category: "clothing", basePrice: 15000, baseDelta: { looks: 3 }, blurb: "A small statement piece" },
  // electronics
  { id: "earpiece", name: "Earpiece", category: "electronics", basePrice: 3000, baseDelta: { happiness: 1 }, blurb: "For calls on the go" },
  { id: "power-bank", name: "Power Bank", category: "electronics", basePrice: 8000, baseDelta: { happiness: 1 }, blurb: "Never die mid-call" },
  { id: "bluetooth-speaker", name: "Bluetooth Speaker", category: "electronics", basePrice: 10000, baseDelta: { happiness: 3 }, blurb: "Music wherever you are" },
  { id: "smartphone", name: "Smartphone", category: "electronics", basePrice: 70000, baseDelta: { happiness: 4, smarts: 2 }, blurb: "A phone that doesn't restart on its own" },
  { id: "laptop", name: "Laptop", category: "electronics", basePrice: 220000, baseDelta: { smarts: 8, happiness: 2 }, blurb: "Opens doors to real tech hustles" },
  { id: "tablet", name: "Tablet", category: "electronics", basePrice: 90000, baseDelta: { smarts: 4, happiness: 2 }, blurb: "Lighter than a laptop, still useful" },
  { id: "smart-tv", name: "Smart TV", category: "electronics", basePrice: 180000, baseDelta: { happiness: 6 }, blurb: "Big screen, better evenings" },
  { id: "gaming-console", name: "Gaming Console", category: "electronics", basePrice: 150000, baseDelta: { happiness: 7 }, blurb: "Weekend plans, sorted" },
  { id: "drone", name: "Drone", category: "electronics", basePrice: 120000, baseDelta: { happiness: 5, smarts: 1 }, blurb: "Views nobody else gets" },
  { id: "camera", name: "Camera", category: "electronics", basePrice: 100000, baseDelta: { happiness: 4, smarts: 1 }, blurb: "For the moments worth keeping" },
  { id: "smartwatch", name: "Smartwatch", category: "electronics", basePrice: 40000, baseDelta: { health: 2, looks: 2 }, blurb: "Keeps you on time and on track" },
  { id: "wifi-router", name: "Wi-Fi Router", category: "electronics", basePrice: 15000, baseDelta: { happiness: 2, smarts: 1 }, blurb: "Stronger signal, fewer fights about it" },
  { id: "printer", name: "Printer", category: "electronics", basePrice: 35000, baseDelta: { smarts: 2 }, blurb: "For the forms nobody accepts digitally" },
  { id: "home-theatre", name: "Home Theatre System", category: "electronics", basePrice: 200000, baseDelta: { happiness: 7 }, blurb: "Cinema sound, zero traffic" },
  { id: "projector", name: "Projector", category: "electronics", basePrice: 90000, baseDelta: { happiness: 5 }, blurb: "Movie nights on a bigger scale" },
  // furniture
  { id: "plastic-chair", name: "Plastic Chair Set", category: "furniture", basePrice: 6000, baseDelta: { happiness: 1 }, blurb: "Somewhere to sit, at least" },
  { id: "bed-frame", name: "Bed Frame", category: "furniture", basePrice: 60000, baseDelta: { health: 2, happiness: 1 }, blurb: "A proper bed, finally" },
  { id: "mattress", name: "Mattress", category: "furniture", basePrice: 80000, baseDelta: { health: 4, happiness: 2 }, blurb: "Sleep makes everything else easier" },
  { id: "wardrobe", name: "Wardrobe", category: "furniture", basePrice: 90000, baseDelta: { happiness: 2 }, blurb: "Somewhere for all those clothes" },
  { id: "dining-table", name: "Dining Table", category: "furniture", basePrice: 100000, baseDelta: { happiness: 3 }, blurb: "A proper table for proper meals" },
  { id: "sofa-set", name: "Sofa Set", category: "furniture", basePrice: 180000, baseDelta: { happiness: 6 }, blurb: "No more sitting on plastic chairs at home" },
  { id: "bookshelf", name: "Bookshelf", category: "furniture", basePrice: 40000, baseDelta: { smarts: 2 }, blurb: "Looks studious even half-empty" },
  { id: "office-desk", name: "Office Desk", category: "furniture", basePrice: 50000, baseDelta: { smarts: 2, happiness: 1 }, blurb: "Somewhere to actually get work done" },
  { id: "kitchen-cabinets", name: "Kitchen Cabinet Set", category: "furniture", basePrice: 150000, baseDelta: { happiness: 3 }, blurb: "A kitchen that finally has storage" },
  { id: "rug", name: "Rug", category: "furniture", basePrice: 20000, baseDelta: { happiness: 2 }, blurb: "Ties a room together" },
  { id: "curtains", name: "Curtains", category: "furniture", basePrice: 15000, baseDelta: { happiness: 1 }, blurb: "Keeps the sun and the neighbours out" },
  { id: "chandelier", name: "Chandelier", category: "furniture", basePrice: 60000, baseDelta: { happiness: 3, looks: 1 }, blurb: "An unnecessary, glorious upgrade" },
  { id: "bunk-bed", name: "Bunk Bed", category: "furniture", basePrice: 70000, baseDelta: { happiness: 2 }, blurb: "Fits two where there was one" },
  { id: "recliner", name: "Recliner", category: "furniture", basePrice: 90000, baseDelta: { happiness: 4, health: 1 }, blurb: "The chair you fight your siblings for" },
  { id: "four-poster-bed", name: "Four-Poster Bed", category: "furniture", basePrice: 180000, baseDelta: { happiness: 6, health: 2 }, blurb: "A bed that feels like an occasion" },
  // lifestyle
  { id: "suya-night", name: "Suya Night Out", category: "lifestyle", basePrice: 2000, baseDelta: { happiness: 3 }, blurb: "Pepper, onions, and good company" },
  { id: "cinema-outing", name: "Cinema Outing", category: "lifestyle", basePrice: 5000, baseDelta: { happiness: 3 }, blurb: "A few hours away from everything" },
  { id: "gym-membership", name: "Gym Membership", category: "lifestyle", basePrice: 40000, baseDelta: { health: 6, looks: 3 }, blurb: "A year's worth of trying to keep fit" },
  { id: "spa-day", name: "Spa Day", category: "lifestyle", basePrice: 25000, baseDelta: { happiness: 5, looks: 2 }, blurb: "An afternoon of doing absolutely nothing" },
  { id: "weekend-getaway", name: "Weekend Getaway", category: "lifestyle", basePrice: 150000, baseDelta: { happiness: 8, health: 2 }, blurb: "A short break from Lagos" },
  { id: "concert-ticket", name: "Concert Ticket", category: "lifestyle", basePrice: 20000, baseDelta: { happiness: 5 }, blurb: "A night you'll talk about for weeks" },
  { id: "birthday-party", name: "Birthday Party", category: "lifestyle", basePrice: 60000, baseDelta: { happiness: 7 }, blurb: "Everyone you know, one evening" },
  { id: "vacation-package", name: "Vacation Package", category: "lifestyle", basePrice: 450000, baseDelta: { happiness: 10, health: 3 }, blurb: "A proper break from Lagos" },
  { id: "personal-trainer", name: "Personal Trainer", category: "lifestyle", basePrice: 80000, baseDelta: { health: 7, looks: 2 }, blurb: "Someone to actually make you show up" },
  { id: "yacht-day-trip", name: "Yacht Day Trip", category: "lifestyle", basePrice: 500000, baseDelta: { happiness: 12, looks: 2 }, blurb: "A day on the water, no traffic in sight" },
  { id: "private-chef-dinner", name: "Private Chef Dinner", category: "lifestyle", basePrice: 100000, baseDelta: { happiness: 8, health: 2 }, blurb: "A meal cooked just for you" },
  { id: "wine-tasting", name: "Wine Tasting", category: "lifestyle", basePrice: 30000, baseDelta: { happiness: 4, smarts: 1 }, blurb: "An evening of pretending to know wine" },
  { id: "golf-membership", name: "Golf Club Membership", category: "lifestyle", basePrice: 300000, baseDelta: { happiness: 6, looks: 2 }, blurb: "Deals get made on the green, they say" },
  { id: "photography-session", name: "Photography Session", category: "lifestyle", basePrice: 50000, baseDelta: { happiness: 4, looks: 3 }, blurb: "Photos worth actually keeping" },
  { id: "art-class", name: "Art Class", category: "lifestyle", basePrice: 20000, baseDelta: { happiness: 3, smarts: 2 }, blurb: "A new way to spend a Saturday" },
  // vehicles
  { id: "bicycle", name: "Bicycle", category: "vehicles", basePrice: 25000, baseDelta: { health: 3, happiness: 2 }, blurb: "Beats trekking, cheaper than a keke" },
  { id: "skateboard", name: "Skateboard", category: "vehicles", basePrice: 15000, baseDelta: { happiness: 2, looks: 1 }, blurb: "Fast, if you don't fall" },
  { id: "motorcycle", name: "Motorcycle", category: "vehicles", basePrice: 400000, baseDelta: { happiness: 4, looks: 2 }, blurb: "Weaves through go-slow like nothing else" },
  { id: "keke", name: "Keke", category: "vehicles", basePrice: 900000, baseDelta: { happiness: 4 }, blurb: "Your own ride, no more haggling fares" },
  { id: "tricycle-cart", name: "Tricycle Cart", category: "vehicles", basePrice: 300000, baseDelta: { happiness: 2 }, blurb: "Small business on three wheels" },
  { id: "sedan-car", name: "Sedan Car", category: "vehicles", basePrice: 3500000, baseDelta: { happiness: 8, looks: 3 }, blurb: "Door-to-door, rain or shine" },
  { id: "suv", name: "SUV", category: "vehicles", basePrice: 6000000, baseDelta: { happiness: 9, looks: 4 }, blurb: "Rides over Lagos's potholes, mostly" },
  { id: "pickup-truck", name: "Pickup Truck", category: "vehicles", basePrice: 5000000, baseDelta: { happiness: 7, looks: 3 }, blurb: "For business and for showing off" },
  { id: "sports-car", name: "Sports Car", category: "vehicles", basePrice: 15000000, baseDelta: { happiness: 12, looks: 7 }, blurb: "Turns every head on the Island" },
  { id: "luxury-car", name: "Luxury Car", category: "vehicles", basePrice: 25000000, baseDelta: { happiness: 14, looks: 8 }, blurb: "You've arrived, literally and otherwise" },
  { id: "speedboat", name: "Speedboat", category: "vehicles", basePrice: 8000000, baseDelta: { happiness: 10, looks: 4 }, blurb: "Skip the Third Mainland traffic entirely" },
  { id: "private-jet-share", name: "Private Jet Share", category: "vehicles", basePrice: 50000000, baseDelta: { happiness: 16, looks: 9 }, blurb: "A fractional share in getting there fast" },
  { id: "helicopter-tour", name: "Helicopter Tour", category: "vehicles", basePrice: 2000000, baseDelta: { happiness: 10, looks: 3 }, blurb: "Lagos from above, just once" },
  { id: "vintage-car", name: "Vintage Car", category: "vehicles", basePrice: 10000000, baseDelta: { happiness: 10, looks: 6 }, blurb: "A collector's piece that still drives" },
  { id: "armored-suv", name: "Armored SUV", category: "vehicles", basePrice: 20000000, baseDelta: { happiness: 9, looks: 5, health: 1 }, blurb: "Peace of mind, at a price" },
  // jewelry
  { id: "earrings", name: "Earrings", category: "jewelry", basePrice: 8000, baseDelta: { looks: 2 }, blurb: "A small everyday sparkle" },
  { id: "bracelet", name: "Bracelet", category: "jewelry", basePrice: 15000, baseDelta: { looks: 3 }, blurb: "A little something on the wrist" },
  { id: "wristwatch", name: "Wristwatch", category: "jewelry", basePrice: 15000, baseDelta: { looks: 4 }, blurb: "Always know the time, always look sharp" },
  { id: "gold-chain", name: "Gold Chain", category: "jewelry", basePrice: 90000, baseDelta: { looks: 6, happiness: 2 }, blurb: "Shine a little, every day" },
  { id: "diamond-ring", name: "Diamond Ring", category: "jewelry", basePrice: 500000, baseDelta: { looks: 8, happiness: 3 }, blurb: "The kind of ring people notice" },
  { id: "pendant-necklace", name: "Pendant Necklace", category: "jewelry", basePrice: 40000, baseDelta: { looks: 4 }, blurb: "A finishing touch at the collar" },
  { id: "cufflinks", name: "Cufflinks", category: "jewelry", basePrice: 20000, baseDelta: { looks: 3 }, blurb: "Details that get noticed" },
  { id: "tiara", name: "Tiara", category: "jewelry", basePrice: 200000, baseDelta: { looks: 7, happiness: 2 }, blurb: "For the night you want to feel like royalty" },
  { id: "gold-bangle-set", name: "Gold Bangle Set", category: "jewelry", basePrice: 150000, baseDelta: { looks: 6 }, blurb: "They jingle when you walk, on purpose" },
  { id: "pearl-necklace", name: "Pearl Necklace", category: "jewelry", basePrice: 100000, baseDelta: { looks: 5 }, blurb: "Classic, understated, always works" },
  { id: "signet-ring", name: "Signet Ring", category: "jewelry", basePrice: 60000, baseDelta: { looks: 4 }, blurb: "A mark of your own" },
  { id: "anklet", name: "Anklet", category: "jewelry", basePrice: 10000, baseDelta: { looks: 2 }, blurb: "Quiet, but noticed" },
  { id: "brooch", name: "Brooch", category: "jewelry", basePrice: 25000, baseDelta: { looks: 3 }, blurb: "An old idea, worn well" },
  { id: "diamond-tennis-bracelet", name: "Diamond Tennis Bracelet", category: "jewelry", basePrice: 800000, baseDelta: { looks: 9, happiness: 3 }, blurb: "A line of diamonds that says everything" },
  { id: "custom-gold-grill", name: "Custom Gold Grill", category: "jewelry", basePrice: 300000, baseDelta: { looks: 8, happiness: 2 }, blurb: "Not subtle, not meant to be" },
  // real estate
  { id: "room-rental", name: "Room Rental", category: "real-estate", basePrice: 200000, baseDelta: { happiness: 2 }, blurb: "A room to call your own, for now" },
  { id: "studio-apartment", name: "Studio Apartment", category: "real-estate", basePrice: 1500000, baseDelta: { happiness: 5 }, blurb: "Small, but entirely yours" },
  { id: "land-plot", name: "Plot of Land", category: "real-estate", basePrice: 4000000, baseDelta: { happiness: 6 }, blurb: "Something solid to call yours" },
  { id: "two-bedroom-flat", name: "Two-Bedroom Flat", category: "real-estate", basePrice: 8000000, baseDelta: { happiness: 8 }, blurb: "Room to actually breathe" },
  { id: "duplex", name: "Duplex", category: "real-estate", basePrice: 25000000, baseDelta: { happiness: 12, health: 2 }, blurb: "Two floors, no more shared walls" },
  { id: "bungalow", name: "Bungalow", category: "real-estate", basePrice: 15000000, baseDelta: { happiness: 10, health: 2 }, blurb: "A roof nobody can take from you" },
  { id: "terrace-house", name: "Terrace House", category: "real-estate", basePrice: 20000000, baseDelta: { happiness: 11 }, blurb: "A tidy row-house life" },
  { id: "office-space", name: "Office Space", category: "real-estate", basePrice: 10000000, baseDelta: { happiness: 5, smarts: 2 }, blurb: "Somewhere to grow the hustle properly" },
  { id: "shop-space", name: "Shop Space", category: "real-estate", basePrice: 6000000, baseDelta: { happiness: 5 }, blurb: "A storefront of your own" },
  { id: "warehouse", name: "Warehouse", category: "real-estate", basePrice: 30000000, baseDelta: { happiness: 4 }, blurb: "Space enough to think bigger" },
  { id: "beachfront-villa", name: "Beachfront Villa", category: "real-estate", basePrice: 80000000, baseDelta: { happiness: 18, health: 3 }, blurb: "Waves outside the window" },
  { id: "penthouse", name: "Penthouse", category: "real-estate", basePrice: 100000000, baseDelta: { happiness: 20, looks: 3 }, blurb: "Lagos spread out below you" },
  { id: "private-estate", name: "Private Estate", category: "real-estate", basePrice: 150000000, baseDelta: { happiness: 22, looks: 4 }, blurb: "Gates, grounds, and total privacy" },
  { id: "island-property", name: "Island Property", category: "real-estate", basePrice: 300000000, baseDelta: { happiness: 25, looks: 5 }, blurb: "The address everyone recognizes" },
  { id: "skyscraper-floor", name: "Skyscraper Floor", category: "real-estate", basePrice: 120000000, baseDelta: { happiness: 20, smarts: 3 }, blurb: "An entire floor, just yours" },
  // food
  { id: "street-snack", name: "Street Snack", category: "food", basePrice: 500, baseDelta: { happiness: 1 }, blurb: "Small joy, cheaply bought" },
  { id: "weekly-groceries", name: "Weekly Groceries", category: "food", basePrice: 8000, baseDelta: { health: 2, happiness: 1 }, blurb: "A full fridge for the week" },
  { id: "restaurant-meal", name: "Restaurant Meal", category: "food", basePrice: 5000, baseDelta: { happiness: 3 }, blurb: "Someone else does the cooking tonight" },
  { id: "owambe-catering", name: "Owambe Catering", category: "food", basePrice: 200000, baseDelta: { happiness: 8 }, blurb: "Feeding the whole party, properly" },
  { id: "imported-wine", name: "Imported Wine", category: "food", basePrice: 15000, baseDelta: { happiness: 3 }, blurb: "A bottle worth the occasion" },
  { id: "birthday-cake", name: "Birthday Cake", category: "food", basePrice: 20000, baseDelta: { happiness: 4 }, blurb: "Candles, singing, the whole thing" },
  { id: "seafood-platter", name: "Seafood Platter", category: "food", basePrice: 25000, baseDelta: { happiness: 4, health: 1 }, blurb: "Fresh off the coast" },
  { id: "monthly-meal-plan", name: "Monthly Meal Plan", category: "food", basePrice: 60000, baseDelta: { health: 5, happiness: 2 }, blurb: "No more deciding what to eat every day" },
  { id: "private-chef-package", name: "Private Chef Package", category: "food", basePrice: 150000, baseDelta: { happiness: 9, health: 2 }, blurb: "A month of meals, made for you" },
  { id: "rare-delicacy-tasting", name: "Rare Delicacy Tasting", category: "food", basePrice: 50000, baseDelta: { happiness: 5, smarts: 1 }, blurb: "Flavors you won't find twice" },
  { id: "champagne-bottle", name: "Champagne Bottle", category: "food", basePrice: 40000, baseDelta: { happiness: 5 }, blurb: "Something to pop when it counts" },
  { id: "gourmet-hamper", name: "Gourmet Hamper", category: "food", basePrice: 35000, baseDelta: { happiness: 4 }, blurb: "A basket of small luxuries" },
  { id: "farm-to-table-box", name: "Farm-to-Table Box", category: "food", basePrice: 20000, baseDelta: { health: 3, happiness: 1 }, blurb: "Fresh, direct, no middleman" },
  { id: "truffle-dinner", name: "Truffle Dinner", category: "food", basePrice: 80000, baseDelta: { happiness: 7 }, blurb: "An indulgence, on purpose" },
  { id: "caviar-tin", name: "Caviar Tin", category: "food", basePrice: 100000, baseDelta: { happiness: 6, looks: 1 }, blurb: "The most extravagant snack there is" },
];

function scaleDelta(delta: StatDelta, mult: number): StatDelta {
  const scaled: StatDelta = {};
  for (const key of Object.keys(delta) as (keyof StatDelta)[]) {
    const value = delta[key];
    if (value != null) scaled[key] = Math.max(1, Math.round(value * mult));
  }
  return scaled;
}

function roundPrice(price: number): number {
  const step = price >= 1_000_000 ? 10_000 : price >= 100_000 ? 1_000 : price >= 10_000 ? 100 : 50;
  return Math.max(step, Math.round(price / step) * step);
}

function generateShopItems(): ShopItem[] {
  const items: ShopItem[] = [];
  for (const line of PRODUCT_LINES) {
    const tiers = BRAND_TIERS[line.category];
    tiers.forEach((tier, i) => {
      items.push({
        id: `${line.id}-${i}`,
        name: `${tier.label} ${line.name}`,
        category: line.category,
        price: roundPrice(line.basePrice * tier.priceMult),
        description: `${line.blurb}.`,
        delta: scaleDelta(line.baseDelta, tier.statMult),
      });
    });
  }
  return items;
}

// Deliberately includes very cheap items (the cheapest brand tier of
// every product line) so the spend-to-age-up requirement (see
// lifeSim.ts's AGE_UP_REQUIREMENTS) is always satisfiable through the
// shop regardless of how little a character has saved, not just through
// whatever chores happened to roll.
export const SHOP_ITEMS: ShopItem[] = generateShopItems();

export const SHOP_CATEGORIES: ShopCategory[] = [
  "clothing",
  "electronics",
  "furniture",
  "lifestyle",
  "vehicles",
  "jewelry",
  "real-estate",
  "food",
];
