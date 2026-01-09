// ============================================================================
// BUILDR AI AGENT v5 - IMPROVED PROCESSING SYSTEM
// ============================================================================
// Key Improvements:
// 1. Tiered Edit System (Instant → Surgical → Full)
// 2. Verification-Retry Loop
// 3. Planning for Complex Builds
// 4. Right-Sized Prompts
// ============================================================================

import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// SECTION 1: MINIMAL PROMPTS (Right-sized for each task)
// ============================================================================

// Tiny prompt for simple edits (~300 chars vs 28,000)
export const MINIMAL_EDIT_PROMPT = `You are Buildr. Make the exact edit requested.

Rules:
1. Output COMPLETE HTML with the edit applied
2. Change ONLY what was asked - nothing else
3. Keep Tailwind config in <head> after CDN
4. Preserve all existing content and functionality

Response format:
[2-5 word acknowledgment]...

\`\`\`html
[complete code]
\`\`\`

Done - [what changed].`;

// Medium prompt for surgical edits (~800 chars)
export const SURGICAL_EDIT_PROMPT = `You are Buildr. Apply a targeted edit to the provided code section.

You will receive:
1. The edit request
2. The specific section of code to modify
3. Context about where this section appears

Rules:
1. Output ONLY the modified section (not the full file)
2. Maintain the same structure and indentation
3. Change only what was requested
4. Keep all class names, IDs, and attributes unless asked to change them

Response format:
\`\`\`html
[modified section only]
\`\`\`

Done - [what changed].`;

// Planning prompt for complex builds (~1000 chars)
export const PLANNER_PROMPT = `You are a build planner. Break down the user's request into sequential, buildable steps.

Analyze the request and output a JSON plan:
{
  "projectType": "website" | "dashboard" | "webapp",
  "complexity": "simple" | "moderate" | "complex",
  "steps": [
    {
      "order": 1,
      "task": "Create base HTML structure with navigation",
      "sections": ["nav", "layout"],
      "dependencies": []
    },
    {
      "order": 2, 
      "task": "Build hero section with headline and CTA",
      "sections": ["hero"],
      "dependencies": [1]
    }
  ],
  "totalSections": 6,
  "needsDatabase": false,
  "needsAuth": false,
  "needsAPI": false
}

Rules:
- Maximum 8 steps
- Each step should produce visible, testable output
- Order by dependency (what needs to exist first)
- Be specific about what each step creates
- Identify if database/auth/API integrations are needed

User request:`;

// Verification-aware build prompt
export const VERIFIED_BUILD_PROMPT = `You are Buildr. Generate production-quality code that will pass verification.

CRITICAL REQUIREMENTS (violations cause build failures):
1. Complete HTML structure: <!DOCTYPE html>, <html>, <head>, <body>, all closed
2. Tailwind config MUST be in <head> immediately after CDN script
3. All tags must be properly closed
4. All scripts must be complete (no truncation)
5. Mobile responsive design

VERIFICATION CHECKS YOU MUST PASS:
- [ ] Has <!DOCTYPE html> and </html>
- [ ] Has <body> and </body>
- [ ] Tailwind config is in <head>, not <body>
- [ ] All <script> tags are closed
- [ ] All <div> tags are closed
- [ ] Code is not truncated

If you cannot complete the full code, say so rather than outputting truncated code.`;

// ============================================================================
// SECTION 2: INSTANT EDIT SYSTEM (No AI needed)
// ============================================================================

export interface InstantEditResult {
  handled: boolean;
  code?: string;
  message?: string;
}

