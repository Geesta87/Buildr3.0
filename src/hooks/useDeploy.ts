// ============================================================================
// BUILDR v4 - useDeploy Hook
// ============================================================================
// React hook for deploying projects to Vercel
// ============================================================================

import { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface DeploymentStatus {
  status: 'idle' | 'deploying' | 'ready' | 'error';
  url?: string;
  deploymentId?: string;
  error?: string;
}

interface ExportResult {
  files: Record<string, string>;
}

interface UseDeployReturn {
  deployment: DeploymentStatus;
  isDeploying: boolean;
  
  deploy: (code: string, projectName: string) => Promise<string | null>;
  checkStatus: (deploymentId: string) => Promise<void>;
  exportProject: (code: string, projectName: string, format: 'html' | 'react' | 'nextjs' | 'github') => Promise<ExportResult>;
  downloadAsZip: (code: string, projectName: string) => void;
  reset: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDeploy(): UseDeployReturn {
  const [deployment, setDeployment] = useState<DeploymentStatus>({
    status: 'idle',
  });

  const isDeploying = deployment.status === 'deploying';

  const deploy = useCallback(async (code: string, projectName: string): Promise<string | null> => {
    setDeployment({ status: 'deploying' });
    
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, projectName }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Deployment failed');
      }
      
      const { url, deploymentId } = await response.json();
      
      setDeployment({
        status: 'ready',
        url,
        deploymentId,
      });
      
      return url;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deployment failed';
      setDeployment({
        status: 'error',
        error: message,
      });
      return null;
    }
  }, []);

  const checkStatus = useCallback(async (deploymentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/deploy?deploymentId=${deploymentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check status');
      }
      
      const { status, url, error } = await response.json();
      
      if (status === 'READY') {
        setDeployment({
          status: 'ready',
          url,
          deploymentId,
        });
      } else if (status === 'ERROR') {
        setDeployment({
          status: 'error',
          error: error || 'Deployment failed',
        });
      } else {
        // Still building
        setDeployment(prev => ({
          ...prev,
          status: 'deploying',
        }));
      }
      
    } catch (err) {
      // Silently fail status checks
      console.error('Status check failed:', err);
    }
  }, []);

  const exportProject = useCallback(async (
    code: string,
    projectName: string,
    format: 'html' | 'react' | 'nextjs' | 'github'
  ): Promise<ExportResult> => {
    const response = await fetch('/api/deploy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, projectName, format }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Export failed');
    }
    
    return response.json();
  }, []);

  const downloadAsZip = useCallback((code: string, projectName: string) => {
    // Create a simple download of the HTML file
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => {
    setDeployment({ status: 'idle' });
  }, []);

  return {
    deployment,
    isDeploying,
    deploy,
    checkStatus,
    exportProject,
    downloadAsZip,
    reset,
  };
}

export default useDeploy;
