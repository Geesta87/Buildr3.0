// ============================================================================
// BUILDR AGENT v4 - ROUTE INTEGRATION
// ============================================================================
// This file integrates Agent v4 into the existing route.ts
// Add this import and call processWithAgentV4() before your existing logic
// ============================================================================

import {
  orchestrate,
  getPromptForMode,
  formatContextForPrompt,
  type AgentDecision,
  type Mode,
} from './agent-core';

import {
  CHAT_MODE_PROMPT,
  BUILD_MODE_PROMPT,
  EDIT_MODE_PROMPT,
  FIX_MODE_PROMPT,
  PLAN_MODE_PROMPT,
} from './behavioral-prompts';

import { SYSTEMS_DNA_CORE } from '@/lib/buildr-systems-dna-v2/systems-dna-core';
import { detectDomain, formatDomainKnowledge } from '@/lib/buildr-systems-dna-v2/domain-knowledge';
import { DATABASE_PATTERNS } from '@/lib/buildr-systems-dna-v2/database-patterns';
import { AUTH_PATTERNS } from '@/lib/buildr-systems-dna-v2/auth-patterns';
import { UI_PATTERNS } from '@/lib/buildr-systems-dna-v2/ui-patterns';

// ============================================================================
// MAIN INTEGRATION FUNCTION
// ============================================================================

export interface AgentV4Result {
  // Decision from orchestrator
  decision: AgentDecision;
  
  // Should we short-circuit and return early?
  shouldReturnEarly: boolean;
  earlyResponse?: {
    type: 'clarification' | 'chat';
    content: string;
  };
  
  // Enhanced system prompt (if proceeding with generation)
  systemPrompt: string;
  
  // Suggested model based on complexity
  suggestedModel: 'haiku' | 'sonnet' | 'opus';
  
  // Request type for compatibility with existing logic
  mappedRequestType: string;
}

