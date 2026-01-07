# Buildr Systems DNA v2 - Implementation Guide

## Overview

This guide shows you how to integrate the Systems DNA into your existing Buildr 3 codebase. There are two approaches:

1. **Quick Integration** (Recommended) - Add DNA as a layer on top of existing code
2. **Full Replacement** - Replace the API route entirely

---

## Quick Integration (Recommended)

### Step 1: Copy the DNA Files

The DNA files are already in your project at:
```
src/lib/buildr-systems-dna-v2/
├── index.ts
├── systems-dna-core.ts
├── domain-knowledge.ts
├── research-prompt.ts
├── ui-patterns.ts
├── database-patterns.ts
├── auth-patterns.ts
└── integration-logic.ts
```

### Step 2: Update Your API Route

Open `src/app/api/generate/route.ts` and make these changes:

#### 2a. Add Imports (at the top, after existing imports)

```typescript
// Add after line ~5 (after existing imports)
import { SYSTEMS_DNA_CORE } from "@/lib/buildr-systems-dna-v2/systems-dna-core";
import { detectDomain, formatDomainKnowledge } from "@/lib/buildr-systems-dna-v2/domain-knowledge";
import { UI_PATTERNS } from "@/lib/buildr-systems-dna-v2/ui-patterns";
import { DATABASE_PATTERNS } from "@/lib/buildr-systems-dna-v2/database-patterns";
import { AUTH_PATTERNS } from "@/lib/buildr-systems-dna-v2/auth-patterns";
```

#### 2b. Add Complexity Detection Function (after MODELS constant, ~line 186)

```typescript
// Add after MODELS constant
type ComplexityLevel = "simple" | "moderate" | "complex";

interface ComplexityResult {
  level: ComplexityLevel;
  needsDatabase: boolean;
  needsAuth: boolean;
  signals: string[];
}

function detectComplexity(userMessage: string): ComplexityResult {
  const lower = userMessage.toLowerCase();
  const signals: string[] = [];
  
  const databaseSignals = [
    "dashboard", "admin", "crud", "database", "store data", "save", "track",
    "inventory", "orders", "users", "customers", "analytics", "reports",
    "booking system", "reservation system", "appointment", "schedule",
    "e-commerce", "shopping cart", "checkout", "payment",
    "crm", "management system", "portal", "multi-user"
  ];
  
  const authSignals = [
    "login", "sign up", "register", "authentication", "user account",
    "admin panel", "dashboard", "portal", "member", "subscription",
    "role", "permission", "private", "secure"
  ];
  
  const complexSignals = [
    "saas", "platform", "app", "application", "system",
    "multi-tenant", "api", "integration", "real-time"
  ];
  
  const simpleSignals = [
    "landing page", "website", "homepage", "brochure", "portfolio"
  ];
  
  const needsDatabase = databaseSignals.some(s => lower.includes(s));
  const needsAuth = authSignals.some(s => lower.includes(s));
  const isComplex = complexSignals.some(s => lower.includes(s));
  const isSimple = simpleSignals.some(s => lower.includes(s)) && !needsDatabase && !needsAuth;
  
  if (needsDatabase) signals.push("needs-database");
  if (needsAuth) signals.push("needs-auth");
  if (isComplex) signals.push("complex-app");
  
  let level: ComplexityLevel = "moderate";
  if (isSimple) level = "simple";
  if (isComplex || (needsDatabase && needsAuth)) level = "complex";
  
  return { level, needsDatabase, needsAuth, signals };
}
```

#### 2c. Add Prompt Assembly Function (after detectComplexity)

