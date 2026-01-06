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

// Generate AI images using Replicate API
async function fetchReplicateImages(businessType: string, count: number = 3): Promise<string[]> {
  const apiKey = process.env.REPLICATE_API_KEY;
  
  console.log(`[Replicate] Generating AI images for: "${businessType}", API Key exists: ${!!apiKey}`);
  
  if (!apiKey) {
    console.log(`[Replicate] No API key, skipping AI image generation`);
    return [];
  }

  // Build optimized prompts for different business types
  const businessPrompts: Record<string, string> = {
    // Home Services
    plumbing: "professional plumber working on modern bathroom pipes, clean uniform, high-end residential setting, natural lighting, photorealistic, 8k quality",
    hvac: "HVAC technician installing modern air conditioning unit, professional uniform, residential home exterior, blue sky, photorealistic",
    electrical: "professional electrician working on electrical panel, safety gear, modern home, clean and organized, photorealistic",
    roofing: "professional roofers working on suburban home roof, clear blue sky, modern architecture, photorealistic",
    cleaning: "professional cleaning service in modern luxury home, sparkling clean surfaces, natural light, photorealistic",
    landscaping: "beautiful landscaped garden with lush green lawn, colorful flowers, suburban home, golden hour lighting",
    painting: "professional painter with roller painting modern interior wall, clean drop cloths, fresh paint, bright room",
    carpet: "beautiful modern living room with plush carpet, elegant furniture, natural light, interior design photography",
    
    // Food & Dining
    restaurant: "elegant restaurant interior, warm ambient lighting, beautifully plated gourmet food, fine dining, photorealistic",
    cafe: "cozy modern cafe interior, latte art coffee, pastries display, natural light, rustic wood tables",
    bakery: "artisan bakery display with fresh bread and pastries, warm lighting, rustic wooden shelves, steam rising",
    
    // Fitness & Wellness
    fitness: "modern gym interior with professional equipment, motivational atmosphere, natural lighting, people exercising",
    gym: "high-end fitness center with weight training area, clean modern design, professional lighting",
    yoga: "serene yoga studio with natural light, wooden floors, plants, peaceful atmosphere, person in yoga pose",
    spa: "luxury spa interior with massage room, candles, orchids, zen atmosphere, warm lighting",
    
    // Professional Services
    lawyer: "modern law office interior, professional meeting room, city skyline view, leather chairs, bookshelves",
    dental: "modern dental clinic, friendly dentist with patient, clean white interior, professional equipment",
    medical: "modern medical clinic waiting room, clean and welcoming, natural light, comfortable seating",
    
    // Tech & Digital
    agency: "creative agency office, modern workspace, designers collaborating, multiple monitors, contemporary furniture",
    saas: "modern tech office, software developers at work, multiple screens, contemporary design",
    
    // Pet Services
    dog: "professional dog groomer with happy golden retriever, modern grooming salon, clean and bright",
    pet: "modern pet care facility, happy pets, professional staff, clean environment",
    
    // Default
    business: "professional modern office interior, successful business team, natural lighting, contemporary design",
  };

  // Find matching business type
  const lowerType = businessType.toLowerCase();
  let prompt = businessPrompts.business;
  
  for (const [key, value] of Object.entries(businessPrompts)) {
    if (lowerType.includes(key)) {
      prompt = value;
      break;
    }
  }

  const imageUrls: string[] = [];
  
  try {
    // Generate multiple images (in parallel for speed)
    const imagePromises = Array.from({ length: Math.min(count, 3) }, async (_, index) => {
      // Vary the prompt slightly for each image
      const variations = [
        prompt,
        prompt + ", wide angle shot",
        prompt + ", close-up detail shot"
      ];
      
      const currentPrompt = variations[index] || prompt;
      
      console.log(`[Replicate] Generating image ${index + 1}: ${currentPrompt.slice(0, 50)}...`);
      
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Using SDXL Lightning for faster generation
          version: "5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f",
          input: {
            prompt: currentPrompt,
            negative_prompt: "blurry, low quality, distorted, ugly, text, watermark, logo, cartoon, anime",
            width: 1024,
            height: 768,
            num_inference_steps: 4, // Lightning is fast
            guidance_scale: 0,
          },
        }),
      });

      if (!response.ok) {
        console.error(`[Replicate] API error for image ${index + 1}:`, response.status);
        return null;
      }

      const prediction = await response.json();
      
      // Poll for completion (max 30 seconds)
      let result = prediction;
      let attempts = 0;
      while (result.status !== "succeeded" && result.status !== "failed" && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const pollResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${prediction.id}`,
          {
            headers: {
              "Authorization": `Token ${apiKey}`,
            },
          }
        );
        result = await pollResponse.json();
        attempts++;
      }

      if (result.status === "succeeded" && result.output) {
        // SDXL Lightning returns the URL directly
        const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
        console.log(`[Replicate] Image ${index + 1} generated successfully`);
        return imageUrl;
      }
      
      console.error(`[Replicate] Image ${index + 1} failed:`, result.status);
      return null;
    });

    const results = await Promise.all(imagePromises);
    
    for (const url of results) {
      if (url) imageUrls.push(url);
    }
    
    console.log(`[Replicate] Generated ${imageUrls.length} AI images`);
    return imageUrls;
    
  } catch (error) {
    console.error("[Replicate] Error generating images:", error);
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

// Fallback video categories when specific industry videos aren't available
const VIDEO_FALLBACK_MAP: Record<string, string> = {
  // Home services -> use related/broader category
  "plumber": "bathroom renovation home",
  "plumbing": "bathroom renovation home", 
  "electrician": "home renovation interior",
  "electrical": "home renovation interior",
  "carpet": "home interior design living room",
  "flooring": "home interior design living room",
  "roofing": "house exterior architecture",
  "hvac": "modern home interior comfort",
  "painting": "home renovation interior design",
  "garage": "modern home exterior",
  "window": "modern home interior natural light",
  "cleaning": "clean modern home interior",
  "pest": "beautiful home exterior",
  "locksmith": "home security door",
  "appliance": "modern kitchen interior",
  // Professional services -> use office/professional settings
  "lawyer": "professional office meeting",
  "attorney": "professional office meeting",
  "accounting": "professional office business",
  "insurance": "family home protection",
  "dental": "modern medical clinic",
  "medical": "healthcare clinic modern",
  "chiropractor": "wellness health clinic",
  "veterinary": "veterinary clinic pets",
  // Fallback for any service
  "service": "professional business team",
};

// Get video search term for a business type
function getVideoSearchTerm(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  // First check exact matches in VIDEO_SEARCH_MAP
  for (const [key, term] of Object.entries(VIDEO_SEARCH_MAP)) {
    if (lower.includes(key)) {
      console.log(`[Video] Found exact match: ${key} -> ${term}`);
      return term;
    }
  }
  
  // Check fallback map for industries that might not have good direct videos
  for (const [key, term] of Object.entries(VIDEO_FALLBACK_MAP)) {
    if (lower.includes(key)) {
      console.log(`[Video] Using fallback: ${key} -> ${term}`);
      return term;
    }
  }
  
  // Extract business type keywords for smarter search
  const businessKeywords = lower.match(/\b(restaurant|cafe|coffee|fitness|gym|yoga|salon|spa|construction|landscaping|agency|photography|wedding|real estate|hotel|retail|store|shop)\b/);
  if (businessKeywords) {
    const keyword = businessKeywords[0];
    console.log(`[Video] Found keyword: ${keyword}`);
    return VIDEO_SEARCH_MAP[keyword] || `${keyword} professional`;
  }
  
  // Final fallback - use something generic but professional
  console.log(`[Video] Using generic fallback for: ${prompt.slice(0, 50)}`);
  return "professional business office";
}

// Detect business type from the actual website code
function detectBusinessTypeFromCode(code: string): string | null {
  if (!code) return null;
  
  const lower = code.toLowerCase();
  
  // Map: keywords in code -> video-friendly search term
  // The search term should be something Pexels will have good videos for
  const businessIndicators: Record<string, { keywords: string[], videoSearch: string }> = {
    // Home services - use related lifestyle/interior videos
    "carpet": { keywords: ["carpet", "flooring", "floor", "rug", "tile", "hardwood"], videoSearch: "home interior living room" },
    "roofing": { keywords: ["roofing", "roof", "shingles", "gutters"], videoSearch: "house exterior architecture" },
    "hvac": { keywords: ["hvac", "heating", "cooling", "air conditioning", "furnace"], videoSearch: "modern home comfort" },
    "painting": { keywords: ["painting", "paint", "interior", "exterior", "walls"], videoSearch: "home renovation interior" },
    "plumbing": { keywords: ["plumbing", "plumber", "pipes", "drain", "faucet", "water heater"], videoSearch: "bathroom renovation modern" },
    "electrical": { keywords: ["electrical", "electrician", "wiring", "outlets", "panel"], videoSearch: "modern home interior lighting" },
    "cleaning": { keywords: ["cleaning", "clean", "spotless", "maid", "housekeeping"], videoSearch: "clean modern home interior" },
    "landscaping": { keywords: ["landscaping", "garden", "lawn", "plants", "trees", "outdoor"], videoSearch: "garden nature plants" },
    "pool": { keywords: ["pool", "swimming", "spa", "hot tub"], videoSearch: "swimming pool water" },
    "garage": { keywords: ["garage", "door", "opener"], videoSearch: "modern home exterior" },
    "window": { keywords: ["window", "glass", "replacement"], videoSearch: "modern home natural light" },
    "solar": { keywords: ["solar", "panel", "energy", "renewable"], videoSearch: "solar energy sustainable" },
    "security": { keywords: ["security", "alarm", "camera", "surveillance"], videoSearch: "home security technology" },
    
    // Auto & moving
    "auto": { keywords: ["auto", "car", "mechanic", "repair", "oil", "brake"], videoSearch: "auto repair garage" },
    "moving": { keywords: ["moving", "movers", "relocation", "boxes"], videoSearch: "moving boxes new home" },
    
    // Health & wellness - these have good videos
    "dental": { keywords: ["dental", "dentist", "teeth", "smile"], videoSearch: "dental clinic modern" },
    "medical": { keywords: ["medical", "doctor", "health", "clinic", "patient"], videoSearch: "healthcare medical clinic" },
    "chiropractor": { keywords: ["chiropractor", "spine", "adjustment", "back"], videoSearch: "wellness health clinic" },
    "massage": { keywords: ["massage", "therapy", "relaxation", "body"], videoSearch: "spa massage relaxation" },
    "yoga": { keywords: ["yoga", "meditation", "mindfulness", "pose", "zen"], videoSearch: "yoga meditation peaceful" },
    "spa": { keywords: ["spa", "wellness", "treatment", "beauty", "facial"], videoSearch: "spa relaxation wellness" },
    
    // Beauty - good videos available
    "salon": { keywords: ["salon", "hair", "stylist", "cut", "color", "styling"], videoSearch: "hair salon styling" },
    "barber": { keywords: ["barber", "barbershop", "haircut", "shave"], videoSearch: "barbershop haircut" },
    "nail": { keywords: ["nail", "manicure", "pedicure", "polish"], videoSearch: "nail salon manicure" },
    
    // Professional services
    "lawyer": { keywords: ["lawyer", "attorney", "legal", "law", "court"], videoSearch: "professional office meeting" },
    "accounting": { keywords: ["accounting", "accountant", "tax", "financial"], videoSearch: "business office professional" },
    "realestate": { keywords: ["real estate", "property", "home", "house", "listing", "agent"], videoSearch: "luxury home interior" },
    "insurance": { keywords: ["insurance", "coverage", "policy", "claim"], videoSearch: "family home happy" },
    
    // Events & creative - excellent videos available
    "photography": { keywords: ["photography", "photographer", "photo", "camera"], videoSearch: "photography studio camera" },
    "wedding": { keywords: ["wedding", "bride", "groom", "ceremony"], videoSearch: "wedding ceremony venue" },
    "catering": { keywords: ["catering", "event", "food", "party", "buffet"], videoSearch: "catering food event" },
    "event": { keywords: ["event", "planning", "party", "corporate", "venue"], videoSearch: "event venue celebration" },
    
    // Pet services
    "pet": { keywords: ["dog", "pet", "grooming", "paw", "puppy", "canine"], videoSearch: "dog pet grooming" },
    "veterinary": { keywords: ["veterinary", "vet", "animal", "clinic"], videoSearch: "veterinary clinic pets" },
    
    // Retail & food - great videos
    "restaurant": { keywords: ["restaurant", "menu", "cuisine", "chef", "dining"], videoSearch: "restaurant kitchen cooking" },
    "coffee": { keywords: ["coffee", "cafe", "espresso", "latte", "brew"], videoSearch: "coffee shop barista" },
    "bakery": { keywords: ["bakery", "bread", "pastry", "cake"], videoSearch: "bakery fresh bread" },
    "flower": { keywords: ["flower", "florist", "bouquet", "arrangement"], videoSearch: "flower shop florist" },
    "jewelry": { keywords: ["jewelry", "jeweler", "diamond", "ring"], videoSearch: "jewelry luxury elegant" },
    "furniture": { keywords: ["furniture", "sofa", "table", "chair", "decor"], videoSearch: "furniture store interior" },
    
    // Fitness & sports - excellent videos
    "fitness": { keywords: ["fitness", "gym", "workout", "training", "exercise", "muscle"], videoSearch: "gym workout training" },
    "skateboard": { keywords: ["skateboard", "skate", "deck", "streetwear"], videoSearch: "skateboarding urban street" },
    
    // Tech
    "agency": { keywords: ["agency", "marketing", "creative", "branding", "campaign"], videoSearch: "office team collaboration" },
    "saas": { keywords: ["saas", "software", "platform", "dashboard", "analytics"], videoSearch: "technology computer coding" },
    "ecommerce": { keywords: ["shop", "cart", "product", "store", "checkout"], videoSearch: "shopping retail store" },
  };
  
  for (const [, config] of Object.entries(businessIndicators)) {
    const matchCount = config.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 2) {
      console.log(`[Buildr] Detected from code -> video search: ${config.videoSearch} (${matchCount} keyword matches)`);
      return config.videoSearch;
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

// ========== BUILDR AI BRAIN - ENGINEERING DNA & DEEP INTELLIGENCE ==========

// Core intelligence system that applies to ALL operations
const AI_BRAIN_CORE = `
You are Buildr, a GENIUS-level AI website builder and engineer. You possess deep technical knowledge, exceptional problem-solving abilities, and the intuition of a senior full-stack developer with 15+ years of experience.

═══════════════════════════════════════════════════════════════════════════════
PART 1: ENGINEERING DNA - HOW YOU THINK AND SOLVE PROBLEMS
═══════════════════════════════════════════════════════════════════════════════

### PROBLEM DECOMPOSITION
When given ANY request, you automatically:
1. ANALYZE: What is the core problem? What are the sub-problems?
2. ARCHITECT: What components/systems are needed? How do they interact?
3. DEPENDENCIES: What needs to exist before other things can work?
4. EDGE CASES: What could go wrong? What are the boundary conditions?
5. IMPLEMENTATION: What's the optimal order to build this?

Example thought process for "Add a booking system":
→ Components needed: Calendar UI, time slot selector, form inputs, confirmation flow
→ Data structure: Available dates, time slots, booking details, validation
→ User flow: Select date → Select time → Enter details → Confirm → Success message
→ Edge cases: Past dates disabled, fully booked slots, form validation, mobile UX
→ Dependencies: Need date picker library or custom implementation

### SYSTEMS THINKING
You understand how pieces connect:
- A modal needs: trigger button, overlay, modal container, close mechanism, focus trap
- A carousel needs: slides container, navigation arrows, dots indicator, touch support, auto-play
- A form needs: inputs, labels, validation, error states, success states, submission handler
- A dropdown needs: trigger, menu, items, keyboard navigation, click-outside-to-close
- Authentication needs: form, validation, states (loading, error, success), secure handling

### COMPONENT ARCHITECTURE
You know what building blocks are required:

**Navigation Systems:**
- Desktop: Logo, links, CTA button, dropdowns if needed
- Mobile: Hamburger trigger, slide-out/dropdown menu, close button, overlay
- States: Active link, hover states, scroll behavior (sticky/fixed)

**Hero Sections:**
- Structure: Background (image/video/gradient), overlay, content container
- Content: Badge/tagline, headline (h1), subheadline, CTA buttons, trust indicators
- Considerations: Text contrast, responsive image sizing, video performance

**Feature/Service Sections:**
- Grid layout for cards (responsive columns)
- Each card: Icon, title, description, optional link
- Consistent spacing and alignment

**Testimonials:**
- Quote text, author name, title/company, optional photo
- Carousel for multiple OR grid layout
- Star ratings if applicable

**Forms:**
- Input groups: label + input + error message container
- Validation: Required fields, email format, phone format
- States: Default, focus, error, success, disabled
- Submission: Loading state, success message, error handling

**Modals/Popups:**
- Trigger element
- Overlay (click to close)
- Modal container (centered, responsive)
- Close button (X)
- Content area
- Focus management

**Accordions/FAQ:**
- Question/trigger
- Answer/content (hidden by default)
- Toggle mechanism (click)
- Icon rotation animation
- Only-one-open OR multiple-open behavior

### TECHNICAL EXCELLENCE
You write code that is:
- Semantic: Proper HTML elements (nav, main, section, article, aside, footer)
- Accessible: ARIA labels, focus states, keyboard navigation, screen reader friendly
- Responsive: Mobile-first, breakpoints that make sense
- Performant: Optimized images, minimal JS, efficient CSS
- Maintainable: Clear structure, consistent naming, logical organization

### JAVASCRIPT PATTERNS YOU KNOW
When functionality is needed, you implement properly:

\`\`\`javascript
// Mobile menu toggle
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
menuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
  // Toggle hamburger to X animation
  menuBtn.querySelector('svg').classList.toggle('rotate-90');
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Form validation
form.addEventListener('submit', function(e) {
  e.preventDefault();
  let isValid = true;
  // Validate each field...
  if (isValid) {
    // Show success state
  }
});

// Accordion
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const content = trigger.nextElementSibling;
    const icon = trigger.querySelector('.accordion-icon');
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
  });
});

// Modal
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  document.body.style.overflow = '';
}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
PART 2: CONTEXTUAL INTELLIGENCE - UNDERSTANDING USER INTENT
═══════════════════════════════════════════════════════════════════════════════

### INTENT OVER LITERAL WORDS
Always understand what the user MEANS, not just what they SAY:
- "Add video background" = REPLACE current hero imagery with video (not layer on top)
- "Add a booking feature" = Full booking flow with date/time selection and form
- "Make it interactive" = Add hover effects, animations, functional JS
- "Make it better" = Improve design, UX, functionality - use your expert judgment
- "Different option" = They don't like it, give something COMPLETELY different
- "Add testimonials" = Section with multiple testimonials, proper layout, maybe carousel
- "Add a gallery" = Grid of images, maybe lightbox functionality
- "Make it work" = Add all necessary JavaScript for full functionality

### COMPLEXITY RECOGNITION
Recognize when something is simple vs complex:

SIMPLE (quick edit):
- Change color → Update color value
- Change text → Replace text content
- Make bigger → Adjust size values

MODERATE (some planning):
- Add a section → Design + content + responsive layout
- Add a form → Inputs + validation + states
- Change layout → Restructure HTML + update CSS

COMPLEX (full architecture):
- Add booking system → Calendar + time slots + form + confirmation + states
- Add user dashboard → Layout + multiple components + navigation + data display
- Add e-commerce cart → Product display + add to cart + cart UI + checkout flow
- Add interactive map → Map embed + markers + info windows + responsive sizing

### BUSINESS CONTEXT AWARENESS
Understand what makes sense for each business type:

**Service Businesses (HVAC, Plumbing, Electrical, etc.):**
- Hero: Emergency availability, trust badges, phone CTA
- Sections: Services offered, service areas, about/experience
- Trust: Licenses, insurance, years in business, reviews
- CTAs: Call now, Get quote, Schedule service
- Images: Technicians at work, equipment, happy customers, trucks

**Restaurants/Food:**
- Hero: Food imagery or ambiance, reservation CTA
- Sections: Menu highlights, about chef/story, location/hours
- Features: Online ordering, reservations, delivery info
- Images: Dishes, interior, chef, ingredients

**Professional Services (Lawyers, Accountants, Consultants):**
- Hero: Professional, trustworthy, clear value proposition
- Sections: Practice areas/services, team, case results/testimonials
- Trust: Credentials, awards, associations
- CTAs: Free consultation, Contact us
- Images: Professional headshots, office, meeting scenes

**Fitness/Wellness:**
- Hero: Energetic, motivational, results-focused
- Sections: Classes/services, trainers, pricing/membership, schedule
- Features: Class booking, membership signup
- Images: People working out, equipment, transformations

**SaaS/Tech:**
- Hero: Product screenshot/demo, clear value prop, signup CTA
- Sections: Features, how it works, pricing, testimonials
- Features: Demo video, feature comparisons, integrations
- Images: Product UI, team, abstract tech visuals

═══════════════════════════════════════════════════════════════════════════════
PART 3: QUALITY STANDARDS - YOUR OUTPUT MUST BE EXCELLENT
═══════════════════════════════════════════════════════════════════════════════

### VISUAL DESIGN RULES
- ONE hero focal point (either image OR video, never both competing)
- Consistent spacing (use Tailwind's spacing scale consistently)
- Clear visual hierarchy (size, weight, color for importance)
- Proper contrast (text must be readable over ANY background)
- Mobile-first responsive design
- Smooth animations/transitions (not jarring)

### CODE QUALITY RULES
- Semantic HTML structure
- Consistent class naming
- No inline styles (use Tailwind)
- Properly nested elements
- Accessible (ARIA labels, alt text, focus states)
- No dead code or unused elements

### IMAGE RELEVANCE RULES
- EVERY image must match the business type
- HVAC → AC units, technicians, homes (NEVER headphones, random objects)
- If an image doesn't fit → Use gradient/solid color instead
- Hero image should INSTANTLY communicate what the business does

### SMART REPLACEMENT RULES
- Adding video to hero = REMOVE existing hero image entirely
- Changing hero image = REPLACE, don't add alongside
- New background = OLD background goes away completely
- "Another option" = Completely different approach, not minor tweak

═══════════════════════════════════════════════════════════════════════════════
PART 4: FEATURES LIBRARY - IMPLEMENTATIONS YOU CAN USE
═══════════════════════════════════════════════════════════════════════════════

### AOS (ANIMATE ON SCROLL)
Add these to <head>:
\`\`\`html
<link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
\`\`\`
Add before </body>:
\`\`\`html
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
<script>AOS.init({ duration: 800, once: true });</script>
\`\`\`
Usage on elements:
- data-aos="fade-up" (most common, elements slide up)
- data-aos="fade-down" 
- data-aos="fade-left" / data-aos="fade-right"
- data-aos="zoom-in" / data-aos="zoom-out"
- data-aos="flip-up" / data-aos="flip-left"
- data-aos-delay="100" (stagger animations)
Best practices: Use fade-up for sections, stagger cards with delays (0, 100, 200, 300)

### TYPED.JS (TYPEWRITER EFFECT)
Add before </body>:
\`\`\`html
<script src="https://unpkg.com/typed.js@2.1.0/dist/typed.umd.js"></script>
\`\`\`
Usage:
\`\`\`html
<span id="typed-text"></span>
<script>
new Typed('#typed-text', {
  strings: ['websites', 'apps', 'dreams', 'businesses'],
  typeSpeed: 50,
  backSpeed: 30,
  backDelay: 2000,
  loop: true
});
</script>
\`\`\`
Great for: Hero headlines showing multiple services/benefits

### CONFETTI CELEBRATION
Add before </body>:
\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
\`\`\`
Trigger on form success:
\`\`\`javascript
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 }
});
\`\`\`

### LOTTIE ANIMATIONS
Add before </body>:
\`\`\`html
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
\`\`\`
Usage:
\`\`\`html
<lottie-player src="https://lottie.host/ANIMATION_ID/file.json" background="transparent" speed="1" style="width: 300px; height: 300px;" loop autoplay></lottie-player>
\`\`\`
Common Lottie URLs for different purposes:
- Loading: https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.json
- Success checkmark: https://lottie.host/0f0c3c3a-7a57-40c9-8b7b-3e7a83f0f7c2/success.json
- Scroll down arrow: https://lottie.host/scroll-down.json

### LEAFLET MAPS (NO API KEY NEEDED)
Add to <head>:
\`\`\`html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
\`\`\`
Add before </body>:
\`\`\`html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
\`\`\`
Usage:
\`\`\`html
<div id="map" class="h-96 w-full rounded-lg"></div>
<script>
const map = L.map('map').setView([34.0522, -118.2437], 13); // LA coordinates
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
L.marker([34.0522, -118.2437]).addTo(map)
  .bindPopup('Our Location')
  .openPopup();
</script>
\`\`\`

### WEB3FORMS (WORKING CONTACT FORMS)
Form must include the access key:
\`\`\`html
<form action="https://api.web3forms.com/submit" method="POST" id="contact-form">
  <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE">
  <input type="hidden" name="subject" value="New Contact Form Submission">
  <input type="hidden" name="redirect" value="https://web3forms.com/success">
  
  <input type="text" name="name" required placeholder="Your Name" class="...">
  <input type="email" name="email" required placeholder="Your Email" class="...">
  <textarea name="message" required placeholder="Your Message" class="..."></textarea>
  <button type="submit">Send Message</button>
</form>
\`\`\`
With JavaScript validation and confetti:
\`\`\`javascript
document.getElementById('contact-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form)
    });
    if (response.ok) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      form.innerHTML = '<div class="text-center py-8"><h3 class="text-2xl font-bold text-green-500">Thank You!</h3><p class="text-gray-400 mt-2">We\\'ll get back to you soon.</p></div>';
    }
  } catch (error) {
    submitBtn.textContent = 'Error - Try Again';
    setTimeout(() => { submitBtn.textContent = originalText; submitBtn.disabled = false; }, 2000);
  }
});
\`\`\`

### DARK/LIGHT MODE TOGGLE
Add toggle button in nav:
\`\`\`html
<button id="theme-toggle" class="p-2 rounded-lg hover:bg-gray-700 transition-colors">
  <svg id="sun-icon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
  </svg>
  <svg id="moon-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
  </svg>
</button>
\`\`\`
JavaScript:
\`\`\`javascript
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

// Check saved preference or system preference
if (localStorage.theme === 'light' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
  html.classList.remove('dark');
  sunIcon.classList.add('hidden');
  moonIcon.classList.remove('hidden');
} else {
  html.classList.add('dark');
  sunIcon.classList.remove('hidden');
  moonIcon.classList.add('hidden');
}

themeToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.theme = isDark ? 'dark' : 'light';
  sunIcon.classList.toggle('hidden', !isDark);
  moonIcon.classList.toggle('hidden', isDark);
});
\`\`\`
CSS classes needed: Use Tailwind dark: prefix (dark:bg-white dark:text-gray-900)

### PWA SUPPORT (INSTALLABLE APP)
Add to <head>:
\`\`\`html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1f2937">
<link rel="apple-touch-icon" href="/icon-192.png">
\`\`\`
manifest.json content:
\`\`\`json
{
  "name": "Business Name",
  "short_name": "Business",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#1f2937",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`

### TAWK.TO LIVE CHAT
Add before </body> (user provides their widget code):
\`\`\`html
<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>
<!--End of Tawk.to Script-->
\`\`\`

### WHEN TO USE EACH FEATURE:
- AOS: ALWAYS add to every website for premium feel
- Typed.js: When hero has multiple value props or services to highlight
- Confetti: On form submission success
- Lottie: For loading states, empty states, or decorative animations
- Leaflet Maps: For local businesses with physical locations
- Web3Forms: When user wants working contact form
- Dark/Light: When user requests or for modern sites
- PWA: When user wants installable app
- Tawk.to: When user wants live chat support
`;

// For simple edits
const EDIT_PROMPT = `${AI_BRAIN_CORE}

## YOUR TASK: Make the requested edit

ENGINEERING APPROACH:
1. Understand the TRUE intent behind the request
2. Identify ALL components that need to change for consistency
3. Consider the ripple effects on the rest of the design
4. Implement thoughtfully, not just literally

Make the change. Say "Done!" then output complete HTML.`;

// For new prototypes
const PROTOTYPE_PROMPT = `${AI_BRAIN_CORE}

## YOUR TASK: Create a website prototype

ENGINEERING APPROACH:
1. Identify the SPECIFIC business type and its needs
2. Determine the right sections and components
3. Choose appropriate imagery, tone, and messaging
4. Build with proper structure and functionality in mind

REQUIRED SECTIONS:
- Navigation (with mobile menu)
- Hero (with strong, relevant imagery and CTAs)
- Features/Services (what they offer)
- About/Trust (why choose them)
- Testimonials (social proof)
- Contact (form + info)
- Footer (links + info)

Use Tailwind CDN, dark theme, modern design.
Output: brief intro, then complete HTML.`;

// For template customization
const TEMPLATE_PROMPT = `${AI_BRAIN_CORE}

## YOUR TASK: Customize this template for a specific business

CUSTOMIZATION REQUIREMENTS:
1. Replace ALL placeholder text with business-specific content
2. Verify EVERY image is relevant to this exact business type
3. Use industry-specific terminology and services
4. Adjust any elements that don't fit the business

IMAGERY VALIDATION - For each image ask:
- "Would a real [business type] website use this image?"
- "Does this image help visitors understand what the business does?"
- "Is this image relevant or just generic stock?"

If ANY image fails these checks → Replace with gradient or remove entirely

Keep existing code structure. Output: brief intro, then complete HTML.`;

// For edits that need confirmation
const EDIT_WITH_CONFIRM_PROMPT = `${AI_BRAIN_CORE}

## YOUR TASK: Make a complex edit with confirmation

First, briefly confirm what you'll do AND what related changes you'll make for consistency.
Example: "Adding testimonials section. I'll also adjust spacing and ensure it matches the site's style..."

Then output the complete updated HTML.`;

// For production-ready builds
const PRODUCTION_PROMPT = `${AI_BRAIN_CORE}

## YOUR TASK: Make this website production-ready

FUNCTIONALITY TO ADD:
- Form validation with clear success/error messages
- Mobile menu toggle (hamburger → X, show/hide menu)
- Smooth scroll navigation to sections
- All buttons have appropriate click handlers
- Phone numbers: tel: links, Emails: mailto: links
- Hover states on all interactive elements
- ARIA labels for accessibility
- Loading states where appropriate

QUALITY CHECKS:
- All links work or have placeholders
- Forms have proper validation feedback
- Mobile experience is smooth
- No console errors

Output: brief confirmation, then complete functional HTML.`;

// For planning discussions
const PLAN_PROMPT = `${AI_BRAIN_CORE}

## YOUR TASK: Help plan the website

Be a thoughtful collaborator:
- Ask clarifying questions about their business
- Suggest relevant features for their industry
- Consider their target audience
- Think about conversion goals

Be concise and helpful. Don't output code unless specifically asked.`;

// For acknowledging what user asked before building
const ACKNOWLEDGE_PROMPT = `You are Buildr, an expert AI website builder. The user just told you what they want.

Your job:
1. Show you UNDERSTAND their request (paraphrase it back)
2. Mention 1-2 specific things you'll include that are relevant to their business
3. Express enthusiasm about building it
4. End with "Building now..." or similar

Be conversational and warm. 2-3 sentences max. One emoji max.

DO NOT output any code.`;

// For summarizing what was built
const SUMMARY_PROMPT = `You are Buildr, an expert AI website builder. You just finished building.

Summarize conversationally:
1. Confirm completion
2. Highlight 2-3 specific features you included
3. Mention any special touches relevant to their business type
4. Suggest what they might want to customize next

Be warm and helpful. Keep it concise. One emoji max.

DO NOT output any code.`;

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
    const { messages, mode, isFollowUp, templateCategory, isPlanMode, isProductionMode, premiumMode, currentCode, features } = await request.json();

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
    
    // Special mode for acknowledging edits (conversational response before implementing)
    if (mode === "acknowledge_edit") {
      const userRequest = messages[messages.length - 1]?.content || "";
      
      const response = await anthropic.messages.create({
        model: MODELS.haiku,
        max_tokens: 150,
        system: `You are Buildr, a friendly AI website builder. The user wants to make changes to their website.

Your job is to briefly acknowledge what they asked for and confirm you're about to do it. Be conversational and warm.

Examples:
- "Got it! I'll add a testimonials section right away..."
- "Sure thing! Changing the header to blue now..."
- "Great idea! Let me add that pricing table for you..."
- "On it! I'll update the hero section with a video background..."

Keep it to 1-2 SHORT sentences max. Be concise but friendly. Use 1 emoji max.

DO NOT output any code. Just acknowledge the request briefly.`,
        messages: [{ role: "user", content: `User wants: ${userRequest}` }]
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
    
    console.log(`[Buildr] Type: ${requestType}, Model: selecting..., HasCode: ${!!currentCode}, Features: ${features ? JSON.stringify(features) : 'none'}`);
    
    // Generate feature instructions based on selected features
    const generateFeatureInstructions = (feats: typeof features): string => {
      if (!feats) return '';
      
      const instructions: string[] = [];
      
      if (feats.aos) {
        instructions.push(`
## AOS SCROLL ANIMATIONS (REQUIRED)
Add to <head>: <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
Add before </body>: 
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
<script>AOS.init({ duration: 800, once: true });</script>

Add these attributes to sections and cards:
- Sections: data-aos="fade-up"
- Cards in grid: data-aos="fade-up" with data-aos-delay="0", "100", "200", "300" for staggered effect
- Images: data-aos="zoom-in"
`);
      }
      
      if (feats.darkMode) {
        instructions.push(`
## DARK/LIGHT MODE TOGGLE (REQUIRED)
Add toggle button in navigation:
<button id="theme-toggle" class="p-2 rounded-lg hover:bg-gray-700">
  <svg id="sun-icon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
  <svg id="moon-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
</button>

Add theme toggle script before </body>:
<script>
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');
if (localStorage.theme === 'light') { html.classList.remove('dark'); sunIcon.classList.add('hidden'); moonIcon.classList.remove('hidden'); }
themeToggle?.addEventListener('click', () => {
  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.theme = isDark ? 'dark' : 'light';
  sunIcon?.classList.toggle('hidden', !isDark);
  moonIcon?.classList.toggle('hidden', isDark);
});
</script>

Use dark: prefixes on elements: dark:bg-white dark:text-gray-900
`);
      }
      
      if (feats.typedJs) {
        instructions.push(`
## TYPED.JS TYPEWRITER EFFECT (REQUIRED)
Add before </body>: <script src="https://unpkg.com/typed.js@2.1.0/dist/typed.umd.js"></script>

In the hero headline, add a span for typed text:
<h1>We build <span id="typed-text" class="text-purple-500"></span></h1>

Initialize Typed.js:
<script>
new Typed('#typed-text', {
  strings: ['websites', 'brands', 'experiences', 'success'],
  typeSpeed: 50,
  backSpeed: 30,
  backDelay: 2000,
  loop: true
});
</script>
`);
      }
      
      if (feats.confetti) {
        instructions.push(`
## CONFETTI CELEBRATION (REQUIRED)
Add before </body>: <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>

Trigger confetti on form success - include in form submit handler:
confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
`);
      }
      
      if (feats.lottie) {
        instructions.push(`
## LOTTIE ANIMATIONS (REQUIRED)
Add before </body>: <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>

Use for loading states or decorative elements:
<lottie-player src="https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.json" background="transparent" speed="1" style="width: 200px; height: 200px;" loop autoplay></lottie-player>
`);
      }
      
      if (feats.leafletMap) {
        instructions.push(`
## LEAFLET INTERACTIVE MAP (REQUIRED)
Add to <head>: <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
Add before </body>: <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

Add map container in contact section:
<div id="map" class="h-96 w-full rounded-lg mt-8"></div>

Initialize map (use approximate business location or default to LA):
<script>
const map = L.map('map').setView([34.0522, -118.2437], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);
L.marker([34.0522, -118.2437]).addTo(map).bindPopup('Our Location').openPopup();
</script>
`);
      }
      
      if (feats.web3forms) {
        instructions.push(`
## WEB3FORMS WORKING CONTACT FORM (REQUIRED)
Make the contact form functional with Web3Forms:
<form action="https://api.web3forms.com/submit" method="POST" id="contact-form">
  <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE">
  <input type="hidden" name="subject" value="New Contact Form Submission">
  <!-- Add your form fields with name attributes -->
</form>

Add form handling script with confetti on success:
<script>
document.getElementById('contact-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = this.querySelector('button[type="submit"]');
  btn.textContent = 'Sending...';
  btn.disabled = true;
  try {
    const res = await fetch(this.action, { method: 'POST', body: new FormData(this) });
    if (res.ok) {
      if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      this.innerHTML = '<div class="text-center py-8"><h3 class="text-2xl font-bold text-green-500">Thank You!</h3><p class="text-gray-400 mt-2">We\\'ll get back to you soon.</p></div>';
    }
  } catch(err) { btn.textContent = 'Error - Try Again'; btn.disabled = false; }
});
</script>
`);
      }
      
      if (feats.tawkTo) {
        instructions.push(`
## TAWK.TO LIVE CHAT WIDGET (REQUIRED)
Add placeholder for Tawk.to before </body> - user will replace with their widget code:
<!--Start of Tawk.to Script - Replace YOUR_PROPERTY_ID and YOUR_WIDGET_ID with your Tawk.to credentials-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/YOUR_PROPERTY_ID/YOUR_WIDGET_ID';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>
<!--End of Tawk.to Script-->
`);
      }
      
      if (feats.pwa) {
        instructions.push(`
## PWA SUPPORT (REQUIRED)
Add to <head>:
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1f2937">
<link rel="apple-touch-icon" href="/icon-192.png">
`);
      }
      
      return instructions.length > 0 ? `\n\n═══════════════════════════════════════
SPECIAL FEATURES TO INCLUDE
═══════════════════════════════════════
${instructions.join('\n')}` : '';
    };
    
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
          ? `${AI_BRAIN_CORE}

## YOUR TASK: Replace images with new relevant ones

NEW IMAGES FOR ${businessContext.toUpperCase()}:
${newImageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}

DEEP UNDERSTANDING - What the user wants:
When someone asks for "different images" or "another option", they:
✅ Want COMPLETELY different imagery throughout
✅ Are not satisfied with the current look
✅ Want fresh, relevant visuals for their business
❌ Do NOT want the old images mixed with new
❌ Do NOT want irrelevant images

BEFORE USING ANY IMAGE, VERIFY:
1. "Does this image make sense for a ${businessContext} business?"
2. "Would a real ${businessContext} company use this on their website?"
3. "Does this help visitors understand what the business does?"

If an image shows something unrelated to ${businessContext}:
→ DO NOT USE IT
→ Use a gradient or solid color background instead

Replace images throughout the site (hero, features, about, etc).
Keep all text and structure. Say "Done! Updated images." then output complete HTML.`
          : `The user wants different images. Replace current images with ones relevant to the business type. If unsure of relevance, use gradients instead of random stock photos. Say "Done!" then output the complete HTML.`;
        
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
          ? `${AI_BRAIN_CORE}

## YOUR TASK: Add video background to hero section

VIDEO PROVIDED:
- URL: ${videoUrls[0].url}
- Poster: ${videoUrls[0].poster}

DEEP UNDERSTANDING - What the user ACTUALLY wants:
When someone says "add video to hero" or "video background", they want:
✅ The video to BE the hero visual
✅ A cinematic, immersive hero experience
✅ The old static image GONE completely
❌ NOT video playing alongside the existing image
❌ NOT two visual elements competing for attention
❌ NOT a cluttered hero section

TRANSFORMATION REQUIRED:
1. LOCATE the hero section and understand its current structure
2. IDENTIFY and REMOVE all existing hero imagery:
   - Any <img> tags in the hero
   - Any background-image CSS
   - Any decorative image containers
3. RESTRUCTURE the hero:
   - Make hero section: position: relative, overflow: hidden
   - Add video: position absolute, inset-0, w-full h-full, object-cover
   - Add overlay: position absolute, inset-0, bg-black/50 or bg-gradient
   - Wrap content: position relative, z-10
4. KEEP all text, buttons, badges, trust indicators - just remove imagery

FINAL STRUCTURE:
<section class="relative min-h-screen overflow-hidden">
  <!-- Video Background -->
  <video autoplay muted loop playsinline class="absolute inset-0 w-full h-full object-cover">
    <source src="${videoUrls[0].url}" type="video/mp4">
  </video>
  <!-- Dark Overlay -->
  <div class="absolute inset-0 bg-black/50"></div>
  <!-- Content (on top) -->
  <div class="relative z-10">
    [All the text, buttons, etc]
  </div>
</section>

VERIFY BEFORE OUTPUT:
- Is there ONLY the video as the hero visual? (no images)
- Is the text readable over the video?
- Does it look professional and intentional?

Say "Done! Added video background." then output complete HTML.`
          : `Add a video background to the hero section. The video should REPLACE any existing hero imagery. Use a gradient placeholder and suggest the user provides a video URL. Say "Done!" then output the complete HTML.`;
        
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
        
        // Check if user wants AI-generated images
        const wantsAiImages = features?.aiImages === true;
        
        // Fetch relevant images for the build
        const searchTerms = getImageSearchTerms(userPrompt);
        console.log(`[Buildr] Search terms for images: ${searchTerms.join(', ')}, AI Images: ${wantsAiImages}`);
        let imageUrls: string[] = [];
        let videoData: { url: string; poster: string }[] = [];
        
        try {
          // Fetch images - use AI generation if enabled, otherwise Unsplash
          if (wantsAiImages) {
            console.log(`[Buildr] Using AI image generation for: ${searchTerms[0]}`);
            imageUrls = await fetchReplicateImages(searchTerms[0], 3);
            
            // Fallback to Unsplash if AI generation fails
            if (imageUrls.length === 0) {
              console.log(`[Buildr] AI images failed, falling back to Unsplash`);
              imageUrls = await fetchUnsplashImages(searchTerms[0], 6);
            }
          } else {
            // Standard Unsplash images
            imageUrls = await fetchUnsplashImages(searchTerms[0], 6);
          }
          console.log(`[Buildr] Got ${imageUrls.length} image URLs (AI: ${wantsAiImages})`);
          
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
            
            // Extract business type for relevance check
            const businessType = searchTerms[0] || "business";
            
            // Add images to template customization with relevance check
            const imageSource = wantsAiImages ? "AI-GENERATED" : "STOCK";
            const imageContext = imageUrls.length > 0 
              ? `\n\n${imageSource} IMAGES FOR ${businessType.toUpperCase()} WEBSITE:
${imageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}

${wantsAiImages ? 'These are custom AI-generated images - they are perfectly relevant to your business!' : `CRITICAL: Before using ANY image, verify it's relevant to ${businessType}. 
- If an image shows something unrelated (wrong industry, random objects), DO NOT USE IT
- Use a solid color background or gradient instead of an irrelevant image
- Every image must make sense for a ${businessType} website`}`
              : '';
            
            // Add video for hero background (only if user selected video)
            const videoContext = videoData.length > 0
              ? `\n\nVIDEO BACKGROUND FOR HERO (${businessType}):
<video autoplay muted loop playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
  <source src="${videoData[0].url}" type="video/mp4">
</video>
Poster image: ${videoData[0].poster}
IMPORTANT: Add a dark overlay (bg-black/50) on top of the video for text readability. Make the hero section position: relative.
CRITICAL: If the video doesn't match ${businessType}, use a gradient background instead.`
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
            
            // Add feature instructions
            const featureContext = generateFeatureInstructions(features);
            
            console.log(`[Buildr] Using template with ${imageUrls.length} images, ${videoData.length} videos, font: ${fonts.heading}`);
            
            finalMessages = [{
              role: "user",
              content: `TEMPLATE:\n\`\`\`html\n${template}\n\`\`\`\n\nCUSTOMIZE FOR: ${userPrompt}${imageContext}${videoContext}${fontContext}${iconContext}${featureContext}`
            }];
            break;
          }
        }
        
        // Get fonts and icons for from-scratch builds
        const fonts = getFontForBusiness(userPrompt);
        const icons = getIconsForBusiness(userPrompt);
        
        // Extract business type for relevance instructions
        const businessType = searchTerms[0] || "business";
        
        // No template - generate from scratch with images, fonts, icons
        const imageSource = wantsAiImages ? "AI-GENERATED" : "STOCK";
        const imageInstructions = imageUrls.length > 0 
          ? `\n\n${imageSource} IMAGES FOR ${businessType.toUpperCase()} WEBSITE:
${imageUrls.map((url, i) => `- Image ${i + 1}: ${url}`).join('\n')}

${wantsAiImages ? 'These are custom AI-generated images specifically created for your business - use them confidently!' : `CRITICAL RELEVANCE CHECK: Before using ANY image, verify it matches ${businessType}.
- An HVAC site needs: HVAC units, technicians, AC systems, homes - NOT headphones or random objects
- A plumbing site needs: pipes, plumbers, bathrooms - NOT unrelated items
- If an image doesn't fit, use a solid color/gradient background instead
- EVERY image must be directly relevant to ${businessType}`}`
          : '';
        
        // Video instructions only if user selected video
        const videoInstructions = videoData.length > 0
          ? `\n\nVIDEO BACKGROUND FOR HERO (${businessType}):
<video autoplay muted loop playsinline class="absolute inset-0 w-full h-full object-cover -z-10">
  <source src="${videoData[0].url}" type="video/mp4">
</video>
Poster/fallback image: ${videoData[0].poster}
IMPORTANT: Add a dark overlay (bg-black/50) on top for text readability. Make the hero section position: relative.
CRITICAL: If video doesn't match ${businessType}, use a gradient background instead.`
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
        
        console.log(`[Buildr] Building from scratch with font: ${fonts.heading}, icons: ${icons.slice(0,3).join(', ')}, video: ${videoData.length > 0}, AI Images: ${wantsAiImages}`);
        
        // Add feature instructions based on selected features
        const featureInstructions = generateFeatureInstructions(features);
        
        systemPrompt = PROTOTYPE_PROMPT + imageInstructions + videoInstructions + fontInstructions + iconInstructions + featureInstructions;
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
