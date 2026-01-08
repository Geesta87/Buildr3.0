// ============================================================================
// BUILDR AGENT v4 - CORE INTELLIGENCE
// ============================================================================
// This is the brain of Buildr. It determines:
// 1. What the user wants (intent)
// 2. How complex it is (complexity)
// 3. What mode to use (chat vs build)
// 4. How to execute (direct vs planned vs incremental)
// ============================================================================

// ============================================================================
// SECTION 1: INTENT DETECTION
// ============================================================================

export type Intent = 
  | 'chat'           // User wants to discuss, ask questions, get opinions
  | 'build'          // User wants something new created
  | 'edit'           // User wants to modify existing code
  | 'fix'            // User reports a bug or something broken
  | 'explain'        // User wants explanation of code or concept
  | 'unclear';       // Can't determine intent

export interface IntentResult {
  intent: Intent;
  confidence: number;  // 0-1
  signals: string[];   // What triggered this classification
}

const CHAT_PATTERNS = [
  /^(what do you think|how should|should i|can you explain|tell me about|what('s| is) the (best|difference)|compare)/i,
  /^(i('m| am) (thinking|wondering|curious)|do you (think|recommend))/i,
  /\?$/,  // Ends with question mark (weak signal)
  /^(hey|hi|hello|yo)\b/i,  // Greetings
  /(opinion|advice|suggest|recommendation|idea|thought)/i,
];

const BUILD_PATTERNS = [
  /^(build|create|make|generate|design|set up|setup)\b/i,
  /(landing page|website|dashboard|app|application|portal|system)/i,
  /^(i need|i want|give me|can you (build|create|make))/i,
  /(for my|for a|for the)\s+\w+\s*(business|company|shop|store|site)/i,
];

const EDIT_PATTERNS = [
  /^(change|update|modify|edit|adjust|tweak|make the|make it)/i,
  /(bigger|smaller|larger|different|new|another|more|less)\b/i,
  /^(add|remove|delete|replace|swap|move)\b/i,
  /(color|font|size|spacing|layout|style|text|image|section)/i,
];

const FIX_PATTERNS = [
  /^(fix|debug|repair|solve|resolve)\b/i,
  /(not working|doesn't work|broken|bug|error|issue|problem|wrong)/i,
  /(won't|can't|doesn't|isn't)\s+\w+/i,
  /(crashed|failing|failed|stuck)/i,
];

const EXPLAIN_PATTERNS = [
  /^(explain|how does|what does|why does|walk me through)/i,
  /(how do i|how can i|how to)\b/i,
  /^(what is|what are|what's)\b/i,
];

export function detectIntent(message: string): IntentResult {
  const signals: string[] = [];
  const scores: Record<Intent, number> = {
    chat: 0,
    build: 0,
    edit: 0,
    fix: 0,
    explain: 0,
    unclear: 0
  };

  // Check each pattern category
  for (const pattern of CHAT_PATTERNS) {
    if (pattern.test(message)) {
      scores.chat += pattern.source.includes('^') ? 2 : 1;
      signals.push(`chat: ${pattern.source.slice(0, 30)}`);
    }
  }

  for (const pattern of BUILD_PATTERNS) {
    if (pattern.test(message)) {
      scores.build += pattern.source.includes('^') ? 2 : 1;
      signals.push(`build: ${pattern.source.slice(0, 30)}`);
    }
  }

  for (const pattern of EDIT_PATTERNS) {
    if (pattern.test(message)) {
      scores.edit += pattern.source.includes('^') ? 2 : 1;
      signals.push(`edit: ${pattern.source.slice(0, 30)}`);
    }
  }

  for (const pattern of FIX_PATTERNS) {
    if (pattern.test(message)) {
      scores.fix += pattern.source.includes('^') ? 2 : 1;
      signals.push(`fix: ${pattern.source.slice(0, 30)}`);
    }
  }

  for (const pattern of EXPLAIN_PATTERNS) {
    if (pattern.test(message)) {
      scores.explain += pattern.source.includes('^') ? 2 : 1;
      signals.push(`explain: ${pattern.source.slice(0, 30)}`);
    }
  }

  // Find highest scoring intent
  const entries = Object.entries(scores) as [Intent, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  
  const [topIntent, topScore] = sorted[0];
  const [secondIntent, secondScore] = sorted[1];
  
  // Calculate confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? topScore / totalScore : 0;
  
  // If scores are too close or too low, mark as unclear
  if (topScore < 2 || (secondScore > 0 && topScore - secondScore < 1)) {
    return {
      intent: topScore >= 2 ? topIntent : 'unclear',
      confidence: Math.min(confidence, 0.6),
      signals
    };
  }

  return {
    intent: topIntent,
    confidence: Math.min(confidence, 1),
    signals
  };
}

// ============================================================================
// SECTION 2: COMPLEXITY DETECTION
// ============================================================================

export type Complexity = 'simple' | 'moderate' | 'complex';

export interface ComplexityResult {
  level: Complexity;
  score: number;
  signals: string[];
  requirements: {
    needsDatabase: boolean;
    needsAuth: boolean;
    needsRealtime: boolean;
    needsMultiFile: boolean;
    needsAPI: boolean;
  };
  suggestedPhases?: string[];
}

const COMPLEXITY_SIGNALS: Record<string, { pattern: RegExp; weight: number; requirement?: keyof ComplexityResult['requirements'] }> = {
  // Database signals
  dashboard: { pattern: /dashboard/i, weight: 2, requirement: 'needsDatabase' },
  admin: { pattern: /admin\s*(panel|portal)?/i, weight: 2, requirement: 'needsDatabase' },
  crud: { pattern: /\b(crud|create|read|update|delete)\b.*\b(data|record|entry)/i, weight: 2, requirement: 'needsDatabase' },
  inventory: { pattern: /inventory|stock|warehouse/i, weight: 2, requirement: 'needsDatabase' },
  orders: { pattern: /orders?|transactions?|purchases?/i, weight: 2, requirement: 'needsDatabase' },
  customers: { pattern: /customers?|clients?|users?\s*(list|table|management)/i, weight: 2, requirement: 'needsDatabase' },
  booking: { pattern: /booking|appointment|scheduling|reservation/i, weight: 2, requirement: 'needsDatabase' },
  tracking: { pattern: /track(ing)?|monitor(ing)?|analytics/i, weight: 1, requirement: 'needsDatabase' },
  
  // Auth signals
  login: { pattern: /log\s*in|sign\s*in|authentication/i, weight: 2, requirement: 'needsAuth' },
  signup: { pattern: /sign\s*up|register|create\s*account/i, weight: 2, requirement: 'needsAuth' },
  roles: { pattern: /roles?|permissions?|access\s*control/i, weight: 2, requirement: 'needsAuth' },
  portal: { pattern: /portal|member\s*area|private/i, weight: 1, requirement: 'needsAuth' },
  
  // Realtime signals
  realtime: { pattern: /real-?\s*time|live|instant/i, weight: 2, requirement: 'needsRealtime' },
  notifications: { pattern: /notifications?|alerts?|push/i, weight: 1, requirement: 'needsRealtime' },
  chat: { pattern: /chat|messaging|conversation/i, weight: 2, requirement: 'needsRealtime' },
  
  // Multi-file signals
  multiPage: { pattern: /multiple\s*pages?|several\s*pages?/i, weight: 2, requirement: 'needsMultiFile' },
  components: { pattern: /components?|modules?|separate\s*files?/i, weight: 1, requirement: 'needsMultiFile' },
  
  // API signals
  api: { pattern: /\bapi\b|endpoint|integration/i, weight: 2, requirement: 'needsAPI' },
  thirdParty: { pattern: /stripe|twilio|sendgrid|mailchimp|zapier/i, weight: 2, requirement: 'needsAPI' },
  
  // General complexity signals
  fullStack: { pattern: /full-?\s*stack|complete\s*system/i, weight: 3 },
  ecommerce: { pattern: /e-?\s*commerce|online\s*store|shop/i, weight: 3 },
  saas: { pattern: /\bsaas\b|software\s*as\s*a\s*service/i, weight: 3 },
  platform: { pattern: /platform|marketplace/i, weight: 3 },
  crm: { pattern: /\bcrm\b|customer\s*relationship/i, weight: 3 },
};

const SIMPLE_SIGNALS = [
  /^(simple|basic|quick|easy)\b/i,
  /landing\s*page/i,
  /\b(one|single)\s*page/i,
  /static/i,
  /brochure/i,
];

export function detectComplexity(message: string, hasExistingCode: boolean = false): ComplexityResult {
  const signals: string[] = [];
  let score = 0;
  
  const requirements = {
    needsDatabase: false,
    needsAuth: false,
    needsRealtime: false,
    needsMultiFile: false,
    needsAPI: false,
  };

  // Check for simple signals first
  for (const pattern of SIMPLE_SIGNALS) {
    if (pattern.test(message)) {
      score -= 1;
      signals.push(`simple: ${pattern.source.slice(0, 20)}`);
    }
  }

  // Check complexity signals
  for (const [name, config] of Object.entries(COMPLEXITY_SIGNALS)) {
    if (config.pattern.test(message)) {
      score += config.weight;
      signals.push(`${name}: +${config.weight}`);
      
      if (config.requirement) {
        requirements[config.requirement] = true;
      }
    }
  }

  // If editing existing code, reduce complexity
  if (hasExistingCode) {
    score = Math.max(0, score - 2);
    signals.push('existing-code: -2');
  }

  // Determine level
  let level: Complexity;
  if (score <= 1) {
    level = 'simple';
  } else if (score <= 4) {
    level = 'moderate';
  } else {
    level = 'complex';
  }

  // Suggest phases for complex builds
  let suggestedPhases: string[] | undefined;
  if (level === 'complex') {
    suggestedPhases = generatePhases(requirements, message);
  }

  return {
    level,
    score,
    signals,
    requirements,
    suggestedPhases
  };
}

function generatePhases(requirements: ComplexityResult['requirements'], message: string): string[] {
  const phases: string[] = [];
  
  // Phase 1: Always start with core UI
  phases.push('Phase 1: Core layout and navigation');
  
  // Phase 2: Main content/features
  if (message.match(/dashboard/i)) {
    phases.push('Phase 2: Dashboard stats and data display');
  } else if (message.match(/booking|appointment/i)) {
    phases.push('Phase 2: Booking interface and calendar');
  } else {
    phases.push('Phase 2: Main content sections');
  }
  
  // Phase 3: Based on requirements
  if (requirements.needsAuth) {
    phases.push('Phase 3: Authentication (login/signup)');
  }
  
  if (requirements.needsDatabase) {
    phases.push(`Phase ${phases.length + 1}: Data management and CRUD operations`);
  }
  
  if (requirements.needsAPI) {
    phases.push(`Phase ${phases.length + 1}: API integrations`);
  }
  
  // Final phase
  phases.push(`Phase ${phases.length + 1}: Polish and error handling`);
  
  return phases;
}

// ============================================================================
// SECTION 3: MODE SELECTION
// ============================================================================

export type Mode = 'chat' | 'plan' | 'build' | 'edit' | 'fix';

export interface ModeDecision {
  mode: Mode;
  reasoning: string;
  shouldAskClarification: boolean;
  clarificationQuestion?: string;
}

export function decideMode(
  intent: IntentResult,
  complexity: ComplexityResult,
  hasExistingCode: boolean,
  messageLength: number
): ModeDecision {
  
  // Low confidence = ask for clarification
  if (intent.confidence < 0.5) {
    return {
      mode: 'chat',
      reasoning: 'Intent unclear',
      shouldAskClarification: true,
      clarificationQuestion: 'I want to make sure I understand - are you looking to build something new, make changes to what we have, or just discuss ideas?'
    };
  }

  // Chat intent = stay in chat mode
  if (intent.intent === 'chat' || intent.intent === 'explain') {
    return {
      mode: 'chat',
      reasoning: 'User wants discussion/explanation',
      shouldAskClarification: false
    };
  }

  // Fix intent = fix mode
  if (intent.intent === 'fix') {
    return {
      mode: 'fix',
      reasoning: 'User reported an issue',
      shouldAskClarification: false
    };
  }

  // Edit intent = edit mode
  if (intent.intent === 'edit') {
    if (!hasExistingCode) {
      return {
        mode: 'chat',
        reasoning: 'Edit requested but no existing code',
        shouldAskClarification: true,
        clarificationQuestion: "I don't see any existing code to edit. Would you like me to build something first?"
      };
    }
    return {
      mode: 'edit',
      reasoning: 'User wants to modify existing code',
      shouldAskClarification: false
    };
  }

  // Build intent - check complexity
  if (intent.intent === 'build') {
    // Simple = just build
    if (complexity.level === 'simple') {
      return {
        mode: 'build',
        reasoning: 'Simple build request',
        shouldAskClarification: false
      };
    }
    
    // Moderate = build, but might ask one question
    if (complexity.level === 'moderate') {
      // If message is very short, might need clarification
      if (messageLength < 50) {
        return {
          mode: 'plan',
          reasoning: 'Moderate complexity with short request',
          shouldAskClarification: true,
          clarificationQuestion: generateClarificationQuestion(complexity)
        };
      }
      return {
        mode: 'build',
        reasoning: 'Moderate complexity with sufficient detail',
        shouldAskClarification: false
      };
    }
    
    // Complex = plan first
    return {
      mode: 'plan',
      reasoning: 'Complex build requires planning',
      shouldAskClarification: false
    };
  }

  // Default
  return {
    mode: 'chat',
    reasoning: 'Default to chat mode',
    shouldAskClarification: true,
    clarificationQuestion: 'What would you like me to help you with?'
  };
}

function generateClarificationQuestion(complexity: ComplexityResult): string {
  if (complexity.requirements.needsAuth && complexity.requirements.needsDatabase) {
    return 'This sounds like it needs user accounts and data storage. Before I build, should users be able to sign up, or is this admin-only?';
  }
  
  if (complexity.requirements.needsDatabase) {
    return 'Should this save data permanently, or is a demo/prototype okay for now?';
  }
  
  if (complexity.requirements.needsAuth) {
    return 'Will this need user login, or should everything be publicly accessible?';
  }
  
  return 'Just to make sure I build the right thing - what\'s the main goal here?';
}

// ============================================================================
// SECTION 4: CONTEXT TRACKING
// ============================================================================

export interface ConversationContext {
  // What has been built
  sectionsBuilt: string[];
  featuresImplemented: string[];
  
  // Design decisions
  colorScheme: string | null;
  fontChoice: string | null;
  stylePreferences: string[];
  
  // Technical state
  hasDatabase: boolean;
  hasAuth: boolean;
  hasExistingCode: boolean;
  codeVersion: number;
  
  // History
  recentChanges: Array<{
    description: string;
    timestamp: number;
  }>;
  
  // Domain
  detectedDomain: string | null;
  businessName: string | null;
  businessType: string | null;
}

export function extractContext(code: string | null, messages: Array<{ role: string; content: string }>): ConversationContext {
  const context: ConversationContext = {
    sectionsBuilt: [],
    featuresImplemented: [],
    colorScheme: null,
    fontChoice: null,
    stylePreferences: [],
    hasDatabase: false,
    hasAuth: false,
    hasExistingCode: !!code,
    codeVersion: 0,
    recentChanges: [],
    detectedDomain: null,
    businessName: null,
    businessType: null,
  };

  if (code) {
    // Detect sections from code
    if (/hero|banner|jumbotron/i.test(code)) context.sectionsBuilt.push('hero');
    if (/<nav|navigation/i.test(code)) context.sectionsBuilt.push('navigation');
    if (/about|who we are/i.test(code)) context.sectionsBuilt.push('about');
    if (/services|what we (do|offer)/i.test(code)) context.sectionsBuilt.push('services');
    if (/features|benefits/i.test(code)) context.sectionsBuilt.push('features');
    if (/testimonial|review/i.test(code)) context.sectionsBuilt.push('testimonials');
    if (/pricing|plans/i.test(code)) context.sectionsBuilt.push('pricing');
    if (/contact|get in touch/i.test(code)) context.sectionsBuilt.push('contact');
    if (/<footer/i.test(code)) context.sectionsBuilt.push('footer');
    if (/gallery|portfolio/i.test(code)) context.sectionsBuilt.push('gallery');
    if (/faq/i.test(code)) context.sectionsBuilt.push('faq');
    
    // Detect features
    if (/dark:|darkMode/i.test(code)) context.featuresImplemented.push('dark-mode');
    if (/aos|animate/i.test(code)) context.featuresImplemented.push('animations');
    if (/chart\.js|recharts/i.test(code)) context.featuresImplemented.push('charts');
    if (/<form/i.test(code)) context.featuresImplemented.push('forms');
    if (/supabase/i.test(code)) {
      context.hasDatabase = true;
      context.featuresImplemented.push('database');
    }
    if (/auth|login|signup/i.test(code)) {
      context.hasAuth = true;
      context.featuresImplemented.push('auth');
    }
    
    // Detect color scheme
    const colorMatch = code.match(/(?:bg|text|border)-(blue|indigo|purple|green|red|orange|yellow|pink|teal|cyan)-\d{2,3}/);
    if (colorMatch) {
      context.colorScheme = colorMatch[1];
    }
    
    // Detect fonts
    const fontMatch = code.match(/font-family:\s*['"]?([^'",;]+)/);
    if (fontMatch) {
      context.fontChoice = fontMatch[1].trim();
    }
  }

  // Extract from conversation history
  for (const msg of messages) {
    const content = msg.content.toLowerCase();
    
    // Look for business info
    const businessMatch = content.match(/(?:my|our|a)\s+(\w+(?:\s+\w+)?)\s+(?:business|company|shop|store|website|site)/);
    if (businessMatch) {
      context.businessType = businessMatch[1];
    }
    
    // Look for business name
    const nameMatch = content.match(/(?:called|named)\s+["']?([^"'\n,]+)["']?/i);
    if (nameMatch) {
      context.businessName = nameMatch[1].trim();
    }
  }

  return context;
}

export function formatContextForPrompt(context: ConversationContext): string {
  const parts: string[] = [];
  
  if (context.sectionsBuilt.length > 0) {
    parts.push(`Current sections: ${context.sectionsBuilt.join(', ')}`);
  }
  
  if (context.colorScheme) {
    parts.push(`Color scheme: ${context.colorScheme}`);
  }
  
  if (context.fontChoice) {
    parts.push(`Font: ${context.fontChoice}`);
  }
  
  if (context.featuresImplemented.length > 0) {
    parts.push(`Features: ${context.featuresImplemented.join(', ')}`);
  }
  
  if (context.businessType) {
    parts.push(`Business type: ${context.businessType}`);
  }
  
  if (context.businessName) {
    parts.push(`Business name: ${context.businessName}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'No existing context';
}

// ============================================================================
// SECTION 5: MAIN ORCHESTRATOR
// ============================================================================

export interface AgentDecision {
  mode: Mode;
  intent: IntentResult;
  complexity: ComplexityResult;
  context: ConversationContext;
  shouldAskClarification: boolean;
  clarificationQuestion?: string;
  suggestedPhases?: string[];
  promptEnhancements: string[];
}

export function orchestrate(
  userMessage: string,
  currentCode: string | null,
  conversationHistory: Array<{ role: string; content: string }>
): AgentDecision {
  
  // Step 1: Detect intent
  const intent = detectIntent(userMessage);
  console.log(`[Agent v4] Intent: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}%)`);
  
  // Step 2: Detect complexity
  const complexity = detectComplexity(userMessage, !!currentCode);
  console.log(`[Agent v4] Complexity: ${complexity.level} (score: ${complexity.score})`);
  
  // Step 3: Extract context
  const context = extractContext(currentCode, conversationHistory);
  console.log(`[Agent v4] Context: ${context.sectionsBuilt.length} sections, ${context.featuresImplemented.length} features`);
  
  // Step 4: Decide mode
  const modeDecision = decideMode(intent, complexity, !!currentCode, userMessage.length);
  console.log(`[Agent v4] Mode: ${modeDecision.mode} - ${modeDecision.reasoning}`);
  
  // Step 5: Determine prompt enhancements
  const promptEnhancements: string[] = [];
  
  if (complexity.requirements.needsDatabase) {
    promptEnhancements.push('database-patterns');
  }
  if (complexity.requirements.needsAuth) {
    promptEnhancements.push('auth-patterns');
  }
  if (context.colorScheme) {
    promptEnhancements.push(`maintain-color-scheme:${context.colorScheme}`);
  }
  if (context.fontChoice) {
    promptEnhancements.push(`maintain-font:${context.fontChoice}`);
  }
  
  return {
    mode: modeDecision.mode,
    intent,
    complexity,
    context,
    shouldAskClarification: modeDecision.shouldAskClarification,
    clarificationQuestion: modeDecision.clarificationQuestion,
    suggestedPhases: complexity.suggestedPhases,
    promptEnhancements
  };
}

export default {
  detectIntent,
  detectComplexity,
  decideMode,
  extractContext,
  formatContextForPrompt,
  orchestrate
};