export function processWithAgentV4(
  userMessage: string,
  currentCode: string | null,
  messages: Array<{ role: string; content: string }>,
  existingRequestType?: string
): AgentV4Result {
  
  // Step 1: Run the orchestrator
  const decision = orchestrate(userMessage, currentCode, messages);
  
  console.log(`[Agent v4] Decision:`, {
    mode: decision.mode,
    intent: decision.intent.intent,
    complexity: decision.complexity.level,
    shouldAsk: decision.shouldAskClarification,
  });
  
  // Step 2: Check if we need clarification
  if (decision.shouldAskClarification && decision.clarificationQuestion) {
    return {
      decision,
      shouldReturnEarly: true,
      earlyResponse: {
        type: 'clarification',
        content: decision.clarificationQuestion,
      },
      systemPrompt: '',
      suggestedModel: 'haiku',
      mappedRequestType: 'chat',
    };
  }
  
  // Step 3: Handle chat mode (no code generation)
  if (decision.mode === 'chat') {
    return {
      decision,
      shouldReturnEarly: false, // Let it generate, but with chat prompt
      systemPrompt: buildChatPrompt(decision),
      suggestedModel: 'haiku',
      mappedRequestType: 'chat',
    };
  }
  
  // Step 4: Handle plan mode (complex requests)
  if (decision.mode === 'plan') {
    return {
      decision,
      shouldReturnEarly: false,
      systemPrompt: buildPlanPrompt(decision),
      suggestedModel: 'sonnet',
      mappedRequestType: 'plan',
    };
  }
  
  // Step 5: Map to existing request types for compatibility
  const mappedRequestType = mapModeToRequestType(decision.mode, existingRequestType);
  
  // Step 6: Build the enhanced system prompt
  const systemPrompt = buildSystemPrompt(decision, userMessage);
  
  // Step 7: Determine model based on complexity
  const suggestedModel = decision.complexity.level === 'complex' ? 'sonnet' : 'haiku';
  
  return {
    decision,
    shouldReturnEarly: false,
    systemPrompt,
    suggestedModel,
    mappedRequestType,
  };
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildChatPrompt(decision: AgentDecision): string {
  return `${CHAT_MODE_PROMPT}

## CURRENT CONTEXT
${formatContextForPrompt(decision.context)}

Remember: You're in chat mode. Discuss, explain, suggest - but don't generate code unless specifically asked to build something.
`;
}

function buildPlanPrompt(decision: AgentDecision): string {
  const phases = decision.suggestedPhases?.join('\n• ') || 'To be determined';
  
  return `${PLAN_MODE_PROMPT}

## CURRENT CONTEXT
${formatContextForPrompt(decision.context)}

## DETECTED REQUIREMENTS
- Complexity: ${decision.complexity.level}
- Needs Database: ${decision.complexity.requirements.needsDatabase}
- Needs Auth: ${decision.complexity.requirements.needsAuth}
- Needs Realtime: ${decision.complexity.requirements.needsRealtime}

## SUGGESTED PHASES
• ${phases}

Present a brief plan based on this analysis. Keep it scannable - max 5 bullet points.
`;
}

function buildSystemPrompt(decision: AgentDecision, userMessage: string): string {
  const parts: string[] = [];
  
  // 1. Add behavioral prompt based on mode
  parts.push(getPromptForMode(decision.mode));
  
  // 2. Add Systems DNA Core (engineering thinking)
  parts.push(SYSTEMS_DNA_CORE);
  
  // 3. Add domain knowledge if detected
  const domain = detectDomain(userMessage);
  if (domain) {
    const domainKnowledge = formatDomainKnowledge(domain);
    if (domainKnowledge) {
      parts.push(`\n═══ DOMAIN: ${domain.toUpperCase()} ═══\n${domainKnowledge}`);
    }
  }
  
  // 4. Add UI patterns for build/edit modes
  if (decision.mode === 'build' || decision.mode === 'edit') {
    parts.push(UI_PATTERNS);
  }
  
  // 5. Add database patterns if needed
  if (decision.complexity.requirements.needsDatabase) {
    parts.push(`\n═══ DATABASE PATTERNS ═══\n${DATABASE_PATTERNS}`);
  }
  
  // 6. Add auth patterns if needed
  if (decision.complexity.requirements.needsAuth) {
    parts.push(`\n═══ AUTH PATTERNS ═══\n${AUTH_PATTERNS}`);
  }
  
  // 7. Add context
  const contextStr = formatContextForPrompt(decision.context);
  if (contextStr !== 'No existing context') {
    parts.push(`\n═══ CURRENT CONTEXT ═══\n${contextStr}`);
  }
  
  // 8. Add complexity guidance
  if (decision.complexity.level === 'simple') {
    parts.push(`\n═══ COMPLEXITY: SIMPLE ═══\nBuild clean and focused. Don't overcomplicate.`);
  } else if (decision.complexity.level === 'complex') {
    parts.push(`\n═══ COMPLEXITY: COMPLEX ═══\nBuild complete systems. Include error handling, loading states, and edge cases.`);
  }
  
  return parts.join('\n\n');
}

// ============================================================================
// HELPERS
// ============================================================================

function mapModeToRequestType(mode: Mode, existingType?: string): string {
  // If we have an existing type from specialized detection, prefer it
  if (existingType && existingType !== 'new_build' && existingType !== 'edit') {
    return existingType;
  }
  
  switch (mode) {
    case 'chat':
      return 'chat';
    case 'plan':
      return 'plan';
    case 'build':
      return 'new_build';
    case 'edit':
      return 'edit';
    case 'fix':
      return 'fix';
    default:
      return 'new_build';
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
In your existing route.ts, add this at the top of the POST handler:

import { processWithAgentV4 } from '@/lib/buildr-agent-v4/route-integration';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, currentCode } = body;
  const lastMessage = messages[messages.length - 1].content;
  
  // === AGENT V4 INTEGRATION ===
  const agentResult = processWithAgentV4(lastMessage, currentCode, messages);
  
  // Handle early returns (clarification needed)
  if (agentResult.shouldReturnEarly && agentResult.earlyResponse) {
    return new Response(
      JSON.stringify({ 
        type: agentResult.earlyResponse.type,
        content: agentResult.earlyResponse.content 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Use the enhanced prompt and suggested model
  const systemPrompt = agentResult.systemPrompt;
  const model = agentResult.suggestedModel === 'sonnet' 
    ? 'claude-sonnet-4-20250514' 
    : 'claude-haiku-4-5-20251001';
  
  // Continue with existing generation logic...
  // Or use agentResult.mappedRequestType to route to existing handlers
}
*/

export default {
  processWithAgentV4,
  buildSystemPrompt,
  buildChatPrompt,
  buildPlanPrompt,
};
