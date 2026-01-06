import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ========== MODEL SELECTION ==========
const MODELS = {
  haiku: "claude-haiku-4-5-20251001",    // Fast - for prototypes & edits
  sonnet: "claude-sonnet-4-20250514",     // Balanced - for production
  opus: "claude-opus-4-20250514"          // Premium - when quality matters most
};

// Template mapping
const TEMPLATE_MAP: Record<string, string[]> = {
  "restaurant": ["restaurant", "cafe", "food", "dining", "menu", "bistro", "eatery", "grill", "bar", "bakery", "pizzeria", "sushi", "coffee"],
  "local-service": ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "cleaning", "landscaping", "roofing", "painting", "moving", "pest", "locksmith", "appliance", "garage", "pool", "carpet", "pressure wash", "junk removal", "tree service", "fencing", "flooring", "window", "gutter", "solar", "security"],
  "fitness": ["fitness", "gym", "yoga", "crossfit", "personal training", "trainer", "workout", "exercise", "pilates", "martial arts", "boxing", "mma", "dance studio", "spin", "cycling"],
  "agency": ["agency", "marketing", "digital agency", "creative agency", "advertising", "branding", "pr agency", "consulting", "seo", "social media", "web design agency", "design studio"],
  "saas": ["saas", "software", "app", "platform", "dashboard", "startup", "tech", "product", "tool", "analytics", "crm", "automation", "ai tool", "api"]
};

// ========== GOOGLE FONTS MAPPING ==========
// Maps business types to appropriate font pairings (heading + body)
const FONT_MAP: Record<string, { heading: string; body: string; style: string }> = {
  "restaurant": { heading: "Playfair Display", body: "Lato", style: "elegant, sophisticated" },
  "coffee": { heading: "DM Serif Display", body: "DM Sans", style: "modern, warm" },
  "cafe": { heading: "Cormorant Garamond", body: "Montserrat", style: "artisan, cozy" },
  "bakery": { heading: "Pacifico", body: "Open Sans", style: "friendly, handcrafted" },
  "landscaping": { heading: "Outfit", body: "Inter", style: "clean, professional" },
  "dog grooming": { heading: "Nunito", body: "Quicksand", style: "friendly, playful" },
  "fitness": { heading: "Oswald", body: "Roboto", style: "strong, athletic" },
  "gym": { heading: "Anton", body: "Roboto Condensed", style: "bold, powerful" },
  "yoga": { heading: "Cormorant", body: "Lora", style: "calm, elegant" },
  "agency": { heading: "Space Grotesk", body: "Inter", style: "modern, techy" },
  "saas": { heading: "Plus Jakarta Sans", body: "Inter", style: "clean, professional" },
  "tech": { heading: "Sora", body: "Inter", style: "futuristic, minimal" },
  "skateboard": { heading: "Bebas Neue", body: "Barlow", style: "bold, urban, street" },
  "clothing": { heading: "Bebas Neue", body: "Barlow Condensed", style: "fashion-forward, edgy" },
  "ecommerce": { heading: "Poppins", body: "Open Sans", style: "modern, trustworthy" },
  "construction": { heading: "Teko", body: "Roboto", style: "industrial, strong" },
  "plumber": { heading: "Rubik", body: "Open Sans", style: "trustworthy, professional" },
  "electrician": { heading: "Exo 2", body: "Source Sans Pro", style: "technical, reliable" },
  "cleaning": { heading: "Quicksand", body: "Nunito Sans", style: "clean, fresh" },
  "lawyer": { heading: "Cormorant Garamond", body: "Libre Baskerville", style: "prestigious, traditional" },
  "medical": { heading: "Raleway", body: "Open Sans", style: "clean, trustworthy" },
  "spa": { heading: "Cormorant", body: "Lato", style: "serene, luxurious" },
  "hotel": { heading: "Playfair Display", body: "Raleway", style: "luxury, hospitality" },
  "photography": { heading: "Italiana", body: "Montserrat", style: "artistic, minimal" },
  "default": { heading: "Inter", body: "Inter", style: "modern, versatile" }
};

