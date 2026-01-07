import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// ============================================================================
// SYSTEMS DNA IMPORTS
// ============================================================================
import { SYSTEMS_DNA_CORE } from "@/lib/buildr-systems-dna-v2/systems-dna-core";
import { detectDomain, formatDomainKnowledge } from "@/lib/buildr-systems-dna-v2/domain-knowledge";
import { UI_PATTERNS } from "@/lib/buildr-systems-dna-v2/ui-patterns";
import { DATABASE_PATTERNS } from "@/lib/buildr-systems-dna-v2/database-patterns";
import { AUTH_PATTERNS } from "@/lib/buildr-systems-dna-v2/auth-patterns";
import { RESEARCH_PROMPT, shouldTriggerResearch } from "@/lib/buildr-systems-dna-v2/research-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ========== LOGGING SYSTEM ==========
interface LogEntry {
  timestamp: string;
  requestType: string;
  intent?: {
    action: string;
    target: string;
    confidence: number;
  };
  hasUploadedImages: boolean;
  duration?: number;
  success: boolean;
  validationPassed?: boolean;
  error?: string;
  userMessage?: string;
}

async function logRequest(entry: LogEntry): Promise<void> {
  console.log(`[Buildr Log] ${JSON.stringify(entry)}`);
  
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/buildr_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          ...entry,
          created_at: new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('[Buildr] Failed to log to Supabase:', e);
    }
  }
}

// ========== MODEL SELECTION ==========
const MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-20250514",
  opus: "claude-opus-4-20250514"
};

// ========== COMPLEXITY DETECTION ==========
type ComplexityLevel = "simple" | "moderate" | "complex";

interface ComplexityResult {
  level: ComplexityLevel;
  needsDatabase: boolean;
  needsAuth: boolean;
  needsResearch: boolean;
  signals: string[];
}

function detectComplexity(userMessage: string, domain: string | null): ComplexityResult {
  const lower = userMessage.toLowerCase();
  const signals: string[] = [];
  
  // Database signals
  const databaseSignals = [
    "dashboard", "admin", "crud", "database", "store data", "save", "track",
    "inventory", "orders", "users", "customers", "analytics", "reports",
    "booking system", "reservation system", "appointment", "schedule",
    "e-commerce", "shopping cart", "checkout", "payment",
    "crm", "management system", "portal", "multi-user"
  ];
  
  // Auth signals
  const authSignals = [
    "login", "sign up", "register", "authentication", "user account",
    "admin panel", "dashboard", "portal", "member", "subscription",
    "role", "permission", "private", "secure"
  ];
  
  // Complex app signals
  const complexSignals = [
    "saas", "platform", "app", "application", "system",
    "multi-tenant", "api", "integration", "real-time",
    "notification", "email", "sms", "payment processing"
  ];
  
  // Simple website signals
  const simpleSignals = [
    "landing page", "website", "homepage", "brochure",
    "portfolio", "about page", "contact page"
  ];
  
  const needsDatabase = databaseSignals.some(s => lower.includes(s));
  const needsAuth = authSignals.some(s => lower.includes(s));
  const isComplex = complexSignals.some(s => lower.includes(s));
  const isSimple = simpleSignals.some(s => lower.includes(s)) && !needsDatabase && !needsAuth;
  
  // Check if we need research (unknown domain)
  const needsResearch = shouldTriggerResearch(userMessage, domain);
  
  if (needsDatabase) signals.push("needs-database");
  if (needsAuth) signals.push("needs-auth");
  if (isComplex) signals.push("complex-app");
  if (needsResearch) signals.push("needs-research");
  
  let level: ComplexityLevel = "moderate";
  if (isSimple) level = "simple";
  if (isComplex || (needsDatabase && needsAuth)) level = "complex";
  
  return { level, needsDatabase, needsAuth, needsResearch, signals };
}

// ========== SMART QUESTIONS ==========
interface SmartQuestion {
  id: string;
  question: string;
  options: string[];
  required: boolean;
  context: string;
}

