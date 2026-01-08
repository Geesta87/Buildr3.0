// ============================================================================
// BUILDR v4 - PROJECT PERSISTENCE
// ============================================================================
// Save and load projects from Supabase
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface Project {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  code: string | null;
  domain: string | null;
  business_type: string | null;
  business_name: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  settings: ProjectSettings | null;
}

export interface ProjectSettings {
  colorScheme?: string;
  fontHeading?: string;
  fontBody?: string;
  features?: string[];
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  code: string;
  change_description: string;
  created_at: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  code?: string;
  domain?: string;
  business_type?: string;
  business_name?: string;
  settings?: ProjectSettings;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  code?: string;
  domain?: string;
  business_type?: string;
  business_name?: string;
  settings?: ProjectSettings;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(input: CreateProjectInput, userId?: string): Promise<Project> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('projects')
    .insert({
      user_id: userId || null,
      name: input.name,
      description: input.description || null,
      code: input.code || null,
      domain: input.domain || null,
      business_type: input.business_type || null,
      business_name: input.business_name || null,
      settings: input.settings || null,
      is_public: !userId, // Public if no user
    })
    .select()
    .single();
  
  if (error) {
    console.error('[Projects] Create error:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }
  
  console.log(`[Projects] Created: ${data.id} - ${data.name}`);
  return data;
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[Projects] Get error:', error);
    throw new Error(`Failed to get project: ${error.message}`);
  }
  
  return data;
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('projects')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();
  
  if (error) {
    console.error('[Projects] Update error:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }
  
  console.log(`[Projects] Updated: ${data.id}`);
  return data;
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('projects')
    .delete()
    .eq('id', projectId);
  
  if (error) {
    console.error('[Projects] Delete error:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
  
  console.log(`[Projects] Deleted: ${projectId}`);
}

/**
 * List projects for a user (or public projects if no user)
 */
export async function listProjects(userId?: string, limit: number = 20): Promise<Project[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[Projects] List error:', error);
    throw new Error(`Failed to list projects: ${error.message}`);
  }
  
  return data || [];
}

// ============================================================================
// VERSION HISTORY
// ============================================================================

/**
 * Save a new version of a project
 */
export async function saveVersion(
  projectId: string, 
  code: string, 
  changeDescription: string
): Promise<ProjectVersion> {
  const client = getSupabaseClient();
  
  // Get current max version number
  const { data: versions } = await client
    .from('project_versions')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1);
  
  const nextVersion = versions && versions.length > 0 
    ? versions[0].version_number + 1 
    : 1;
  
  const { data, error } = await client
    .from('project_versions')
    .insert({
      project_id: projectId,
      version_number: nextVersion,
      code,
      change_description: changeDescription,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[Versions] Save error:', error);
    throw new Error(`Failed to save version: ${error.message}`);
  }
  
  console.log(`[Versions] Saved v${nextVersion} for project ${projectId}`);
  return data;
}

/**
 * Get version history for a project
 */
export async function getVersionHistory(projectId: string, limit: number = 10): Promise<ProjectVersion[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('project_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[Versions] Get history error:', error);
    throw new Error(`Failed to get version history: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a specific version
 */
export async function getVersion(projectId: string, versionNumber: number): Promise<ProjectVersion | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('project_versions')
    .select('*')
    .eq('project_id', projectId)
    .eq('version_number', versionNumber)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Versions] Get error:', error);
    throw new Error(`Failed to get version: ${error.message}`);
  }
  
  return data;
}

/**
 * Restore a project to a specific version
 */
export async function restoreVersion(projectId: string, versionNumber: number): Promise<Project> {
  // Get the version
  const version = await getVersion(projectId, versionNumber);
  if (!version) {
    throw new Error(`Version ${versionNumber} not found`);
  }
  
  // Update project with version's code
  const project = await updateProject(projectId, {
    code: version.code,
  });
  
  // Save this as a new version
  await saveVersion(projectId, version.code, `Restored from v${versionNumber}`);
  
  console.log(`[Versions] Restored project ${projectId} to v${versionNumber}`);
  return project;
}

// ============================================================================
// DATABASE SCHEMA (for reference)
// ============================================================================

export const SCHEMA_SQL = `
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  domain TEXT,
  business_type TEXT,
  business_name TEXT,
  settings JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project versions table
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  code TEXT NOT NULL,
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can read own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Versions policies
CREATE POLICY "Users can read versions of own projects" ON project_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_versions.project_id 
      AND (projects.user_id = auth.uid() OR projects.is_public = true)
    )
  );

CREATE POLICY "Users can insert versions for own projects" ON project_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_versions.project_id 
      AND (projects.user_id = auth.uid() OR projects.user_id IS NULL)
    )
  );
`;

export default {
  getSupabaseClient,
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
};
