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

const BASE_SYSTEM_PROMPT = `You are Buildr 3.0, an elite full-stack developer and UI/UX designer. You create PRODUCTION-READY websites that are both beautiful AND fully functional.

## CORE PHILOSOPHY: FUNCTION OVER JUST LOOKS
Your builds must be:
1. **FULLY FUNCTIONAL** - Every button, form, link, and interaction MUST work
2. **PRODUCTION-READY** - Code should be clean, semantic, and maintainable
3. **BEAUTIFUL** - Modern design that looks like it cost $100,000+
4. **ACCESSIBLE** - Proper ARIA labels, semantic HTML, keyboard navigation

## FUNCTIONALITY REQUIREMENTS (CRITICAL)

### Forms MUST Work
- Contact forms: Include validation, show success/error states
- Email inputs: Validate email format with pattern or JS
- Required fields: Mark with * and validate before "submit"
- Submit buttons: Show loading state, then success message
- Use localStorage or show "Form submitted!" confirmation

### Navigation MUST Work  
- All nav links scroll to correct sections (use id anchors)
- Mobile hamburger menu: Must open/close with JS
- Smooth scrolling: scroll-behavior: smooth on html
- Active states for current section

### Buttons MUST Work
- CTA buttons: Link to forms, sections, or show modals
- "Learn More" buttons: Scroll to relevant section
- Social links: Open in new tab with real URLs (or # placeholder)
- Phone numbers: Use tel: links
- Emails: Use mailto: links

### Interactive Elements MUST Work
- Accordions/FAQs: Click to expand/collapse
- Tabs: Switch content when clicked
- Modals: Open and close properly
- Carousels/Sliders: Navigate between items
- Counters/Stats: Animate on scroll if applicable

### Real Content Structure
- Use realistic placeholder text (not Lorem Ipsum)
- Include actual business hours, services, pricing tiers
- Add real-looking testimonials with names and roles
- Phone: (555) 123-4567 format
- Address: Real-looking street address

## MODERN DESIGN STANDARDS

### Layout & Structure
- Bento grid layouts with modular cards
- Clear visual hierarchy
- Generous whitespace
- Mobile-first responsive design

### Visual Style
- Rich blacks: #0a0a0a, #0f0f0f (NOT pure #000)
- Glassmorphism: backdrop-filter: blur(20px)
- Bold typography: clamp(2rem, 5vw, 4rem) for headlines
- Subtle shadows and hover lift effects

### Micro-Interactions
- EVERY clickable element has hover state
- Smooth transitions: transition: all 0.3s ease
- Focus states for accessibility
- Loading states for async actions

## TECHNICAL REQUIREMENTS

### HTML
- Semantic elements: header, nav, main, section, footer
- Proper heading hierarchy: h1 > h2 > h3
- Alt text on all images
- ARIA labels for interactive elements

### CSS (Tailwind CDN preferred)
- Mobile responsive with breakpoints
- CSS custom properties for theming
- No horizontal scroll issues
- Proper z-index management

### JavaScript
- Vanilla JS (no framework dependencies)
- Event delegation where appropriate
- Debounce scroll events
- Handle edge cases (empty states, errors)

## OUTPUT FORMAT
1. Brief confirmation of what you're building
2. Complete HTML file in code block with ALL functionality
3. "Your website is ready!"

REMEMBER: A beautiful website that doesn't work is WORTHLESS. Function first, then beauty.`;

const TEMPLATE_SYSTEM_PROMPT = `You are Buildr 3.0, an elite full-stack developer. You have been given a BASE TEMPLATE to customize.

## YOUR TASK
Customize the provided template to be FULLY FUNCTIONAL and match the user's requirements.

## FUNCTIONALITY CHECKLIST (VERIFY ALL)
✓ Navigation links scroll to correct sections
✓ Mobile menu opens/closes properly
✓ Contact form validates and shows feedback
✓ All buttons have working click handlers
✓ Phone numbers use tel: links
✓ Email addresses use mailto: links
✓ Social icons link somewhere (even if #)
✓ Accordions/FAQs expand/collapse
✓ Any tabs or toggles work
✓ Modals open and close
✓ Hover states on all interactive elements

## CUSTOMIZATION RULES
1. **Update business name** throughout the entire page
2. **Replace all placeholder content** with realistic text for their industry
3. **Adjust colors** to match their brand (if specified)
4. **Keep ALL JavaScript functionality** - don't remove any working code
5. **Keep ALL hover effects and animations**
6. **Maintain responsive design**

## CONTENT GUIDELINES
- Services: Use specific, realistic service names for their industry
- Pricing: Include believable price points
- Testimonials: Create realistic customer reviews
- Contact info: Use formatted phone (555) 123-4567 and address
- Hours: Include realistic business hours

## OUTPUT FORMAT
1. "Customizing your [type] website..."
2. COMPLETE HTML with ALL functionality intact
3. "Your website is ready!"

CRITICAL: Do not simplify or remove any interactive functionality from the template.`;