// ========== ICONIFY ICON MAPPING ==========
// Maps business types to relevant Iconify icon names
const ICON_MAP: Record<string, string[]> = {
  "restaurant": ["mdi:silverware-fork-knife", "mdi:chef-hat", "mdi:food", "mdi:glass-wine", "mdi:table-furniture", "mdi:clock-outline"],
  "coffee": ["mdi:coffee", "mdi:coffee-maker", "mdi:cup", "mdi:wifi", "mdi:cake-variant", "mdi:cookie"],
  "cafe": ["mdi:coffee-outline", "mdi:croissant", "mdi:tea", "mdi:book-open-variant", "mdi:wifi", "mdi:music"],
  "bakery": ["mdi:bread-slice", "mdi:cupcake", "mdi:cake", "mdi:cookie", "mdi:baguette", "mdi:muffin"],
  "landscaping": ["mdi:flower", "mdi:tree", "mdi:grass", "mdi:shovel", "mdi:sprinkler", "mdi:fence"],
  "dog grooming": ["mdi:dog", "mdi:paw", "mdi:scissors-cutting", "mdi:bathtub", "mdi:hair-dryer", "mdi:heart"],
  "fitness": ["mdi:dumbbell", "mdi:run", "mdi:heart-pulse", "mdi:yoga", "mdi:timer", "mdi:trophy"],
  "gym": ["mdi:weight-lifter", "mdi:dumbbell", "mdi:arm-flex", "mdi:boxing-glove", "mdi:treadmill", "mdi:locker"],
  "yoga": ["mdi:yoga", "mdi:meditation", "mdi:spa", "mdi:leaf", "mdi:candle", "mdi:peace"],
  "agency": ["mdi:rocket-launch", "mdi:lightbulb", "mdi:chart-line", "mdi:palette", "mdi:target", "mdi:handshake"],
  "saas": ["mdi:cloud", "mdi:chart-areaspline", "mdi:cog", "mdi:shield-check", "mdi:api", "mdi:database"],
  "skateboard": ["mdi:skateboard", "mdi:tshirt-crew", "mdi:shoe-sneaker", "mdi:truck-delivery", "mdi:tag", "mdi:fire"],
  "clothing": ["mdi:tshirt-crew", "mdi:hanger", "mdi:shopping-outline", "mdi:truck-fast", "mdi:tag-multiple", "mdi:star"],
  "ecommerce": ["mdi:cart", "mdi:truck-delivery", "mdi:credit-card", "mdi:shield-check", "mdi:tag", "mdi:star"],
  "construction": ["mdi:hammer-wrench", "mdi:hard-hat", "mdi:crane", "mdi:home-city", "mdi:ruler", "mdi:brick"],
  "plumber": ["mdi:pipe", "mdi:water-pump", "mdi:wrench", "mdi:toilet", "mdi:shower", "mdi:water"],
  "electrician": ["mdi:flash", "mdi:power-plug", "mdi:lightbulb", "mdi:electric-switch", "mdi:meter-electric", "mdi:tools"],
  "cleaning": ["mdi:broom", "mdi:spray-bottle", "mdi:washing-machine", "mdi:sparkles", "mdi:home-heart", "mdi:check-circle"],
  "lawyer": ["mdi:scale-balance", "mdi:gavel", "mdi:briefcase", "mdi:file-document", "mdi:shield-account", "mdi:handshake"],
  "medical": ["mdi:stethoscope", "mdi:hospital-box", "mdi:pill", "mdi:heart-pulse", "mdi:medical-bag", "mdi:clipboard-pulse"],
  "spa": ["mdi:spa", "mdi:flower-tulip", "mdi:candle", "mdi:water", "mdi:hand-heart", "mdi:leaf"],
  "hotel": ["mdi:bed", "mdi:room-service", "mdi:key", "mdi:pool", "mdi:parking", "mdi:wifi"],
  "photography": ["mdi:camera", "mdi:image", "mdi:flash", "mdi:video", "mdi:palette", "mdi:heart"],
  "default": ["mdi:check-circle", "mdi:star", "mdi:clock", "mdi:phone", "mdi:email", "mdi:map-marker"]
};

// Get font pairing for a business type
function getFontForBusiness(prompt: string): { heading: string; body: string; style: string; googleLink: string } {
  const lower = prompt.toLowerCase();
  
  for (const [key, fonts] of Object.entries(FONT_MAP)) {
    if (lower.includes(key)) {
      const headingEncoded = fonts.heading.replace(/ /g, '+');
      const bodyEncoded = fonts.body.replace(/ /g, '+');
      const googleLink = `https://fonts.googleapis.com/css2?family=${headingEncoded}:wght@400;500;600;700&family=${bodyEncoded}:wght@300;400;500;600&display=swap`;
      return { ...fonts, googleLink };
    }
  }
  
  // Default fonts
  const defaultFonts = FONT_MAP["default"];
  return { 
    ...defaultFonts, 
    googleLink: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
  };
}

// Get icons for a business type
function getIconsForBusiness(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  
  for (const [key, icons] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) {
      return icons;
    }
  }
  
  return ICON_MAP["default"];
}

