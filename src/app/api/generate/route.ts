// ============================================================================
// BUILDR v5 - CLEAN ARCHITECTURE
// ============================================================================
// Principles:
// 1. Simple routing - no AI classification step
// 2. Smart model - Sonnet for quality, Haiku only for trivial tasks
// 3. Minimal prompts - tell AI what to do, not 100 rules
// 4. Instant edits - no AI for simple changes
// 5. One code path - not 15 different cases
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// MODELS - Use the right model for the job
// ============================================================================

const MODELS = {
  smart: "claude-sonnet-4-20250514",   // For builds and complex edits
  fast: "claude-haiku-4-5-20251001",    // Only for trivial tasks
};

// ============================================================================
// INSTANT EDITS - No AI needed
// ============================================================================

interface Section {
  name: string;
  start: number;
  end: number;
}

function findAllSections(code: string): Section[] {
  const lines = code.split('\n');
  const sections: Section[] = [];
  
  const markers = [
    'hero', 'nav', 'header', 'about', 'services', 'features', 'pricing',
    'testimonials', 'team', 'trainers', 'classes', 'schedule', 'gallery',
    'faq', 'contact', 'cta', 'footer', 'membership', 'stats', 'benefits'
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    for (const marker of markers) {
      // Check for section markers
      if (line.includes(`id="${marker}"`) || 
          line.includes(`id='${marker}'`) ||
          line.includes(`<!-- ${marker}`) ||
          line.includes(`<!--${marker}`) ||
          (line.includes(`<section`) && line.includes(marker))) {
        
        // Find the closing tag
        let depth = 0;
        let end = i;
        const tagMatch = lines[i].match(/<(section|div|nav|header|footer|aside)/i);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : 'section';
        
        for (let j = i; j < lines.length; j++) {
          const opens = (lines[j].match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
          const closes = (lines[j].match(new RegExp(`</${tag}>`, 'gi')) || []).length;
          depth += opens - closes;
          
          if (j === i) depth = Math.max(depth, 1); // Ensure we count the opening
          
          if (depth <= 0) {
            end = j;
            break;
          }
          end = j;
        }
        
        sections.push({ name: marker, start: i, end });
        break;
      }
    }
  }
  
  return sections;
}

function instantDelete(code: string, target: string): { success: boolean; code?: string; message: string } {
  const sections = findAllSections(code);
  const targetLower = target.toLowerCase();
  
  // Find matching section
  const section = sections.find(s => 
    targetLower.includes(s.name) || s.name.includes(targetLower)
  );
  
  if (!section) {
    return { success: false, message: `Could not find "${target}" section` };
  }
  
  const lines = code.split('\n');
  const removed = section.end - section.start + 1;
  lines.splice(section.start, removed);
  
  return {
    success: true,
    code: lines.join('\n'),
    message: `Removed ${section.name} section (${removed} lines)`
  };
}

function instantHeadingResize(code: string, bigger: boolean): { success: boolean; code?: string; message: string } {
  const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl'];
  let changes = 0;
  let newCode = code;
  
  for (let i = 0; i < sizes.length; i++) {
    const current = sizes[i];
    const next = bigger ? sizes[Math.min(i + 1, sizes.length - 1)] : sizes[Math.max(i - 1, 0)];
    
    if (current !== next) {
      const regex = new RegExp(`(<h[1-6][^>]*class="[^"]*)(${current})`, 'gi');
      const beforeCount = (newCode.match(regex) || []).length;
      newCode = newCode.replace(regex, `$1${next}`);
      changes += beforeCount;
    }
  }
  
  if (changes === 0) {
    return { success: false, message: 'No headings found to resize' };
  }
  
  return {
    success: true,
    code: newCode,
    message: `Made ${changes} heading(s) ${bigger ? 'larger' : 'smaller'}`
  };
}

function tryInstantEdit(code: string, message: string): { handled: boolean; code?: string; response?: string } {
  const msg = message.toLowerCase();
  
  // REMOVE/DELETE
  const removeMatch = msg.match(/^(remove|delete)\s+(the\s+)?(.+?)\s*(section)?$/i);
  if (removeMatch) {
    const target = removeMatch[3];
    const result = instantDelete(code, target);
    if (result.success) {
      return { handled: true, code: result.code, response: result.message };
    }
  }
  
  // HEADINGS LARGER/SMALLER
  if (msg.match(/(make|headings?|titles?).*(larger|bigger)/i)) {
    const result = instantHeadingResize(code, true);
    if (result.success) {
      return { handled: true, code: result.code, response: result.message };
    }
  }
  
  if (msg.match(/(make|headings?|titles?).*(smaller)/i)) {
    const result = instantHeadingResize(code, false);
    if (result.success) {
      return { handled: true, code: result.code, response: result.message };
    }
  }
  
  return { handled: false };
}

// ============================================================================
// SIMPLE REQUEST TYPE DETECTION - No AI needed
// ============================================================================

type RequestType = 'build' | 'edit' | 'chat';

function detectRequestType(message: string, hasCode: boolean): RequestType {
  const msg = message.toLowerCase();
  
  // BUILD: Creating something new
  if (!hasCode && (
    msg.includes('build') || msg.includes('create') || msg.includes('make me') ||
    msg.includes('landing page') || msg.includes('website') || msg.includes('dashboard')
  )) {
    return 'build';
  }
  
  // CHAT: Questions, opinions
  if (msg.endsWith('?') || msg.startsWith('what') || msg.startsWith('how') || 
      msg.startsWith('should') || msg.startsWith('can you explain')) {
    return 'chat';
  }
  
  // EDIT: Everything else when we have code
  if (hasCode) {
    return 'edit';
  }
  
  return 'build';
}

// ============================================================================
// MINIMAL PROMPTS - Just tell the AI what to do
// ============================================================================

const BUILD_PROMPT = `You are Buildr, an expert web developer.

Create a complete, working HTML page with Tailwind CSS. 

Rules:
1. Single HTML file with all code
2. Tailwind CDN in <head>, config right after
3. Mobile responsive
4. Working interactions (menus, forms, etc.)
5. Professional design

Output format:
Brief acknowledgment → Complete HTML code → Brief confirmation`;

const EDIT_PROMPT = `You are Buildr. Make the requested edit.

Rules:
1. Output the COMPLETE updated HTML
2. Only change what was asked
3. Keep everything else exactly the same
4. Tailwind config stays in <head>

Output format:
Brief acknowledgment → Complete HTML code → Brief confirmation`;

const CHAT_PROMPT = `You are Buildr, an expert web developer. Answer the question helpfully and concisely. If they want to build something, offer to do it.`;

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, currentCode } = body;
    
    const userMessage = messages[messages.length - 1]?.content || "";
    const hasCode = !!currentCode && currentCode.length > 100;
    
    console.log(`[Buildr v5] Message: "${userMessage.substring(0, 50)}..." HasCode: ${hasCode}`);
    
    // ========================================
    // STEP 1: Try instant edit (no AI needed)
    // ========================================
    if (hasCode) {
      const instant = tryInstantEdit(currentCode, userMessage);
      
      if (instant.handled) {
        console.log(`[Buildr v5] INSTANT: ${instant.response}`);
        
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: instant.response })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ code: instant.code })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        });
        
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
        });
      }
    }
    
    // ========================================
    // STEP 2: Determine request type
    // ========================================
    const requestType = detectRequestType(userMessage, hasCode);
    console.log(`[Buildr v5] Type: ${requestType}`);
    
    // ========================================
    // STEP 3: Select model and prompt
    // ========================================
    let model: string;
    let systemPrompt: string;
    let maxTokens: number;
    
    switch (requestType) {
      case 'build':
        model = MODELS.smart;  // Use Sonnet for builds
        systemPrompt = BUILD_PROMPT;
        maxTokens = 16000;
        break;
        
      case 'edit':
        model = MODELS.smart;  // Use Sonnet for edits too - quality matters
        systemPrompt = EDIT_PROMPT;
        maxTokens = 16000;
        break;
        
      case 'chat':
        model = MODELS.fast;   // Haiku is fine for chat
        systemPrompt = CHAT_PROMPT;
        maxTokens = 2000;
        break;
        
      default:
        model = MODELS.smart;
        systemPrompt = BUILD_PROMPT;
        maxTokens = 16000;
    }
    
    // ========================================
    // STEP 4: Prepare messages
    // ========================================
    let apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content
    }));
    
    // Add current code to edit requests
    if (requestType === 'edit' && currentCode) {
      const lastIdx = apiMessages.length - 1;
      apiMessages[lastIdx] = {
        ...apiMessages[lastIdx],
        content: `${apiMessages[lastIdx].content}\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\``
      };
    }
    
    // ========================================
    // STEP 5: Call Claude and stream response
    // ========================================
    console.log(`[Buildr v5] Calling ${model}...`);
    const startTime = Date.now();
    
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
      stream: true
    });
    
    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";
        
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          }
        }
        
        // Extract code if present
        const codeMatch = fullResponse.match(/```html\n([\s\S]*?)```/);
        if (codeMatch) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ code: codeMatch[1] })}\n\n`));
        }
        
        const duration = Date.now() - startTime;
        console.log(`[Buildr v5] Done in ${duration}ms`);
        
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
    });
    
  } catch (error) {
    console.error("[Buildr v5] Error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
