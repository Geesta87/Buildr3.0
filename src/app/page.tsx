"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  code?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [streamingContent, setStreamingContent] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const extractCode = (text: string): string | null => {
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    const codeMatch = text.match(/```\n([\s\S]*?)```/);
    if (codeMatch && (codeMatch[1].includes("<!DOCTYPE") || codeMatch[1].includes("<html"))) {
      return codeMatch[1].trim();
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!hasStarted) setHasStarted(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                  const code = extractCode(fullContent);
                  if (code) setCurrentCode(code);
                }
              } catch {
                // Skip
              }
            }
          }
        }
      }

      const code = extractCode(fullContent);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent,
        code: code || undefined,
      }]);
      setStreamingContent("");
      if (code) setCurrentCode(code);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error. Please check your API key and try again.",
      }]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  const handleDownload = () => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buildr-export.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setMessages([]);
    setCurrentCode("");
    setStreamingContent("");
    setHasStarted(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderMessageContent = (content: string) => {
    const withoutCode = content.replace(/```[\s\S]*?```/g, "").trim();
    return withoutCode;
  };

  // ==================== LANDING SCREEN ====================
  if (!hasStarted) {
    return (
      <div className="landing-container">
        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0A0A0A;
            color: #fff;
            min-height: 100vh;
          }
          
          .landing-container {
            min-height: 100vh;
            background: #0A0A0A;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
          }
          
          .grid-background {
            position: fixed;
            inset: 0;
            opacity: 0.15;
            pointer-events: none;
            background-image: linear-gradient(to right, #27272a 1px, transparent 1px),
                              linear-gradient(to bottom, #27272a 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
            -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
          }
          
          .header {
            position: relative;
            z-index: 10;
            width: 100%;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid transparent;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .logo-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: #A855F7;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 10px 25px -5px rgba(168, 85, 247, 0.2);
          }
          
          .logo-text {
            display: flex;
            flex-direction: column;
          }
          
          .logo-title {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.2;
            color: white;
          }
          
          .logo-subtitle {
            font-size: 12px;
            color: #9ca3af;
            font-weight: 500;
          }
          
          .nav-buttons {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .nav-link {
            font-size: 14px;
            font-weight: 500;
            color: #9ca3af;
            text-decoration: none;
            transition: color 0.2s;
          }
          
          .nav-link:hover {
            color: #A855F7;
          }
          
          .btn-settings {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            color: #e5e7eb;
            background: #1C1C1C;
            border: 1px solid #374151;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
          }
          
          .btn-settings:hover {
            background: #252525;
          }
          
          .btn-signin {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 20px;
            font-size: 14px;
            font-weight: 600;
            color: white;
            background: #A855F7;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            box-shadow: 0 10px 25px -5px rgba(168, 85, 247, 0.25);
          }
          
          .btn-signin:hover {
            background: #9333EA;
          }
          
          .main-content {
            position: relative;
            z-index: 10;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 16px 80px;
          }
          
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #27272a;
            backdrop-filter: blur(8px);
            margin-bottom: 32px;
            transition: border-color 0.2s;
            cursor: default;
          }
          
          .badge:hover {
            border-color: rgba(168, 85, 247, 0.5);
          }
          
          .badge-icon {
            color: #A855F7;
          }
          
          .badge-text {
            font-size: 14px;
            color: #d1d5db;
            font-weight: 500;
          }
          
          .badge-tag {
            font-size: 10px;
            font-weight: 700;
            color: #A855F7;
            background: rgba(168, 85, 247, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .headline {
            font-size: clamp(48px, 8vw, 72px);
            font-weight: 700;
            text-align: center;
            letter-spacing: -0.02em;
            margin-bottom: 24px;
            max-width: 900px;
            line-height: 1.1;
          }
          
          .headline-white {
            color: white;
          }
          
          .headline-gradient {
            background: linear-gradient(to right, #e879f9, #a855f7, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-style: italic;
            padding-right: 8px;
          }
          
          .headline-gray {
            color: #6b7280;
          }
          
          .subtitle {
            font-size: clamp(16px, 2.5vw, 20px);
            text-align: center;
            color: #9ca3af;
            max-width: 640px;
            margin-bottom: 48px;
            font-weight: 300;
            line-height: 1.6;
          }
          
          .subtitle-muted {
            color: #6b7280;
          }
          
          .prompt-wrapper {
            width: 100%;
            max-width: 768px;
            position: relative;
          }
          
          .prompt-glow {
            position: absolute;
            inset: -4px;
            background: linear-gradient(to right, #A855F7, #3b82f6);
            border-radius: 16px;
            filter: blur(20px);
            opacity: 0.2;
            transition: opacity 0.5s;
          }
          
          .prompt-wrapper:hover .prompt-glow {
            opacity: 0.3;
          }
          
          .prompt-box {
            position: relative;
            background: #0F0F0F;
            border-radius: 12px;
            border: 1px solid #27272a;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
          }
          
          .prompt-input-area {
            padding: 16px 20px;
            display: flex;
            gap: 16px;
          }
          
          .prompt-icon {
            color: #A855F7;
            flex-shrink: 0;
            margin-top: 4px;
            animation: pulse 2s ease-in-out infinite;
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .prompt-textarea {
            flex: 1;
            background: transparent;
            border: none;
            color: #e5e7eb;
            font-size: 18px;
            resize: none;
            outline: none;
            min-height: 56px;
            font-family: inherit;
          }
          
          .prompt-textarea::placeholder {
            color: #6b7280;
          }
          
          .keyboard-hints {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            color: #4b5563;
            padding-top: 8px;
          }
          
          .kbd {
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid #374151;
            border-radius: 4px;
            background: #1f2937;
            font-family: inherit;
          }
          
          .prompt-divider {
            height: 1px;
            background: #27272a;
          }
          
          .prompt-bottom {
            padding: 12px 20px;
            background: #121212;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          
          .prompt-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
          }
          
          .btn-action {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            font-family: inherit;
          }
          
          .btn-action-primary {
            color: white;
            background: #1f2937;
          }
          
          .btn-action-primary:hover {
            background: #374151;
          }
          
          .btn-action-secondary {
            color: #9ca3af;
            background: transparent;
          }
          
          .btn-action-secondary:hover {
            color: #e5e7eb;
            background: rgba(255, 255, 255, 0.05);
          }
          
          .btn-generate {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 8px 24px;
            font-size: 14px;
            font-weight: 600;
            color: white;
            background: #A855F7;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 10px 25px -5px rgba(168, 85, 247, 0.25);
            font-family: inherit;
          }
          
          .btn-generate:hover {
            background: #9333EA;
          }
          
          .btn-generate:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .btn-generate:active {
            transform: scale(0.95);
          }
          
          .quick-prompts {
            margin-top: 32px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 8px;
            font-size: 14px;
          }
          
          .quick-prompts-label {
            color: #6b7280;
          }
          
          .quick-prompt-btn {
            padding: 4px 12px;
            border-radius: 9999px;
            border: 1px solid #27272a;
            background: rgba(255, 255, 255, 0.05);
            color: #9ca3af;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
          }
          
          .quick-prompt-btn:hover {
            border-color: rgba(168, 85, 247, 0.5);
            color: #A855F7;
          }
          
          .footer {
            position: relative;
            z-index: 10;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #4b5563;
          }
          
          @media (max-width: 768px) {
            .nav-buttons {
              display: none;
            }
            
            .keyboard-hints {
              display: none;
            }
            
            .prompt-bottom {
              flex-direction: column;
            }
            
            .btn-generate {
              width: 100%;
            }
          }
        `}</style>
        
        <div className="grid-background" />
        
        {/* Header */}
        <header className="header">
          <div className="logo-section">
            <div className="logo-icon">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className="logo-text">
              <span className="logo-title">Buildr</span>
              <span className="logo-subtitle">AI Website Builder</span>
            </div>
          </div>
          <nav className="nav-buttons">
            <a href="#" className="nav-link">Docs</a>
            <button className="btn-settings">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
            <button className="btn-signin">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sign In
            </button>
          </nav>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {/* Badge */}
          <div className="badge">
            <svg className="badge-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="badge-text">Powered by Claude AI</span>
            <span className="badge-tag">Opus 4.5</span>
          </div>

          {/* Headline */}
          <h1 className="headline">
            <span className="headline-white">Build </span>
            <span className="headline-gradient">anything</span>
            <br />
            <span className="headline-gray">with AI</span>
          </h1>

          {/* Subtitle */}
          <p className="subtitle">
            Describe your vision in plain English. Watch it come to life in seconds.
            <br />
            <span className="subtitle-muted">No coding required.</span>
          </p>

          {/* Prompt Box */}
          <div className="prompt-wrapper">
            <div className="prompt-glow" />
            <div className="prompt-box">
              <div className="prompt-input-area">
                <svg className="prompt-icon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <textarea
                  className="prompt-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to build..."
                  rows={2}
                />
                <div className="keyboard-hints">
                  <kbd className="kbd">⌘</kbd>
                  <kbd className="kbd">K</kbd>
                </div>
              </div>
              
              <div className="prompt-divider" />
              
              <div className="prompt-bottom">
                <div className="prompt-actions">
                  <button className="btn-action btn-action-primary">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Plan with AI
                  </button>
                  <button className="btn-action btn-action-secondary">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Screenshot
                  </button>
                  <button className="btn-action btn-action-secondary">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Clone URL
                  </button>
                </div>
                <button 
                  className="btn-generate"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                >
                  Generate
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="quick-prompts">
            <span className="quick-prompts-label">Try:</span>
            {["SaaS Dashboard", "Portfolio", "E-commerce Store"].map((prompt) => (
              <button
                key={prompt}
                className="quick-prompt-btn"
                onClick={() => setInput(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="footer">
          © 2024 Buildr Inc. All rights reserved.
        </footer>
      </div>
    );
  }

  // ==================== BUILDER VIEW ====================
  return (
    <div style={{ height: "100vh", display: "flex", background: "#0A0A0A" }}>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0A0A0A; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
      `}</style>
      
      {/* Left: Chat */}
      <div style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: "1px solid #27272a" }}>
        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleClear}
              style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)" }}
              title="Back to home"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <div>
              <div style={{ fontWeight: 700, color: "white" }}>Buildr</div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>AI Website Builder</div>
            </div>
          </div>
          <button
            onClick={handleClear}
            style={{ padding: "8px", borderRadius: "8px", background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%",
                borderRadius: "16px",
                padding: "12px 16px",
                background: msg.role === "user" ? "#A855F7" : "#1C1C1C",
                color: msg.role === "user" ? "white" : "#e5e7eb",
                border: msg.role === "user" ? "none" : "1px solid #27272a"
              }}>
                <p style={{ fontSize: "14px", whiteSpace: "pre-wrap", margin: 0 }}>{renderMessageContent(msg.content)}</p>
                {msg.code && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: "12px", opacity: 0.75, display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Code generated
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingContent && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ maxWidth: "85%", borderRadius: "16px", padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", color: "#e5e7eb" }}>
                <p style={{ fontSize: "14px", whiteSpace: "pre-wrap", margin: 0 }}>{renderMessageContent(streamingContent)}</p>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ borderRadius: "16px", padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#A855F7", animation: "bounce 0.6s ease-in-out infinite" }} />
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#A855F7", animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0.15s" }} />
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#A855F7", animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "16px", borderTop: "1px solid #27272a" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for changes..."
              disabled={isLoading}
              style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", background: "#1C1C1C", border: "1px solid #27272a", color: "white", resize: "none", outline: "none", fontFamily: "inherit", fontSize: "14px" }}
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{ padding: "12px 16px", borderRadius: "12px", background: "#A855F7", border: "none", color: "white", cursor: "pointer", opacity: !input.trim() || isLoading ? 0.5 : 1 }}
            >
              {isLoading ? (
                <div style={{ width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px", textAlign: "center" }}>Enter to send • Shift+Enter for new line</p>
        </div>
      </div>

      {/* Right: Preview */}
      <div style={{ width: "50%", display: "flex", flexDirection: "column", background: "#111" }}>
        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setViewMode("preview")}
              style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", border: "none", cursor: "pointer", background: viewMode === "preview" ? "#A855F7" : "transparent", color: viewMode === "preview" ? "white" : "#9ca3af" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            <button
              onClick={() => setViewMode("code")}
              style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", border: "none", cursor: "pointer", background: viewMode === "code" ? "#A855F7" : "transparent", color: viewMode === "code" ? "white" : "#9ca3af" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code
            </button>
          </div>
          {currentCode && (
            <button
              onClick={handleDownload}
              style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", border: "none", cursor: "pointer", background: "transparent", color: "#9ca3af" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "16px", overflow: "hidden" }}>
          {!currentCode ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "2px dashed #27272a" }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p style={{ color: "#9ca3af", marginTop: "16px" }}>Preview will appear here</p>
              <p style={{ color: "#4b5563", fontSize: "12px", marginTop: "4px" }}>Generating...</p>
            </div>
          ) : viewMode === "preview" ? (
            <iframe
              srcDoc={currentCode}
              style={{ width: "100%", height: "100%", background: "white", borderRadius: "8px", border: "none" }}
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          ) : (
            <div style={{ height: "100%", overflow: "auto", borderRadius: "12px", background: "#0A0A0A", border: "1px solid #27272a" }}>
              <pre style={{ padding: "16px", fontSize: "14px", color: "#d1d5db", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 }}>{currentCode}</pre>
            </div>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