export function tryInstantEdit(code: string, userMessage: string): InstantEditResult {
  const msg = userMessage.toLowerCase().trim();
  
  // === REMOVE/DELETE SECTION ===
  if (msg.match(/^(remove|delete|get rid of)/)) {
    const sectionMatch = msg.match(/(remove|delete|get rid of)\s+(the\s+)?(.+?)\s*(section)?$/);
    if (sectionMatch) {
      const target = sectionMatch[3].toLowerCase();
      const result = removeSection(code, target);
      if (result.success) {
        return { handled: true, code: result.code, message: result.message };
      }
    }
  }
  
  // === MAKE HEADINGS LARGER/SMALLER ===
  if (msg.match(/(make|headings?|titles?).*(larger|bigger|smaller)/)) {
    const bigger = !msg.includes('smaller');
    const result = resizeHeadings(code, bigger);
    if (result.success) {
      return { handled: true, code: result.code, message: result.message };
    }
  }
  
  // === SIMPLE COLOR CHANGES ===
  const colorMatch = msg.match(/change\s+(.+?)\s+(to|into)\s+(red|blue|green|yellow|purple|pink|orange|gray|black|white|indigo|emerald|cyan|teal)/);
  if (colorMatch) {
    const element = colorMatch[1];
    const newColor = colorMatch[3];
    const result = changeColor(code, element, newColor);
    if (result.success) {
      return { handled: true, code: result.code, message: result.message };
    }
  }
  
  // === SHOW/HIDE ELEMENTS ===
  if (msg.match(/^(hide|show|toggle)/)) {
    // Could implement visibility changes
  }
  
  return { handled: false };
}

// Helper: Find and remove a section
function removeSection(code: string, target: string): { success: boolean; code?: string; message?: string } {
  const lines = code.split('\n');
  
  // Section identifiers to look for
  const sectionNames: Record<string, string[]> = {
    'hero': ['hero', 'banner', 'jumbotron'],
    'nav': ['nav', 'navbar', 'navigation', 'header'],
    'about': ['about', 'about-us', 'who-we-are'],
    'services': ['services', 'our-services', 'what-we-do'],
    'features': ['features', 'feature'],
    'pricing': ['pricing', 'price', 'plans'],
    'testimonials': ['testimonials', 'reviews', 'testimonial'],
    'team': ['team', 'our-team', 'staff', 'trainers'],
    'trainers': ['trainers', 'trainer', 'coaches'],
    'classes': ['classes', 'class', 'schedule'],
    'gallery': ['gallery', 'portfolio', 'work'],
    'faq': ['faq', 'faqs', 'questions'],
    'contact': ['contact', 'contact-us', 'get-in-touch'],
    'cta': ['cta', 'call-to-action'],
    'footer': ['footer'],
    'stats': ['stats', 'statistics', 'numbers'],
    'membership': ['membership', 'memberships', 'plans'],
  };
  
  // Find which section the target maps to
  let sectionKey = target.replace(/\s+/g, '-');
  for (const [key, aliases] of Object.entries(sectionNames)) {
    if (aliases.some(alias => target.includes(alias) || alias.includes(target))) {
      sectionKey = key;
      break;
    }
  }
  
  // Find the section in the code
  let startLine = -1;
  let endLine = -1;
  let depth = 0;
  let foundSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Look for section start
    if (!foundSection) {
      const isMatch = 
        line.includes(`id="${sectionKey}"`) ||
        line.includes(`id='${sectionKey}'`) ||
        line.includes(`<!-- ${sectionKey}`) ||
        line.includes(`<!--${sectionKey}`) ||
        (line.includes('<section') && line.includes(sectionKey)) ||
        (line.includes('<div') && line.includes(sectionKey) && line.includes('id='));
      
      if (isMatch) {
        startLine = i;
        foundSection = true;
        depth = 1;
        
        // Check if it's a self-contained line
        const opens = (lines[i].match(/<(section|div|nav|header|footer|aside)/gi) || []).length;
        const closes = (lines[i].match(/<\/(section|div|nav|header|footer|aside)>/gi) || []).length;
        depth = opens - closes;
        
        if (depth <= 0) {
          endLine = i;
          break;
        }
        continue;
      }
    }
    
    // Track depth to find section end
    if (foundSection) {
      const opens = (lines[i].match(/<(section|div|nav|header|footer|aside)/gi) || []).length;
      const closes = (lines[i].match(/<\/(section|div|nav|header|footer|aside)>/gi) || []).length;
      depth += opens - closes;
      
      if (depth <= 0) {
        endLine = i;
        break;
      }
    }
  }
  
  if (startLine === -1) {
    return { success: false, message: `Could not find "${target}" section` };
  }
  
  if (endLine === -1) {
    endLine = startLine; // Single line section or couldn't find end
  }
  
  // Remove the lines
  const removedCount = endLine - startLine + 1;
  lines.splice(startLine, removedCount);
  
  return {
    success: true,
    code: lines.join('\n'),
    message: `Removed ${target} section (${removedCount} lines)`
  };
}

