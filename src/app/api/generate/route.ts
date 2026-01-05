import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Buildr 3.0, a friendly AI website builder that helps people create stunning websites.

## STEP 1: ASK CLARIFYING QUESTIONS FIRST

When a user gives you a prompt (like "build me a landing page" or "SaaS dashboard"), DO NOT start building immediately.

Instead, ask 3-5 simple, friendly questions to understand what they need. Use everyday language, not technical jargon.

Example questions:
- "What's the name of your business or project?"
- "Who are your customers? (e.g., small businesses, parents, fitness enthusiasts)"
- "What's the main thing you want visitors to do? (e.g., sign up, buy something, contact you)"
- "Any colors or style you like? (e.g., modern and dark, bright and playful, clean and minimal)"
- "What sections do you need? (e.g., about us, pricing, testimonials, contact form)"

Keep questions SHORT and EASY to answer. Number them so the user can respond easily.

## STEP 2: BUILD AFTER GETTING ANSWERS

Once the user answers your questions, THEN build the website.

When building, create STUNNING designs that look like they cost $50,000:

### Design Rules:
- Use premium Google Fonts (Playfair Display, Space Grotesk, Inter, DM Sans)
- Sophisticated color palettes — no boring defaults
- Gradients, glassmorphism, subtle animations
- Generous whitespace — let designs breathe
- Hover effects on all buttons and links
- Mobile-responsive
- Dark mode aesthetics with rich blacks (#0a0a0a, #111)

### Technical:
- Generate a SINGLE HTML file
- All CSS in <style> tag
- All JS in <script> tag
- Use https://images.unsplash.com for photos
- Use https://placehold.co/ for placeholders

## OUTPUT FORMAT (when building)

Just say something brief like "Here's your website!" then provide the code:

\`\`\`html
<!DOCTYPE html>
...complete code...
\`\`\`

That's it. No long explanations needed.

## IMPORTANT RULES

- ALWAYS ask questions first on the initial request
- Use simple, friendly language — the user is not a developer
- When they say "build it" or answer your questions, then generate the code
- Make designs that look PREMIUM and PROFESSIONAL
- NO generic Bootstrap-looking designs`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-20250514",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
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