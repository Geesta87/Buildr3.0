// ============================================================================
// BUILDR SYSTEMS DNA v2 - INTEGRATION LOGIC
// ============================================================================
// This file shows how all the pieces connect together.
// Use this to understand how to implement Systems DNA in Buildr.
// ============================================================================

import { SYSTEMS_DNA_CORE } from './systems-dna-core';
import { DOMAIN_KNOWLEDGE, detectDomain, formatDomainKnowledge } from './domain-knowledge';
import { RESEARCH_PROMPT, shouldTriggerResearch, formatResearchResults } from './research-prompt';
import { UI_PATTERNS } from './ui-patterns';
import { DATABASE_PATTERNS } from './database-patterns';
import { AUTH_PATTERNS } from './auth-patterns';

// ============================================================================
// COMPLEXITY DETECTION
// ============================================================================

export interface ComplexityResult {
  level: 'simple' | 'moderate' | 'complex';
  signals: string[];
  needsDatabase: boolean;
  needsAuth: boolean;
  needsRealtime: boolean;
}

export function detectComplexity(prompt: string): ComplexityResult {
  const lower = prompt.toLowerCase();
  const signals: string[] = [];
  
  // Check for complexity signals
  const patterns: Record<string, RegExp> = {
    multiUser: /multiple (users?|people|staff|employees)|team|roles?|permissions?|admin|different (people|users)/i,
    database: /inventory|tracking|management|orders?|customers?|clients?|booking|appointments?|reservations?|catalog|products?|dashboard/i,
    auth: /login|sign ?in|accounts?|portal|dashboard|authentication|users?|members?/i,
    realtime: /real-?time|live|sync|notifications?|instant|updates?/i,
    multiRole: /admin|owner|staff|manager|customer|client|wholesaler|vendor|employee/i,
    ecommerce: /shop|store|cart|checkout|payment|buy|purchase|order|sell/i,
    scheduling: /book|schedule|appointment|reservation|calendar|availability/i,
    loyalty: /loyalty|points?|rewards?|redeem/i,
    crud: /add|edit|delete|update|create|manage|track/i,
  };
  
  for (const [signal, pattern] of Object.entries(patterns)) {
    if (pattern.test(lower)) {
      signals.push(signal);
    }
  }
  
  const score = signals.length;
  
  // Determine level
  let level: 'simple' | 'moderate' | 'complex';
  if (score >= 4) {
    level = 'complex';
  } else if (score >= 2) {
    level = 'moderate';
  } else {
    level = 'simple';
  }
  
  return {
    level,
    signals,
    needsDatabase: signals.some(s => ['database', 'ecommerce', 'scheduling', 'loyalty', 'crud', 'multiUser'].includes(s)),
    needsAuth: signals.some(s => ['auth', 'multiUser', 'multiRole', 'portal'].includes(s)),
    needsRealtime: signals.includes('realtime'),
  };
}

// ============================================================================
// SMART QUESTIONS CHECK
// ============================================================================

export interface SmartQuestion {
  id: string;
  question: string;
  options: string[];
  allowOther: boolean;
}

export interface QuestionsResult {
  needsQuestions: boolean;
  reasoning?: string;
  questions?: SmartQuestion[];
}

// Get questions from domain knowledge if available
export function getSmartQuestions(prompt: string, domain: string | null): QuestionsResult {
  // If we have domain knowledge with questions, use those
  if (domain && DOMAIN_KNOWLEDGE[domain]?.questionsToAsk) {
    const domainQuestions = DOMAIN_KNOWLEDGE[domain].questionsToAsk;
    
    // Check if the prompt already answers the questions
    const lower = prompt.toLowerCase();
    const unansweredQuestions = domainQuestions.filter(q => {
      // Simple heuristic: if any option keywords are in the prompt, consider it answered
      const optionKeywords = q.options.flatMap(o => o.toLowerCase().split(' '));
      return !optionKeywords.some(keyword => keyword.length > 4 && lower.includes(keyword));
    });
    
    if (unansweredQuestions.length > 0) {
      return {
        needsQuestions: true,
        reasoning: `Need to understand key details for ${DOMAIN_KNOWLEDGE[domain].industry}`,
        questions: unansweredQuestions.slice(0, 2).map((q, i) => ({
          id: `q${i}`,
          question: q.question,
          options: q.options,
          allowOther: true
        }))
      };
    }
  }
  
  // For unknown domains, the AI will need to determine questions
  return { needsQuestions: false };
}

// ============================================================================
// PROMPT ASSEMBLY
// ============================================================================

export interface PromptConfig {
  userMessage: string;
  domain: string | null;
  complexity: ComplexityResult;
  researchResults?: string;
  previousContext?: string;
}

