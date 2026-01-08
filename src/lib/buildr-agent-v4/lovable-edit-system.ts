// ============================================================================
// BUILDR v4 - LOVABLE-STYLE LINE-BASED EDIT SYSTEM
// ============================================================================
// Instead of regenerating entire files, AI outputs only the changes
// Frontend applies the changes surgically
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface LineEdit {
  action: 'delete' | 'replace' | 'insert';
  startLine: number;
  endLine?: number;        // For delete/replace ranges
  newContent?: string;     // For replace/insert
}

export interface EditInstruction {
  edits: LineEdit[];
  summary: string;
}

export interface SectionLocation {
  name: string;
  startLine: number;
  endLine: number;
  content: string;
}

// ============================================================================
// SECTION DETECTION - Find sections with line numbers
// ============================================================================

export function findSections(code: string): SectionLocation[] {
  const lines = code.split('\n');
  const sections: SectionLocation[] = [];
  
  // Section markers to look for
  const sectionIdentifiers: Record<string, RegExp[]> = {
    'hero': [/id=["']hero/i, /class="[^"]*hero/i, /<!-- ?hero/i, /<section[^>]*hero/i],
    'navigation': [/<nav/i, /id=["']nav/i, /class="[^"]*nav/i],
    'about': [/id=["']about/i, /<!-- ?about/i, /about us/i, /who we are/i],
    'services': [/id=["']services/i, /<!-- ?services/i, /our services/i],
    'features': [/id=["']features/i, /<!-- ?features/i],
    'pricing': [/id=["']pricing/i, /<!-- ?pricing/i, /pricing plans/i],
    'testimonials': [/id=["']testimonials/i, /<!-- ?testimonials/i, /what (people|clients|customers) say/i, /reviews/i],
    'team': [/id=["']team/i, /<!-- ?team/i, /our team/i, /meet the team/i],
    'trainers': [/id=["']trainers/i, /<!-- ?trainers/i, /our trainers/i, /meet.*trainers/i],
    'classes': [/id=["']classes/i, /<!-- ?classes/i, /class schedule/i, /our classes/i],
    'schedule': [/id=["']schedule/i, /<!-- ?schedule/i, /class schedule/i],
    'gallery': [/id=["']gallery/i, /<!-- ?gallery/i],
    'faq': [/id=["']faq/i, /<!-- ?faq/i, /frequently asked/i],
    'contact': [/id=["']contact/i, /<!-- ?contact/i, /get in touch/i, /contact us/i],
    'cta': [/id=["']cta/i, /<!-- ?cta/i, /call.to.action/i, /ready to/i],
    'footer': [/<footer/i, /id=["']footer/i, /<!-- ?footer/i],
    'membership': [/id=["']membership/i, /<!-- ?membership/i, /membership plans/i],
    'stats': [/id=["']stats/i, /<!-- ?stats/i, /statistics/i, /numbers/i],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const [sectionName, patterns] of Object.entries(sectionIdentifiers)) {
      if (patterns.some(p => p.test(line))) {
        // Found section start - now find the end
        const tagMatch = line.match(/<(section|div|nav|header|footer|aside|article)/i);
        const tag = tagMatch ? tagMatch[1].toLowerCase() : 'section';
        
        let depth = 1;
        let endLine = i;
        
        // Count opening tag on current line
        const openOnStart = (line.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
        const closeOnStart = (line.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
        depth = openOnStart - closeOnStart;
        
        if (depth <= 0) {
          // Single line section or self-closing
          endLine = i;
        } else {
          // Find closing tag
          for (let j = i + 1; j < lines.length && depth > 0; j++) {
            const openTags = (lines[j].match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
            const closeTags = (lines[j].match(new RegExp(`</${tag}>`, 'gi')) || []).length;
            depth += openTags - closeTags;
            endLine = j;
          }
        }
        
        // Check if we already have this section (avoid duplicates)
        const exists = sections.some(s => s.startLine === i + 1);
        if (!exists) {
          sections.push({
            name: sectionName,
            startLine: i + 1,  // 1-indexed
            endLine: endLine + 1,  // 1-indexed
            content: lines.slice(i, endLine + 1).join('\n')
          });
        }
        break; // Don't check other patterns for this line
      }
    }
  }
  
  return sections.sort((a, b) => a.startLine - b.startLine);
}

// ============================================================================
// ELEMENT FINDING - Find specific elements
// ============================================================================

export function findElements(code: string, elementType: string): SectionLocation[] {
  const lines = code.split('\n');
  const elements: SectionLocation[] = [];
  
  const elementPatterns: Record<string, RegExp> = {
    'heading': /<h[1-6][^>]*>/i,
    'h1': /<h1[^>]*>/i,
    'h2': /<h2[^>]*>/i,
    'h3': /<h3[^>]*>/i,
    'button': /<button[^>]*>/i,
    'image': /<img[^>]*>/i,
    'link': /<a[^>]*>/i,
    'form': /<form[^>]*>/i,
    'input': /<input[^>]*>/i,
    'video': /<video[^>]*>/i,
  };
  
  const pattern = elementPatterns[elementType.toLowerCase()];
  if (!pattern) return elements;
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      elements.push({
        name: elementType,
        startLine: i + 1,
        endLine: i + 1,
        content: lines[i]
      });
    }
  }
  
  return elements;
}

// ============================================================================
// LINE-BASED EDIT APPLICATION
// ============================================================================

export function applyLineEdits(code: string, edits: LineEdit[]): string {
  const lines = code.split('\n');
  
  // Sort edits by line number descending (apply from bottom to top)
  const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);
  
  for (const edit of sortedEdits) {
    const startIdx = edit.startLine - 1; // Convert to 0-indexed
    const endIdx = (edit.endLine || edit.startLine) - 1;
    
    switch (edit.action) {
      case 'delete':
        lines.splice(startIdx, endIdx - startIdx + 1);
        break;
        
      case 'replace':
        const newLines = edit.newContent?.split('\n') || [];
        lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
        break;
        
      case 'insert':
        const insertLines = edit.newContent?.split('\n') || [];
        lines.splice(startIdx, 0, ...insertLines);
        break;
    }
  }
  
  return lines.join('\n');
}

// ============================================================================
// INSTANT EDIT HANDLERS - No AI needed!
// ============================================================================

export function handleInstantDelete(code: string, sectionName: string): { 
  success: boolean; 
  newCode?: string; 
  message: string;
  linesRemoved?: number;
} {
  const sections = findSections(code);
  
  // Find matching section (fuzzy match)
  const sectionLower = sectionName.toLowerCase();
  const section = sections.find(s => 
    s.name === sectionLower || 
    sectionLower.includes(s.name) ||
    s.name.includes(sectionLower)
  );
  
  if (!section) {
    // Try to find by content
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(sectionLower)) {
        // Found a reference - try to find the section boundary
        const foundSections = findSections(code);
        for (const s of foundSections) {
          if (i + 1 >= s.startLine && i + 1 <= s.endLine) {
            const linesRemoved = s.endLine - s.startLine + 1;
            const newCode = applyLineEdits(code, [{
              action: 'delete',
              startLine: s.startLine,
              endLine: s.endLine
            }]);
            return {
              success: true,
              newCode,
              message: `Removed ${s.name} section (${linesRemoved} lines)`,
              linesRemoved
            };
          }
        }
      }
    }
    
    return {
      success: false,
      message: `Could not find "${sectionName}" section`
    };
  }
  
  const linesRemoved = section.endLine - section.startLine + 1;
  const newCode = applyLineEdits(code, [{
    action: 'delete',
    startLine: section.startLine,
    endLine: section.endLine
  }]);
  
  return {
    success: true,
    newCode,
    message: `Removed ${section.name} section (${linesRemoved} lines)`,
    linesRemoved
  };
}

export function handleInstantHeadingSize(code: string, action: 'larger' | 'smaller'): {
  success: boolean;
  newCode?: string;
  message: string;
  changesCount?: number;
} {
  const lines = code.split('\n');
  let changesCount = 0;
  
  // Tailwind text size classes in order
  const sizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'];
  
  for (let i = 0; i < lines.length; i++) {
    // Only modify heading tags
    if (/<h[1-6][^>]*class=/i.test(lines[i])) {
      let modified = false;
      
      for (let j = 0; j < sizes.length; j++) {
        if (lines[i].includes(sizes[j])) {
          const newSizeIdx = action === 'larger' 
            ? Math.min(j + 1, sizes.length - 1)
            : Math.max(j - 1, 0);
          
          if (newSizeIdx !== j) {
            lines[i] = lines[i].replace(sizes[j], sizes[newSizeIdx]);
            changesCount++;
            modified = true;
          }
          break;
        }
      }
      
      // If no size class found, add one
      if (!modified && action === 'larger') {
        lines[i] = lines[i].replace(/class="/, 'class="text-4xl ');
        changesCount++;
      }
    }
  }
  
  if (changesCount === 0) {
    return {
      success: false,
      message: 'No headings found to modify'
    };
  }
  
  return {
    success: true,
    newCode: lines.join('\n'),
    message: `Made ${changesCount} heading(s) ${action}`,
    changesCount
  };
}

export function handleInstantColorChange(code: string, fromColor: string, toColor: string): {
  success: boolean;
  newCode?: string;
  message: string;
  changesCount?: number;
} {
  // Tailwind color patterns
  const colorPattern = new RegExp(`(bg-|text-|border-|from-|to-|via-)${fromColor}(-\\d{2,3})?`, 'g');
  
  let changesCount = 0;
  const newCode = code.replace(colorPattern, (match, prefix, shade) => {
    changesCount++;
    return `${prefix}${toColor}${shade || '-600'}`;
  });
  
  if (changesCount === 0) {
    return {
      success: false,
      message: `No ${fromColor} colors found to change`
    };
  }
  
  return {
    success: true,
    newCode,
    message: `Changed ${changesCount} ${fromColor} → ${toColor}`,
    changesCount
  };
}

// ============================================================================
// INSTANT EDIT ROUTER - Determines if edit can be instant
// ============================================================================

export interface InstantEditResult {
  canBeInstant: boolean;
  result?: {
    success: boolean;
    newCode?: string;
    message: string;
  };
  fallbackReason?: string;
}

export function tryInstantEdit(code: string, userMessage: string): InstantEditResult {
  const msg = userMessage.toLowerCase();
  
  // REMOVE/DELETE SECTION
  if (msg.match(/^(remove|delete|get rid of|take out)/)) {
    // Extract what to remove
    const sectionMatch = msg.match(/(remove|delete|get rid of|take out)\s+(the\s+)?(.+?)\s*(section|area|part)?$/i);
    if (sectionMatch) {
      const sectionName = sectionMatch[3].trim();
      const result = handleInstantDelete(code, sectionName);
      return {
        canBeInstant: result.success,
        result: result.success ? result : undefined,
        fallbackReason: result.success ? undefined : result.message
      };
    }
  }
  
  // MAKE HEADINGS LARGER/SMALLER
  if (msg.match(/^(make\s+)?(headings?|titles?|text)\s+(larger|bigger|smaller)/)) {
    const action = msg.includes('smaller') ? 'smaller' : 'larger';
    const result = handleInstantHeadingSize(code, action);
    return {
      canBeInstant: result.success,
      result: result.success ? result : undefined,
      fallbackReason: result.success ? undefined : result.message
    };
  }
  
  // CHANGE COLOR (simple cases)
  const colorMatch = msg.match(/change\s+(\w+)\s+(color\s+)?to\s+(\w+)/);
  if (colorMatch) {
    const fromColor = colorMatch[1];
    const toColor = colorMatch[3];
    
    // Map common color names to Tailwind
    const colorMap: Record<string, string> = {
      'blue': 'blue', 'red': 'red', 'green': 'green', 'yellow': 'yellow',
      'purple': 'purple', 'pink': 'pink', 'orange': 'orange', 'gray': 'gray',
      'grey': 'gray', 'black': 'gray', 'white': 'white', 'indigo': 'indigo',
      'teal': 'teal', 'cyan': 'cyan', 'emerald': 'emerald', 'violet': 'violet'
    };
    
    const from = colorMap[fromColor] || fromColor;
    const to = colorMap[toColor] || toColor;
    
    const result = handleInstantColorChange(code, from, to);
    return {
      canBeInstant: result.success,
      result: result.success ? result : undefined,
      fallbackReason: result.success ? undefined : result.message
    };
  }
  
  // Not an instant edit
  return {
    canBeInstant: false,
    fallbackReason: 'Complex edit requires AI'
  };
}

// ============================================================================
// AI PROMPT FOR LINE-BASED EDITS (when instant isn't possible)
// ============================================================================

export const LINE_BASED_EDIT_PROMPT = `You are Buildr. Make ONLY the specific change requested.

## CRITICAL: OUTPUT FORMAT

You must respond with a JSON object containing line-based edits. DO NOT output the full HTML file.

## RESPONSE FORMAT

\`\`\`json
{
  "edits": [
    {
      "action": "replace",
      "startLine": 45,
      "endLine": 52,
      "newContent": "<section class=\\"py-20\\">\\n  <h2>New Content</h2>\\n</section>"
    }
  ],
  "summary": "Replaced the hero section with updated content"
}
\`\`\`

## ACTIONS

- **delete**: Remove lines (startLine to endLine)
- **replace**: Replace lines with newContent
- **insert**: Insert newContent after startLine

## RULES

1. Output ONLY the JSON object, nothing else
2. Use actual line numbers from the code provided
3. Keep newContent minimal - only what's needed
4. Escape quotes and newlines in newContent
5. Multiple edits should be in the edits array

## EXAMPLES

User: "remove the pricing section" (pricing is lines 120-180)
\`\`\`json
{
  "edits": [{"action": "delete", "startLine": 120, "endLine": 180}],
  "summary": "Removed pricing section"
}
\`\`\`

User: "change the hero headline"
\`\`\`json
{
  "edits": [{"action": "replace", "startLine": 25, "endLine": 25, "newContent": "      <h1 class=\\"text-5xl font-bold\\">New Headline Here</h1>"}],
  "summary": "Updated hero headline"
}
\`\`\`

User: "add a CTA button after the features"
\`\`\`json
{
  "edits": [{"action": "insert", "startLine": 95, "newContent": "    <button class=\\"bg-blue-600 px-8 py-3 rounded-lg\\">Get Started</button>"}],
  "summary": "Added CTA button after features section"
}
\`\`\`

Now analyze the code and make the requested edit:`;

// ============================================================================
// PARSE AI RESPONSE
// ============================================================================

export function parseLineEditResponse(response: string): EditInstruction | null {
  try {
    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                      response.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, response];
    
    const jsonStr = jsonMatch[1]?.trim() || response.trim();
    const parsed = JSON.parse(jsonStr);
    
    if (parsed.edits && Array.isArray(parsed.edits)) {
      return {
        edits: parsed.edits,
        summary: parsed.summary || 'Edit applied'
      };
    }
    
    return null;
  } catch (e) {
    console.error('Failed to parse line edit response:', e);
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  findSections,
  findElements,
  applyLineEdits,
  handleInstantDelete,
  handleInstantHeadingSize,
  handleInstantColorChange,
  tryInstantEdit,
  parseLineEditResponse,
  LINE_BASED_EDIT_PROMPT
};
