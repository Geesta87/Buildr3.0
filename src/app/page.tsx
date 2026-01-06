"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase, Project } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  code?: string;
}

interface AIQuestion {
  question: string;
  options: string[];
  allowMultiple: boolean;
  hasOther: boolean;
}

export default function Home() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState("");
  
  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Existing state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [streamingCode, setStreamingCode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [streamingContent, setStreamingContent] = useState("");
  const [buildStatus, setBuildStatus] = useState<string>("");
  
  // Flow states
  const [stage, setStage] = useState<"auth" | "projects" | "home" | "questions" | "builder">("auth");
  const [userPrompt, setUserPrompt] = useState("");
  const [isFirstBuild, setIsFirstBuild] = useState(true);
  
  // AI-generated questions
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [otherText, setOtherText] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check auth on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStage("projects");
        loadProjects();
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStage("projects");
        loadProjects();
      } else {
        setStage("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-save project when code changes
  useEffect(() => {
    if (currentProject && currentCode && currentCode !== currentProject.code) {
      setSaveStatus("unsaved");
      const timer = setTimeout(() => {
        saveProject();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentCode, currentProject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Panel resize handlers
  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setPanelWidth(Math.min(Math.max(newWidth, 20), 80));
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Auth functions
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSent(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
    setCurrentProject(null);
    setStage("auth");
  };

  // Project functions
  const loadProjects = async () => {
    setProjectsLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (data && !error) {
      setProjects(data);
    }
    setProjectsLoading(false);
  };

  const createProject = async (name: string, prompt: string) => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: name || "Untitled Project",
        preview_prompt: prompt,
      })
      .select()
      .single();

    if (data && !error) {
      setCurrentProject(data);
      setProjects(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const saveProject = async () => {
    if (!currentProject || !currentCode) return;
    
    setSaveStatus("saving");
    const { error } = await supabase
      .from("projects")
      .update({
        code: currentCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentProject.id);

    if (!error) {
      setSaveStatus("saved");
      setCurrentProject(prev => prev ? { ...prev, code: currentCode } : null);
    }
  };

  const deleteProject = async (projectId: string) => {
    await supabase.from("projects").delete().eq("id", projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const openProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentCode(project.code || "");
    setUserPrompt(project.preview_prompt || "");
    setStage("builder");
    setIsFirstBuild(!project.code);
  };

  // Code extraction functions
  const extractCode = (text: string): string | null => {
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    const codeMatch = text.match(/```\n([\s\S]*?)```/);
    if (codeMatch && (codeMatch[1].includes("<!DOCTYPE") || codeMatch[1].includes("<html"))) {
      return codeMatch[1].trim();
    }
    return null;
  };

  const extractStreamingCode = (text: string): string | null => {
    const complete = extractCode(text);
    if (complete) return complete;
    const partialMatch = text.match(/```html\n([\s\S]*?)$/);
    if (partialMatch) return partialMatch[1];
    const partialMatch2 = text.match(/```\n([\s\S]*?)$/);
    if (partialMatch2 && (partialMatch2[1].includes("<!DOCTYPE") || partialMatch2[1].includes("<html") || partialMatch2[1].includes("<head") || partialMatch2[1].includes("<style"))) {
      return partialMatch2[1];
    }
    return null;
  };

  const getBuildStatus = (code: string): string => {
    if (!code) return "Starting...";
    if (code.includes("</html>")) return "Finishing up...";
    if (code.includes("</script>")) return "Adding interactions...";
    if (code.includes("<script")) return "Adding JavaScript...";
    if (code.includes("@media")) return "Making responsive...";
    if (code.includes(":hover")) return "Adding hover effects...";
    if (code.includes("animation")) return "Adding animations...";
    if (code.includes("footer")) return "Creating footer...";
    if (code.includes("hero")) return "Designing hero section...";
    if (code.includes("nav")) return "Creating navigation...";
    if (code.includes("<style")) return "Writing styles...";
    if (code.includes("<head")) return "Setting up structure...";
    return "Building...";
  };

  // Generate questions using AI
  const generateQuestions = async (prompt: string) => {
    setIsLoadingQuestions(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `I want to build: "${prompt}"

Analyze this request and generate 3-4 specific clarifying questions. Return ONLY a JSON array:

[{"question": "...", "options": ["...", "..."], "allowMultiple": false, "hasOther": true}]

Rules:
- Questions specific to "${prompt}", not generic
- Simple, non-technical language
- First question: core purpose/goal
- Include style/vibe question
- Include features/sections question (allowMultiple: true)`
          }],
          mode: "questions"
        }),
      });

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
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.content) fullContent += parsed.content;
              } catch {}
            }
          }
        }
      }

      const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setAiQuestions(JSON.parse(jsonMatch[0]));
      } else {
        setAiQuestions([
          { question: "What's the main purpose?", options: ["Showcase work", "Generate leads", "Sell products", "Provide information"], allowMultiple: false, hasOther: true },
          { question: "What style do you prefer?", options: ["Modern & Minimal", "Bold & Colorful", "Dark & Techy", "Elegant"], allowMultiple: false, hasOther: false },
          { question: "What sections do you need?", options: ["Hero", "About", "Features", "Contact", "Pricing"], allowMultiple: true, hasOther: true },
        ]);
      }
    } catch {
      setAiQuestions([
        { question: "What's the main purpose?", options: ["Showcase", "Sell", "Inform", "Generate leads"], allowMultiple: false, hasOther: true },
        { question: "What style?", options: ["Modern", "Bold", "Dark", "Elegant"], allowMultiple: false, hasOther: false },
        { question: "What sections?", options: ["Hero", "About", "Features", "Contact"], allowMultiple: true, hasOther: true },
      ]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setUserPrompt(input);
    setStage("questions");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    await generateQuestions(input);
  };

  const currentQuestion = aiQuestions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (currentQuestion?.allowMultiple) {
      setSelectedOptions(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleNextQuestion = () => {
    const finalAnswers = otherText ? [...selectedOptions, otherText] : selectedOptions;
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: finalAnswers }));
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptions([]);
      setOtherText("");
    }
  };

  const handleImplement = async () => {
    const finalAnswers = { ...answers, [currentQuestionIndex]: otherText ? [...selectedOptions, otherText] : selectedOptions };
    
    let buildPrompt = `Build me a ${userPrompt}.\n\nHere are my requirements:\n`;
    aiQuestions.forEach((q, idx) => {
      const ans = finalAnswers[idx];
      if (ans && ans.length > 0) {
        buildPrompt += `- ${q.question}: ${ans.join(", ")}\n`;
      }
    });
    buildPrompt += "\nCreate this now. Make it stunning and professional.";

    // Create project in Supabase
    const project = await createProject(userPrompt, buildPrompt);
    if (!project) return;

    setStage("builder");
    setViewMode("code");
    
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: buildPrompt };
    setMessages([userMessage]);
    setIsLoading(true);
    setStreamingContent("");
    setStreamingCode("");
    setBuildStatus("Starting...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }] }),
      });

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
                  const partialCode = extractStreamingCode(fullContent);
                  if (partialCode) {
                    setStreamingCode(partialCode);
                    setBuildStatus(getBuildStatus(partialCode));
                  }
                  const code = extractCode(fullContent);
                  if (code) setCurrentCode(code);
                }
              } catch {}
            }
          }
        }
      }

      const code = extractCode(fullContent);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: fullContent, code: code || undefined }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) {
        setCurrentCode(code);
        setIsFirstBuild(false);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, there was an error. Please try again." }]);
    } finally {
      setIsLoading(false);
      setBuildStatus("");
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setStreamingCode("");
    setBuildStatus("Implementing changes...");

    try {
      const systemContext = isFirstBuild ? "" : `\n\nCurrent website code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nThe user wants changes. Confirm what you're doing briefly, then output the FULL updated code.`;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.role === "user" && m.id === userMessage.id ? m.content + systemContext : m.content,
          })),
          isFollowUp: !isFirstBuild,
        }),
      });

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
                  const partialCode = extractStreamingCode(fullContent);
                  if (partialCode) {
                    setStreamingCode(partialCode);
                    setBuildStatus(getBuildStatus(partialCode));
                  }
                  const code = extractCode(fullContent);
                  if (code) setCurrentCode(code);
                }
              } catch {}
            }
          }
        }
      }

      const code = extractCode(fullContent);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: fullContent, code: code || undefined }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) {
        setCurrentCode(code);
        setIsFirstBuild(false);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, there was an error. Please try again." }]);
    } finally {
      setIsLoading(false);
      setBuildStatus("");
    }
  };

  const handleDownload = () => {
    if (!currentCode) return;
    const blob = new Blob([currentCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject?.name || "buildr-export"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToProjects = () => {
    setMessages([]);
    setCurrentCode("");
    setStreamingContent("");
    setStreamingCode("");
    setInput("");
    setUserPrompt("");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    setAiQuestions([]);
    setIsFirstBuild(true);
    setBuildStatus("");
    setCurrentProject(null);
    setStage("projects");
    loadProjects();
  };

  const handleNewProject = () => {
    setMessages([]);
    setCurrentCode("");
    setInput("");
    setUserPrompt("");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    setAiQuestions([]);
    setIsFirstBuild(true);
    setCurrentProject(null);
    setStage("home");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (stage === "home") handleGenerate();
      else if (stage === "builder") handleChatSubmit(e);
    }
  };

  const renderMessageContent = (content: string, isStreaming: boolean = false) => {
    let cleaned = content.replace(/```[\s\S]*?```/g, "").trim();
    if (isStreaming || cleaned.includes("```")) cleaned = cleaned.replace(/```[\s\S]*/g, "").trim();
    cleaned = cleaned.replace(/\*\*/g, "").trim();
    if (!cleaned || cleaned.length < 3) return isFirstBuild ? "Building your website..." : "Implementing changes...";
    return cleaned;
  };

  // Loading state
  if (authLoading) {
    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.loadingScreen}>
          <div style={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  // ==================== AUTH SCREEN ====================
  if (stage === "auth") {
    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.gridBg} />
        
        <main style={styles.authMain}>
          <div style={styles.authCard}>
            <div style={styles.authLogo}>
              <div style={styles.logoIcon}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h1 style={styles.authTitle}>Buildr</h1>
              <p style={styles.authSubtitle}>AI Website Builder</p>
            </div>

            {authSent ? (
              <div style={styles.authSent}>
                <div style={styles.authSentIcon}>✉️</div>
                <h2 style={styles.authSentTitle}>Check your email</h2>
                <p style={styles.authSentText}>
                  We sent a magic link to <strong>{authEmail}</strong>
                  <br />Click the link to sign in.
                </p>
                <button onClick={() => setAuthSent(false)} style={styles.authBackBtn}>
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSignIn} style={styles.authForm}>
                <label style={styles.authLabel}>Email address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={styles.authInput}
                />
                {authError && <p style={styles.authError}>{authError}</p>}
                <button type="submit" style={styles.authSubmit}>
                  Continue with Email
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <p style={styles.authNote}>No password needed. We'll send you a magic link.</p>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==================== PROJECTS SCREEN ====================
  if (stage === "projects") {
    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.gridBg} />
        
        <header style={styles.projectsHeader}>
          <div style={styles.logoSection}>
            <div style={styles.logoIcon}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <div style={styles.logoTitle}>Buildr</div>
              <div style={styles.logoSubtitle}>AI Website Builder</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.userEmail}>{user?.email}</span>
            <button onClick={handleSignOut} style={styles.signOutBtn}>Sign out</button>
          </div>
        </header>

        <main style={styles.projectsMain}>
          <div style={styles.projectsContent}>
            <div style={styles.projectsTop}>
              <h1 style={styles.projectsTitle}>My Projects</h1>
              <button onClick={handleNewProject} style={styles.newProjectBtn}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            </div>

            {projectsLoading ? (
              <div style={styles.projectsLoading}>
                <div style={styles.loadingSpinner} />
              </div>
            ) : projects.length === 0 ? (
              <div style={styles.emptyProjects}>
                <div style={styles.emptyIcon}>📁</div>
                <h2 style={styles.emptyTitle}>No projects yet</h2>
                <p style={styles.emptyText}>Create your first website with AI</p>
                <button onClick={handleNewProject} style={styles.emptyBtn}>
                  Create Project
                </button>
              </div>
            ) : (
              <div style={styles.projectsGrid}>
                {projects.map((project) => (
                  <div key={project.id} style={styles.projectCard}>
                    <div style={styles.projectPreview} onClick={() => openProject(project)}>
                      {project.code ? (
                        <iframe
                          srcDoc={project.code}
                          style={styles.projectIframe}
                          sandbox=""
                          title={project.name}
                        />
                      ) : (
                        <div style={styles.projectEmpty}>
                          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div style={styles.projectInfo}>
                      <h3 style={styles.projectName} onClick={() => openProject(project)}>{project.name}</h3>
                      <p style={styles.projectDate}>
                        {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => deleteProject(project.id)} 
                      style={styles.projectDelete}
                      title="Delete project"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==================== HOME SCREEN ====================
  if (stage === "home") {
    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.gridBg} />
        
        <header style={styles.header}>
          <div style={styles.logoSection}>
            <button onClick={handleBackToProjects} style={styles.backBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div style={styles.logoTitle}>Buildr</div>
              <div style={styles.logoSubtitle}>New Project</div>
            </div>
          </div>
        </header>

        <main style={styles.main}>
          <h1 style={styles.headline}>
            <span style={{ color: "#fff" }}>What do you want to </span>
            <span style={styles.gradientText}>build</span>
            <span style={{ color: "#fff" }}>?</span>
          </h1>

          <div style={styles.promptWrapper}>
            <div style={styles.promptGlow} />
            <div style={styles.promptBox}>
              <div style={styles.promptInputArea}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2} style={{ flexShrink: 0, marginTop: 4 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to build..."
                  style={styles.textarea}
                  rows={2}
                />
              </div>
              <div style={styles.promptDivider} />
              <div style={styles.promptBottom}>
                <div />
                <button
                  onClick={handleGenerate}
                  disabled={!input.trim()}
                  style={{ ...styles.btnGenerate, opacity: !input.trim() ? 0.5 : 1, cursor: !input.trim() ? "not-allowed" : "pointer" }}
                >
                  Generate
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div style={styles.quickPrompts}>
            <span style={{ color: "#6b7280" }}>Try:</span>
            {["Restaurant website", "Fitness landing page", "Portfolio", "SaaS pricing"].map((prompt) => (
              <button key={prompt} onClick={() => setInput(prompt)} style={styles.quickPromptBtn}>
                {prompt}
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUESTIONS SCREEN ====================
  if (stage === "questions") {
    const isLastQuestion = currentQuestionIndex === aiQuestions.length - 1;
    const canProceed = selectedOptions.length > 0 || otherText.trim().length > 0;

    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.gridBg} />

        <header style={styles.header}>
          <div style={styles.logoSection}>
            <button onClick={handleBackToProjects} style={styles.backBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div style={styles.logoTitle}>Buildr</div>
              <div style={styles.logoSubtitle}>New Project</div>
            </div>
          </div>
        </header>

        <main style={styles.questionsMain}>
          {isLoadingQuestions ? (
            <div style={styles.loadingQuestions}>
              <div style={styles.loadingSpinner} />
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Analyzing your request...</p>
            </div>
          ) : currentQuestion ? (
            <div style={styles.questionCard}>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${((currentQuestionIndex + 1) / aiQuestions.length) * 100}%` }} />
              </div>
              
              <div style={styles.questionHeader}>
                <span style={styles.questionNumber}>Question {currentQuestionIndex + 1} of {aiQuestions.length}</span>
                <span style={styles.projectType}>{userPrompt}</span>
              </div>

              <h2 style={styles.questionTitle}>{currentQuestion.question}</h2>
              
              {currentQuestion.allowMultiple && <p style={styles.multiSelectHint}>Select all that apply</p>}

              <div style={styles.optionsGrid}>
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    style={{ ...styles.optionBtn, ...(selectedOptions.includes(option) ? styles.optionBtnSelected : {}) }}
                  >
                    <div style={{ ...styles.optionRadio, ...(selectedOptions.includes(option) ? styles.optionRadioSelected : {}) }}>
                      {selectedOptions.includes(option) && (
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {option}
                  </button>
                ))}
              </div>

              {currentQuestion.hasOther && (
                <div style={styles.otherSection}>
                  <label style={styles.otherLabel}>Other (please specify)</label>
                  <input type="text" value={otherText} onChange={(e) => setOtherText(e.target.value)} placeholder="Type your answer..." style={styles.otherInput} />
                </div>
              )}

              <div style={styles.questionActions}>
                {currentQuestionIndex > 0 && (
                  <button onClick={() => { setCurrentQuestionIndex(prev => prev - 1); setSelectedOptions(answers[currentQuestionIndex - 1] || []); setOtherText(""); }} style={styles.btnSecondary}>
                    Back
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {isLastQuestion ? (
                  <button onClick={handleImplement} disabled={!canProceed} style={{ ...styles.btnImplement, opacity: !canProceed ? 0.5 : 1, cursor: !canProceed ? "not-allowed" : "pointer" }}>
                    Build My Website
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </button>
                ) : (
                  <button onClick={handleNextQuestion} disabled={!canProceed} style={{ ...styles.btnNext, opacity: !canProceed ? 0.5 : 1, cursor: !canProceed ? "not-allowed" : "pointer" }}>
                    Next
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  // ==================== BUILDER VIEW ====================
  return (
    <div ref={containerRef} style={styles.builderContainer}>
      <style jsx global>{globalStyles}</style>
      
      <div style={{ ...styles.chatPanel, width: `${panelWidth}%` }}>
        <div style={styles.chatHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={handleBackToProjects} style={styles.homeBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            <div>
              <div style={styles.logoTitle}>{currentProject?.name || "Buildr"}</div>
              <div style={styles.logoSubtitle}>
                {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "All changes saved" : "Unsaved changes"}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.messagesArea}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={msg.role === "user" ? styles.userMessage : styles.assistantMessage}>
                <p style={styles.messageText}>{renderMessageContent(msg.content)}</p>
                {msg.code && (
                  <div style={styles.codeIndicator}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Ready — check the preview
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={styles.buildingMessage}>
                <div style={styles.buildingHeader}>
                  <div style={styles.buildingSpinner}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <div style={styles.buildingTitle}>{isFirstBuild ? "Building your website" : "Implementing changes"}</div>
                    <div style={styles.buildingStatus}>{buildStatus}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <form onSubmit={handleChatSubmit} style={styles.inputForm}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask for changes..." disabled={isLoading} style={styles.chatInput} rows={1} />
            <button type="submit" disabled={!input.trim() || isLoading} style={{ ...styles.sendBtn, opacity: !input.trim() || isLoading ? 0.5 : 1 }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <div style={styles.resizer} onMouseDown={handleMouseDown}>
        <div style={styles.resizerLine} />
      </div>

      <div style={{ ...styles.previewPanel, width: `${100 - panelWidth}%` }}>
        <div style={styles.previewHeader}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setViewMode("preview")} style={viewMode === "preview" ? styles.tabActive : styles.tabInactive}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            <button onClick={() => setViewMode("code")} style={viewMode === "code" ? styles.tabActive : styles.tabInactive}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code
              {isLoading && streamingCode && <span style={styles.liveIndicator}>LIVE</span>}
            </button>
          </div>
          {currentCode && (
            <button onClick={handleDownload} style={styles.downloadBtn}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
        </div>

        <div style={styles.previewContent}>
          {!currentCode && !streamingCode ? (
            <div style={styles.emptyPreview}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Your preview will appear here</p>
            </div>
          ) : viewMode === "preview" ? (
            <iframe srcDoc={currentCode} style={styles.iframe} sandbox="allow-scripts allow-same-origin" title="Preview" />
          ) : (
            <div style={styles.codeView}>
              <pre style={styles.codeContent}>{currentCode || streamingCode}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #0A0A0A; color: #fff; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0A0A0A; }
  ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
`;

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
  gridBg: { position: "fixed", inset: 0, opacity: 0.15, pointerEvents: "none", backgroundImage: "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)" },
  loadingScreen: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  loadingSpinner: { width: 48, height: 48, border: "3px solid #27272a", borderTopColor: "#A855F7", borderRadius: "50%", animation: "spin 1s linear infinite" },
  
  // Auth styles
  authMain: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { width: "100%", maxWidth: 400, background: "#111", borderRadius: 16, border: "1px solid #27272a", padding: 32 },
  authLogo: { textAlign: "center", marginBottom: 32 },
  authTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 700, marginTop: 16, marginBottom: 4 },
  authSubtitle: { color: "#9ca3af", fontSize: 14 },
  authForm: { display: "flex", flexDirection: "column", gap: 16 },
  authLabel: { fontSize: 14, fontWeight: 500, color: "#d1d5db" },
  authInput: { padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "white", fontSize: 16, fontFamily: "'Inter', sans-serif", outline: "none" },
  authError: { color: "#ef4444", fontSize: 14, margin: 0 },
  authSubmit: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  authNote: { fontSize: 13, color: "#6b7280", textAlign: "center", margin: 0 },
  authSent: { textAlign: "center" },
  authSentIcon: { fontSize: 48, marginBottom: 16 },
  authSentTitle: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  authSentText: { color: "#9ca3af", fontSize: 14, lineHeight: 1.6 },
  authBackBtn: { marginTop: 24, padding: "8px 16px", background: "transparent", border: "1px solid #27272a", borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  
  // Projects styles
  projectsHeader: { padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #27272a" },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  userEmail: { fontSize: 14, color: "#9ca3af" },
  signOutBtn: { padding: "8px 16px", background: "transparent", border: "1px solid #27272a", borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  projectsMain: { flex: 1, padding: 24 },
  projectsContent: { maxWidth: 1200, margin: "0 auto" },
  projectsTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  projectsTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 700 },
  newProjectBtn: { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  projectsLoading: { display: "flex", justifyContent: "center", padding: 64 },
  emptyProjects: { textAlign: "center", padding: 64 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: 600, marginBottom: 8 },
  emptyText: { color: "#9ca3af", marginBottom: 24 },
  emptyBtn: { padding: "12px 24px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  projectsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 },
  projectCard: { background: "#111", borderRadius: 12, border: "1px solid #27272a", overflow: "hidden", position: "relative" },
  projectPreview: { aspectRatio: "16/10", background: "#0a0a0a", cursor: "pointer", overflow: "hidden" },
  projectIframe: { width: "200%", height: "200%", border: "none", transform: "scale(0.5)", transformOrigin: "top left", pointerEvents: "none" },
  projectEmpty: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  projectInfo: { padding: 16 },
  projectName: { fontSize: 16, fontWeight: 600, marginBottom: 4, cursor: "pointer" },
  projectDate: { fontSize: 13, color: "#6b7280" },
  projectDelete: { position: "absolute", top: 8, right: 8, width: 32, height: 32, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7 },
  
  // Header and logo
  header: { position: "relative", zIndex: 10, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoSection: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { width: 40, height: 40, borderRadius: 8, background: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center", color: "white", boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)" },
  logoTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: "white" },
  logoSubtitle: { fontSize: 12, color: "#9ca3af" },
  backBtn: { width: 40, height: 40, borderRadius: 8, background: "#1C1C1C", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", cursor: "pointer" },
  
  // Main home
  main: { position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px 80px" },
  headline: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 700, textAlign: "center", letterSpacing: "-0.02em", marginBottom: 32, lineHeight: 1.2 },
  gradientText: { background: "linear-gradient(to right, #e879f9, #a855f7, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
  promptWrapper: { width: "100%", maxWidth: 640, position: "relative" },
  promptGlow: { position: "absolute", inset: -4, background: "linear-gradient(to right, #A855F7, #3b82f6)", borderRadius: 16, filter: "blur(20px)", opacity: 0.2 },
  promptBox: { position: "relative", background: "#0F0F0F", borderRadius: 12, border: "1px solid #27272a", overflow: "hidden" },
  promptInputArea: { padding: 20, display: "flex", gap: 16 },
  textarea: { flex: 1, background: "transparent", border: "none", color: "#e5e7eb", fontSize: 18, fontFamily: "'Inter', sans-serif", resize: "none", outline: "none", minHeight: 56 },
  promptDivider: { height: 1, background: "#27272a" },
  promptBottom: { padding: "12px 20px", background: "#0A0A0A", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnGenerate: { display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, color: "white", background: "#A855F7", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  quickPrompts: { marginTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8, fontSize: 14 },
  quickPromptBtn: { padding: "6px 14px", borderRadius: 9999, border: "1px solid #27272a", background: "rgba(255, 255, 255, 0.05)", color: "#9ca3af", fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  
  // Questions
  questionsMain: { position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  loadingQuestions: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  questionCard: { width: "100%", maxWidth: 600, background: "#111", borderRadius: 16, border: "1px solid #27272a", padding: 32 },
  progressBar: { height: 4, background: "#27272a", borderRadius: 2, marginBottom: 24, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(to right, #A855F7, #6366f1)", borderRadius: 2, transition: "width 0.3s ease" },
  questionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  questionNumber: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  projectType: { fontSize: 12, color: "#A855F7", background: "rgba(168, 85, 247, 0.1)", padding: "4px 12px", borderRadius: 9999 },
  questionTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, fontWeight: 600, color: "white", marginBottom: 8 },
  multiSelectHint: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  optionsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 },
  optionBtn: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 10, color: "#d1d5db", fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: "'Inter', sans-serif" },
  optionBtnSelected: { background: "rgba(168, 85, 247, 0.1)", borderColor: "#A855F7", color: "white" },
  optionRadio: { width: 20, height: 20, borderRadius: 6, border: "2px solid #4b5563", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optionRadioSelected: { background: "#A855F7", borderColor: "#A855F7" },
  otherSection: { marginBottom: 24 },
  otherLabel: { display: "block", fontSize: 14, color: "#9ca3af", marginBottom: 8 },
  otherInput: { width: "100%", padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "white", fontSize: 14, fontFamily: "'Inter', sans-serif", outline: "none" },
  questionActions: { display: "flex", gap: 12 },
  btnSecondary: { padding: "12px 24px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  btnNext: { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  btnImplement: { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "linear-gradient(to right, #A855F7, #6366f1)", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  
  // Builder
  builderContainer: { height: "100vh", display: "flex", background: "#0A0A0A" },
  chatPanel: { display: "flex", flexDirection: "column", borderRight: "1px solid #27272a", minWidth: 300 },
  chatHeader: { padding: 16, borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between" },
  homeBtn: { width: 40, height: 40, borderRadius: 8, background: "#A855F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  messagesArea: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 },
  userMessage: { maxWidth: "85%", borderRadius: 16, padding: "12px 16px", background: "#A855F7", color: "white" },
  assistantMessage: { maxWidth: "85%", borderRadius: 16, padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", color: "#e5e7eb" },
  messageText: { fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 },
  codeIndicator: { marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 13, color: "#22c55e", display: "flex", alignItems: "center", gap: 8 },
  buildingMessage: { borderRadius: 16, padding: "16px 20px", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #A855F7" },
  buildingHeader: { display: "flex", alignItems: "center", gap: 14 },
  buildingSpinner: { width: 40, height: 40, borderRadius: 10, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 2s linear infinite" },
  buildingTitle: { fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 2 },
  buildingStatus: { fontSize: 13, color: "#A855F7", fontWeight: 500 },
  inputArea: { padding: 16, borderTop: "1px solid #27272a" },
  inputForm: { display: "flex", gap: 12 },
  chatInput: { flex: 1, padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 12, color: "white", fontSize: 14, fontFamily: "'Inter', sans-serif", resize: "none", outline: "none" },
  sendBtn: { padding: "12px 16px", background: "#A855F7", border: "none", borderRadius: 12, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  resizer: { width: 12, background: "#0A0A0A", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" },
  resizerLine: { width: 4, height: 40, background: "#27272a", borderRadius: 2 },
  previewPanel: { display: "flex", flexDirection: "column", background: "#111", minWidth: 300 },
  previewHeader: { padding: 16, borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center" },
  tabActive: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  tabInactive: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "transparent", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  liveIndicator: { fontSize: 9, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 6px", borderRadius: 4, marginLeft: 8, animation: "pulse 1s ease-in-out infinite" },
  downloadBtn: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "transparent", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  previewContent: { flex: 1, padding: 16, overflow: "hidden" },
  emptyPreview: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "2px dashed #27272a" },
  iframe: { width: "100%", height: "100%", background: "white", borderRadius: 8, border: "none" },
  codeView: { height: "100%", overflow: "auto", borderRadius: 12, background: "#0A0A0A", border: "1px solid #27272a" },
  codeContent: { padding: 16, fontSize: 14, color: "#d1d5db", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 },
};
