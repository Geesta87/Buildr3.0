// ============================================================================
// BUILDR v4 - VERCEL DEPLOYMENT
// ============================================================================
// Deploy projects to Vercel with one click
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export interface DeploymentConfig {
  projectName: string;
  code: string;
  framework?: 'static' | 'nextjs';
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
}

export interface VercelProject {
  id: string;
  name: string;
  url: string;
}

// ============================================================================
// STATIC HTML DEPLOYMENT
// ============================================================================

/**
 * Create a deployable static site from HTML code
 * Returns the files structure needed for Vercel
 */
export function createStaticSiteFiles(code: string, projectName: string): Record<string, string> {
  return {
    'index.html': code,
    'vercel.json': JSON.stringify({
      version: 2,
      routes: [
        { src: '/(.*)', dest: '/index.html' }
      ]
    }, null, 2),
  };
}

/**
 * Create a multi-file project structure
 */
export function createMultiFileProject(
  files: Record<string, string>,
  projectName: string
): Record<string, string> {
  return {
    ...files,
    'vercel.json': JSON.stringify({
      version: 2,
      buildCommand: null,
      outputDirectory: '.',
    }, null, 2),
  };
}

// ============================================================================
// VERCEL API INTEGRATION
// ============================================================================

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Deploy to Vercel using their API
 * Requires VERCEL_TOKEN environment variable
 */
export async function deployToVercel(
  config: DeploymentConfig,
  vercelToken?: string
): Promise<DeploymentResult> {
  const token = vercelToken || process.env.VERCEL_TOKEN;
  
  if (!token) {
    return {
      success: false,
      error: 'Vercel token not configured. Set VERCEL_TOKEN environment variable.',
    };
  }

  try {
    // Create files for deployment
    const files = createStaticSiteFiles(config.code, config.projectName);
    
    // Create deployment
    const response = await fetch(`${VERCEL_API_BASE}/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        files: Object.entries(files).map(([path, content]) => ({
          file: path,
          data: Buffer.from(content).toString('base64'),
          encoding: 'base64',
        })),
        projectSettings: {
          framework: null, // Static site
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'Deployment failed',
      };
    }

    const deployment = await response.json();
    
    return {
      success: true,
      url: `https://${deployment.url}`,
      deploymentId: deployment.id,
    };
  } catch (error) {
    console.error('[Vercel] Deployment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown deployment error',
    };
  }
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  deploymentId: string,
  vercelToken?: string
): Promise<{ status: string; url?: string; error?: string }> {
  const token = vercelToken || process.env.VERCEL_TOKEN;
  
  if (!token) {
    return { status: 'error', error: 'Vercel token not configured' };
  }

  try {
    const response = await fetch(`${VERCEL_API_BASE}/v13/deployments/${deploymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { status: 'error', error: 'Failed to get deployment status' };
    }

    const deployment = await response.json();
    
    return {
      status: deployment.readyState, // QUEUED, BUILDING, READY, ERROR
      url: deployment.readyState === 'READY' ? `https://${deployment.url}` : undefined,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List user's Vercel projects
 */
export async function listVercelProjects(vercelToken?: string): Promise<VercelProject[]> {
  const token = vercelToken || process.env.VERCEL_TOKEN;
  
  if (!token) {
    return [];
  }

  try {
    const response = await fetch(`${VERCEL_API_BASE}/v9/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    return data.projects.map((p: { id: string; name: string; latestDeployments?: Array<{ url: string }> }) => ({
      id: p.id,
      name: p.name,
      url: p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : null,
    }));
  } catch (error) {
    console.error('[Vercel] List projects error:', error);
    return [];
  }
}

// ============================================================================
// ALTERNATIVE: GITHUB + VERCEL FLOW
// ============================================================================

/**
 * For users who want to deploy via GitHub:
 * 1. Push to GitHub repo
 * 2. Vercel auto-deploys from GitHub
 * 
 * This creates the files needed for that flow
 */
export function createGitHubDeploymentPackage(
  code: string,
  projectName: string,
  includeReadme: boolean = true
): Record<string, string> {
  const files: Record<string, string> = {
    'index.html': code,
    'vercel.json': JSON.stringify({
      version: 2,
      routes: [
        { src: '/(.*)', dest: '/index.html' }
      ]
    }, null, 2),
    '.gitignore': `
.DS_Store
node_modules/
.env
.env.local
`,
  };

  if (includeReadme) {
    files['README.md'] = `# ${projectName}

Built with [Buildr](https://buildr3-0.vercel.app)

## Deploy

This project is configured for automatic deployment to Vercel.

1. Push to GitHub
2. Import in Vercel
3. Done!

## Local Development

Just open \`index.html\` in your browser.
`;
  }

  return files;
}

/**
 * Create a downloadable ZIP file URL (data URL)
 */
export async function createDownloadableZip(files: Record<string, string>): Promise<string> {
  // In browser, we'd use JSZip
  // For server-side, we return instructions
  
  // This is a placeholder - actual implementation would use JSZip
  const fileList = Object.keys(files).join(', ');
  console.log(`[Deploy] Would create ZIP with: ${fileList}`);
  
  return ''; // Would return data URL
}

// ============================================================================
// EXPORT TO OTHER PLATFORMS
// ============================================================================

export interface ExportOptions {
  format: 'html' | 'nextjs' | 'react';
  includeAssets: boolean;
}

/**
 * Export project for use outside Buildr
 */
export function exportProject(
  code: string,
  projectName: string,
  options: ExportOptions
): Record<string, string> {
  switch (options.format) {
    case 'html':
      return {
        'index.html': code,
      };
      
    case 'react':
      // Convert HTML to React component
      return {
        'src/App.jsx': convertHtmlToReact(code),
        'src/index.jsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
        'index.html': `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.jsx"></script>
</body>
</html>
`,
        'package.json': JSON.stringify({
          name: projectName.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.0.0',
            vite: '^4.0.0',
          },
        }, null, 2),
      };
      
    case 'nextjs':
      return {
        'app/page.tsx': convertHtmlToNextJs(code),
        'app/layout.tsx': `
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
`,
        'package.json': JSON.stringify({
          name: projectName.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
          dependencies: {
            next: '^14.0.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
        }, null, 2),
      };
      
    default:
      return { 'index.html': code };
  }
}

/**
 * Simple HTML to React conversion
 */
function convertHtmlToReact(html: string): string {
  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  
  // Basic conversions
  let jsx = bodyContent
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/onclick=/gi, 'onClick=')
    .replace(/onsubmit=/gi, 'onSubmit=')
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .trim();
  
  return `
import React from 'react';

export default function App() {
  return (
    <>
      ${jsx}
    </>
  );
}
`;
}

/**
 * Simple HTML to Next.js conversion
 */
function convertHtmlToNextJs(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  
  let jsx = bodyContent
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/onclick=/gi, 'onClick=')
    .replace(/onsubmit=/gi, 'onSubmit=')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  
  return `
export default function Home() {
  return (
    <main>
      ${jsx}
    </main>
  );
}
`;
}

export default {
  createStaticSiteFiles,
  createMultiFileProject,
  deployToVercel,
  getDeploymentStatus,
  listVercelProjects,
  createGitHubDeploymentPackage,
  exportProject,
};