// Image search term mapping for different business types
const IMAGE_SEARCH_MAP: Record<string, string[]> = {
  "restaurant": ["restaurant interior", "food plating", "chef cooking", "dining ambiance"],
  "coffee": ["coffee shop interior", "barista coffee", "latte art", "cafe ambiance"],
  "cafe": ["coffee shop interior", "cafe seating", "pastries coffee", "cozy cafe"],
  "bakery": ["fresh bakery", "artisan bread", "pastry display", "bakery interior"],
  "local-service": ["professional worker", "home repair", "service technician", "tools equipment"],
  "fitness": ["gym workout", "fitness training", "yoga class", "healthy lifestyle"],
  "agency": ["modern office", "team collaboration", "creative workspace", "business meeting"],
  "saas": ["technology workspace", "computer dashboard", "startup office", "digital innovation"],
  "landscaping": ["beautiful garden", "landscape design", "lawn maintenance", "outdoor living"],
  "dog grooming": ["dog grooming salon", "pet spa", "cute dogs", "dog bath"],
  "skateboard": ["skateboarding", "skate culture", "streetwear fashion", "urban style"],
  "clothing": ["fashion clothing", "streetwear apparel", "clothing brand", "fashion model"],
  "ecommerce": ["online shopping", "product display", "ecommerce store", "shopping bags"],
  "construction": ["construction site", "building contractor", "architecture construction", "construction workers"],
  "cleaning": ["professional cleaning", "clean home interior", "cleaning service", "spotless room"],
  "plumber": ["plumbing repair", "plumber working", "bathroom fixtures", "pipe repair"],
  "electrician": ["electrical work", "electrician repair", "wiring installation", "electrical panel"],
  // Additional business types
  "carpet": ["carpet flooring installation", "carpet samples interior", "luxury carpet texture", "carpet living room"],
  "flooring": ["hardwood flooring installation", "flooring samples", "beautiful floor interior", "flooring contractor"],
  "roofing": ["roofing contractor", "roof installation", "roofing work", "house roof repair"],
  "hvac": ["hvac technician", "air conditioning unit", "heating repair", "hvac installation"],
  "painting": ["house painting", "interior painting", "paint colors wall", "professional painter"],
  "moving": ["moving company", "moving boxes", "movers carrying furniture", "relocation service"],
  "pest control": ["pest control service", "exterminator", "pest free home", "pest control technician"],
  "auto": ["auto repair shop", "car mechanic", "auto service", "car maintenance"],
  "dental": ["dental office", "dentist smile", "dental care", "modern dental clinic"],
  "medical": ["medical clinic", "healthcare professional", "doctor patient", "medical office"],
  "lawyer": ["law office", "legal professional", "attorney meeting", "law firm"],
  "accounting": ["accounting office", "financial advisor", "accountant working", "tax preparation"],
  "real estate": ["luxury home exterior", "real estate agent", "beautiful house", "property interior"],
  "insurance": ["insurance agent", "family protection", "insurance meeting", "coverage planning"],
  "photography": ["photography studio", "photographer camera", "photo session", "professional photography"],
  "wedding": ["wedding venue", "wedding ceremony", "bride groom", "wedding flowers"],
  "catering": ["catering service", "catering food display", "event catering", "buffet setup"],
  "event": ["event planning", "corporate event", "event venue", "party decoration"],
  "tutoring": ["tutoring session", "student learning", "education classroom", "teacher student"],
  "daycare": ["daycare children", "childcare center", "kids playing", "nursery school"],
  "senior care": ["senior care", "elderly assistance", "home care senior", "caregiver helping"],
  "pool": ["swimming pool service", "pool cleaning", "beautiful pool", "pool maintenance"],
  "garage door": ["garage door installation", "garage door repair", "modern garage", "garage door service"],
  "window": ["window installation", "window cleaning", "new windows home", "window replacement"],
  "solar": ["solar panel installation", "solar energy", "solar roof", "renewable energy"],
  "security": ["home security system", "security camera", "alarm system", "security installation"],
  "locksmith": ["locksmith service", "door lock", "key cutting", "locksmith working"],
  "towing": ["tow truck service", "roadside assistance", "car towing", "tow truck"],
  "salon": ["hair salon interior", "hairstylist working", "beauty salon", "hair styling"],
  "barber": ["barbershop interior", "barber cutting hair", "barber shop", "mens haircut"],
  "nail": ["nail salon", "manicure pedicure", "nail art", "nail technician"],
  "massage": ["massage therapy", "spa massage", "relaxation massage", "massage therapist"],
  "chiropractor": ["chiropractic care", "chiropractor adjustment", "spine health", "chiropractic clinic"],
  "veterinary": ["veterinary clinic", "vet with pet", "animal hospital", "veterinarian"],
  "pet": ["pet store", "pet care", "pets animals", "pet grooming"],
  "flower": ["flower shop", "florist arrangement", "beautiful flowers", "flower delivery"],
  "jewelry": ["jewelry store", "jewelry display", "luxury jewelry", "jeweler"],
  "furniture": ["furniture store", "modern furniture", "home furniture", "furniture showroom"],
  "appliance": ["appliance repair", "home appliances", "appliance technician", "kitchen appliances"],
};

// Fetch images from Unsplash API
async function fetchUnsplashImages(query: string, count: number = 5): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  console.log(`[Unsplash] Fetching images for: "${query}", API Key exists: ${!!accessKey}`);
  
  if (!accessKey) {
    console.log(`[Unsplash] No API key, using picsum fallback`);
    // Return picsum placeholders if no API key
    return Array.from({ length: count }, (_, i) => 
      `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/1200/800`
    );
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.log(`[Unsplash] API error: ${response.status}`);
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    const urls = data.results.map((photo: { urls: { regular: string } }) => photo.urls.regular);
    console.log(`[Unsplash] Fetched ${urls.length} images`);
    return urls;
  } catch (error) {
    console.error("[Unsplash] Fetch error:", error);
    // Fallback to picsum
    return Array.from({ length: count }, (_, i) => 
      `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/1200/800`
    );
  }
}

