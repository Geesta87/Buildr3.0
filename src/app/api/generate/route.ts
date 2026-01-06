import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Template mapping
const TEMPLATE_MAP: Record<string, string[]> = {
  "restaurant": ["restaurant", "cafe", "food", "dining", "menu", "bistro", "eatery", "grill", "bar", "bakery", "pizzeria", "sushi", "coffee"],
  "local-service": ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "cleaning", "landscaping", "roofing", "painting", "moving", "pest", "locksmith", "appliance", "garage", "pool", "carpet", "pressure wash", "junk removal", "tree service", "fencing", "flooring", "window", "gutter", "solar", "security"],
  "fitness": ["fitness", "gym", "yoga", "crossfit", "personal training", "trainer", "workout", "exercise", "pilates", "martial arts", "boxing", "mma", "dance studio", "spin", "cycling"],
  "agency": ["agency", "marketing", "digital agency", "creative agency", "advertising", "branding", "pr agency", "consulting", "seo", "social media", "web design agency", "design studio"],
  "saas": ["saas", "software", "app", "platform", "dashboard", "startup", "tech", "product", "tool", "analytics", "crm", "automation", "ai tool", "api"]
};

// Find template category based on prompt
function findTemplateCategory(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const [category, keywords] of Object.entries(TEMPLATE_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }
  return null;
}

// Load template file
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
    const template = await fs.readFile(templatePath, "utf-8");
    return template;
  } catch (error) {
    console.error("Error loading template:", error);
    return null;
  }
}

// ========== SMART PROMPT SYSTEM ==========

// PROTOTYPE MODE: Fast visual-first builds (~150 words)
const PROTOTYPE_PROMPT = `You are Buildr, a fast UI designer. Create a VISUAL PROTOTYPE.

FOCUS ON:
- Beautiful layout and design
- Modern aesthetic (dark theme, gradients, whitespace)
- Proper sections: hero, features, about, contact, footer
- Mobile responsive with Tailwind CDN
- Realistic placeholder content (not Lorem Ipsum)

KEEP SIMPLE:
- Basic nav links (href="#section")
- Simple form structure (no JS validation yet)
- Static content (functionality comes later)

OUTPUT: Brief intro line, then complete HTML in code block.`;

// TEMPLATE CUSTOMIZATION: When using a template (~100 words)
const TEMPLATE_PROMPT = `You are Buildr. Customize this template for the user's business.

DO:
- Replace business name, services, content
- Adjust colors if requested
- Keep existing structure and JS
- Use realistic content for their industry

OUTPUT: Brief intro, then complete customized HTML.`;

// SMALL EDIT: Minimal prompt for quick changes (~50 words)
const EDIT_PROMPT = `You are Buildr. Make the requested change to the website.

Rules:
- Output the COMPLETE updated HTML
- Keep all existing functionality
- Only change what was asked

Output: One sentence confirmation, then full HTML code block.`;

// PRODUCTION MODE: Full functionality (~300 words)
const PRODUCTION_PROMPT = `You are Buildr. Make this website PRODUCTION-READY with full functionality.

ADD/VERIFY:
✓ Form validation with success/error states
✓ Mobile menu toggle (hamburger opens/closes)
✓ Smooth scroll navigation
✓ All buttons have click handlers
✓ Phone numbers use tel: links
✓ Emails use mailto: links
✓ Accordions/FAQs expand/collapse
✓ Hover states on all interactive elements
✓ Loading states for forms
✓ ARIA labels for accessibility

TECHNICAL:
- Vanilla JS, no dependencies
- Semantic HTML (header, nav, main, section, footer)
- Error handling for forms
- Mobile responsive

OUTPUT: Brief confirmation of what you're adding, then complete HTML with ALL functionality.`;

// PLAN MODE: Discussion without code (~100 words)
const PLAN_PROMPT = `You are Buildr, a website consultant. Help the user plan their site.

- Ask clarifying questions
- Suggest features they might need
- Discuss layout and sections
- Be concise (2-3 paragraphs max)
- Do NOT output code unless asked
- End with a question`;

// ========== REQUEST TYPE DETECTION ==========

function detectRequestType(userMessage: string, isFollowUp: boolean, isPlanMode: boolean, isProductionMode: boolean): string {
  if (isPlanMode) return "plan";
  if (isProductionMode) return "production";
  if (!isFollowUp) return "prototype";
  
  const lower = userMessage.toLowerCase();
  
  // Production/finalize triggers
  if (lower.includes("make production") || 
      lower.includes("make it work") || 
      lower.includes("add functionality") ||
      lower.includes("finalize") ||
      lower.includes("make functional") ||
      lower.includes("production ready")) {
    return "production";
  }
  
  // Small edit patterns
  const smallEditPatterns = [
    /^(change|make|update|fix|add|remove|move|swap|replace|edit|adjust|tweak)/i,
    /color|font|size|spacing|padding|margin|text|button|image|logo|title|heading/i,
    /bigger|smaller|larger|bolder|lighter|darker|brighter/i
  ];
  
  const isSmallEdit = smallEditPatterns.some(pattern => pattern.test(lower)) && lower.length < 200;
  
  if (isSmallEdit) return "edit";
  
  // Default to prototype for follow-ups that aren't clearly edits
  return "prototype";
}

// ========== API HANDLER ==========

export async function POST(request: NextRequest) {
  try {
    const { messages, mode, isFollowUp, templateCategory, isPlanMode, isProductionMode } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = messages[0]?.content || "";
    const lastMessage = messages[messages.length - 1]?.content || userPrompt;
    
    // Detect request type
    const requestType = detectRequestType(lastMessage, isFollowUp, isPlanMode, isProductionMode);
    
    // Select appropriate prompt based on request type
    let systemPrompt: string;
    let finalMessages = messages;
    
    switch (requestType) {
      case "plan":
        systemPrompt = PLAN_PROMPT;
        break;
        
      case "production":
        systemPrompt = PRODUCTION_PROMPT;
        break;
        
      case "edit":
        systemPrompt = EDIT_PROMPT;
        break;
        
      case "prototype":
      default:
        // Check for template
        const detectedCategory = templateCategory || findTemplateCategory(userPrompt);
        
        if (detectedCategory && !isFollowUp) {
          const template = await loadTemplate(detectedCategory);
          
          if (template) {
            systemPrompt = TEMPLATE_PROMPT;
            const originalMessage = finalMessages[0].content;
            finalMessages = [{
              role: "user",
              content: `## TEMPLATE\n\n\`\`\`html\n${template}\n\`\`\`\n\n## CUSTOMIZE FOR:\n${originalMessage}`
            }];
          } else {
            systemPrompt = PROTOTYPE_PROMPT;
          }
        } else {
          systemPrompt = PROTOTYPE_PROMPT;
        }
        break;
    }
    
    // Handle questions mode separately
    if (mode === "questions") {
      systemPrompt = `Generate 3-4 clarifying questions as JSON array. Each: {question, options[], allowMultiple, hasOther}. Return ONLY JSON.`;
    }

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
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
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ content: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    
    let errorMessage = "Failed to generate. Please try again.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        errorMessage = "Too many requests. Please wait a moment.";
        statusCode = 429;
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 504;
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    );
  }
}