export function assemblePrompt(config: PromptConfig): string {
  const { userMessage, domain, complexity, researchResults, previousContext } = config;
  
  let prompt = SYSTEMS_DNA_CORE;
  
  // Add domain knowledge OR research results
  if (domain) {
    prompt += '\n\n' + formatDomainKnowledge(domain);
  } else if (researchResults) {
    prompt += '\n\n' + formatResearchResults(researchResults);
  }
  
  // Add UI patterns (always for anything with frontend)
  prompt += '\n\n' + UI_PATTERNS;
  
  // Add database patterns if needed
  if (complexity.needsDatabase) {
    prompt += '\n\n' + DATABASE_PATTERNS;
  }
  
  // Add auth patterns if needed
  if (complexity.needsAuth) {
    prompt += '\n\n' + AUTH_PATTERNS;
  }
  
  // Add previous context if this is a follow-up
  if (previousContext) {
    prompt += `\n\n
═══════════════════════════════════════════════════════════════════════════════
CURRENT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

The user has an existing project. Here's what exists:

${previousContext}

Make changes to the existing code, don't start from scratch unless asked.
`;
  }
  
  return prompt;
}

// ============================================================================
// MAIN FLOW
// ============================================================================

/*
This is how the complete flow works:

1. USER SENDS MESSAGE
   ↓
2. DETECT DOMAIN
   - Check if we recognize the industry/business type
   - Returns: domain key or null
   ↓
3. DETECT COMPLEXITY
   - Analyze for signals (multi-user, database, auth, etc.)
   - Returns: simple | moderate | complex
   ↓
4. CHECK IF RESEARCH NEEDED
   - If domain unknown AND complexity > simple → Research
   - Trigger web search, synthesize results
   ↓
5. CHECK IF QUESTIONS NEEDED
   - Look for critical unknowns
   - If questions exist and unanswered → Ask
   ↓
6. ASSEMBLE PROMPT
   - Start with SYSTEMS_DNA_CORE
   - Add domain knowledge OR research results
   - Add UI_PATTERNS
   - Add DATABASE_PATTERNS if needed
   - Add AUTH_PATTERNS if needed
   ↓
7. GENERATE RESPONSE
   - Send assembled prompt + user message to Claude
   - Stream response back to user
*/

export async function handleBuildRequest(
  userMessage: string,
  currentCode: string | null,
  webSearchFn?: (query: string) => Promise<string>
): Promise<{
  shouldAskQuestions: boolean;
  questions?: SmartQuestion[];
  prompt?: string;
}> {
  
  // Step 1: Detect domain
  const domain = detectDomain(userMessage);
  console.log(`[Buildr] Domain detected: ${domain || 'unknown'}`);
  
  // Step 2: Detect complexity
  const complexity = detectComplexity(userMessage);
  console.log(`[Buildr] Complexity: ${complexity.level}`, complexity.signals);
  
  // Step 3: Check if research needed
  let researchResults: string | undefined;
  if (shouldTriggerResearch(userMessage, domain, complexity.level) && webSearchFn) {
    console.log(`[Buildr] Triggering research for unknown domain`);
    researchResults = await webSearchFn(userMessage);
  }
  
  // Step 4: Check if questions needed
  const questionsResult = getSmartQuestions(userMessage, domain);
  
  // If using AI to determine questions for unknown domains:
  // This would be a separate AI call with SMART_QUESTIONS_PROMPT
  
  if (questionsResult.needsQuestions && questionsResult.questions) {
    return {
      shouldAskQuestions: true,
      questions: questionsResult.questions
    };
  }
  
  // Step 5: Assemble prompt
  const prompt = assemblePrompt({
    userMessage,
    domain,
    complexity,
    researchResults,
    previousContext: currentCode || undefined
  });
  
  return {
    shouldAskQuestions: false,
    prompt
  };
}

// ============================================================================
// EXAMPLE USAGE IN API ROUTE
// ============================================================================

/*
// In your Next.js API route (route.ts):

import { handleBuildRequest } from './systems-dna-v2/integration-logic';

export async function POST(request: NextRequest) {
  const { messages, currentCode } = await request.json();
  const userMessage = messages[messages.length - 1].content;
  
  // Process with Systems DNA
  const result = await handleBuildRequest(
    userMessage,
    currentCode,
    async (query) => {
      // Your web search implementation
      const searchResults = await performWebSearch(query);
      return synthesizeResearch(searchResults);
    }
  );
  
  // If questions needed, return them
  if (result.shouldAskQuestions) {
    return Response.json({
      type: 'questions',
      questions: result.questions
    });
  }
  
  // Otherwise, generate with the assembled prompt
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: result.prompt,
    messages: [{ role: 'user', content: userMessage }],
    stream: true
  });
  
  // Stream response back...
}
*/

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SYSTEMS_DNA_CORE,
  DOMAIN_KNOWLEDGE,
  RESEARCH_PROMPT,
  UI_PATTERNS,
  DATABASE_PATTERNS,
  AUTH_PATTERNS,
  detectDomain,
  formatDomainKnowledge,
  shouldTriggerResearch,
  formatResearchResults
};
