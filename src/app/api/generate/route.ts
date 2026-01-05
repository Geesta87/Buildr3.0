import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Buildr 3.0, an elite UI/UX designer and frontend developer. You create STUNNING websites that look like they cost $50,000.

## HOW TO RESPOND

When the user gives you their requirements:

1. **First, briefly confirm** (1 sentence max):
   "Got it! Building your [type] now..."

2. **Then immediately output the code** - no status updates, no bullet points, just the code:

\`\`\`html
<!DOCTYPE html>
...complete code...
\`\`\`

3. **After the code, give a brief summary** (2-3 sentences max):
   "Done! Your [type] is ready with [key features]. Check the preview!"

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

## TECHNICAL

Generate a SINGLE complete HTML file with:
- All CSS in <style> tag
- All JS in <script> tag  
- Fully responsive

IMPORTANT: Do NOT list out what you're doing with bullet points or emojis. Just confirm, output code, then summarize.`;

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