function getSmartQuestions(
  userMessage: string, 
  domain: string | null, 
  complexity: ComplexityResult
): SmartQuestion[] {
  const questions: SmartQuestion[] = [];
  const lower = userMessage.toLowerCase();
  
  // Check what's already specified
  const hasBusinessName = /called|named|for my|for our|\bmy\b.*\b(business|company|shop|store|restaurant)\b/i.test(userMessage);
  const hasLocation = /\bin\b.*\b(city|state|town)|phoenix|austin|miami|nyc|la|sf|chicago/i.test(lower);
  const hasStyle = /modern|minimal|bold|elegant|dark|light|colorful|professional/i.test(lower);
  
  // Only ask what we DON'T know
  if (!hasBusinessName && complexity.level !== "simple") {
    questions.push({
      id: "business_name",
      question: "What's the name of your business?",
      options: [],
      required: true,
      context: "naming"
    });
  }
  
  // Domain-specific questions
  if (domain) {
    // Restaurant questions
    if (domain === "restaurant" && !lower.includes("menu")) {
      questions.push({
        id: "menu_style",
        question: "How should we display your menu?",
        options: [
          "Visual menu with photos",
          "Simple text menu with categories",
          "Interactive menu with filters",
          "PDF menu download"
        ],
        required: false,
        context: "menu"
      });
    }
    
    // Service business questions
    if (["plumbing", "electrical", "hvac", "cleaning", "landscaping", "roofing", "painting"].includes(domain)) {
      if (!lower.includes("emergency") && !lower.includes("24/7")) {
        questions.push({
          id: "availability",
          question: "Do you offer emergency/24-7 services?",
          options: ["Yes, 24/7 emergency service", "Business hours only", "Extended hours available"],
          required: false,
          context: "availability"
        });
      }
    }
    
    // Booking-related questions
    if (lower.includes("booking") || lower.includes("appointment") || lower.includes("reservation")) {
      questions.push({
        id: "booking_type",
        question: "How should booking work?",
        options: [
          "Contact form (you call them back)",
          "Simple date/time picker",
          "Full calendar with availability",
          "Integration with Calendly/Acuity"
        ],
        required: true,
        context: "booking"
      });
    }
    
    // Dog grooming specific
    if (domain === "dog_grooming") {
      if (!lower.includes("mobile") && !lower.includes("salon")) {
        questions.push({
          id: "service_type",
          question: "What type of grooming service?",
          options: ["Mobile grooming (we come to you)", "Salon-based", "Both mobile and salon"],
          required: false,
          context: "service_model"
        });
      }
    }
    
    // SaaS/Dashboard questions
    if (domain === "saas" || complexity.needsDatabase) {
      questions.push({
        id: "user_types",
        question: "Who will use this system?",
        options: [
          "Just me (admin only)",
          "Me + my team",
          "Me + customers",
          "Multiple user types with different permissions"
        ],
        required: true,
        context: "users"
      });
    }
  }
  
  // Complexity-based questions
  if (complexity.needsAuth && !lower.includes("login") && !lower.includes("sign")) {
    questions.push({
      id: "auth_type",
      question: "How should users log in?",
      options: [
        "Email + password",
        "Social login (Google, etc.)",
        "Magic link (email only)",
        "No login needed"
      ],
      required: false,
      context: "auth"
    });
  }
  
  // Limit to 2 questions max
  return questions.slice(0, 2);
}

