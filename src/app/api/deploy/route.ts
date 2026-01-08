// ============================================================================
// BUILDR v4 - DEPLOY API
// ============================================================================
// /api/deploy - Deploy projects to Vercel
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  deployToVercel,
  getDeploymentStatus,
  createGitHubDeploymentPackage,
  exportProject,
} from '@/lib/buildr-agent-v4/vercel-deploy';
import { getProject } from '@/lib/buildr-agent-v4/project-persistence';

// POST /api/deploy - Deploy to Vercel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, code, projectName, vercelToken } = body;
    
    // Get code from project if not provided directly
    let codeToDeply = code;
    let name = projectName;
    
    if (projectId && !code) {
      const project = await getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      codeToDeply = project.code;
      name = name || project.name;
    }
    
    if (!codeToDeply) {
      return NextResponse.json({ error: 'No code to deploy' }, { status: 400 });
    }
    
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    
    // Deploy to Vercel
    const result = await deployToVercel(
      {
        projectName: name,
        code: codeToDeply,
      },
      vercelToken
    );
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      url: result.url,
      deploymentId: result.deploymentId,
    });
    
  } catch (error) {
    console.error('[API/Deploy] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    );
  }
}

// GET /api/deploy - Get deployment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get('deploymentId');
    const vercelToken = searchParams.get('token');
    
    if (!deploymentId) {
      return NextResponse.json({ error: 'Deployment ID is required' }, { status: 400 });
    }
    
    const status = await getDeploymentStatus(deploymentId, vercelToken || undefined);
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('[API/Deploy] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

// PUT /api/deploy - Export project (for download)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, code, projectName, format = 'html' } = body;
    
    // Get code from project if not provided directly
    let codeToExport = code;
    let name = projectName;
    
    if (projectId && !code) {
      const project = await getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      codeToExport = project.code;
      name = name || project.name;
    }
    
    if (!codeToExport) {
      return NextResponse.json({ error: 'No code to export' }, { status: 400 });
    }
    
    // Generate export files
    let files: Record<string, string>;
    
    if (format === 'github') {
      files = createGitHubDeploymentPackage(codeToExport, name || 'buildr-project');
    } else {
      files = exportProject(codeToExport, name || 'buildr-project', {
        format: format as 'html' | 'react' | 'nextjs',
        includeAssets: true,
      });
    }
    
    return NextResponse.json({ files });
    
  } catch (error) {
    console.error('[API/Deploy] PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