// Helper: Resize headings
function resizeHeadings(code: string, bigger: boolean): { success: boolean; code?: string; message?: string } {
  const sizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'];
  
  let newCode = code;
  let changeCount = 0;
  
  // Find and replace heading sizes
  for (let i = 0; i < sizes.length; i++) {
    const current = sizes[i];
    const replacement = bigger 
      ? sizes[Math.min(i + 1, sizes.length - 1)]
      : sizes[Math.max(i - 1, 0)];
    
    if (current !== replacement) {
      // Only in heading tags
      const regex = new RegExp(`(<h[1-6][^>]*class="[^"]*)(${current})([^"]*")`, 'gi');
      const matches = newCode.match(regex);
      if (matches) {
        changeCount += matches.length;
        newCode = newCode.replace(regex, `$1${replacement}$3`);
      }
    }
  }
  
  if (changeCount === 0) {
    return { success: false, message: 'No heading sizes found to change' };
  }
  
  return {
    success: true,
    code: newCode,
    message: `Made ${changeCount} heading(s) ${bigger ? 'larger' : 'smaller'}`
  };
}

// Helper: Change colors
function changeColor(code: string, element: string, newColor: string): { success: boolean; code?: string; message?: string } {
  // Map common color names to Tailwind
  const colorMap: Record<string, string> = {
    'red': 'red', 'blue': 'blue', 'green': 'green', 'yellow': 'yellow',
    'purple': 'purple', 'pink': 'pink', 'orange': 'orange', 'gray': 'gray',
    'black': 'gray-900', 'white': 'white', 'indigo': 'indigo', 
    'emerald': 'emerald', 'cyan': 'cyan', 'teal': 'teal'
  };
  
  const tailwindColor = colorMap[newColor] || newColor;
  let newCode = code;
  let changeCount = 0;
  
  // Common color patterns to replace
  const colorPrefixes = ['bg-', 'text-', 'border-', 'from-', 'to-', 'via-'];
  const colorRegex = /(bg-|text-|border-|from-|to-|via-)(red|blue|green|yellow|purple|pink|orange|gray|indigo|emerald|cyan|teal|slate|zinc|neutral|stone|amber|lime|sky|violet|fuchsia|rose)(-\d{2,3})?/g;
  
  // If element is specified, try to target it
  if (element.includes('button') || element.includes('btn')) {
    // Target buttons specifically
    const buttonRegex = /<button[^>]*class="([^"]*)"/gi;
    newCode = newCode.replace(buttonRegex, (match, classes) => {
      const newClasses = classes.replace(colorRegex, `$1${tailwindColor}$3`);
      changeCount++;
      return match.replace(classes, newClasses);
    });
  } else if (element.includes('background') || element.includes('bg')) {
    // Target background colors
    newCode = newCode.replace(/bg-(red|blue|green|yellow|purple|pink|orange|gray|indigo|emerald|cyan|teal|slate|zinc|neutral|stone|amber|lime|sky|violet|fuchsia|rose)(-\d{2,3})?/g, (match, color, shade) => {
      changeCount++;
      return `bg-${tailwindColor}${shade || '-600'}`;
    });
  } else {
    // General color replacement
    newCode = newCode.replace(colorRegex, (match, prefix, color, shade) => {
      changeCount++;
      return `${prefix}${tailwindColor}${shade || '-600'}`;
    });
  }
  
  if (changeCount === 0) {
    return { success: false, message: `No ${element} colors found to change` };
  }
  
  return {
    success: true,
    code: newCode,
    message: `Changed ${changeCount} ${element} color(s) to ${newColor}`
  };
}

// ============================================================================
// SECTION 3: SURGICAL EDIT SYSTEM (Minimal AI, targeted changes)
// ============================================================================

export interface SurgicalEditContext {
  possible: boolean;
  targetSection?: string;
  startLine?: number;
  endLine?: number;
  editType?: 'modify' | 'add' | 'replace';
}

