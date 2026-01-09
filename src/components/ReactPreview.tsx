'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
  useSandpack,
} from '@codesandbox/sandpack-react';
import { atomDark } from '@codesandbox/sandpack-themes';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ReactPreviewProps {
  files: ProjectFile[];
  appType: 'react-webapp' | 'react-dashboard' | 'react-fullstack';
  onFileChange?: (path: string, content: string) => void;
  className?: string;
}

// ============================================================================
// DEFAULT FILES (Base Next.js/React setup)
// ============================================================================

const DEFAULT_PACKAGE_JSON = {
  dependencies: {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.309.0",
    "recharts": "^2.10.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
};

const DEFAULT_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Buildr App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              border: "hsl(214.3 31.8% 91.4%)",
              background: "hsl(0 0% 100%)",
              foreground: "hsl(222.2 84% 4.9%)",
              primary: { DEFAULT: "hsl(222.2 47.4% 11.2%)", foreground: "hsl(210 40% 98%)" },
              secondary: { DEFAULT: "hsl(210 40% 96.1%)", foreground: "hsl(222.2 47.4% 11.2%)" },
              muted: { DEFAULT: "hsl(210 40% 96.1%)", foreground: "hsl(215.4 16.3% 46.9%)" },
              accent: { DEFAULT: "hsl(210 40% 96.1%)", foreground: "hsl(222.2 47.4% 11.2%)" },
            }
          }
        }
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const DEFAULT_APP_TSX = `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-3xl font-bold text-foreground">
        Loading your app...
      </h1>
    </div>
  );
}`;

const DEFAULT_INDEX_TSX = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);`;

const UTILS_FILE = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`;

// ============================================================================
// FILE PATH CONVERTER
// ============================================================================

