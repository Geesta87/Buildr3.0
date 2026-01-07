// ============================================================================
// BUILDR SYSTEMS DNA v2 - INDEX
// ============================================================================
// Main entry point - exports everything you need
// ============================================================================

// Core brain
export { SYSTEMS_DNA_CORE, default as SystemsDnaCore } from './systems-dna-core';

// Domain knowledge
export { 
  DOMAIN_KNOWLEDGE, 
  detectDomain, 
  formatDomainKnowledge,
  default as DomainKnowledge 
} from './domain-knowledge';

// Research capability
export { 
  RESEARCH_PROMPT, 
  shouldTriggerResearch, 
  formatResearchResults,
  default as ResearchPrompt 
} from './research-prompt';

// Pattern modules
export { UI_PATTERNS, default as UiPatterns } from './ui-patterns';
export { DATABASE_PATTERNS, default as DatabasePatterns } from './database-patterns';
export { AUTH_PATTERNS, default as AuthPatterns } from './auth-patterns';

// Integration logic
export {
  detectComplexity,
  getSmartQuestions,
  assemblePrompt,
  handleBuildRequest,
  type ComplexityResult,
  type SmartQuestion,
  type QuestionsResult,
  type PromptConfig
} from './integration-logic';

// ============================================================================
// QUICK START
// ============================================================================
/*

import { handleBuildRequest } from './buildr-systems-dna-v2';

// In your API route:
const result = await handleBuildRequest(userMessage, currentCode);

if (result.shouldAskQuestions) {
  // Return questions to frontend
  return { type: 'questions', questions: result.questions };
}

// Use result.prompt as the system prompt for Claude
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: result.prompt,
  messages: [{ role: 'user', content: userMessage }]
});

*/
