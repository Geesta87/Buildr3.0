// ============================================================================
// BUILDR AGENT v4 - MAIN INDEX
// ============================================================================
// Everything you need to use Agent v4
// ============================================================================

// Core intelligence
export {
  detectIntent,
  detectComplexity,
  decideMode,
  extractContext,
  formatContextForPrompt,
  orchestrate,
  type Intent,
  type IntentResult,
  type Complexity,
  type ComplexityResult,
  type Mode,
  type ModeDecision,
  type ConversationContext,
  type AgentDecision,
} from './agent-core';

// Behavioral prompts
export {
  CORE_PERSONALITY,
  CHAT_MODE_PROMPT,
  PLAN_MODE_PROMPT,
  BUILD_MODE_PROMPT,
  EDIT_MODE_PROMPT,
  FIX_MODE_PROMPT,
  INCREMENTAL_BUILD_PROMPT,
  getPromptForMode,
  getIncrementalPrompt,
} from './behavioral-prompts';

// Project persistence
export {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
  saveVersion,
  getVersionHistory,
  getVersion,
  restoreVersion,
  SCHEMA_SQL,
  type Project,
  type ProjectSettings,
  type ProjectVersion,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project-persistence';

// Vercel deployment
export {
  deployToVercel,
  getDeploymentStatus,
  listVercelProjects,
  createStaticSiteFiles,
  createGitHubDeploymentPackage,
  exportProject,
  type DeploymentConfig,
  type DeploymentResult,
  type ExportOptions,
} from './vercel-deploy';

// Route integration
export {
  processWithAgentV4,
  type AgentV4Result,
} from './route-integration';

// ============================================================================
// QUICK START EXAMPLE
// ============================================================================

/*
import { orchestrate, getPromptForMode, updateProject, saveVersion } from '@/lib/buildr-agent-v4';

// In your API route:
export async function POST(request: Request) {
  const { messages, currentCode, projectId } = await request.json();
  const userMessage = messages[messages.length - 1].content;

  // Step 1: Let the agent decide what to do
  const decision = orchestrate(userMessage, currentCode, messages);
  
  // Step 2: If clarification needed, ask
  if (decision.shouldAskClarification) {
    return Response.json({
      type: 'clarification',
      question: decision.clarificationQuestion
    });
  }
  
  // Step 3: Get the right prompt for this mode
  const behavioralPrompt = getPromptForMode(decision.mode);
  
  // Step 4: Combine with your existing prompts (Systems DNA, etc.)
  const fullPrompt = `
    ${behavioralPrompt}
    ${SYSTEMS_DNA_CORE}
    ${decision.promptEnhancements.includes('database-patterns') ? DATABASE_PATTERNS : ''}
    ${decision.promptEnhancements.includes('auth-patterns') ? AUTH_PATTERNS : ''}
    
    CONTEXT:
    ${formatContextForPrompt(decision.context)}
  `;
  
  // Step 5: Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: fullPrompt,
    messages: messages,
    stream: true
  });
  
  // Step 6: After successful generation, save version
  if (projectId && newCode) {
    await saveVersion(projectId, newCode, `${decision.mode}: ${userMessage.slice(0, 50)}`);
    await updateProject(projectId, { code: newCode });
  }
  
  return streamResponse;
}
*/

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = '4.0.0';
export const FEATURES = [
  'Intent detection (chat/build/edit/fix)',
  'Complexity analysis',
  'Mode-based prompts',
  'Project persistence (Supabase)',
  'Version history',
  'Vercel deployment',
  'Context tracking',
];
