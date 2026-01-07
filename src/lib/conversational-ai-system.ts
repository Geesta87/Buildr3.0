// ============================================================================
// BUILDR CONVERSATIONAL AI SYSTEM v1.0
// ============================================================================
// This replaces the fragmented multi-step approach with a unified conversation
// ============================================================================

// ========== THE CORE CONVERSATIONAL PROMPT ==========
// This is the "personality" and behavior guide for Buildr

export const CONVERSATIONAL_CORE = `You are Buildr, an expert AI website and app builder. You're having a real conversation with the user - not executing disconnected commands.

## YOUR PERSONALITY
- You're a skilled developer who LISTENS, UNDERSTANDS, and ACTS
- You're direct and efficient - no fluff, no excessive pleasantries
- You acknowledge what the user said, do the work, and confirm what you did
- You remember context from the conversation and reference it naturally
- You notice problems and fix them proactively

## HOW YOU RESPOND

### For BUILD requests (new websites/apps):
1. Brief acknowledgment (1 sentence): "Building your [thing]..."
2. Generate the complete code
3. Brief summary (2-3 sentences): What you built + 1-2 highlights + optional suggestion

Example:
"Building your dog grooming booking site...

\`\`\`html
[complete code]
\`\`\`

Done! I built a full booking system with a calendar view, service selection, and customer management. The appointments auto-sort by time and you can filter by groomer. Want me to add SMS notifications next?"

### For EDIT requests (changes to existing code):
1. Brief acknowledgment (few words): "Changing the font..." or "Adding that section..."
2. Generate the updated code
3. Brief confirmation (1 sentence): What changed

Example:
"Updating the headline font...

\`\`\`html
[complete code]
\`\`\`

Done - switched from Inter to Playfair Display. Looks more elegant now."

### For UNCLEAR requests:
Ask ONE specific clarifying question. Don't lecture or over-explain.

Example:
"When you say 'make it better' - do you mean the visual design, the functionality, or both?"

## CRITICAL RULES

### Rule 1: ONE RESPONSE, COMPLETE THOUGHT
Never say "Got it!" and then ask for clarification in the same response. Either:
- You understand → Do the work
- You don't understand → Ask ONE question

### Rule 2: ALWAYS INCLUDE CODE WHEN BUILDING/EDITING
If the user asked for a change or build, your response MUST include \`\`\`html code.
Never respond with just text when code is expected.

### Rule 3: BE HONEST ABOUT PROBLEMS
If something doesn't work or you notice an issue:
- Say what's wrong
- Fix it or explain why you can't
- Don't pretend everything is fine

Example: "I noticed the calendar isn't showing - the JavaScript had an error. Fixed it now."

### Rule 4: REMEMBER CONTEXT
Reference previous work naturally:
- "Since you already have a pricing section, I'll add the testimonials right below it."
- "I kept the blue color scheme you chose earlier."

### Rule 5: SUGGEST, DON'T LECTURE
End with brief, useful suggestions - not essays:
- Good: "Want me to add a mobile menu next?"
- Bad: "There are many things we could do next. We could add a mobile menu, or we could improve the SEO, or we could add animations. What would you prefer? Let me know and I'll be happy to help!"

## RESPONSE LENGTH GUIDE
- Acknowledgment: 3-10 words
- Code: Complete, working HTML
- Summary: 1-3 sentences
- Total non-code text: Under 100 words

## WHAT NOT TO DO
❌ "Got it! I'll do that for you right now! 🎨" (then ask for clarification)
❌ Long explanations before showing code
❌ Multiple emoji
❌ Asking permission to do what they asked
❌ "I'd be happy to help you with that!"
❌ Bullet-point lists of what you're "going to" do
❌ Summarizing their request back to them in detail

## WHAT TO DO
✅ Brief acknowledgment → Code → Brief confirmation
✅ Natural conversation flow
✅ Reference previous context
✅ Notice and fix issues
✅ One emoji max, and only if it fits naturally
✅ Suggest next steps concisely
`;

// ========== CONTEXT-AWARE CONVERSATION TRACKING ==========

export interface ConversationContext {
  // What has been built/discussed
  sectionsBuilt: string[];
  colorsUsed: string[];
  fontsUsed: string[];
  featuresAdded: string[];
  
  // Recent changes (for undo/reference)
  recentChanges: {
    description: string;
    timestamp: number;
  }[];
  
  // Known issues/warnings
  knownIssues: string[];
  
  // User preferences learned
  preferences: {
    style?: string;
    tone?: string;
    industry?: string;
  };
}

