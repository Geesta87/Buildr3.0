// ============================================================================
// BUILDR v4 - PROJECTS API
// ============================================================================
// /api/projects - CRUD operations for projects
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
  saveVersion,
  getVersionHistory,
  restoreVersion,
} from '@/lib/buildr-agent-v4/project-persistence';

// GET /api/projects - List projects or get single project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (projectId) {
      // Get single project
      const project = await getProject(projectId);
      
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Also get version history
      const versions = await getVersionHistory(projectId, 10);
      
      return NextResponse.json({ project, versions });
    }
    
    // List projects
    const projects = await listProjects(userId || undefined);
    return NextResponse.json({ projects });
    
  } catch (error) {
    console.error('[API/Projects] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, code, domain, businessType, businessName, userId } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    
    const project = await createProject({
      name,
      description,
      code,
      domain,
      business_type: businessType,
      business_name: businessName,
    }, userId);
    
    // If code was provided, save initial version
    if (code) {
      await saveVersion(project.id, code, 'Initial version');
    }
    
    return NextResponse.json({ project }, { status: 201 });
    
  } catch (error) {
    console.error('[API/Projects] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects - Update project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, code, domain, businessType, businessName, saveAsVersion, versionDescription } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Update project
    const project = await updateProject(id, {
      name,
      description,
      code,
      domain,
      business_type: businessType,
      business_name: businessName,
    });
    
    // Optionally save as new version
    if (saveAsVersion && code) {
      await saveVersion(id, code, versionDescription || 'Updated');
    }
    
    return NextResponse.json({ project });
    
  } catch (error) {
    console.error('[API/Projects] PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    await deleteProject(projectId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API/Projects] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects - Restore version
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, versionNumber } = body;
    
    if (!projectId || !versionNumber) {
      return NextResponse.json(
        { error: 'Project ID and version number are required' },
        { status: 400 }
      );
    }
    
    const project = await restoreVersion(projectId, versionNumber);
    
    return NextResponse.json({ project });
    
  } catch (error) {
    console.error('[API/Projects] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore version' },
      { status: 500 }
    );
  }
}