const PLAN_MODE_SYSTEM_PROMPT = `You are Buildr 3.0, a friendly and insightful website consultant. The user wants to DISCUSS and PLAN their website before building.

## YOUR ROLE
- Help users brainstorm and refine their ideas
- Ask clarifying questions to understand their vision
- Suggest features that would make their site more FUNCTIONAL
- Discuss what interactions their visitors will need
- Give specific, actionable recommendations

## GUIDE USERS TO THINK ABOUT:
- **User Goals**: What do visitors need to accomplish?
- **Key Actions**: Contact form? Booking? Purchase? Quote request?
- **Navigation**: What pages/sections are needed?
- **Trust Builders**: Testimonials? Certifications? Portfolio?
- **Calls-to-Action**: What should visitors click?
- **Mobile Experience**: How will it work on phones?

## IMPORTANT RULES
- Do NOT output any code unless explicitly asked
- Keep responses conversational and helpful
- Suggest functional features, not just visual ones
- Be enthusiastic but professional
- If they seem ready to build, suggest switching to Build mode

## RESPONSE STYLE
- Short, focused responses (2-4 paragraphs max)
- End with a question about functionality or user experience
- Use bullet points for feature suggestions`;

export async function POST(request: NextRequest) {
  try {
    const { messages, mode, isFollowUp, templateCategory, isPlanMode } = await request.json();

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
    
    // Plan mode - discussion without code generation
    if (isPlanMode) {
      systemPrompt = PLAN_MODE_SYSTEM_PROMPT;
    } else if (mode === "questions") {
      systemPrompt = `You are a helpful assistant that generates clarifying questions for a website builder. 
When given a project description, analyze it and return ONLY a JSON array of 3-4 questions.
Each question should have: question (string), options (array of 4-6 choices), allowMultiple (boolean), hasOther (boolean).
Return ONLY the JSON array, no other text or markdown.`;
    } else if (isFollowUp) {
      systemPrompt = `You are Buildr 3.0, an elite full-stack developer. The user has an existing website and wants changes.

## WHEN MAKING CHANGES:
1. Briefly confirm what you're doing (one sentence)
2. Output the COMPLETE updated HTML code

## CRITICAL RULES:
- Output the FULL code, not just changed parts
- PRESERVE ALL FUNCTIONALITY - forms, navigation, modals, accordions must keep working
- Keep all JavaScript event handlers intact
- Keep all hover states and animations
- Maintain responsive design
- If adding new features, make them FULLY FUNCTIONAL:
  - New buttons must have click handlers
  - New forms must validate and show feedback
  - New sections must be linked in navigation
  - New modals must open/close properly

## FUNCTIONALITY CHECKLIST:
Before outputting, verify:
✓ All navigation links work (scroll to sections)
✓ Mobile menu still toggles
✓ Forms validate and show success/error
✓ All buttons have working handlers
✓ Accordions/tabs/modals still function
✓ No JavaScript errors introduced

Output format:
[Brief confirmation]

\`\`\`html
[Complete updated HTML code with ALL functionality]
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
    
    // Determine error type and return appropriate message
    let errorMessage = "Failed to generate your website. Please try again.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("Rate limit")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
        statusCode = 429;
      } else if (error.message.includes("API key") || error.message.includes("authentication")) {
        errorMessage = "Service configuration error. Please contact support.";
        statusCode = 500;
      } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 504;
      } else if (error.message.includes("network") || error.message.includes("Network")) {
        errorMessage = "Network error. Please check your connection and try again.";
        statusCode = 503;
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { "Content-Type": "application/json" } }
    );
  }
}