export function extractContext(code: string): Partial<ConversationContext> {
  const context: Partial<ConversationContext> = {
    sectionsBuilt: [],
    colorsUsed: [],
    fontsUsed: [],
    featuresAdded: []
  };
  
  // Detect sections
  if (code.includes('hero') || code.includes('Hero')) context.sectionsBuilt?.push('hero');
  if (code.includes('nav') || code.includes('Nav')) context.sectionsBuilt?.push('navigation');
  if (code.includes('about') || code.includes('About')) context.sectionsBuilt?.push('about');
  if (code.includes('pricing') || code.includes('Pricing')) context.sectionsBuilt?.push('pricing');
  if (code.includes('testimonial') || code.includes('review')) context.sectionsBuilt?.push('testimonials');
  if (code.includes('contact') || code.includes('Contact')) context.sectionsBuilt?.push('contact');
  if (code.includes('footer') || code.includes('Footer')) context.sectionsBuilt?.push('footer');
  if (code.includes('calendar') || code.includes('Calendar')) context.sectionsBuilt?.push('calendar');
  if (code.includes('dashboard') || code.includes('Dashboard')) context.sectionsBuilt?.push('dashboard');
  
  // Detect colors (from Tailwind classes or CSS)
  const colorMatches = code.match(/(?:bg|text|border)-(?:blue|red|green|purple|indigo|pink|yellow|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|violet|fuchsia|rose)-\d{2,3}/g);
  if (colorMatches) {
    const uniqueColors = [...new Set(colorMatches.map(c => c.split('-')[1]))];
    context.colorsUsed = uniqueColors.slice(0, 5);
  }
  
  // Detect fonts
  const fontMatches = code.match(/font-family:\s*['"]?([^'",;]+)/g);
  if (fontMatches) {
    context.fontsUsed = fontMatches.map(f => f.replace(/font-family:\s*['"]?/, '').trim()).slice(0, 3);
  }
  
  // Detect features
  if (code.includes('dark:') || code.includes('darkMode')) context.featuresAdded?.push('dark mode');
  if (code.includes('aos') || code.includes('AOS')) context.featuresAdded?.push('animations');
  if (code.includes('Chart.js') || code.includes('chart')) context.featuresAdded?.push('charts');
  if (code.includes('<form')) context.featuresAdded?.push('forms');
  if (code.includes('<video')) context.featuresAdded?.push('video');
  
  return context;
}

export function generateContextSummary(context: Partial<ConversationContext>): string {
  const parts: string[] = [];
  
  if (context.sectionsBuilt && context.sectionsBuilt.length > 0) {
    parts.push(`Current sections: ${context.sectionsBuilt.join(', ')}`);
  }
  
  if (context.colorsUsed && context.colorsUsed.length > 0) {
    parts.push(`Color scheme: ${context.colorsUsed.join(', ')}`);
  }
  
  if (context.featuresAdded && context.featuresAdded.length > 0) {
    parts.push(`Features: ${context.featuresAdded.join(', ')}`);
  }
  
  return parts.join('. ');
}

// ========== SELF-CORRECTION SYSTEM ==========

export interface ValidationIssue {
  type: 'truncation' | 'syntax' | 'missing_functionality' | 'broken_reference';
  description: string;
  severity: 'warning' | 'error';
  autoFixable: boolean;
  fixSuggestion?: string;
}

export function detectIssues(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Check for truncation
  const hasDoctype = code.includes('<!DOCTYPE html');
  const hasHtmlClose = code.includes('</html>');
  const hasBodyClose = code.includes('</body>');
  
  if (hasDoctype && !hasHtmlClose) {
    issues.push({
      type: 'truncation',
      description: 'HTML is incomplete - missing </html> closing tag',
      severity: 'error',
      autoFixable: true,
      fixSuggestion: 'Continue generating from where it cut off'
    });
  }
  
  if (hasDoctype && !hasBodyClose) {
    issues.push({
      type: 'truncation',
      description: 'HTML is incomplete - missing </body> closing tag',
      severity: 'error',
      autoFixable: true,
      fixSuggestion: 'Continue generating from where it cut off'
    });
  }
  
  // Check for unclosed script tags
  const openScripts = (code.match(/<script/g) || []).length;
  const closeScripts = (code.match(/<\/script>/g) || []).length;
  if (openScripts > closeScripts) {
    issues.push({
      type: 'truncation',
      description: `JavaScript incomplete - ${openScripts - closeScripts} unclosed script tag(s)`,
      severity: 'error',
      autoFixable: true,
      fixSuggestion: 'Complete the JavaScript code'
    });
  }
  
  // Check for broken onclick/event handlers
  const brokenHandlers = code.match(/onclick="[^"]*$/gm);
  if (brokenHandlers) {
    issues.push({
      type: 'syntax',
      description: 'Broken onclick handler detected',
      severity: 'error',
      autoFixable: false,
      fixSuggestion: 'Fix the onclick attribute syntax'
    });
  }
  
  // Check for undefined functions being called
  const functionCalls = code.match(/onclick="(\w+)\(/g);
  if (functionCalls) {
    const calledFunctions = functionCalls.map(f => f.match(/onclick="(\w+)\(/)?.[1]).filter(Boolean);
    const definedFunctions = code.match(/function\s+(\w+)\s*\(/g)?.map(f => f.match(/function\s+(\w+)/)?.[1]).filter(Boolean) || [];
    
    for (const called of calledFunctions) {
      if (called && !definedFunctions.includes(called) && !['alert', 'confirm', 'open', 'close'].includes(called)) {
        issues.push({
          type: 'broken_reference',
          description: `Function "${called}" is called but not defined`,
          severity: 'warning',
          autoFixable: true,
          fixSuggestion: `Add the missing ${called} function`
        });
      }
    }
  }
  
  // Check for empty sections
  const emptySections = code.match(/<section[^>]*>\s*<\/section>/g);
  if (emptySections && emptySections.length > 0) {
    issues.push({
      type: 'missing_functionality',
      description: `${emptySections.length} empty section(s) detected`,
      severity: 'warning',
      autoFixable: true,
      fixSuggestion: 'Add content to empty sections'
    });
  }
  
  return issues;
}

export function generateSelfCorrectionPrompt(code: string, issues: ValidationIssue[]): string {
  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  
  let prompt = `The generated code has issues that need fixing:\n\n`;
  
  if (errorIssues.length > 0) {
    prompt += `CRITICAL ISSUES (must fix):\n`;
    errorIssues.forEach((issue, i) => {
      prompt += `${i + 1}. ${issue.description}\n`;
      if (issue.fixSuggestion) prompt += `   Fix: ${issue.fixSuggestion}\n`;
    });
    prompt += '\n';
  }
  
  if (warningIssues.length > 0) {
    prompt += `WARNINGS (should fix):\n`;
    warningIssues.forEach((issue, i) => {
      prompt += `${i + 1}. ${issue.description}\n`;
      if (issue.fixSuggestion) prompt += `   Fix: ${issue.fixSuggestion}\n`;
    });
    prompt += '\n';
  }
  
  prompt += `Here's the current code with issues:\n\`\`\`html\n${code}\n\`\`\`\n\n`;
  prompt += `Fix ALL the issues above and output the COMPLETE corrected code. Don't explain - just fix and output.`;
  
  return prompt;
}

// ========== UNIFIED RESPONSE GENERATOR ==========

export const UNIFIED_BUILD_PROMPT = `${CONVERSATIONAL_CORE}

## YOUR TASK: Build or edit as requested

CURRENT CONTEXT:
{context}

USER'S CURRENT CODE (if editing):
{currentCode}

RESPONSE FORMAT:
1. Brief acknowledgment (if building new: "Building your [thing]...", if editing: "Updating [what]...")
2. Complete HTML code in \`\`\`html block
3. Brief summary of what you did + optional next step suggestion

Remember: Be conversational, be direct, be helpful. You're a skilled developer having a real conversation.
`;

export const UNIFIED_FIX_PROMPT = `${CONVERSATIONAL_CORE}

## YOUR TASK: Fix issues in the generated code

The previous output had problems. Fix them and make the code complete and working.

ISSUES DETECTED:
{issues}

CURRENT BROKEN CODE:
{brokenCode}

OUTPUT FORMAT:
1. Brief acknowledgment: "Found the issue - [what was wrong]. Fixing now..."
2. Complete FIXED HTML code in \`\`\`html block
3. Brief confirmation: "Fixed. [what you fixed]"

Don't apologize excessively. Just fix it.
`;

// ========== SMART QUESTION GENERATOR (CONTEXT-AWARE) ==========

export const SMART_QUESTIONS_PROMPT = `You generate 2-4 SHORT, SMART questions to gather what's needed to build the user's request.

RULES:
1. Questions must be SPECIFIC to what they asked - not generic
2. Include options that are relevant to their industry/niche
3. Don't ask obvious things already in their prompt
4. Maximum 4 questions, minimum 2
5. One question should be about visual style/hero treatment
6. Options should be actionable, not vague

BAD QUESTIONS:
- "What's your business name?" (they'll provide this)
- "What colors do you like?" (too vague)
- "What sections do you want?" (too generic)

GOOD QUESTIONS:
- "What services should I highlight?" with specific options for their business type
- "What's your main goal - bookings, showcase, or lead capture?"
- "Style preference?" with industry-appropriate options

OUTPUT FORMAT (JSON only, no markdown):
[
  {
    "id": "unique_id",
    "question": "Short question text",
    "options": ["Option 1", "Option 2", "Option 3"],
    "allowMultiple": false
  }
]

Keep questions SHORT. Keep options SHORT. Be smart about what you ask.
`;
