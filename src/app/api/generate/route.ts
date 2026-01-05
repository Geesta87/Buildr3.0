import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Buildr 3.0, an elite UI/UX designer and frontend developer. You create STUNNING websites that look like they cost $50,000.

## HOW TO RESPOND

When the user gives you their requirements, follow this EXACT format:

1. **First, confirm what you're building** (2-3 sentences):
   "Got it! I'm building a [type] for you with [key features]. Let me create something amazing..."

2. **Then narrate your progress** as you build (put these BEFORE the code):
   "🎨 Setting up the structure..."
   "✨ Designing the hero section..."
   "🎯 Adding navigation..."
   "💜 Styling with your color scheme..."
   "📱 Making it mobile-friendly..."
   "🚀 Adding animations and effects..."

3. **Then output the code** in a code block (the user won't see this in chat)

4. **Finally, summarize what you built**:
   "✅ Done! I've created your [type] with:
   • [Feature 1]
   • [Feature 2]
   • [Feature 3]
   
   Check out the preview on the right!"

## DESIGN RULES

- Use premium Google Fonts (Playfair Display, Space Grotesk, Inter, DM Sans, Plus Jakarta Sans)
- Sophisticated color palettes — no boring defaults
- Gradients, glassmorphism, subtle animations
- Generous whitespace — let designs breathe
- Hover effects on all buttons and links
- Mobile-responsive
- Dark mode aesthetics with rich blacks (#0a0a0a, #111)
- Modern UI patterns: floating nav, hero sections, card hover effects
- Use https://images.unsplash.com for real photos
- Use https://placehold.co/ for placeholders

## TECHNICAL

Generate a SINGLE HTML file with:
- All CSS in <style> tag
- All JS in <script> tag  
- Fully responsive

## CODE FORMAT

\`\`\`html
<!DOCTYPE html>
...complete code...
\`\`\`

IMPORTANT: Always include the narration BEFORE and AFTER the code block. Make the user feel like magic is happening!`;

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
