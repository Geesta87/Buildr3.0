// ============================================================================
// BUILDR SYSTEMS DNA v2 - RESEARCH PROMPT
// ============================================================================
// Used when the domain is UNKNOWN to research before building.
// This makes Buildr capable of handling ANY industry, not just known ones.
// ============================================================================

export const RESEARCH_PROMPT = `You are researching a business type or system to understand how it works before building.

Your goal: Understand this domain well enough to build a complete, realistic system.

## WHAT TO RESEARCH

1. **How does this type of business/system actually work?**
   - What's the customer journey?
   - What's the business model?
   - Who are the key users/actors?

2. **What features do similar businesses have on their websites/apps?**
   - What's standard/expected?
   - What's a differentiator?
   - What do customers look for?

3. **What data needs to be tracked?**
   - What entities exist?
   - How do they relate?
   - What fields are needed?

4. **What are the industry-specific patterns?**
   - Terminology used
   - Common workflows
   - Regulatory requirements (if any)

5. **What questions should I ask the user?**
   - What decisions affect how I build this?
   - What can't I assume?

## OUTPUT FORMAT

Return a structured understanding:

\`\`\`
DOMAIN: [Business/system type]

HOW IT WORKS:
[2-3 sentences on business model and customer journey]

USER TYPES:
• [User 1]: [What they do]
• [User 2]: [What they do]

EXPECTED FEATURES:
• [Feature 1]
• [Feature 2]
• [Feature 3]

KEY PATTERNS:
• [Pattern 1 — why it matters]
• [Pattern 2 — why it matters]

DATA ENTITIES:
• [Entity]: [key fields]
• [Entity]: [key fields]

QUESTIONS TO ASK USER:
• [Question 1] — Options: [A, B, C]
• [Question 2] — Options: [A, B, C]

THINGS TO BE CAREFUL ABOUT:
• [Consideration 1]
• [Consideration 2]
\`\`\`

## EXAMPLE

If researching "horse boarding facility":

\`\`\`
DOMAIN: Horse Boarding Facility

HOW IT WORKS:
Horse boarding facilities house and care for horses owned by others. Revenue comes from monthly board fees plus additional services (training, lessons, farrier coordination). Horse owners visit regularly and expect updates on their horse's health and care.

USER TYPES:
• Horse Owner: Checks on horse, books services, pays board, communicates with staff
• Barn Manager: Manages stalls, schedules, feeding, health records, billing
• Trainer: Manages lesson schedule, tracks student progress (if facility offers training)

EXPECTED FEATURES:
• Stall availability and booking
• Horse profiles (health records, feeding instructions, vet/farrier info)
• Service booking (training, lessons, turnout)
• Billing and payments
• Communication/updates for owners
• Calendar (events, vet visits, farrier)

KEY PATTERNS:
• Horse owners are VERY particular — detailed horse profiles are essential
• Monthly boarding + à la carte services is the business model
• Health/feeding instructions must be accessible to all staff
• Photo updates of horses make owners happy
• Emergency contact info is critical

DATA ENTITIES:
• Horse: name, breed, age, color, owner_id, stall_id, health_notes, feeding_instructions, vet, farrier, emergency_contact
• Owner: name, email, phone, horses, balance, payment_method
• Stall: number, size, type (stall, paddock, pasture), status, current_horse_id
• Service: name, price, duration, category
• Booking: horse_id, service_id, date, time, status, notes

QUESTIONS TO ASK USER:
• What services do you offer beyond basic board? — Options: Training, Lessons, Breeding, Rehab, Just boarding
• How do owners pay? — Options: Monthly auto-charge, Invoice, Pay at facility

THINGS TO BE CAREFUL ABOUT:
• Horse health records are sensitive — consider privacy
• Multiple horses per owner is common
• Feeding schedules are precise and critical
\`\`\`

Now apply this research approach to understand the user's domain.
`;

// ============================================================================
// RESEARCH TRIGGER LOGIC
// ============================================================================

export function shouldTriggerResearch(
  prompt: string,
  detectedDomain: string | null,
  complexity: 'simple' | 'moderate' | 'complex'
): boolean {
  // If we don't recognize the domain, research
  if (!detectedDomain) {
    return true;
  }
  
  // If it's complex and we want extra confidence, research
  if (complexity === 'complex') {
    // Check for unusual combinations or specifics that might need research
    const lower = prompt.toLowerCase();
    const specificSignals = [
      'compliance',
      'regulation',
      'specific state',
      'integration with',
      'api',
      'sync with',
      'like [company name]',
      'industry standard'
    ];
    
    if (specificSignals.some(signal => lower.includes(signal))) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// FORMAT RESEARCH RESULTS FOR PROMPT INJECTION
// ============================================================================

export function formatResearchResults(research: string): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
RESEARCH FINDINGS
═══════════════════════════════════════════════════════════════════════════════

Based on research about this type of business/system:

${research}

Use these findings to inform your build. Apply these patterns and include these features.
`;
}

// ============================================================================
// EXAMPLE: How research would be triggered in the main flow
// ============================================================================

/*
async function handleRequest(userMessage: string) {
  // 1. Try to detect domain from our knowledge base
  const domain = detectDomain(userMessage);
  
  // 2. Detect complexity
  const complexity = detectComplexity(userMessage);
  
  // 3. Check if research is needed
  if (shouldTriggerResearch(userMessage, domain, complexity.level)) {
    // Trigger web search
    const searchQuery = extractSearchQuery(userMessage);
    const searchResults = await webSearch(searchQuery);
    
    // Use AI to synthesize research
    const researchSynthesis = await synthesizeResearch(searchResults, userMessage);
    
    // Add to prompt
    promptAddition = formatResearchResults(researchSynthesis);
  } else if (domain) {
    // Use baked-in knowledge
    promptAddition = formatDomainKnowledge(domain);
  }
  
  // 4. Continue with build...
}
*/

export default RESEARCH_PROMPT;