function convertToSandpackFiles(files: ProjectFile[]): Record<string, string> {
  const sandpackFiles: Record<string, string> = {};
  
  files.forEach(file => {
    // Convert Next.js paths to Sandpack-compatible paths
    let sandpackPath = file.path;
    
    // Remove src/ prefix for Sandpack
    if (sandpackPath.startsWith('src/')) {
      sandpackPath = sandpackPath.replace('src/', '/');
    }
    
    // Convert app/page.tsx to App.tsx (main entry)
    if (sandpackPath.includes('app/page.tsx') || sandpackPath.includes('app/page.jsx')) {
      sandpackPath = '/App.tsx';
    }
    
    // Convert app/layout.tsx to Layout.tsx
    if (sandpackPath.includes('app/layout.tsx') || sandpackPath.includes('app/layout.jsx')) {
      sandpackPath = '/Layout.tsx';
    }
    
    // Convert components paths
    if (sandpackPath.includes('components/')) {
      sandpackPath = sandpackPath.replace(/.*components\//, '/components/');
    }
    
    // Convert lib paths
    if (sandpackPath.includes('lib/')) {
      sandpackPath = sandpackPath.replace(/.*lib\//, '/lib/');
    }
    
    // Ensure path starts with /
    if (!sandpackPath.startsWith('/')) {
      sandpackPath = '/' + sandpackPath;
    }
    
    sandpackFiles[sandpackPath] = file.content;
  });
  
  return sandpackFiles;
}

// ============================================================================
// WRAP APP COMPONENT (Inject Layout if exists)
// ============================================================================

function createWrappedApp(files: Record<string, string>): string {
  const hasLayout = files['/Layout.tsx'] || files['/Layout.jsx'];
  const hasApp = files['/App.tsx'] || files['/App.jsx'];
  
  if (hasLayout && hasApp) {
    // Create a wrapper that uses both Layout and App
    return `import React from 'react';
import Layout from './Layout';
import AppContent from './App';

export default function WrappedApp() {
  return (
    <Layout>
      <AppContent />
    </Layout>
  );
}`;
  }
  
  return files['/App.tsx'] || files['/App.jsx'] || DEFAULT_APP_TSX;
}

// ============================================================================
// SANDPACK PREVIEW COMPONENT
// ============================================================================

export function ReactPreview({ files, appType, onFileChange, className }: ReactPreviewProps) {
  const [activeFile, setActiveFile] = useState('/App.tsx');
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview');
  
  // Convert project files to Sandpack format
  const sandpackFiles = useMemo(() => {
    const converted = convertToSandpackFiles(files);
    
    // Ensure required files exist
    if (!converted['/App.tsx'] && !converted['/App.jsx']) {
      converted['/App.tsx'] = DEFAULT_APP_TSX;
    }
    
    if (!converted['/index.tsx']) {
      // Create index that imports the app
      const hasWrappedApp = converted['/Layout.tsx'] && converted['/App.tsx'];
      converted['/index.tsx'] = hasWrappedApp 
        ? `import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './Layout';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <Layout>
    <App />
  </Layout>
);`
        : DEFAULT_INDEX_TSX;
    }
    
    if (!converted['/lib/utils.ts']) {
      converted['/lib/utils.ts'] = UTILS_FILE;
    }
    
    return converted;
  }, [files]);
  
  // Determine which files to show in explorer
  const visibleFiles = useMemo(() => {
    return Object.keys(sandpackFiles).filter(path => 
      !path.includes('node_modules') && 
      path !== '/package.json'
    );
  }, [sandpackFiles]);

  return (
    <div className={`flex flex-col h-full bg-[#0a0a0b] ${className || ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-[#111113]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-300">
            {appType === 'react-dashboard' ? '📊 Dashboard' : 
             appType === 'react-fullstack' ? '🚀 Full-Stack App' : 
             '⚛️ React App'}
          </span>
          <span className="text-xs text-zinc-500">
            {Object.keys(sandpackFiles).length} files
          </span>
        </div>
        
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
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              viewMode === 'split' 
                ? 'bg-zinc-700 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Split
          </button>
        </div>
      </div>
      
      {/* Sandpack Provider */}
      <div className="flex-1 overflow-hidden">
        <SandpackProvider
          template="react-ts"
          theme={atomDark}
          files={{
            ...sandpackFiles,
            '/public/index.html': DEFAULT_INDEX_HTML,
          }}
          customSetup={{
            dependencies: DEFAULT_PACKAGE_JSON.dependencies,
            entry: '/index.tsx',
          }}
          options={{
            activeFile: activeFile,
            visibleFiles: visibleFiles,
            recompileMode: 'delayed',
            recompileDelay: 500,
          }}
        >
          <SandpackLayout className="!h-full !border-0 !rounded-none">
            {/* File Explorer - Show in code or split mode */}
            {(viewMode === 'code' || viewMode === 'split') && (
              <SandpackFileExplorer 
                className="!w-48 !min-w-48 !border-r !border-zinc-800"
                autoHiddenFiles
              />
            )}
            
            {/* Code Editor - Show in code or split mode */}
            {(viewMode === 'code' || viewMode === 'split') && (
              <SandpackCodeEditor
                showTabs
                showLineNumbers
                showInlineErrors
                wrapContent
                className={viewMode === 'split' ? '!w-1/2' : '!flex-1'}
              />
            )}
            
            {/* Preview - Show in preview or split mode */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <SandpackPreview
                showNavigator
                showRefreshButton
                showOpenInCodeSandbox={false}
                className={viewMode === 'split' ? '!w-1/2' : '!flex-1'}
              />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}

// ============================================================================
// FILE TREE COMPONENT (For non-Sandpack display)
// ============================================================================

interface FileTreeProps {
  files: ProjectFile[];
  activeFile: string;
  onFileSelect: (path: string) => void;
}

export function FileTree({ files, activeFile, onFileSelect }: FileTreeProps) {
  // Group files by directory
  const fileTree = useMemo(() => {
    const tree: Record<string, ProjectFile[]> = {};
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(Boolean);
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
      
      if (!tree[dir]) {
        tree[dir] = [];
      }
      tree[dir].push(file);
    });
    
    return tree;
  }, [files]);
  
  return (
    <div className="text-sm">
      {Object.entries(fileTree).map(([dir, dirFiles]) => (
        <div key={dir} className="mb-2">
          {dir !== 'root' && (
            <div className="flex items-center gap-1 px-2 py-1 text-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {dir}
            </div>
          )}
          {dirFiles.map(file => {
            const fileName = file.path.split('/').pop() || file.path;
            const isActive = file.path === activeFile;
            
            return (
              <button
                key={file.path}
                onClick={() => onFileSelect(file.path)}
                className={`w-full flex items-center gap-2 px-4 py-1 text-left transition-colors ${
                  isActive 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <FileIcon fileName={fileName} />
                {fileName}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// FILE ICON COMPONENT
// ============================================================================

function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const iconClass = "w-4 h-4";
  
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return (
        <svg className={`${iconClass} text-blue-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      );
    case 'ts':
      return (
        <svg className={`${iconClass} text-blue-500`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h18v18H3V3zm10.71 14.29c.18.18.43.29.71.29s.53-.11.71-.29l2.83-2.83c.39-.39.39-1.02 0-1.41l-2.83-2.83c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L15.59 12l-1.88 1.88c-.39.39-.39 1.02 0 1.41zM8.29 9.71C8.47 9.53 8.72 9.42 9 9.42s.53.11.71.29c.39.39.39 1.02 0 1.41L7.83 13l1.88 1.88c.39.39.39 1.02 0 1.41-.18.18-.43.29-.71.29s-.53-.11-.71-.29l-2.83-2.83c-.39-.39-.39-1.02 0-1.41l2.83-2.83z"/>
        </svg>
      );
    case 'css':
      return (
        <svg className={`${iconClass} text-pink-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.192 3.143h15.615l-1.42 16.034-6.404 1.812-6.369-1.813L4.192 3.143zM16.9 6.424l-9.8-.002.158 1.949 7.529.002-.189 2.02H9.66l.179 1.913h4.597l-.272 2.62-2.164.598-2.197-.603-.141-1.569h-1.94l.216 2.867L12 17.484l3.995-1.137.905-9.923z"/>
        </svg>
      );
    case 'json':
      return (
        <svg className={`${iconClass} text-yellow-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0a2 2 0 012 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2z"/>
        </svg>
      );
    default:
      return (
        <svg className={`${iconClass} text-zinc-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default ReactPreview;
