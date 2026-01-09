'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for Sandpack (heavy library)
const ReactPreview = dynamic(() => import('./ReactPreview'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-900">
      <div className="flex items-center gap-3 text-zinc-400">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading React preview...
      </div>
    </div>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectFile {
  path: string;
  content: string;
}

export interface PreviewPaneProps {
  // For HTML mode
  htmlCode?: string;
  
  // For React mode
  reactProject?: {
    files: ProjectFile[];
    appType: 'react-webapp' | 'react-dashboard' | 'react-fullstack';
    features?: string[];
  };
  
  // Common props
  isLoading?: boolean;
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
  onCodeChange?: (code: string) => void;
  onFileChange?: (path: string, content: string) => void;
}

// ============================================================================
// DEVICE FRAME SIZES
// ============================================================================

const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '812px' },
};

// ============================================================================
// HTML PREVIEW COMPONENT
// ============================================================================

function HtmlPreview({ 
  code, 
  deviceMode = 'desktop',
  isLoading 
}: { 
  code: string; 
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  isLoading?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Generate preview HTML with error handling
  const previewHtml = useMemo(() => {
    if (!code) return '';
    
    // If it's already complete HTML, use as-is
    if (code.includes('<!DOCTYPE html') || code.includes('<html')) {
      // Add error handling script
      const errorScript = `
        <script>
          window.onerror = function(msg, url, line) {
            window.parent.postMessage({ type: 'preview-error', error: msg, line: line }, '*');
            return true;
          };
        </script>
      `;
      return code.replace('</head>', errorScript + '</head>');
    }
    
    // Wrap partial HTML in full document
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    window.onerror = function(msg, url, line) {
      window.parent.postMessage({ type: 'preview-error', error: msg, line: line }, '*');
      return true;
    };
  </script>
</head>
<body>
  ${code}
</body>
</html>`;
  }, [code]);
  
  // Listen for errors from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-error') {
        setError(`Error at line ${event.data.line}: ${event.data.error}`);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Clear error when code changes
  useEffect(() => {
    setError(null);
  }, [code]);
  
  const deviceSize = DEVICE_SIZES[deviceMode];
  
  return (
    <div className="relative h-full flex items-center justify-center bg-zinc-900 overflow-hidden">
      {/* Device Frame */}
      <div 
        className={`relative bg-white transition-all duration-300 ${
          deviceMode !== 'desktop' ? 'rounded-3xl shadow-2xl border-8 border-zinc-800' : ''
        }`}
        style={{
          width: deviceSize.width,
          height: deviceSize.height,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="flex items-center gap-3 text-white">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Building...
            </div>
          </div>
        )}
        
        {/* Error Banner */}
        {error && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-sm px-4 py-2 z-10">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Preview iframe */}
        <iframe
          ref={iframeRef}
          srcDoc={previewHtml}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Preview"
        />
      </div>
      
      {/* Device Label */}
      {deviceMode !== 'desktop' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
          {deviceMode === 'tablet' ? 'iPad' : 'iPhone'}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PREVIEW PANE COMPONENT
// ============================================================================

export function PreviewPane({
  htmlCode,
  reactProject,
  isLoading = false,
  deviceMode = 'desktop',
  onCodeChange,
  onFileChange,
}: PreviewPaneProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [activeTab, setActiveTab] = useState<'html' | 'react'>('html');
  
  // Determine which mode to use
  const isReactMode = !!reactProject && reactProject.files.length > 0;
  
  // Auto-switch to React tab when React project is received
  useEffect(() => {
    if (isReactMode) {
      setActiveTab('react');
    }
  }, [isReactMode]);
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0b]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#111113]">
        <div className="flex items-center gap-4">
          {/* Mode Tabs (only show if both are available) */}
          {htmlCode && isReactMode && (
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === 'html' 
                    ? 'bg-zinc-700 text-white' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                HTML
              </button>
              <button
                onClick={() => setActiveTab('react')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === 'react' 
                    ? 'bg-zinc-700 text-white' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                React
              </button>
            </div>
          )}
          
          {/* Output Type Badge */}
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isReactMode && activeTab === 'react'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-orange-500/20 text-orange-400'
          }`}>
            {isReactMode && activeTab === 'react' 
              ? `⚛️ ${reactProject?.appType?.replace('react-', '').toUpperCase()}`
              : '🌐 HTML'
            }
          </span>
        </div>
        
        {/* View Toggle (for HTML mode) */}
        {(!isReactMode || activeTab === 'html') && (
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'preview' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'code' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Code
            </button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isReactMode && activeTab === 'react' ? (
          // React Preview with Sandpack
          <ReactPreview
            files={reactProject.files}
            appType={reactProject.appType}
            onFileChange={onFileChange}
          />
        ) : (
          // HTML Preview
          viewMode === 'preview' ? (
            <HtmlPreview 
              code={htmlCode || ''} 
              deviceMode={deviceMode}
              isLoading={isLoading}
            />
          ) : (
            // Code View
            <div className="h-full overflow-auto bg-[#1e1e1e]">
              <pre className="p-4 text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                {htmlCode || '// No code generated yet'}
              </pre>
            </div>
          )
        )}
      </div>
      
      {/* React Features Footer */}
      {isReactMode && activeTab === 'react' && reactProject?.features && reactProject.features.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-[#111113]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500">Features:</span>
            {reactProject.features.map(feature => (
              <span 
                key={feature}
                className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default PreviewPane;