export function analyzeSurgicalEdit(code: string, userMessage: string): SurgicalEditContext {
  const msg = userMessage.toLowerCase();
  
  // Edits that CAN be surgical
  const surgicalPatterns = [
    /change\s+(the\s+)?(hero|about|pricing|contact|footer)\s*(section)?/i,
    /update\s+(the\s+)?(text|heading|title)\s*(in|on|for)/i,
    /add\s+(a\s+)?(button|link|image|icon)\s*(to|in|on)/i,
    /modify\s+(the\s+)?(.+?)\s*section/i,
  ];
  
  const isSurgical = surgicalPatterns.some(p => p.test(msg));
  
  if (!isSurgical) {
    return { possible: false };
  }
  
  // Find which section to target
  const sections = ['hero', 'nav', 'about', 'services', 'features', 'pricing', 'testimonials', 'team', 'contact', 'footer', 'faq', 'gallery', 'cta'];
  let targetSection = '';
  
  for (const section of sections) {
    if (msg.includes(section)) {
      targetSection = section;
      break;
    }
  }
  
  if (!targetSection) {
    return { possible: false };
  }
  
  // Find the section in code
  const lines = code.split('\n');
  let startLine = -1;
  let endLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(`id="${targetSection}"`) || 
        line.includes(`<!-- ${targetSection}`) ||
        (line.includes('<section') && line.includes(targetSection))) {
      startLine = i;
      
      // Find end of section
      let depth = 1;
      for (let j = i + 1; j < lines.length; j++) {
        const opens = (lines[j].match(/<(section|div)/gi) || []).length;
        const closes = (lines[j].match(/<\/(section|div)>/gi) || []).length;
        depth += opens - closes;
        if (depth <= 0) {
          endLine = j;
          break;
        }
      }
      break;
    }
  }
  
  if (startLine === -1) {
    return { possible: false };
  }
  
  return {
    possible: true,
    targetSection,
    startLine,
    endLine: endLine || startLine + 50, // Default to ~50 lines if can't find end
    editType: 'modify'
  };
}

export function extractSection(code: string, startLine: number, endLine: number): string {
  const lines = code.split('\n');
  return lines.slice(startLine, endLine + 1).join('\n');
}

export function applySurgicalEdit(originalCode: string, startLine: number, endLine: number, newSection: string): string {
  const lines = originalCode.split('\n');
  const before = lines.slice(0, startLine);
  const after = lines.slice(endLine + 1);
  return [...before, newSection, ...after].join('\n');
}

// ============================================================================
// SECTION 4: VERIFICATION SYSTEM (Enhanced)
// ============================================================================

export interface VerificationResult {
  valid: boolean;
  issues: string[];
  canAutoFix: boolean;
  severity: 'none' | 'warning' | 'error' | 'critical';
}

export function verifyCode(code: string): VerificationResult {
  const issues: string[] = [];
  let severity: VerificationResult['severity'] = 'none';
  
  // Skip verification for non-HTML responses
  if (!code.includes('<!DOCTYPE html') && !code.includes('<html') && code.length < 500) {
    return { valid: true, issues: [], canAutoFix: false, severity: 'none' };
  }
  
  // CRITICAL: Tailwind config position
  if (code.includes('cdn.tailwindcss.com') && code.includes('tailwind.config')) {
    const bodyIndex = code.indexOf('<body');
    const configIndex = code.indexOf('tailwind.config');
    if (bodyIndex !== -1 && configIndex > bodyIndex) {
      issues.push('CRITICAL: Tailwind config is in <body> - will cause blank page');
      severity = 'critical';
    }
  }
  
  // ERROR: Missing structure
  if (code.includes('<!DOCTYPE html') && !code.includes('</html>')) {
    issues.push('Missing </html> - code appears truncated');
    severity = severity === 'critical' ? 'critical' : 'error';
  }
  
  if (code.includes('<body') && !code.includes('</body>')) {
    issues.push('Missing </body> - code appears truncated');
    severity = severity === 'critical' ? 'critical' : 'error';
  }
  
  // WARNING: Unclosed tags
  const openScripts = (code.match(/<script/g) || []).length;
  const closeScripts = (code.match(/<\/script>/g) || []).length;
  if (openScripts > closeScripts) {
    issues.push(`${openScripts - closeScripts} unclosed <script> tag(s)`);
    severity = severity === 'none' ? 'warning' : severity;
  }
  
  const openDivs = (code.match(/<div/g) || []).length;
  const closeDivs = (code.match(/<\/div>/g) || []).length;
  if (Math.abs(openDivs - closeDivs) > 3) {
    issues.push(`Mismatched div tags: ${openDivs} open, ${closeDivs} close`);
    severity = severity === 'none' ? 'warning' : severity;
  }
  
  // Check for common truncation signs
  if (code.endsWith('...') || code.endsWith('```') || code.match(/class="[^"]*$/)) {
    issues.push('Code appears to be truncated mid-line');
    severity = 'error';
  }
  
  const canAutoFix = issues.some(i => 
    i.includes('Tailwind') || 
    i.includes('Missing </') ||
    i.includes('unclosed')
  );
  
  return {
    valid: issues.length === 0,
    issues,
    canAutoFix,
    severity
  };
}

