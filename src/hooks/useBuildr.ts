'use client';

import { useState, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ReactProject {
  files: ProjectFile[];
  appType: 'react-webapp' | 'react-dashboard' | 'react-fullstack';
  features: string[];
}

export interface BuildrResponse {
  // HTML output
  htmlCode: string | null;
  
  // React output
  reactProject: ReactProject | null;
  
  // Status
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Metadata
  approach: 'instant' | 'surgical' | 'full' | 'planned' | null;
  agentVersion: string | null;
}

export interface UseBuildrOptions {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: string) => void;
  onHtmlReceived?: (code: string) => void;
  onReactProjectReceived?: (project: ReactProject) => void;
}

// ============================================================================
// EXTRACT CODE FROM RESPONSE
// ============================================================================

function extractHtmlFromResponse(text: string): string | null {
  // Try to extract HTML from markdown code blocks
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) {
    return htmlMatch[1].trim();
  }
  
  // Try generic code block
  const codeMatch = text.match(/```\n([\s\S]*?)```/);
  if (codeMatch && codeMatch[1].includes('<!DOCTYPE html')) {
    return codeMatch[1].trim();
  }
  
  // Check if the text itself is HTML
  if (text.includes('<!DOCTYPE html') || (text.includes('<html') && text.includes('</html>'))) {
    return text.trim();
  }
  
  return null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBuildr(options: UseBuildrOptions = {}) {
  const [state, setState] = useState<BuildrResponse>({
    htmlCode: null,
    reactProject: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    approach: null,
    agentVersion: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTextRef = useRef<string>('');
  
  // Send request to Buildr API
  const generate = useCallback(async ({
    messages,
    mode = 'prototype',
    currentCode,
    features = [],
    premiumMode = false,
    appType = 'website',
    uploadedImages = [],
  }: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    mode?: string;
    currentCode?: string;
    features?: string[];
    premiumMode?: boolean;
    appType?: string;
    uploadedImages?: Array<{ name: string; type: string; base64: string }>;
  }) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    streamingTextRef.current = '';
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      isStreaming: true,
      error: null,
    }));
    
    options.onStreamStart?.();
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          mode,
          currentCode,
          features,
          premiumMode,
          appType,
          uploadedImages,
          isFollowUp: !!currentCode,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let accumulatedText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            
            // Handle React project output
            if (parsed.reactProject) {
              const project: ReactProject = {
                files: parsed.files || [],
                appType: parsed.appType || 'react-webapp',
                features: parsed.features || [],
              };
              
              setState(prev => ({
                ...prev,
                reactProject: project,
              }));
              
              options.onReactProjectReceived?.(project);
              continue;
            }
            
            // Handle streaming content
            if (parsed.content) {
              accumulatedText += parsed.content;
              streamingTextRef.current = accumulatedText;
              
              // Try to extract HTML as we stream
              const htmlCode = extractHtmlFromResponse(accumulatedText);
              if (htmlCode) {
                setState(prev => ({
                  ...prev,
                  htmlCode,
                }));
              }
            }
            
            // Handle direct code
            if (parsed.code) {
              setState(prev => ({
                ...prev,
                htmlCode: parsed.code,
              }));
              options.onHtmlReceived?.(parsed.code);
            }
            
            // Handle fixed code
            if (parsed.fixedCode) {
              setState(prev => ({
                ...prev,
                htmlCode: parsed.fixedCode,
              }));
              options.onHtmlReceived?.(parsed.fixedCode);
            }
            
            // Handle surgical merge
            if (parsed.surgicalMerge && parsed.content) {
              const mergedHtml = extractHtmlFromResponse(parsed.content);
              if (mergedHtml) {
                setState(prev => ({
                  ...prev,
                  htmlCode: mergedHtml,
                }));
                options.onHtmlReceived?.(mergedHtml);
              }
            }
            
          } catch (e) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      }
      
      // Final extraction after stream complete
      const finalHtml = extractHtmlFromResponse(accumulatedText);
      if (finalHtml) {
        setState(prev => ({
          ...prev,
          htmlCode: finalHtml,
        }));
        options.onHtmlReceived?.(finalHtml);
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
      }));
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      const errorMessage = (error as Error).message || 'Something went wrong';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMessage,
      }));
      
      options.onError?.(errorMessage);
    } finally {
      options.onStreamEnd?.();
    }
  }, [options]);
  
  // Cancel current request
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
      }));
    }
  }, []);
  
  // Reset state
  const reset = useCallback(() => {
    cancel();
    streamingTextRef.current = '';
    setState({
      htmlCode: null,
      reactProject: null,
      isLoading: false,
      isStreaming: false,
      error: null,
      approach: null,
      agentVersion: null,
    });
  }, [cancel]);
  
  // Update HTML code manually (for edits)
  const setHtmlCode = useCallback((code: string) => {
    setState(prev => ({
      ...prev,
      htmlCode: code,
    }));
  }, []);
  
  // Update React project files
  const updateReactFile = useCallback((path: string, content: string) => {
    setState(prev => {
      if (!prev.reactProject) return prev;
      
      const updatedFiles = prev.reactProject.files.map(file =>
        file.path === path ? { ...file, content } : file
      );
      
      return {
        ...prev,
        reactProject: {
          ...prev.reactProject,
          files: updatedFiles,
        },
      };
    });
  }, []);
  
  return {
    ...state,
    generate,
    cancel,
    reset,
    setHtmlCode,
    updateReactFile,
    streamingText: streamingTextRef.current,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default useBuildr;
