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
  
  // Extract key nouns from the prompt for generic search
  const words = prompt.split(/\s+/).filter(w => w.length > 3);
  return words.slice(0, 3).map(w => `${w} business`);
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
  
  // Image replacement triggers
  if (/(better|real|new|replace|update|change).*(image|photo|picture)/i.test(lower) ||
      /(image|photo|picture).*(better|real|replace|update)/i.test(lower)) {
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
        // Fetch new images and replace existing ones
        const imgSearchTerms = getImageSearchTerms(userPrompt);
        let newImageUrls: string[] = [];
        
        try {
          newImageUrls = await fetchUnsplashImages(imgSearchTerms[0], 8);
        } catch (e) {
          console.error("Failed to fetch images:", e);
        }
        
        const imageReplacePrompt = newImageUrls.length > 0
          ? `Replace the placeholder/existing images with these high-quality Unsplash images:\n${newImageUrls.map((url, i) => `Image ${i + 1}: ${url}`).join('\n')}\n\nUse these URLs in img src and background-image properties. Keep all other content the same. Say "Done! Updated images." then output the complete HTML.`
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
        // Fetch relevant images for the build
        const searchTerms = getImageSearchTerms(userPrompt);
        console.log(`[Buildr] Search terms for images: ${searchTerms.join(', ')}`);
        let imageUrls: string[] = [];
        
        try {
          // Fetch images for the primary search term
          imageUrls = await fetchUnsplashImages(searchTerms[0], 6);
          console.log(`[Buildr] Got ${imageUrls.length} image URLs`);
        } catch (e) {
          console.error("Failed to fetch images:", e);
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
            
            console.log(`[Buildr] Using template with ${imageUrls.length} images, font: ${fonts.heading}`);
            
            finalMessages = [{
              role: "user",
              content: `TEMPLATE:\n\`\`\`html\n${template}\n\`\`\`\n\nCUSTOMIZE FOR: ${userPrompt}${imageContext}${fontContext}${iconContext}`
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
        
        console.log(`[Buildr] Building from scratch with font: ${fonts.heading}, icons: ${icons.slice(0,3).join(', ')}`);
        
        systemPrompt = PROTOTYPE_PROMPT + imageInstructions + fontInstructions + iconInstructions;
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