```typescript
function assembleSystemsPrompt(
  userMessage: string,
  existingPrompt: string,
  mediaInstructions: string,
  fontInstructions: string,
  iconInstructions: string,
  featureInstructions: string
): string {
  const domain = detectDomain(userMessage);
  const complexity = detectComplexity(userMessage);
  
  console.log(`[Buildr DNA] Domain: ${domain}, Complexity: ${complexity.level}`);
  
  const parts: string[] = [];
  
  // 1. Start with Systems DNA Core (replaces old base prompt)
  parts.push(SYSTEMS_DNA_CORE);
  
  // 2. Add domain knowledge if detected
  if (domain) {
    const domainKnowledge = formatDomainKnowledge(domain);
    if (domainKnowledge) {
      parts.push(`\n\n═══ DOMAIN: ${domain.toUpperCase()} ═══\n${domainKnowledge}`);
    }
  }
  
  // 3. Add UI patterns
  parts.push(`\n\n${UI_PATTERNS}`);
  
  // 4. Add database patterns if needed
  if (complexity.needsDatabase) {
    parts.push(`\n\n${DATABASE_PATTERNS}`);
  }
  
  // 5. Add auth patterns if needed
  if (complexity.needsAuth) {
    parts.push(`\n\n${AUTH_PATTERNS}`);
  }
  
  // 6. Add existing media/font/icon/feature instructions
  if (mediaInstructions) parts.push(mediaInstructions);
  if (fontInstructions) parts.push(fontInstructions);
  if (iconInstructions) parts.push(iconInstructions);
  if (featureInstructions) parts.push(featureInstructions);
  
  // 7. Add complexity guidance
  parts.push(`\n\n═══ COMPLEXITY: ${complexity.level.toUpperCase()} ═══`);
  if (complexity.level === "simple") {
    parts.push("Focus on visual appeal. Don't overcomplicate.");
  } else if (complexity.level === "complex") {
    parts.push("Build complete systems. Don't skip essential features.");
  }
  
  return parts.join("\n");
}
```

#### 2d. Modify the Build Case (around line 3205-3221)

Find this section:
```typescript
// Select base prompt based on application type
let basePrompt = PROTOTYPE_PROMPT; // Default: website
if (appType === "dashboard") {
  basePrompt = DASHBOARD_PROMPT;
  ...
```

Replace it with:
```typescript
// Use Systems DNA to assemble prompt
systemPrompt = assembleSystemsPrompt(
  lastMessage,
  PROTOTYPE_PROMPT, // fallback
  mediaInstructions,
  fontInstructions,
  iconInstructions,
  featureInstructions
);

// Override for specific app types that need specialized prompts
if (appType === "api") {
  systemPrompt = API_PROMPT + fontInstructions + iconInstructions;
}
```

### Step 3: Add Smart Questions Mode (Optional)

If you want to use the smart questions feature, add this mode handler in the API route (around line 3227, where mode === "questions" is handled):

```typescript
// Smart questions mode using DNA
if (mode === "smart-questions") {
  const domain = detectDomain(lastMessage);
  const complexity = detectComplexity(lastMessage);
  
  // Import and use the getSmartQuestions function from integration-logic.ts
  // Or implement inline based on domain + complexity
  
  const questions = []; // Generate based on domain/complexity
  
  return new Response(JSON.stringify({ questions }), {
    headers: { "Content-Type": "application/json" }
  });
}
```

### Step 4: Update Model Selection (Optional)

For complex builds, auto-upgrade to Sonnet:

```typescript
// Around line 3222
const complexity = detectComplexity(lastMessage);
model = (premiumMode || complexity.level === "complex") ? MODELS.sonnet : MODELS.haiku;
```

---

## Full Replacement Approach

If you prefer to use the complete new route, rename:
- `route.ts` → `route-backup.ts`
- `route-with-dna.ts` → `route.ts`

The new route is a cleaned-up version that uses Systems DNA throughout.

---

## Testing

After making changes:

1. **Simple Test**: "Build a plumber website in Phoenix"
   - Should detect: domain=plumbing, complexity=simple
   - Should include: trust signals, emergency contact, service areas

2. **Moderate Test**: "Build a dog grooming booking site"
   - Should detect: domain=dog_grooming, complexity=moderate
   - Should include: services, booking system, pet-related language

3. **Complex Test**: "Build an inventory management dashboard for my cannabis farm"
   - Should detect: domain=cannabis_cultivation, complexity=complex
   - Should include: database patterns, auth patterns, compliance features

---

## Troubleshooting

### "Cannot find module" errors
Make sure the DNA files are in `src/lib/buildr-systems-dna-v2/` and the imports use `@/lib/...`

### Prompt too long
The full assembled prompt can be 3,000-4,000 tokens. If you hit limits:
- Remove UI_PATTERNS for simple builds
- Only include DATABASE_PATTERNS and AUTH_PATTERNS when needed

### Build quality decreased
Make sure SYSTEMS_DNA_CORE is always included first - it contains the critical thinking framework.

---

## What Changed

| Before | After |
|--------|-------|
| Fixed prompts per app type | Dynamic prompts based on what's needed |
| Generic questions | Domain-aware smart questions |
| Same approach for all builds | Complexity-aware building |
| Template-driven | Systems thinking |

The key insight: **Build what makes it actually work, not just what they literally said.**
