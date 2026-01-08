// ============================================================================
// BUILDR v4 - SURGICAL EDIT SYSTEM
// ============================================================================
// Line-based modifications instead of full file rewrites
// Inspired by Lovable's approach for fast edits
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface LineRange {
  start: number;
  end: number;
}

export interface SurgicalEdit {
  type: 'delete' | 'replace' | 'insert';
  range?: LineRange;        // For delete/replace
  insertAfter?: number;     // For insert (line number)
  newContent?: string;      // For replace/insert
  description: string;
}

export interface EditPlan {
  edits: SurgicalEdit[];
  requiresFullRewrite: boolean;
  reason?: string;
}

export interface SectionInfo {
  name: string;
  startLine: number;
  endLine: number;
  startTag: string;
}

// ============================================================================
// SECTION DETECTION - Find where sections are in the code
// ============================================================================

export function detectSections(code: string): SectionInfo[] {
  const lines = code.split('\n');
  const sections: SectionInfo[] = [];
  
  // Common section patterns with their identifiers
  const sectionPatterns = [
    { name: 'hero', patterns: [/id=["']hero/i, /<!-- hero/i, /hero.*(section|banner)/i, /<section[^>]*class="[^"]*hero/i] },
    { name: 'navigation', patterns: [/<nav/i, /id=["']nav/i, /<!-- nav/i] },
    { name: 'header', patterns: [/<header/i, /id=["']header/i] },
    { name: 'about', patterns: [/id=["']about/i, /<!-- about/i, /about.*(section|us)/i] },
    { name: 'services', patterns: [/id=["']services/i, /<!-- services/i, /our services/i] },
    { name: 'features', patterns: [/id=["']features/i, /<!-- features/i] },
    { name: 'pricing', patterns: [/id=["']pricing/i, /<!-- pricing/i, /pricing.*(section|plans)/i] },
    { name: 'testimonials', patterns: [/id=["']testimonials/i, /<!-- testimonials/i, /testimonial/i, /reviews/i] },
    { name: 'team', patterns: [/id=["']team/i, /<!-- team/i, /our team/i, /trainers/i, /meet.*team/i] },
    { name: 'trainers', patterns: [/id=["']trainers/i, /<!-- trainers/i, /our trainers/i, /meet.*trainers/i] },
    { name: 'gallery', patterns: [/id=["']gallery/i, /<!-- gallery/i] },
    { name: 'faq', patterns: [/id=["']faq/i, /<!-- faq/i, /frequently asked/i] },
    { name: 'contact', patterns: [/id=["']contact/i, /<!-- contact/i, /contact.*(section|us)/i, /get in touch/i] },
    { name: 'cta', patterns: [/id=["']cta/i, /<!-- cta/i, /call.to.action/i] },
    { name: 'footer', patterns: [/<footer/i, /id=["']footer/i, /<!-- footer/i] },
  ];

  let currentSection: { name: string; startLine: number; startTag: string } | null = null;
  let tagDepth = 0;
  let sectionTag = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-indexed

    // If not in a section, look for section starts
    if (!currentSection) {
      for (const { name, patterns } of sectionPatterns) {
        if (patterns.some(p => p.test(line))) {
          // Determine the tag type
          const tagMatch = line.match(/<(section|div|nav|header|footer|aside|article)/i);
          if (tagMatch) {
            currentSection = { name, startLine: lineNum, startTag: tagMatch[1].toLowerCase() };
            sectionTag = tagMatch[1].toLowerCase();
            tagDepth = 1;
            break;
          }
        }
      }
    } else {
      // Count tag depth to find section end
      const openTags = (line.match(new RegExp(`<${sectionTag}[\\s>]`, 'gi')) || []).length;
      const closeTags = (line.match(new RegExp(`</${sectionTag}>`, 'gi')) || []).length;
      
      tagDepth += openTags - closeTags;

      if (tagDepth <= 0) {
        sections.push({
          name: currentSection.name,
          startLine: currentSection.startLine,
          endLine: lineNum,
          startTag: currentSection.startTag
        });
        currentSection = null;
        tagDepth = 0;
      }
    }
  }

  // Handle unclosed section at end of file
  if (currentSection) {
    sections.push({
      name: currentSection.name,
      startLine: currentSection.startLine,
      endLine: lines.length,
      startTag: currentSection.startTag
    });
  }

  return sections;
}

// ============================================================================
// EDIT PLANNING - Determine what lines to modify
// ============================================================================

export function planEdit(code: string, userRequest: string): EditPlan {
  const lower = userRequest.toLowerCase();
  const sections = detectSections(code);
  
  // REMOVE SECTION
  const removeMatch = lower.match(/remove|delete|get rid of|take out/);
  if (removeMatch) {
    // Find which section to remove
    for (const section of sections) {
      if (lower.includes(section.name)) {
        return {
          edits: [{
            type: 'delete',
            range: { start: section.startLine, end: section.endLine },
            description: `Remove ${section.name} section (lines ${section.startLine}-${section.endLine})`
          }],
          requiresFullRewrite: false
        };
      }
    }
    
    // Check for common aliases
    if (lower.includes('trainer') && sections.find(s => s.name === 'team')) {
      const section = sections.find(s => s.name === 'team')!;
      return {
        edits: [{
          type: 'delete',
          range: { start: section.startLine, end: section.endLine },
          description: `Remove trainers/team section (lines ${section.startLine}-${section.endLine})`
        }],
        requiresFullRewrite: false
      };
    }
  }

  // ADD ANIMATION - Usually needs full rewrite to add classes throughout
  if (lower.match(/add.*(animation|animate|fade|slide|hover effect)/)) {
    return {
      edits: [],
      requiresFullRewrite: true,
      reason: 'Animations require modifications throughout the file'
    };
  }

  // CHANGE COLOR - Could be surgical if specific, full if "all colors"
  if (lower.match(/change.*(color|colour)/)) {
    if (lower.includes('all') || lower.includes('theme') || lower.includes('scheme')) {
      return {
        edits: [],
        requiresFullRewrite: true,
        reason: 'Color scheme change affects entire file'
      };
    }
    // Specific color change could be surgical but complex to detect
    return {
      edits: [],
      requiresFullRewrite: true,
      reason: 'Color changes may affect multiple elements'
    };
  }

  // ADD SECTION - Needs to insert new content
  const addMatch = lower.match(/add.*(section|faq|pricing|testimonial|contact|about)/);
  if (addMatch) {
    // Find where to insert (usually before footer or at end)
    const footer = sections.find(s => s.name === 'footer');
    const insertPoint = footer ? footer.startLine - 1 : null;
    
    return {
      edits: [{
        type: 'insert',
        insertAfter: insertPoint || undefined,
        description: `Add new section before footer`
      }],
      requiresFullRewrite: true, // Need AI to generate the new section content
      reason: 'New section needs to be generated'
    };
  }

  // DEFAULT: Full rewrite for complex changes
  return {
    edits: [],
    requiresFullRewrite: true,
    reason: 'Complex edit requires full context'
  };
}

// ============================================================================
// SURGICAL EDIT EXECUTION
// ============================================================================

export function applySurgicalEdit(code: string, edit: SurgicalEdit): string {
  const lines = code.split('\n');
  
  switch (edit.type) {
    case 'delete':
      if (edit.range) {
        // Remove lines (convert to 0-indexed)
        lines.splice(edit.range.start - 1, edit.range.end - edit.range.start + 1);
      }
      break;
      
    case 'replace':
      if (edit.range && edit.newContent) {
        const newLines = edit.newContent.split('\n');
        lines.splice(edit.range.start - 1, edit.range.end - edit.range.start + 1, ...newLines);
      }
      break;
      
    case 'insert':
      if (edit.insertAfter !== undefined && edit.newContent) {
        const newLines = edit.newContent.split('\n');
        lines.splice(edit.insertAfter, 0, ...newLines);
      }
      break;
  }
  
  return lines.join('\n');
}

export function applyAllEdits(code: string, edits: SurgicalEdit[]): string {
  let result = code;
  
  // Apply edits in reverse order (so line numbers stay valid)
  const sortedEdits = [...edits].sort((a, b) => {
    const aLine = a.range?.start || a.insertAfter || 0;
    const bLine = b.range?.start || b.insertAfter || 0;
    return bLine - aLine; // Descending
  });
  
  for (const edit of sortedEdits) {
    result = applySurgicalEdit(result, edit);
  }
  
  return result;
}

// ============================================================================
// PROMPT FOR SURGICAL EDITS
// ============================================================================

export const SURGICAL_EDIT_PROMPT = `You are Buildr. The user wants a quick edit.

## YOUR TASK
Make ONLY the specific change requested. Do not modify anything else.

## RULES
1. Output ONLY the modified section/lines, not the entire file
2. Preserve all existing code outside the edit area
3. Keep the same indentation and formatting style

## RESPONSE FORMAT FOR DELETIONS
"Removing [section name]...

Lines [X] to [Y] deleted.

Done - removed the [section name] section."

## RESPONSE FORMAT FOR MODIFICATIONS
"Updating [element]...

\`\`\`html
[ONLY the modified lines/section]
\`\`\`

Replace lines [X] to [Y] with the above.

Done - [what changed]."

## RESPONSE FORMAT FOR ADDITIONS
"Adding [section]...

\`\`\`html
[new section code]
\`\`\`

Insert after line [X].

Done - added [section] [location]."`;

// ============================================================================
// QUICK EDIT DETERMINATION
// ============================================================================

export type EditApproach = 'surgical' | 'full';

export function determineEditApproach(code: string, userRequest: string): { 
  approach: EditApproach; 
  plan?: EditPlan;
  estimatedTime: string;
} {
  const plan = planEdit(code, userRequest);
  
  if (!plan.requiresFullRewrite && plan.edits.length > 0) {
    return {
      approach: 'surgical',
      plan,
      estimatedTime: '5-10 seconds'
    };
  }
  
  return {
    approach: 'full',
    plan,
    estimatedTime: '20-40 seconds'
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  detectSections,
  planEdit,
  applySurgicalEdit,
  applyAllEdits,
  determineEditApproach,
  SURGICAL_EDIT_PROMPT
};
