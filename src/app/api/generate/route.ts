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
  
  // Simple edit detection - these should be FAST
  const simpleEditPatterns = [
    /change.*(color|colour)/i,
    /make.*(bigger|smaller|larger|bolder|darker|lighter|brighter)/i,
    /change.*(text|title|heading|name|font)/i,
    /add.*(section|button|image|logo)/i,
    /remove|delete/i,
    /move|swap|replace/i,
    /update.*(phone|email|address|hours)/i,
  ];
  
  if (simpleEditPatterns.some(p => p.test(lower))) {
    return "edit";
  }
  
  // Default for follow-ups
  return "edit";
}

// ========== API HANDLER ==========

export async function POST(request: NextRequest) {
  try {
    const { messages, mode, isFollowUp, templateCategory, isPlanMode, isProductionMode, premiumMode } = await request.json();

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
    
    // ========== MODEL & PROMPT SELECTION ==========
    switch (requestType) {
      case "edit":
        // FAST: Simple edits use Haiku with minimal prompt
        systemPrompt = EDIT_PROMPT;
        model = MODELS.haiku;
        maxTokens = 16000;
        break;
        
      case "production":
        // QUALITY: Production uses Sonnet (or Opus if premium)
        systemPrompt = PRODUCTION_PROMPT;
        model = premiumMode ? MODELS.opus : MODELS.sonnet;
        maxTokens = 16000;
        break;
        
      case "plan":
        systemPrompt = PLAN_PROMPT;
        model = MODELS.haiku;
        maxTokens = 2000;
        break;
        
      case "prototype":
      default:
        // Check for template
        const detectedCategory = templateCategory || findTemplateCategory(userPrompt);
        
        if (detectedCategory && !isFollowUp) {
          const template = await loadTemplate(detectedCategory);
          if (template) {
            systemPrompt = TEMPLATE_PROMPT;
            model = MODELS.haiku;
            maxTokens = 16000;
            finalMessages = [{
              role: "user",
              content: `TEMPLATE:\n\`\`\`html\n${template}\n\`\`\`\n\nCUSTOMIZE FOR: ${userPrompt}`
            }];
            break;
          }
        }
        
        // No template - generate from scratch
        systemPrompt = PROTOTYPE_PROMPT;
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