// Fetch videos from Pexels API
async function fetchPexelsVideos(query: string, count: number = 2): Promise<{ url: string; poster: string }[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  
  console.log(`[Pexels] Fetching videos for: "${query}", API Key exists: ${!!apiKey}`);
  
  if (!apiKey) {
    console.log(`[Pexels] No API key, skipping video fetch`);
    return [];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      console.log(`[Pexels] API error: ${response.status}`);
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    interface PexelsVideoFile {
      quality: string;
      file_type: string;
      link: string;
    }
    
    interface PexelsVideo {
      video_files: PexelsVideoFile[];
      video_pictures: { picture: string }[];
    }
    
    const videos = data.videos.map((video: PexelsVideo) => {
      // Get HD mp4 video
      const hdFile = video.video_files.find((f: PexelsVideoFile) => f.quality === "hd" && f.file_type === "video/mp4")
                  || video.video_files.find((f: PexelsVideoFile) => f.quality === "sd" && f.file_type === "video/mp4")
                  || video.video_files[0];
      return {
        url: hdFile?.link || "",
        poster: video.video_pictures[0]?.picture || ""
      };
    }).filter((v: { url: string }) => v.url);
    
    console.log(`[Pexels] Fetched ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error("[Pexels] Video fetch error:", error);
    return [];
  }
}

// Get relevant image search terms based on user prompt
function getImageSearchTerms(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  
  // Check for specific business types first
  for (const [key, terms] of Object.entries(IMAGE_SEARCH_MAP)) {
    if (lower.includes(key)) {
      return terms;
    }
  }
  
  // Check template categories
  for (const [category, keywords] of Object.entries(TEMPLATE_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return IMAGE_SEARCH_MAP[category] || [keyword, `${keyword} business`, `${keyword} professional`];
      }
    }
  }
  
  // IMPROVED: Extract key business words from prompt for better search
  const businessWords = prompt.toLowerCase().match(/\b(carpet|flooring|roofing|hvac|painting|plumbing|electrical|cleaning|landscaping|moving|auto|dental|medical|lawyer|salon|barber|spa|massage|photography|wedding|catering|event|pool|garage|window|solar|security|pet|flower|jewelry|furniture|appliance|restaurant|cafe|coffee|bakery|fitness|gym|yoga|agency|construction)\b/g);
  
  if (businessWords && businessWords.length > 0) {
    const mainBusiness = businessWords[0];
    return [`${mainBusiness} service`, `${mainBusiness} professional`, `${mainBusiness} business`, `${mainBusiness} interior`];
  }
  
  // Fallback: Extract key nouns from the prompt
  const words = prompt.split(/\s+/).filter(w => w.length > 3);
  return words.slice(0, 3).map(w => `${w} service professional`);
}

// Video search term mapping - good for hero background videos
const VIDEO_SEARCH_MAP: Record<string, string> = {
  "restaurant": "restaurant kitchen cooking",
  "coffee": "coffee shop barista",
  "cafe": "coffee pouring cafe",
  "bakery": "bakery fresh bread",
  "fitness": "gym workout training",
  "gym": "gym weights exercise",
  "yoga": "yoga meditation peaceful",
  "landscaping": "garden nature plants",
  "dog grooming": "dog pet grooming",
  "agency": "office team working",
  "saas": "technology computer coding",
  "skateboard": "skateboarding urban street",
  "clothing": "fashion model clothing",
  "ecommerce": "shopping retail store",
  "construction": "construction building site",
  "spa": "spa relaxation massage",
  "hotel": "luxury hotel resort",
  // Additional business types
  "carpet": "carpet flooring installation interior",
  "flooring": "flooring installation hardwood",
  "roofing": "roofing contractor house",
  "hvac": "hvac technician air conditioning",
  "painting": "house painting interior",
  "plumber": "plumbing repair bathroom",
  "electrician": "electrical work wiring",
  "cleaning": "cleaning service home",
  "moving": "moving boxes movers",
  "auto": "auto repair mechanic",
  "dental": "dental clinic smile",
  "salon": "hair salon styling",
  "barber": "barbershop haircut",
  "massage": "massage therapy spa",
  "photography": "photography studio camera",
  "wedding": "wedding ceremony venue",
  "catering": "catering food event",
  "pool": "swimming pool service",
  "real estate": "luxury home interior",
  "lawyer": "law office professional",
};

// Get video search term for a business type
function getVideoSearchTerm(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  for (const [key, term] of Object.entries(VIDEO_SEARCH_MAP)) {
    if (lower.includes(key)) {
      return term;
    }
  }
  
  // Extract main business type from prompt
  const words = prompt.split(/\s+/).filter(w => w.length > 3);
  return words.slice(0, 2).join(" ") + " business";
}

// Detect business type from the actual website code
function detectBusinessTypeFromCode(code: string): string | null {
  if (!code) return null;
  
  const lower = code.toLowerCase();
  
  // Check for specific business indicators in the code
  const businessIndicators: Record<string, string[]> = {
    // Home services
    "carpet flooring installation": ["carpet", "flooring", "installation", "floor", "rug", "tile", "hardwood"],
    "roofing contractor": ["roofing", "roof", "shingles", "gutters", "leak"],
    "hvac air conditioning": ["hvac", "heating", "cooling", "air conditioning", "furnace", "duct"],
    "painting interior": ["painting", "paint", "interior", "exterior", "colors", "walls"],
    "plumbing repair": ["plumbing", "plumber", "pipes", "drain", "faucet", "water heater"],
    "electrical work": ["electrical", "electrician", "wiring", "outlets", "panel", "lighting"],
    "cleaning service": ["cleaning", "clean", "spotless", "maid", "housekeeping", "sanitize"],
    "landscaping garden": ["landscaping", "garden", "lawn", "plants", "trees", "outdoor", "yard"],
    "pool service": ["pool", "swimming", "spa", "hot tub", "cleaning"],
    "garage door": ["garage", "door", "opener", "installation", "repair"],
    "window installation": ["window", "glass", "replacement", "installation"],
    "solar energy": ["solar", "panel", "energy", "renewable", "installation"],
    "security system": ["security", "alarm", "camera", "surveillance", "monitoring"],
    
    // Auto & moving
    "auto repair mechanic": ["auto", "car", "mechanic", "repair", "service", "oil", "brake"],
    "moving service": ["moving", "movers", "relocation", "boxes", "packing"],
    "towing service": ["towing", "tow", "roadside", "assistance"],
    
    // Health & wellness
    "dental clinic": ["dental", "dentist", "teeth", "smile", "orthodontic", "oral"],
    "medical clinic": ["medical", "doctor", "health", "clinic", "patient", "healthcare"],
    "chiropractor spine": ["chiropractor", "spine", "adjustment", "back", "neck"],
    "massage therapy": ["massage", "therapy", "spa", "relaxation", "body"],
    "yoga meditation": ["yoga", "meditation", "mindfulness", "pose", "zen", "calm"],
    "spa wellness": ["spa", "wellness", "treatment", "beauty", "facial"],
    
    // Beauty
    "salon hair styling": ["salon", "hair", "stylist", "cut", "color", "styling"],
    "barber haircut": ["barber", "barbershop", "haircut", "shave", "trim"],
    "nail salon": ["nail", "manicure", "pedicure", "polish"],
    
    // Professional services
    "lawyer legal": ["lawyer", "attorney", "legal", "law", "court", "case"],
    "accounting tax": ["accounting", "accountant", "tax", "financial", "bookkeeping"],
    "real estate home": ["real estate", "property", "home", "house", "listing", "agent"],
    "insurance coverage": ["insurance", "coverage", "policy", "claim", "protection"],
    
    // Events & creative
    "photography studio": ["photography", "photographer", "photo", "camera", "session"],
    "wedding ceremony": ["wedding", "bride", "groom", "ceremony", "reception"],
    "catering food event": ["catering", "event", "food", "party", "buffet"],
    "event planning": ["event", "planning", "party", "corporate", "venue"],
    
    // Pet services
    "dog grooming pet": ["dog", "pet", "grooming", "paw", "puppy", "canine", "furry"],
    "veterinary animal": ["veterinary", "vet", "animal", "pet", "clinic"],
    
    // Retail & food
    "restaurant food dining": ["restaurant", "menu", "cuisine", "chef", "dining", "reservation"],
    "coffee cafe": ["coffee", "cafe", "espresso", "latte", "brew", "roast"],
    "bakery bread": ["bakery", "bread", "pastry", "cake", "fresh"],
    "flower shop": ["flower", "florist", "bouquet", "arrangement", "delivery"],
    "jewelry store": ["jewelry", "jeweler", "diamond", "ring", "necklace"],
    "furniture store": ["furniture", "sofa", "table", "chair", "decor"],
    
    // Fitness & sports
    "gym workout fitness": ["fitness", "gym", "workout", "training", "exercise", "muscle"],
    "skateboard streetwear": ["skateboard", "skate", "deck", "streetwear", "urban"],
    
    // Tech
    "agency marketing": ["agency", "marketing", "creative", "branding", "campaign"],
    "saas software": ["saas", "software", "platform", "dashboard", "analytics"],
    "ecommerce store": ["shop", "cart", "product", "buy", "store", "checkout"],
  };
  
  for (const [searchTerm, keywords] of Object.entries(businessIndicators)) {
    const matchCount = keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 2) {
      console.log(`[Buildr] Detected business type from code: ${searchTerm} (${matchCount} matches)`);
      return searchTerm;
    }
  }
  
  return null;
}

function findTemplateCategory(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const [category, keywords] of Object.entries(TEMPLATE_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return null;
}

async function loadTemplate(category: string): Promise<string | null> {
  try {
    const variants: Record<string, string[]> = {
      "restaurant": ["restaurant-1.html", "restaurant-2.html"],
      "local-service": ["local-service-1.html", "local-service-2.html", "local-service-3.html", "local-service-4.html", "local-service-5.html"],
      "fitness": ["fitness-1.html", "fitness-2.html", "fitness-3.html", "fitness-4.html", "fitness-5.html"],
      "agency": ["agency-1.html", "agency-2.html", "agency-3.html", "agency-4.html", "agency-5.html"],
      "saas": ["saas-1.html", "saas-2.html", "saas-3.html", "saas-4.html", "saas-5.html"]
    };
    const files = variants[category];
    if (!files) return null;
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const templatePath = path.join(process.cwd(), "src", "templates", randomFile);
    return await fs.readFile(templatePath, "utf-8");
  } catch { return null; }
}

// ========== ULTRA-MINIMAL PROMPTS ==========

// For simple edits (color, text, size) - ~30 words
const EDIT_PROMPT = `Make the requested change. Be brief - just say "Done!" then output the complete updated HTML code. No explanations needed.`;

// For new prototypes - ~80 words  
const PROTOTYPE_PROMPT = `Create a beautiful website prototype. Use Tailwind CDN, dark theme, modern design. Include: nav, hero, features, about, contact, footer. Use realistic content. Output: one intro line, then complete HTML.`;

// For template customization - ~50 words
const TEMPLATE_PROMPT = `Customize this template for the user's business. Replace name, services, content. Keep all existing code structure. Output: brief intro, then complete HTML.`;

// For edits that need confirmation - say what you'll do first
const EDIT_WITH_CONFIRM_PROMPT = `First, briefly confirm what you'll do (1 sentence, e.g. "Adding SEO meta tags and schema markup..."). Then output the complete updated HTML code.`;

// For production-ready builds - ~150 words
const PRODUCTION_PROMPT = `Make this website production-ready:
- Form validation with success/error messages
- Mobile menu toggle working
- Smooth scroll navigation  
- All buttons have click handlers
- Phone: tel: links, Email: mailto: links
- Hover states on interactive elements
- ARIA labels for accessibility

Output: brief confirmation, then complete HTML with all functionality.`;

// For planning discussions
const PLAN_PROMPT = `Help plan the website. Ask questions, suggest features. Be concise. Don't output code unless asked.`;

// For acknowledging what user asked before building
const ACKNOWLEDGE_PROMPT = `You are Buildr, a friendly AI website builder assistant. The user just told you what they want to build.

Your job is to:
1. Acknowledge what they asked for enthusiastically
2. Confirm the key details you understood
3. Briefly explain what you're going to create for them
4. End with something like "Let me build this for you now!" or "Starting the build..."

Be conversational, warm, and excited to help. Use emojis sparingly (1-2 max). Keep it to 3-4 sentences.

DO NOT output any code. Just have a friendly conversation acknowledging their request.`;

// For summarizing what was built
const SUMMARY_PROMPT = `You are Buildr, a friendly AI website builder. You just finished building a website.

Summarize what you built in a conversational way:
1. Confirm the build is complete
2. List the main sections/features you included (bullet points)
3. Mention any special touches (fonts, images, icons)
4. Give a tip for what they can do next

Be warm and helpful. Use emojis sparingly. Keep it concise but informative.

DO NOT output any code. Just summarize what was built.`;

// ========== DETECT REQUEST TYPE ==========

function detectRequestType(message: string, isFollowUp: boolean, isPlanMode: boolean, isProductionMode: boolean): string {
  if (isPlanMode) return "plan";
  if (isProductionMode) return "production";
  if (!isFollowUp) return "prototype";
  
  const lower = message.toLowerCase();
  
  // Production triggers
  if (lower.includes("production") || lower.includes("finalize") || lower.includes("make it work") || lower.includes("functional")) {
    return "production";
  }
  
  // Video request triggers - add video OR request different/another video
  if (/(add|put|use|include).*(video)/i.test(lower) || 
      /video.*(background|hero|section|header)/i.test(lower) ||
      /(hero|background).*(video)/i.test(lower) ||
      /(another|different|new|change).*(video)/i.test(lower) ||
      /video.*(another|different|option)/i.test(lower)) {
    return "add_video";
  }
  
  // Image replacement triggers - including "another option" type requests
  if (/(better|real|new|replace|update|change).*(image|photo|picture)/i.test(lower) ||
      /(image|photo|picture).*(better|real|replace|update)/i.test(lower) ||
      /(another|different).*(image|photo|picture|option)/i.test(lower) ||
      /give me.*(another|different|new)/i.test(lower)) {
    return "images";
  }
  
  // VERY simple edits - no confirmation needed (instant-like)
  const instantEditPatterns = [
    /^change.*(color|colour)/i,
    /^make.*(bigger|smaller|larger)/i,
    /^update.*(phone|email|address)/i,
  ];
  
  if (instantEditPatterns.some(p => p.test(lower))) {
    return "edit";
  }
  
  // Complex edits that benefit from confirmation
  const complexEditPatterns = [
    /add.*(seo|meta|schema|analytics|tracking)/i,
    /add.*(section|feature|component)/i,
    /implement|integrate|optimize/i,
    /redesign|restructure|refactor/i,
    /add.*(functionality|animation|effect)/i,
  ];
  
  if (complexEditPatterns.some(p => p.test(lower))) {
    return "edit_confirm"; // New type - edit with brief confirmation
  }
  
  // Default for follow-ups - simple edit
  return "edit";
}

// ========== API HANDLER ==========

export async function POST(request: NextRequest) {
  try {
    const { messages, mode, isFollowUp, templateCategory, isPlanMode, isProductionMode, premiumMode, currentCode } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    
    // Special mode for acknowledgment (conversational response before building)
    if (mode === "acknowledge") {
      const userPrompt = messages[messages.length - 1]?.content || "";
      
      const response = await anthropic.messages.create({
        model: MODELS.haiku,
        max_tokens: 300,
        system: ACKNOWLEDGE_PROMPT,
        messages: [{ role: "user", content: `User wants to build: ${userPrompt}` }]
      });
      
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      return new Response(JSON.stringify({ content: text }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Special mode for summary (after build completes)
    if (mode === "summary") {
      const userPrompt = messages[0]?.content || "";
      const builtCode = currentCode || "";
      
      // Extract what sections were built
      const sections: string[] = [];
      if (builtCode.includes("hero") || builtCode.includes("Hero")) sections.push("Hero section");
      if (builtCode.includes("nav") || builtCode.includes("Nav")) sections.push("Navigation");
      if (builtCode.includes("about") || builtCode.includes("About")) sections.push("About section");
      if (builtCode.includes("service") || builtCode.includes("Service") || builtCode.includes("feature")) sections.push("Services/Features");
      if (builtCode.includes("testimonial") || builtCode.includes("review")) sections.push("Testimonials");
      if (builtCode.includes("contact") || builtCode.includes("Contact")) sections.push("Contact section");
      if (builtCode.includes("footer") || builtCode.includes("Footer")) sections.push("Footer");
      if (builtCode.includes("pricing") || builtCode.includes("Pricing")) sections.push("Pricing");
      if (builtCode.includes("<video")) sections.push("Video background");
      
      const hasGoogleFonts = builtCode.includes("fonts.googleapis.com");
      const hasIcons = builtCode.includes("iconify");
      const hasImages = builtCode.includes("unsplash.com") || builtCode.includes("pexels.com");
      
      const response = await anthropic.messages.create({
        model: MODELS.haiku,
        max_tokens: 400,
        system: SUMMARY_PROMPT,
        messages: [{ 
          role: "user", 
          content: `Original request: ${userPrompt}\n\nSections built: ${sections.join(", ")}\n\nFeatures: ${hasGoogleFonts ? "Custom fonts, " : ""}${hasIcons ? "Icons, " : ""}${hasImages ? "Stock photos, " : ""}Mobile responsive` 
        }]
      });
      
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      return new Response(JSON.stringify({ content: text }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const userPrompt = messages[0]?.content || "";
    const lastMessage = messages[messages.length - 1]?.content || userPrompt;
    const requestType = detectRequestType(lastMessage, isFollowUp, isPlanMode, isProductionMode);
    
    let systemPrompt: string;
    let model: string;
    let maxTokens: number;
    let finalMessages = messages;
    
    console.log(`[Buildr] Type: ${requestType}, Model: selecting..., HasCode: ${!!currentCode}`);
    
    // ========== MODEL & PROMPT SELECTION ==========
    switch (requestType) {
      case "edit":
        // FAST: Simple edits use Haiku with minimal prompt
        systemPrompt = EDIT_PROMPT;
        model = MODELS.haiku;
        maxTokens = 16000;
        
        if (currentCode) {
          const lastMsg = finalMessages[finalMessages.length - 1];
          finalMessages = [
            ...finalMessages.slice(0, -1),
            { 
              role: lastMsg.role, 
              content: `${lastMsg.content}\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\`` 
            }
          ];
        }
        break;
      
      case "edit_confirm":
        // Complex edits - brief confirmation then build
        systemPrompt = EDIT_WITH_CONFIRM_PROMPT;
        model = MODELS.haiku;
        maxTokens = 16000;
        
        if (currentCode) {
          const lastMsg = finalMessages[finalMessages.length - 1];
          finalMessages = [
            ...finalMessages.slice(0, -1),
            { 
              role: lastMsg.role, 
              content: `${lastMsg.content}\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\`` 
            }
          ];
        }
        break;
      
      case "images":
        // Detect business type from current code OR conversation history
        const businessContext = detectBusinessTypeFromCode(currentCode) || getImageSearchTerms(userPrompt)[0];
        console.log(`[Buildr] Image replacement - detected business: ${businessContext}`);
        
        let newImageUrls: string[] = [];
        
        try {
          newImageUrls = await fetchUnsplashImages(businessContext, 8);
          console.log(`[Buildr] Fetched ${newImageUrls.length} new images for: ${businessContext}`);
        } catch (e) {
          console.error("Failed to fetch images:", e);
        }
        
        const imageReplacePrompt = newImageUrls.length > 0
          ? `Replace the existing images with these NEW high-quality images (relevant to the ${businessContext} website):\n${newImageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}\n\nUse these URLs in img src and background-image properties. Keep all other content the same. Say "Done! Updated images." then output the complete HTML.`
          : `The user wants better images. Replace placeholder images with professional stock photos from picsum.photos or similar. Say "Done!" then output the complete HTML.`;
        
        systemPrompt = imageReplacePrompt;
        model = MODELS.haiku;
        maxTokens = 16000;
        
        if (currentCode) {
          const lastMsg = finalMessages[finalMessages.length - 1];
          finalMessages = [
            ...finalMessages.slice(0, -1),
            { 
              role: lastMsg.role, 
              content: `${lastMsg.content}\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\`` 
            }
          ];
        }
        break;
      
      case "add_video":
        // Detect business type from current code for relevant video
        const videoBusinessContext = detectBusinessTypeFromCode(currentCode) || getVideoSearchTerm(userPrompt);
        console.log(`[Buildr] Video request - detected business: ${videoBusinessContext}`);
        
        const videoQuery = videoBusinessContext;
        let videoUrls: { url: string; poster: string }[] = [];
        
        try {
          videoUrls = await fetchPexelsVideos(videoQuery, 1);
          console.log(`[Buildr] Fetched video for: ${videoQuery}, success: ${videoUrls.length > 0}`);
        } catch (e) {
          console.error("Failed to fetch video:", e);
        }
        
        const videoAddPrompt = videoUrls.length > 0
          ? `Add a video background to the section the user requested. Use this Pexels video:

VIDEO URL: ${videoUrls[0].url}
POSTER IMAGE: ${videoUrls[0].poster}

Implementation:
<video autoplay muted loop playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
  <source src="${videoUrls[0].url}" type="video/mp4">
</video>

- Add position: relative to the parent section
- Add a dark overlay (bg-black/50) on top of the video for text readability
- Keep all existing content, just add the video behind it
- Say "Done! Added video background." then output the complete HTML.`
          : `Add a video background to the hero/requested section. Use a placeholder video or suggest the user provides a video URL. Say "Done!" then output the complete HTML.`;
        
        systemPrompt = videoAddPrompt;
        model = MODELS.haiku;
        maxTokens = 16000;
        
        if (currentCode) {
          const lastMsg = finalMessages[finalMessages.length - 1];
          finalMessages = [
            ...finalMessages.slice(0, -1),
            { 
              role: lastMsg.role, 
              content: `${lastMsg.content}\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\`` 
            }
          ];
        }
        break;
        
      case "production":
        // QUALITY: Production uses Sonnet (or Opus if premium)
        systemPrompt = PRODUCTION_PROMPT;
        model = premiumMode ? MODELS.opus : MODELS.sonnet;
        maxTokens = 16000;
        
        if (currentCode) {
          const lastMsg = finalMessages[finalMessages.length - 1];
          finalMessages = [
            ...finalMessages.slice(0, -1),
            { 
              role: lastMsg.role, 
              content: `${lastMsg.content}\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\`` 
            }
          ];
        }
        break;
        
      case "plan":
        systemPrompt = PLAN_PROMPT;
        model = MODELS.haiku;
        maxTokens = 2000;
        break;
        
      case "prototype":
      default:
        // Check if user selected video in questionnaire
        const wantsVideo = userPrompt.toLowerCase().includes("video background") || 
                          userPrompt.toLowerCase().includes("🎬 video");
        
        // Fetch relevant images for the build
        const searchTerms = getImageSearchTerms(userPrompt);
        console.log(`[Buildr] Search terms for images: ${searchTerms.join(', ')}`);
        let imageUrls: string[] = [];
        let videoData: { url: string; poster: string }[] = [];
        
        try {
          // Fetch images for the primary search term
          imageUrls = await fetchUnsplashImages(searchTerms[0], 6);
          console.log(`[Buildr] Got ${imageUrls.length} image URLs`);
          
          // Only fetch video if user wants it
          if (wantsVideo) {
            const videoSearchTerm = getVideoSearchTerm(userPrompt);
            videoData = await fetchPexelsVideos(videoSearchTerm, 1);
            console.log(`[Buildr] Got ${videoData.length} video URLs`);
          }
        } catch (e) {
          console.error("Failed to fetch media:", e);
        }
        
        // Check for template
        const detectedCategory = templateCategory || findTemplateCategory(userPrompt);
        console.log(`[Buildr] Detected category: ${detectedCategory}`);
        
        if (detectedCategory && !isFollowUp) {
          const template = await loadTemplate(detectedCategory);
          if (template) {
            systemPrompt = TEMPLATE_PROMPT;
            model = MODELS.haiku;
            maxTokens = 16000;
            
            // Get fonts and icons for this business
            const fonts = getFontForBusiness(userPrompt);
            const icons = getIconsForBusiness(userPrompt);
            
            // Add images to template customization
            const imageContext = imageUrls.length > 0 
              ? `\n\nUSE THESE HIGH-QUALITY IMAGES:\n${imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}\n\nReplace placeholder images with these URLs.`
              : '';
            
            // Add video for hero background (only if user selected video)
            const videoContext = videoData.length > 0
              ? `\n\nUSE THIS VIDEO BACKGROUND IN THE HERO SECTION:
<video autoplay muted loop playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
  <source src="${videoData[0].url}" type="video/mp4">
</video>
Poster image: ${videoData[0].poster}
IMPORTANT: Add a dark overlay (bg-black/50) on top of the video for text readability. Make the hero section position: relative.`
              : '';
            
            // Add font instructions
            const fontContext = `\n\nUSE THESE GOOGLE FONTS:
- Add this link in <head>: <link href="${fonts.googleLink}" rel="stylesheet">
- Heading font: "${fonts.heading}" - Use for h1, h2, h3, nav brand
- Body font: "${fonts.body}" - Use for paragraphs, buttons, links
- Style vibe: ${fonts.style}`;
            
            // Add icon instructions
            const iconContext = `\n\nUSE ICONIFY FOR ICONS:
- Add this script before </body>: <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
- Use icons like: <span class="iconify" data-icon="ICON_NAME"></span>
- Recommended icons for this business: ${icons.join(', ')}`;
            
            console.log(`[Buildr] Using template with ${imageUrls.length} images, ${videoData.length} videos, font: ${fonts.heading}`);
            
            finalMessages = [{
              role: "user",
              content: `TEMPLATE:\n\`\`\`html\n${template}\n\`\`\`\n\nCUSTOMIZE FOR: ${userPrompt}${imageContext}${videoContext}${fontContext}${iconContext}`
            }];
            break;
          }
        }
        
        // Get fonts and icons for from-scratch builds
        const fonts = getFontForBusiness(userPrompt);
        const icons = getIconsForBusiness(userPrompt);
        
        // No template - generate from scratch with images, fonts, icons
        const imageInstructions = imageUrls.length > 0 
          ? `\n\nUSE THESE HIGH-QUALITY IMAGES from Unsplash:\n${imageUrls.map((url, i) => `- Hero/Feature ${i + 1}: ${url}`).join('\n')}\n\nUse these URLs directly in img src and background-image. They are real, working image URLs.`
          : '';
        
        // Video instructions only if user selected video
        const videoInstructions = videoData.length > 0
          ? `\n\nUSE THIS VIDEO BACKGROUND IN THE HERO SECTION:
<video autoplay muted loop playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
  <source src="${videoData[0].url}" type="video/mp4">
</video>
Poster/fallback image: ${videoData[0].poster}
IMPORTANT: Add a dark overlay (bg-black/50) on top for text readability. Make the hero section position: relative.`
          : '';
        
        const fontInstructions = `\n\nUSE THESE GOOGLE FONTS:
- Add this link in <head>: <link href="${fonts.googleLink}" rel="stylesheet">
- Heading font: "${fonts.heading}" - Use for h1, h2, h3, nav brand (font-family: '${fonts.heading}', sans-serif)
- Body font: "${fonts.body}" - Use for paragraphs, buttons, links (font-family: '${fonts.body}', sans-serif)
- Style vibe: ${fonts.style}`;

        const iconInstructions = `\n\nUSE ICONIFY FOR ICONS:
- Add this script before </body>: <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
- Use icons like: <span class="iconify" data-icon="ICON_NAME" style="font-size: 24px;"></span>
- Recommended icons for this business: ${icons.join(', ')}
- Use these icons in feature sections, services, contact info, etc.`;
        
        console.log(`[Buildr] Building from scratch with font: ${fonts.heading}, icons: ${icons.slice(0,3).join(', ')}, video: ${videoData.length > 0}`);
        
        systemPrompt = PROTOTYPE_PROMPT + imageInstructions + videoInstructions + fontInstructions + iconInstructions;
        model = premiumMode ? MODELS.sonnet : MODELS.haiku;
        maxTokens = 16000;
        break;
    }
    
    // Questions mode
    if (mode === "questions") {
      systemPrompt = `Return JSON array of 3-4 questions. Format: [{question, options[], allowMultiple, hasOther}]. JSON only.`;
      model = MODELS.haiku;
      maxTokens = 1000;
    }

    console.log(`[Buildr] Type: ${requestType}, Model: ${model}, Premium: ${premiumMode || false}`);

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: finalMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate. Please try again." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