export function autoFix(code: string, issues: string[]): { code: string; fixes: string[] } {
  let fixed = code;
  const fixes: string[] = [];
  
  // Fix: Tailwind config position
  if (issues.some(i => i.includes('Tailwind config is in <body>'))) {
    const configMatch = code.match(/(<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>)/);
    if (configMatch) {
      // Remove from current position
      fixed = fixed.replace(configMatch[1], '');
      // Add after Tailwind CDN
      const cdnPattern = /(<script\s+src=["']https:\/\/cdn\.tailwindcss\.com["'][^>]*><\/script>)/;
      fixed = fixed.replace(cdnPattern, `$1\n  ${configMatch[1]}`);
      fixes.push('Moved Tailwind config to <head>');
    }
  }
  
  // Fix: Missing </html>
  if (issues.some(i => i.includes('Missing </html>')) && !fixed.includes('</html>')) {
    fixed = fixed.trim() + '\n</html>';
    fixes.push('Added missing </html>');
  }
  
  // Fix: Missing </body>
  if (issues.some(i => i.includes('Missing </body>')) && !fixed.includes('</body>')) {
    const htmlClose = fixed.lastIndexOf('</html>');
    if (htmlClose !== -1) {
      fixed = fixed.slice(0, htmlClose) + '</body>\n' + fixed.slice(htmlClose);
    } else {
      fixed = fixed.trim() + '\n</body>';
    }
    fixes.push('Added missing </body>');
  }
  
  // Fix: Unclosed scripts
  if (issues.some(i => i.includes('unclosed <script>'))) {
    const open = (fixed.match(/<script/g) || []).length;
    const close = (fixed.match(/<\/script>/g) || []).length;
    if (open > close) {
      const missing = '</script>\n'.repeat(open - close);
      const bodyClose = fixed.lastIndexOf('</body>');
      if (bodyClose !== -1) {
        fixed = fixed.slice(0, bodyClose) + missing + fixed.slice(bodyClose);
      }
      fixes.push(`Added ${open - close} missing </script> tag(s)`);
    }
  }
  
  return { code: fixed, fixes };
}

// ============================================================================
// SECTION 5: PLANNING SYSTEM (For complex builds)
// ============================================================================

export interface BuildPlan {
  projectType: 'website' | 'dashboard' | 'webapp';
  complexity: 'simple' | 'moderate' | 'complex';
  steps: BuildStep[];
  totalSections: number;
  needsDatabase: boolean;
  needsAuth: boolean;
  needsAPI: boolean;
}

export interface BuildStep {
  order: number;
  task: string;
  sections: string[];
  dependencies: number[];
}

export function needsPlanning(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  
  // Complex indicators
  const complexIndicators = [
    'dashboard', 'admin', 'webapp', 'web app', 'application',
    'with database', 'with auth', 'with login',
    'multiple pages', 'multi-page',
    'e-commerce', 'ecommerce', 'store', 'shop',
    'booking system', 'reservation',
    'user accounts', 'admin panel'
  ];
  
  // Length and feature count indicators
  const hasMultipleFeatures = (msg.match(/(and|with|plus|also|\,)/g) || []).length >= 3;
  const isLong = msg.length > 200;
  
  return complexIndicators.some(ind => msg.includes(ind)) || (hasMultipleFeatures && isLong);
}

export function parsePlanResponse(response: string): BuildPlan | null {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const plan = JSON.parse(jsonMatch[0]) as BuildPlan;
    
    // Validate required fields
    if (!plan.steps || !Array.isArray(plan.steps)) return null;
    
    return plan;
  } catch {
    return null;
  }
}

// ============================================================================
// SECTION 6: MAIN PROCESSING FUNCTION
// ============================================================================

export interface ProcessingResult {
  approach: 'instant' | 'surgical' | 'planned' | 'full';
  result?: {
    code: string;
    message: string;
  };
  plan?: BuildPlan;
  surgicalContext?: SurgicalEditContext;
  prompt?: string;
  model?: 'haiku' | 'sonnet';
  maxTokens?: number;
}

export function determineProcessingApproach(
  userMessage: string, 
  currentCode: string | null,
  isFollowUp: boolean
): ProcessingResult {
  
  // === NEW BUILD (no existing code) ===
  if (!currentCode || currentCode.length < 100) {
    // Check if needs planning
    if (needsPlanning(userMessage)) {
      return {
        approach: 'planned',
        prompt: PLANNER_PROMPT,
        model: 'sonnet',
        maxTokens: 2000
      };
    }
    
    // Simple new build
    return {
      approach: 'full',
      prompt: VERIFIED_BUILD_PROMPT,
      model: 'sonnet',
      maxTokens: 16000
    };
  }
  
  // === EDIT (has existing code) ===
  
  // Try instant edit first (no AI needed)
  const instant = tryInstantEdit(currentCode, userMessage);
  if (instant.handled) {
    return {
      approach: 'instant',
      result: {
        code: instant.code!,
        message: instant.message!
      }
    };
  }
  
  // Try surgical edit (minimal AI)
  const surgical = analyzeSurgicalEdit(currentCode, userMessage);
  if (surgical.possible) {
    return {
      approach: 'surgical',
      surgicalContext: surgical,
      prompt: SURGICAL_EDIT_PROMPT,
      model: 'haiku', // Fast model for small edits
      maxTokens: 3000
    };
  }
  
  // Fall back to full edit
  return {
    approach: 'full',
    prompt: MINIMAL_EDIT_PROMPT, // Still use minimal prompt, not 28k
    model: 'sonnet',
    maxTokens: 16000
  };
}

// ============================================================================
// SECTION 7: VERIFICATION-RETRY WRAPPER
// ============================================================================

export async function generateWithRetry(
  anthropic: Anthropic,
  systemPrompt: string,
  userMessage: string,
  currentCode: string | null,
  model: string,
  maxTokens: number,
  maxRetries: number = 2
): Promise<{ code: string; message: string; retries: number }> {
  
  let attempts = 0;
  let lastCode = '';
  let lastIssues: string[] = [];
  
  while (attempts < maxRetries) {
    attempts++;
    
    // Build messages
    let content = userMessage;
    if (currentCode) {
      content += `\n\nCurrent code:\n\`\`\`html\n${currentCode}\n\`\`\``;
    }
    if (attempts > 1 && lastIssues.length > 0) {
      content = `PREVIOUS ATTEMPT HAD ERRORS - PLEASE FIX:\n${lastIssues.join('\n')}\n\n${content}`;
    }
    
    // Call AI
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content }]
    });
    
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Extract code
    const codeMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
    if (!codeMatch) {
      lastIssues = ['No code block found in response'];
      continue;
    }
    
    lastCode = codeMatch[1].trim();
    
    // Verify
    const verification = verifyCode(lastCode);
    
    if (verification.valid) {
      return { code: lastCode, message: text.split('```')[0].trim(), retries: attempts - 1 };
    }
    
    // Try auto-fix
    if (verification.canAutoFix) {
      const fixed = autoFix(lastCode, verification.issues);
      const reVerify = verifyCode(fixed.code);
      if (reVerify.valid) {
        return { 
          code: fixed.code, 
          message: `${text.split('```')[0].trim()} (auto-fixed: ${fixed.fixes.join(', ')})`,
          retries: attempts - 1
        };
      }
    }
    
    // Critical errors shouldn't retry - they need different approach
    if (verification.severity === 'critical') {
      break;
    }
    
    lastIssues = verification.issues;
  }
  
  // Return best attempt
  return { code: lastCode, message: 'Completed with warnings', retries: attempts };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Prompts
  MINIMAL_EDIT_PROMPT,
  SURGICAL_EDIT_PROMPT,
  PLANNER_PROMPT,
  VERIFIED_BUILD_PROMPT,
  
  // Instant edits
  tryInstantEdit,
  
  // Surgical edits
  analyzeSurgicalEdit,
  extractSection,
  applySurgicalEdit,
  
  // Verification
  verifyCode,
  autoFix,
  
  // Planning
  needsPlanning,
  parsePlanResponse,
  
  // Main processing
  determineProcessingApproach,
  generateWithRetry
};