// ========== PROMPT ASSEMBLY ==========
function assembleSystemPrompt(
  userMessage: string,
  domain: string | null,
  complexity: ComplexityResult,
  mediaInstructions: string,
  fontInstructions: string,
  iconInstructions: string,
  featureInstructions: string
): string {
  const parts: string[] = [];
  
  // 1. Always include core DNA
  parts.push(SYSTEMS_DNA_CORE);
  
  // 2. Add domain knowledge if detected
  if (domain) {
    const domainKnowledge = formatDomainKnowledge(domain);
    if (domainKnowledge) {
      parts.push(`\n\n═══════════════════════════════════════════════════════════════════════════════
DOMAIN KNOWLEDGE: ${domain.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
${domainKnowledge}`);
    }
  }
  
  // 3. Always add UI patterns for frontend
  parts.push(`\n\n${UI_PATTERNS}`);
  
  // 4. Add database patterns if needed
  if (complexity.needsDatabase) {
    parts.push(`\n\n${DATABASE_PATTERNS}`);
  }
  
  // 5. Add auth patterns if needed
  if (complexity.needsAuth) {
    parts.push(`\n\n${AUTH_PATTERNS}`);
  }
  
  // 6. Add media, font, icon, and feature instructions
  if (mediaInstructions) parts.push(mediaInstructions);
  if (fontInstructions) parts.push(fontInstructions);
  if (iconInstructions) parts.push(iconInstructions);
  if (featureInstructions) parts.push(featureInstructions);
  
  // 7. Add complexity-specific guidance
  parts.push(`\n\n═══════════════════════════════════════════════════════════════════════════════
BUILD COMPLEXITY: ${complexity.level.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════
${complexity.level === "simple" ? `
This is a SIMPLE build (landing page/brochure site):
- Focus on visual appeal and clear messaging
- Don't overcomplicate with unnecessary features
- Prioritize: Hero, Services/Features, About, Contact, Footer
- Make it look professional and conversion-focused` : 
complexity.level === "moderate" ? `
This is a MODERATE build (interactive site with some functionality):
- Include interactive elements (forms, modals, tabs)
- Consider the user journey and conversion flow
- Add appropriate JavaScript for functionality
- Balance aesthetics with usability` :
`This is a COMPLEX build (full application/system):
- Think in terms of complete systems, not just UI
- Consider all user types and their flows
- Include proper data management
- Build with scalability in mind
- Don't skip essential features that make it actually work`}

Detected signals: ${complexity.signals.join(", ") || "standard website"}`);

  return parts.join("\n");
}

// ========== GOOGLE FONTS MAPPING ==========
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
  "plumber": { heading: "Rubik", body: "Open Sans", style: "trustworthy, professional" },
  "electrician": { heading: "Exo 2", body: "Source Sans Pro", style: "technical, reliable" },
  "cleaning": { heading: "Quicksand", body: "Nunito Sans", style: "clean, fresh" },
  "lawyer": { heading: "Cormorant Garamond", body: "Libre Baskerville", style: "prestigious, traditional" },
  "medical": { heading: "Raleway", body: "Open Sans", style: "clean, trustworthy" },
  "spa": { heading: "Cormorant", body: "Lato", style: "serene, luxurious" },
  "default": { heading: "Inter", body: "Inter", style: "modern, versatile" }
};

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
  
  const defaultFonts = FONT_MAP["default"];
  return { 
    ...defaultFonts, 
    googleLink: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
  };
}

// ========== ICONIFY ICON MAPPING ==========
const ICON_MAP: Record<string, string[]> = {
  "restaurant": ["mdi:silverware-fork-knife", "mdi:chef-hat", "mdi:food", "mdi:glass-wine", "mdi:table-furniture", "mdi:clock-outline"],
  "coffee": ["mdi:coffee", "mdi:coffee-maker", "mdi:cup", "mdi:wifi", "mdi:cake-variant", "mdi:cookie"],
  "dog grooming": ["mdi:dog", "mdi:paw", "mdi:scissors-cutting", "mdi:bathtub", "mdi:hair-dryer", "mdi:heart"],
  "fitness": ["mdi:dumbbell", "mdi:run", "mdi:heart-pulse", "mdi:yoga", "mdi:timer", "mdi:trophy"],
  "agency": ["mdi:rocket-launch", "mdi:lightbulb", "mdi:chart-line", "mdi:palette", "mdi:target", "mdi:handshake"],
  "saas": ["mdi:cloud", "mdi:chart-areaspline", "mdi:cog", "mdi:shield-check", "mdi:api", "mdi:database"],
  "plumber": ["mdi:pipe", "mdi:water-pump", "mdi:wrench", "mdi:toilet", "mdi:shower", "mdi:water"],
  "electrician": ["mdi:flash", "mdi:power-plug", "mdi:lightbulb", "mdi:electric-switch", "mdi:meter-electric", "mdi:tools"],
  "cleaning": ["mdi:broom", "mdi:spray-bottle", "mdi:washing-machine", "mdi:sparkles", "mdi:home-heart", "mdi:check-circle"],
  "lawyer": ["mdi:scale-balance", "mdi:gavel", "mdi:briefcase", "mdi:file-document", "mdi:shield-account", "mdi:handshake"],
  "default": ["mdi:check-circle", "mdi:star", "mdi:clock", "mdi:phone", "mdi:email", "mdi:map-marker"]
};

function getIconsForBusiness(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  
  for (const [key, icons] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) {
      return icons;
    }
  }
  
  return ICON_MAP["default"];
}

// ========== FEATURE INSTRUCTIONS ==========
function generateFeatureInstructions(features: string[]): string {
  if (!features || features.length === 0) return "";
  
  const featureMap: Record<string, string> = {
    "animations": "Add AOS (Animate on Scroll) library and use fade-up, fade-in animations on sections",
    "darkMode": "Include dark/light mode toggle with localStorage persistence",
    "contactForm": "Add Web3Forms contact form with validation and success states",
    "maps": "Add Leaflet map showing business location",
    "chat": "Include Tawk.to live chat widget placeholder",
    "pwa": "Add PWA manifest and service worker for installability",
    "confetti": "Add confetti celebration on form submissions"
  };
  
  let instructions = "\n\n═══════════════════════════════════════════════════════════════════════════════\nREQUESTED FEATURES\n═══════════════════════════════════════════════════════════════════════════════\n";
  
  features.forEach(f => {
    if (featureMap[f]) {
      instructions += `• ${featureMap[f]}\n`;
    }
  });
  
  return instructions;
}

// ========== ACKNOWLEDGE PROMPT ==========
const ACKNOWLEDGE_PROMPT = `You are Buildr's friendly assistant. Acknowledge the user's request with enthusiasm and tell them what you're going to build.

RULES:
1. Be brief but specific - mention what you understand they want
2. List 3-5 key features you'll include (bullet points)
3. End with "Let me ask a few quick questions to customize this perfectly." OR "Building now..." if no questions needed
4. Keep it under 100 words total
5. Match their energy - professional for business sites, fun for creative projects

NEVER mention technical details like "Tailwind" or "React" - speak in user terms.

Example for "Build a dog grooming website":
"I'll create a professional dog grooming website with:
• Eye-catching hero with your services
• Service menu with pricing
• Online booking system
• Photo gallery of happy pups
• Customer testimonials
• Contact info and location

Building now..."`;

// ========== MAIN API HANDLER ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      messages, 
      currentCode, 
      mode = "build",
      hasUploadedImages,
      uploadedImages,
      wantsVideo,
      imageUrls,
      premiumMode,
      wantsAiImages,
      appType = "website",
      features = [],
      answers // User's answers to smart questions
    } = body;

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || "";
    
    // Detect domain and complexity using Systems DNA
    const domain = detectDomain(lastMessage);
    const complexity = detectComplexity(lastMessage, domain);
    
    console.log(`[Buildr DNA] Domain: ${domain}, Complexity: ${complexity.level}, Signals: ${complexity.signals.join(", ")}`);

    // ========== MODE: SMART QUESTIONS ==========
    if (mode === "smart-questions") {
      const questions = getSmartQuestions(lastMessage, domain, complexity);
      
      // If no questions needed, return empty array
      if (questions.length === 0) {
        return new Response(JSON.stringify({ questions: [], skipQuestions: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ questions, skipQuestions: false }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ========== MODE: ACKNOWLEDGE ==========
    if (mode === "acknowledge") {
      const ackStream = await anthropic.messages.stream({
        model: MODELS.haiku,
        max_tokens: 500,
        system: ACKNOWLEDGE_PROMPT,
        messages: [{ role: "user", content: lastMessage }]
      });
      
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          for await (const event of ackStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      });
      
      return new Response(readableStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }
      });
    }

    // ========== MODE: BUILD ==========
    // Get business type for fonts/icons
    const businessType = domain || "default";
    const fonts = getFontForBusiness(lastMessage);
    const icons = getIconsForBusiness(lastMessage);
    
    // Build media instructions
    let mediaInstructions = "";
    if (wantsVideo) {
      mediaInstructions = `\n\nVIDEO HERO: Use a looping background video in the hero section.`;
    } else if (hasUploadedImages && uploadedImages?.length > 0) {
      mediaInstructions = `\n\nUSER UPLOADED IMAGE: The user uploaded a custom image. Make it the star of the hero section with a dark overlay for text contrast.`;
    } else if (imageUrls?.length > 0) {
      mediaInstructions = `\n\nIMAGES PROVIDED:\n${imageUrls.map((url: string, i: number) => `- Image ${i + 1}: ${url}`).join('\n')}\n\nUse Image 1 for the hero. Others for features, about, etc.`;
    }
    
    const fontInstructions = `\n\nGOOGLE FONTS:
- Link: <link href="${fonts.googleLink}" rel="stylesheet">
- Headings: "${fonts.heading}" (font-family: '${fonts.heading}', sans-serif)
- Body: "${fonts.body}" (font-family: '${fonts.body}', sans-serif)
- Style: ${fonts.style}`;

    const iconInstructions = `\n\nICONIFY ICONS:
- Script: <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
- Usage: <span class="iconify" data-icon="ICON_NAME"></span>
- Recommended: ${icons.join(', ')}`;
    
    const featureInstructions = generateFeatureInstructions(features);
    
    // Append user answers to the message if provided
    let enrichedMessage = lastMessage;
    if (answers && Object.keys(answers).length > 0) {
      enrichedMessage += `\n\nUser's answers to questions:\n${Object.entries(answers).map(([q, a]) => `- ${q}: ${a}`).join('\n')}`;
    }

    // Assemble the system prompt using Systems DNA
    const systemPrompt = assembleSystemPrompt(
      enrichedMessage,
      domain,
      complexity,
      mediaInstructions,
      fontInstructions,
      iconInstructions,
      featureInstructions
    );
    
    // Select model based on complexity and premium mode
    let model = MODELS.haiku;
    if (premiumMode || complexity.level === "complex") {
      model = MODELS.sonnet;
    }
    
    const maxTokens = 16000;
    
    console.log(`[Buildr DNA] Building with model: ${model}, Domain: ${domain}, Complexity: ${complexity.level}`);

    const startTime = Date.now();

    // Prepare messages
    const finalMessages = currentCode 
      ? [{ role: "user", content: `Current code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nUser request: ${enrichedMessage}` }]
      : [{ role: "user", content: enrichedMessage }];

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: finalMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    let fullResponse = "";
    
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullResponse += event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`));
            }
          }
          
          const duration = Date.now() - startTime;
          await logRequest({
            timestamp: new Date().toISOString(),
            requestType: "build",
            hasUploadedImages: hasUploadedImages || false,
            duration,
            success: true,
            userMessage: lastMessage.substring(0, 100)
          });
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          
          await logRequest({
            timestamp: new Date().toISOString(),
            requestType: "build",
            hasUploadedImages: hasUploadedImages || false,
            duration: Date.now() - startTime,
            success: false,
            error: String(error),
            userMessage: lastMessage.substring(0, 100)
          });
          
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error) {
    console.error("API Error:", error);
    
    let errorMessage = "Something went wrong. Please try again.";
    let helpText = "";
    
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "API configuration error.";
        helpText = "Please check that your Anthropic API key is configured correctly.";
      } else if (error.message.includes("rate limit") || error.message.includes("429")) {
        errorMessage = "Too many requests.";
        helpText = "Please wait a moment and try again.";
      }
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      help: helpText,
      details: process.env.NODE_ENV === "development" ? String(error) : undefined
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
