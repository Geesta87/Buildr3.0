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
    // Pick a random template variant for variety
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

const BASE_SYSTEM_PROMPT = `You are Buildr 3.0, an elite UI/UX designer creating websites that win design awards. Your designs look like they cost $100,000+ and follow 2025/2026 design trends.

## MODERN DESIGN TRENDS TO USE

### 1. BENTO GRID LAYOUTS
- Use modular card-based layouts inspired by Apple's bento style
- Cards with different sizes creating visual hierarchy
- Rounded corners (16-24px), subtle shadows, hover lift effects

### 2. GLASSMORPHISM & LIQUID GLASS
- Translucent cards with backdrop-filter: blur(20px)
- Semi-transparent backgrounds: rgba(255,255,255,0.05) on dark
- Subtle borders: 1px solid rgba(255,255,255,0.1)

### 3. BOLD TYPOGRAPHY
- MASSIVE headlines: 4rem-8rem (use clamp for responsiveness)
- Premium fonts via Google Fonts or Tailwind CDN
- Tight letter-spacing on headlines: -0.02em to -0.05em

### 4. RICH COLOR PALETTES
- Rich blacks: #0a0a0a, #0f0f0f, #111111 (NOT pure #000)
- Accent gradients and neon accents that pop

### 5. MICRO-INTERACTIONS
- Hover effects on EVERYTHING clickable
- Smooth transitions (0.3s ease)
- Cards lift on hover

### 6. VISUAL EFFECTS
- Gradient text: background-clip: text
- Glow effects with box-shadow
- Gradient backgrounds in hero sections

## CRITICAL RULES
- EVERY element should have hover states
- Mobile responsive 
- Use real placeholder images from Unsplash or keep existing images
- Generate a SINGLE HTML file with embedded CSS/JS`;

const TEMPLATE_SYSTEM_PROMPT = `You are Buildr 3.0, an elite UI/UX designer. You have been given a BASE TEMPLATE to customize.

## YOUR TASK
Customize the provided template based on the user's requirements. Keep the same high-quality structure and styling, but:

1. **Change the business name** to match the user's business
2. **Update all text content** (headlines, descriptions, service names, etc.)
3. **Adjust colors** if the user specified preferences (modify the Tailwind config or CSS variables)
4. **Update sections** based on what features the user wants
5. **Keep the same professional quality** - don't simplify or remove effects

## IMPORTANT RULES
- Keep the Tailwind CSS CDN approach - it works great
- Keep Material Symbols icons - they look professional  
- Keep the same layout structure - it's proven to convert
- Keep hover effects and animations
- Keep responsive design
- Update placeholder images if needed (use Unsplash URLs)

## OUTPUT FORMAT
1. Briefly say "Customizing your [type] website..."
2. Output the COMPLETE customized HTML in a code block
3. After code: "Your website is ready!"

Output the FULL HTML - do not truncate or summarize.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, mode, isFollowUp, templateCategory } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = BASE_SYSTEM_PROMPT;
    let finalMessages = messages;

    // Determine if we should use a template
    const userPrompt = messages[0]?.content || "";
    const detectedCategory = templateCategory || findTemplateCategory(userPrompt);
    
    if (mode === "questions") {
      systemPrompt = `You are a helpful assistant that generates clarifying questions for a website builder. 
When given a project description, analyze it and return ONLY a JSON array of 3-4 questions.
Each question should have: question (string), options (array of 4-6 choices), allowMultiple (boolean), hasOther (boolean).
Return ONLY the JSON array, no other text or markdown.`;
    } else if (isFollowUp) {
      systemPrompt = `You are Buildr 3.0, an elite UI/UX designer. The user has an existing website and wants changes.

When the user asks for changes:
1. Briefly confirm what you're doing (one short sentence)
2. Then output the COMPLETE updated HTML code

IMPORTANT: 
- Output the FULL code, not just the changed parts
- Keep all existing functionality unless asked to remove it
- Maintain the same design quality and style
- Keep Tailwind CSS and Material Symbols if present

Output format:
[Brief confirmation]

\`\`\`html
[Complete updated HTML code]
\`\`\`

Done!`;
    } else if (detectedCategory && !isFollowUp) {
      // Load template for new builds
      const template = await loadTemplate(detectedCategory);
      
      if (template) {
        systemPrompt = TEMPLATE_SYSTEM_PROMPT;
        
        // Prepend template to user message
        const originalMessage = finalMessages[0].content;
        finalMessages = [{
          role: "user",
          content: `## BASE TEMPLATE TO CUSTOMIZE

\`\`\`html
${template}
\`\`\`

## USER REQUIREMENTS

${originalMessage}

Please customize the template above based on these requirements. Output the complete customized HTML.`
        }];
      }
    }

    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-20250514",
      max_tokens: 32000, // Increased for full templates
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
    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
