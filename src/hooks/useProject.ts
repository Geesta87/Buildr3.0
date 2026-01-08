// ============================================================================
// BUILDR v4 - useProject Hook
// ============================================================================
// React hook for project persistence and version control
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  domain: string | null;
  business_type: string | null;
  business_name: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectVersion {
  id: string;
  version_number: number;
  code: string;
  change_description: string;
  created_at: string;
}

interface UseProjectReturn {
  project: Project | null;
  versions: ProjectVersion[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  
  createProject: (name: string, code?: string) => Promise<Project>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: (code: string, description?: string) => Promise<void>;
  renameProject: (name: string) => Promise<void>;
  deleteProject: () => Promise<void>;
  restoreVersion: (versionNumber: number) => Promise<void>;
  setHasUnsavedChanges: (value: boolean) => void;
  clearError: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useProject(initialProjectId?: string): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (initialProjectId) {
      loadProject(initialProjectId);
    }
  }, [initialProjectId]);

  const createProject = useCallback(async (name: string, code?: string): Promise<Project> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }
      
      const { project: newProject } = await response.json();
      setProject(newProject);
      setHasUnsavedChanges(false);
      localStorage.setItem('buildr_current_project', newProject.id);
      
      return newProject;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects?id=${projectId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load project');
      }
      
      const { project: loadedProject, versions: loadedVersions } = await response.json();
      setProject(loadedProject);
      setVersions(loadedVersions || []);
      setHasUnsavedChanges(false);
      localStorage.setItem('buildr_current_project', projectId);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load project';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (code: string, description?: string): Promise<void> => {
    if (!project) {
      await createProject('Untitled Project', code);
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          code,
          saveAsVersion: true,
          versionDescription: description || 'Auto-save',
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save project');
      }
      
      const { project: updatedProject } = await response.json();
      setProject(updatedProject);
      setHasUnsavedChanges(false);
      
      // Refresh versions
      const versionsResponse = await fetch(`/api/projects?id=${project.id}`);
      if (versionsResponse.ok) {
        const { versions: newVersions } = await versionsResponse.json();
        setVersions(newVersions || []);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save project';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [project, createProject]);

  const renameProject = useCallback(async (name: string): Promise<void> => {
    if (!project) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, name }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename project');
      }
      
      const { project: updatedProject } = await response.json();
      setProject(updatedProject);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename project';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  const deleteProject = useCallback(async (): Promise<void> => {
    if (!project) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects?id=${project.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }
      
      setProject(null);
      setVersions([]);
      localStorage.removeItem('buildr_current_project');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  const restoreVersion = useCallback(async (versionNumber: number): Promise<void> => {
    if (!project) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          versionNumber,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore version');
      }
      
      const { project: updatedProject } = await response.json();
      setProject(updatedProject);
      setHasUnsavedChanges(false);
      
      // Refresh versions
      const versionsResponse = await fetch(`/api/projects?id=${project.id}`);
      if (versionsResponse.ok) {
        const { versions: newVersions } = await versionsResponse.json();
        setVersions(newVersions || []);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore version';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    project,
    versions,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    createProject,
    loadProject,
    saveProject,
    renameProject,
    deleteProject,
    restoreVersion,
    setHasUnsavedChanges,
    clearError,
  };
}

export default useProject;
