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

interface Question {
  id: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
  hasOther: boolean;
}

// Smart pre-set questions based on keywords
const QUESTION_SETS: Record<string, Question[]> = {
  restaurant: [
    { id: "cuisine", question: "What type of cuisine?", options: ["Italian", "Mexican", "Asian", "American", "Mediterranean", "Indian"], allowMultiple: false, hasOther: true },
    { id: "features", question: "What features do you need?", options: ["Online Menu", "Reservations", "Online Ordering", "Photo Gallery", "Reviews", "Location Map"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What vibe fits your restaurant?", options: ["Elegant & Upscale", "Casual & Friendly", "Modern & Trendy", "Rustic & Cozy"], allowMultiple: false, hasOther: false },
  ],
  portfolio: [
    { id: "type", question: "What type of portfolio?", options: ["Designer / Creative", "Developer", "Photographer", "Artist", "Freelancer", "Agency"], allowMultiple: false, hasOther: true },
    { id: "sections", question: "What sections do you need?", options: ["Hero / Intro", "Project Gallery", "About Me", "Skills", "Testimonials", "Contact"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What vibe do you want?", options: ["Minimal & Clean", "Bold & Creative", "Dark & Moody", "Bright & Friendly"], allowMultiple: false, hasOther: false },
  ],
  saas: [
    { id: "product", question: "What does your product do?", options: ["Project Management", "Analytics & Reporting", "CRM / Sales", "Marketing Tools", "Finance & Accounting", "Team Collaboration"], allowMultiple: false, hasOther: true },
    { id: "sections", question: "What sections do you need?", options: ["Hero with CTA", "Features Grid", "Pricing Table", "Testimonials", "FAQ", "Demo/Screenshots"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What style fits your brand?", options: ["Dark & Techy", "Light & Clean", "Colorful & Modern", "Minimal & Professional"], allowMultiple: false, hasOther: false },
  ],
  landing: [
    { id: "goal", question: "What's the main goal?", options: ["Get Sign-ups", "Sell a Product", "Book Appointments", "Generate Leads", "Promote an Event"], allowMultiple: false, hasOther: true },
    { id: "sections", question: "What sections do you need?", options: ["Hero with CTA", "Features/Benefits", "Pricing", "Testimonials", "FAQ", "Contact Form"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What style fits your brand?", options: ["Modern & Minimal", "Bold & Colorful", "Professional & Corporate", "Playful & Fun"], allowMultiple: false, hasOther: false },
  ],
  ecommerce: [
    { id: "products", question: "What are you selling?", options: ["Clothing & Fashion", "Electronics", "Food & Beverages", "Digital Products", "Home & Furniture", "Beauty & Health"], allowMultiple: false, hasOther: true },
    { id: "features", question: "What features do you need?", options: ["Product Grid", "Shopping Cart", "Search & Filters", "Reviews", "Wishlist", "Categories"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What style fits your brand?", options: ["Minimal & Elegant", "Bold & Trendy", "Luxury & Premium", "Fun & Colorful"], allowMultiple: false, hasOther: false },
  ],
  fitness: [
    { id: "type", question: "What type of fitness business?", options: ["Gym / Fitness Center", "Personal Training", "Yoga Studio", "CrossFit", "Online Coaching", "Fitness App"], allowMultiple: false, hasOther: true },
    { id: "sections", question: "What sections do you need?", options: ["Hero with CTA", "Classes/Programs", "Trainer Profiles", "Pricing/Membership", "Testimonials", "Contact/Location"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What vibe fits your brand?", options: ["Bold & Energetic", "Clean & Modern", "Dark & Intense", "Friendly & Approachable"], allowMultiple: false, hasOther: false },
  ],
  default: [
    { id: "purpose", question: "What's the main purpose?", options: ["Showcase Work", "Generate Leads", "Sell Products/Services", "Provide Information", "Build Community", "Book Appointments"], allowMultiple: false, hasOther: true },
    { id: "sections", question: "What sections do you need?", options: ["Hero Section", "About", "Services/Features", "Pricing", "Testimonials", "Contact"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What style do you prefer?", options: ["Modern & Minimal", "Bold & Colorful", "Dark & Techy", "Elegant & Professional"], allowMultiple: false, hasOther: false },
  ],
};

const getQuestionsForPrompt = (prompt: string): Question[] => {
  const lower = prompt.toLowerCase();
  if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("food") || lower.includes("menu")) return QUESTION_SETS.restaurant;
  if (lower.includes("portfolio") || lower.includes("personal")) return QUESTION_SETS.portfolio;
  if (lower.includes("saas") || lower.includes("dashboard") || lower.includes("software") || lower.includes("app")) return QUESTION_SETS.saas;
  if (lower.includes("landing") || lower.includes("marketing")) return QUESTION_SETS.landing;
  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop")) return QUESTION_SETS.ecommerce;
  if (lower.includes("fitness") || lower.includes("gym") || lower.includes("yoga") || lower.includes("training")) return QUESTION_SETS.fitness;
  return QUESTION_SETS.default;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authSent, setAuthSent] = useState(false);
  const [authError, setAuthError] = useState("");
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [streamingCode, setStreamingCode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [streamingContent, setStreamingContent] = useState("");
  const [buildStatus, setBuildStatus] = useState<string>("");
  
  const [stage, setStage] = useState<"auth" | "home" | "questions" | "builder">("auth");
  const [userPrompt, setUserPrompt] = useState("");
  const [isFirstBuild, setIsFirstBuild] = useState(true);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [otherText, setOtherText] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  const [panelWidth, setPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) { setStage("home"); loadProjects(); }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { setStage("home"); loadProjects(); } else { setStage("auth"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentProject && currentCode && currentCode !== currentProject.code) {
      setSaveStatus("unsaved");
      const timer = setTimeout(() => saveProject(), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentCode, currentProject]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPanelWidth(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 20), 80));
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail, options: { emailRedirectTo: window.location.origin } });
    if (error) setAuthError(error.message); else setAuthSent(true);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setUser(null); setProjects([]); setCurrentProject(null); setStage("auth"); };

  const loadProjects = async () => {
    setProjectsLoading(true);
    const { data } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    if (data) setProjects(data);
    setProjectsLoading(false);
  };

  const createProject = async (name: string, prompt: string) => {
    if (!user) return null;
    const { data } = await supabase.from("projects").insert({ user_id: user.id, name: name || "Untitled Project", preview_prompt: prompt }).select().single();
    if (data) { setCurrentProject(data); setProjects(prev => [data, ...prev]); return data; }
    return null;
  };

  const saveProject = async () => {
    if (!currentProject || !currentCode) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("projects").update({ code: currentCode, updated_at: new Date().toISOString() }).eq("id", currentProject.id);
    if (!error) { setSaveStatus("saved"); setCurrentProject(prev => prev ? { ...prev, code: currentCode } : null); }
  };

  const deleteProject = async (projectId: string) => { await supabase.from("projects").delete().eq("id", projectId); setProjects(prev => prev.filter(p => p.id !== projectId)); };

  const openProject = (project: Project) => { setCurrentProject(project); setCurrentCode(project.code || ""); setUserPrompt(project.preview_prompt || ""); setStage("builder"); setIsFirstBuild(!project.code); };

  const extractCode = (text: string): string | null => {
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    const codeMatch = text.match(/```\n([\s\S]*?)```/);
    if (codeMatch && (codeMatch[1].includes("<!DOCTYPE") || codeMatch[1].includes("<html"))) return codeMatch[1].trim();
    return null;
  };

  const extractStreamingCode = (text: string): string | null => {
    const complete = extractCode(text);
    if (complete) return complete;
    const partial = text.match(/```html\n([\s\S]*?)$/);
    if (partial) return partial[1];
    const partial2 = text.match(/```\n([\s\S]*?)$/);
    if (partial2 && (partial2[1].includes("<!DOCTYPE") || partial2[1].includes("<html"))) return partial2[1];
    return null;
  };

  const getBuildStatus = (code: string): string => {
    if (!code) return "Starting...";
    if (code.includes("</html>")) return "Finishing up...";
    if (code.includes("<script")) return "Adding JavaScript...";
    if (code.includes("@media")) return "Making responsive...";
    if (code.includes(":hover")) return "Adding hover effects...";
    if (code.includes("hero")) return "Designing hero section...";
    if (code.includes("nav")) return "Creating navigation...";
    if (code.includes("<style")) return "Writing styles...";
    return "Building...";
  };

  const handleGenerate = () => {
    if (!input.trim()) return;
    setUserPrompt(input);
    setQuestions(getQuestionsForPrompt(input));
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    setStage("questions");
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (currentQuestion?.allowMultiple) setSelectedOptions(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
    else setSelectedOptions([option]);
  };

  const handleNextQuestion = () => {
    const finalAnswers = otherText ? [...selectedOptions, otherText] : selectedOptions;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: finalAnswers }));
    if (currentQuestionIndex < questions.length - 1) { setCurrentQuestionIndex(prev => prev + 1); setSelectedOptions([]); setOtherText(""); }
  };

  const handleImplement = async () => {
    const finalAnswers = { ...answers, [currentQuestion.id]: otherText ? [...selectedOptions, otherText] : selectedOptions };
    let buildPrompt = `Build me a ${userPrompt}.\n\nHere are my requirements:\n`;
    questions.forEach(q => { const ans = finalAnswers[q.id]; if (ans && ans.length > 0) buildPrompt += `- ${q.question}: ${ans.join(", ")}\n`; });
    buildPrompt += "\nCreate this now. Make it stunning and professional.";
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
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }] }) });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              try { const parsed = JSON.parse(line.slice(6)); if (parsed.content) { fullContent += parsed.content; setStreamingContent(fullContent); const partialCode = extractStreamingCode(fullContent); if (partialCode) { setStreamingCode(partialCode); setBuildStatus(getBuildStatus(partialCode)); } const code = extractCode(fullContent); if (code) setCurrentCode(code); } } catch {}
            }
          }
        }
      }
      const code = extractCode(fullContent);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: fullContent, code: code || undefined }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) { setCurrentCode(code); setIsFirstBuild(false); }
    } catch (error) { console.error(error); setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, there was an error." }]); }
    finally { setIsLoading(false); setBuildStatus(""); }
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
      const systemContext = isFirstBuild ? "" : `\n\nCurrent website code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nThe user wants changes. Confirm briefly, then output FULL updated code.`;
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.role === "user" && m.id === userMessage.id ? m.content + systemContext : m.content })), isFollowUp: !isFirstBuild }) });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              try { const parsed = JSON.parse(line.slice(6)); if (parsed.content) { fullContent += parsed.content; setStreamingContent(fullContent); const partialCode = extractStreamingCode(fullContent); if (partialCode) { setStreamingCode(partialCode); setBuildStatus(getBuildStatus(partialCode)); } const code = extractCode(fullContent); if (code) setCurrentCode(code); } } catch {}
            }
          }
        }
      }
      const code = extractCode(fullContent);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: fullContent, code: code || undefined }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) { setCurrentCode(code); setIsFirstBuild(false); }
    } catch (error) { console.error(error); setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, there was an error." }]); }
    finally { setIsLoading(false); setBuildStatus(""); }
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

  const handleBackToHome = () => {
    setMessages([]); setCurrentCode(""); setStreamingContent(""); setStreamingCode(""); setInput(""); setUserPrompt(""); setCurrentQuestionIndex(0); setAnswers({}); setSelectedOptions([]); setOtherText(""); setQuestions([]); setIsFirstBuild(true); setBuildStatus(""); setCurrentProject(null); setStage("home"); loadProjects();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (stage === "home") handleGenerate(); else if (stage === "builder") handleChatSubmit(e); }
  };

  const renderMessageContent = (content: string) => {
    let cleaned = content.replace(/```[\s\S]*?```/g, "").replace(/```[\s\S]*/g, "").replace(/\*\*/g, "").trim();
    if (!cleaned || cleaned.length < 3) return isFirstBuild ? "Building your website..." : "Implementing changes...";
    return cleaned;
  };

  if (authLoading) return <div style={styles.loadingScreen}><div style={styles.spinner} /></div>;

  // AUTH
  if (stage === "auth") {
    return (
      <div style={styles.authContainer}>
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
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Check your email</h2>
              <p style={{ color: "#9ca3af", fontSize: 14 }}>We sent a magic link to <strong>{authEmail}</strong></p>
              <button onClick={() => setAuthSent(false)} style={styles.linkBtn}>Use a different email</button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={styles.label}>Email address</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" required style={styles.input} />
              </div>
              {authError && <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{authError}</p>}
              <button type="submit" style={styles.primaryBtn}>Continue with Email →</button>
              <p style={{ textAlign: "center", color: "#6b7280", fontSize: 13, margin: 0 }}>No password needed. We'll send you a magic link.</p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // HOME
  if (stage === "home") {
    return (
      <div style={styles.container}>
        <div style={styles.gridBg} />
        <header style={styles.header}>
          <div style={styles.headerLeft}>
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
            <span style={{ fontSize: 14, color: "#9ca3af" }}>{user?.email}</span>
            <button onClick={handleSignOut} style={styles.outlineBtn}>Sign out</button>
          </div>
        </header>

        <main style={styles.homeMain}>
          <div style={styles.badge}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span style={{ color: "#d1d5db", fontSize: 14 }}>Powered by Claude AI</span>
            <span style={styles.badgeTag}>Opus 4.5</span>
          </div>

          <h1 style={styles.headline}>
            <span style={{ color: "#fff" }}>Build </span>
            <span style={styles.gradientText}>anything</span>
            <br />
            <span style={{ color: "#6b7280" }}>with AI</span>
          </h1>

          <p style={styles.subtitle}>Describe your vision in plain English. Watch it come to life in seconds.<br />No coding required.</p>

          <div style={styles.promptWrapper}>
            <div style={styles.promptGlow} />
            <div style={styles.promptBox}>
              <div style={styles.promptInput}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2} style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe what you want to build..." style={styles.textarea} rows={2} />
                <div style={styles.kbd}>
                  <span style={styles.key}>⌘</span>
                  <span style={styles.key}>K</span>
                </div>
              </div>
              <div style={styles.promptDivider} />
              <div style={styles.promptBottom}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.chipActive}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Plan with AI
                  </button>
                  <button style={styles.chip}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Screenshot
                  </button>
                  <button style={styles.chip}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Clone URL
                  </button>
                </div>
                <button onClick={handleGenerate} disabled={!input.trim()} style={{ ...styles.generateBtn, opacity: input.trim() ? 1 : 0.5 }}>Generate →</button>
              </div>
            </div>
          </div>

          <div style={styles.quickPrompts}>
            <span style={{ color: "#6b7280" }}>Try:</span>
            {["Restaurant website", "Fitness landing page", "Portfolio", "SaaS pricing page"].map((p) => (
              <button key={p} onClick={() => setInput(p)} style={styles.quickBtn}>{p}</button>
            ))}
          </div>

          <div style={styles.projectsSection}>
            <h2 style={styles.projectsTitle}>My Projects</h2>
            {projectsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><div style={styles.spinner} /></div>
            ) : projects.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                <p style={{ color: "#9ca3af" }}>No projects yet. Create your first one above!</p>
              </div>
            ) : (
              <div style={styles.projectsGrid}>
                {projects.map((project) => (
                  <div key={project.id} style={styles.projectCard}>
                    <div style={styles.projectPreview} onClick={() => openProject(project)}>
                      {project.code ? (
                        <iframe srcDoc={project.code} style={styles.projectIframe} sandbox="" title={project.name} />
                      ) : (
                        <div style={styles.projectEmpty}>
                          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                      )}
                    </div>
                    <div style={styles.projectInfo}>
                      <h3 style={styles.projectName} onClick={() => openProject(project)}>{project.name}</h3>
                      <p style={styles.projectDate}>{new Date(project.updated_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteProject(project.id)} style={styles.deleteBtn}>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

  // QUESTIONS
  if (stage === "questions") {
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const canProceed = selectedOptions.length > 0 || otherText.trim().length > 0;
    return (
      <div style={styles.questionsContainer}>
        <button onClick={handleBackToHome} style={styles.backBtn}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <div style={styles.questionCard}>
          <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} /></div>
          <div style={styles.questionHeader}>
            <span style={styles.questionNum}>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span style={styles.questionTag}>{userPrompt}</span>
          </div>
          <h2 style={styles.questionTitle}>{currentQuestion?.question}</h2>
          {currentQuestion?.allowMultiple && <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Select all that apply</p>}
          <div style={styles.optionsGrid}>
            {currentQuestion?.options.map((opt) => (
              <button key={opt} onClick={() => handleOptionSelect(opt)} style={{ ...styles.optionBtn, ...(selectedOptions.includes(opt) ? styles.optionSelected : {}) }}>{opt}</button>
            ))}
          </div>
          {currentQuestion?.hasOther && (
            <div style={{ marginBottom: 24 }}>
              <label style={styles.label}>Other (please specify)</label>
              <input type="text" value={otherText} onChange={(e) => setOtherText(e.target.value)} placeholder="Type your answer..." style={styles.input} />
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            {currentQuestionIndex > 0 && <button onClick={() => { setCurrentQuestionIndex(prev => prev - 1); setSelectedOptions(answers[questions[currentQuestionIndex - 1]?.id] || []); setOtherText(""); }} style={styles.secondaryBtn}>Back</button>}
            <button onClick={isLastQuestion ? handleImplement : handleNextQuestion} disabled={!canProceed} style={{ ...styles.primaryBtn, flex: 1, opacity: canProceed ? 1 : 0.5 }}>{isLastQuestion ? "Build My Website ⚡" : "Next →"}</button>
          </div>
        </div>
      </div>
    );
  }

  // BUILDER
  return (
    <div ref={containerRef} style={styles.builderContainer}>
      <div style={{ ...styles.chatPanel, width: `${panelWidth}%` }}>
        <div style={styles.chatHeader}>
          <button onClick={handleBackToHome} style={styles.homeBtn}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </button>
          <div>
            <div style={styles.logoTitle}>{currentProject?.name || "Buildr"}</div>
            <div style={styles.logoSubtitle}>{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "All changes saved" : "Unsaved changes"}</div>
          </div>
        </div>
        <div style={styles.messagesArea}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={msg.role === "user" ? styles.userMsg : styles.assistantMsg}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{renderMessageContent(msg.content)}</p>
                {msg.code && <div style={styles.codeIndicator}>✓ Ready — check the preview</div>}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={styles.buildingMsg}>
                <div style={styles.buildingIcon}><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{isFirstBuild ? "Building your website" : "Implementing changes"}</div>
                  <div style={{ fontSize: 13, color: "#A855F7" }}>{buildStatus}</div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={styles.inputArea}>
          <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 12 }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask for changes..." disabled={isLoading} style={styles.chatInput} rows={1} />
            <button type="submit" disabled={!input.trim() || isLoading} style={{ ...styles.sendBtn, opacity: (!input.trim() || isLoading) ? 0.5 : 1 }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      </div>

      <div onMouseDown={handleMouseDown} style={styles.resizer}><div style={styles.resizerLine} /></div>

      <div style={{ ...styles.previewPanel, width: `${100 - panelWidth}%` }}>
        <div style={styles.previewHeader}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setViewMode("preview")} style={viewMode === "preview" ? styles.tabActive : styles.tabInactive}>👁 Preview</button>
            <button onClick={() => setViewMode("code")} style={viewMode === "code" ? styles.tabActive : styles.tabInactive}>
              &lt;/&gt; Code
              {isLoading && streamingCode && <span style={styles.liveBadge}>LIVE</span>}
            </button>
          </div>
          {currentCode && <button onClick={handleDownload} style={styles.downloadBtn}>↓ Download</button>}
        </div>
        <div style={styles.previewContent}>
          {!currentCode && !streamingCode ? (
            <div style={styles.emptyPreview}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Your preview will appear here</p>
            </div>
          ) : viewMode === "preview" ? (
            <iframe srcDoc={currentCode} style={styles.iframe} sandbox="allow-scripts allow-same-origin" title="Preview" />
          ) : (
            <div style={styles.codeView}><pre style={styles.codeContent}>{currentCode || streamingCode}</pre></div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: { minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" },
  spinner: { width: 48, height: 48, border: "3px solid #27272a", borderTopColor: "#A855F7", borderRadius: "50%", animation: "spin 1s linear infinite" },
  authContainer: { minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  authCard: { width: "100%", maxWidth: 400, background: "#111", borderRadius: 16, border: "1px solid #27272a", padding: 32 },
  authLogo: { textAlign: "center", marginBottom: 32 },
  authTitle: { fontSize: 28, fontWeight: 700, color: "#fff", marginTop: 16, marginBottom: 4 },
  authSubtitle: { color: "#9ca3af", fontSize: 14 },
  logoIcon: { width: 48, height: 48, borderRadius: 12, background: "#A855F7", display: "flex", alignItems: "center", justifyContent: "center", color: "white", margin: "0 auto", boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)" },
  label: { display: "block", fontSize: 14, fontWeight: 500, color: "#d1d5db", marginBottom: 8 },
  input: { width: "100%", padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "white", fontSize: 16, outline: "none", boxSizing: "border-box" },
  primaryBtn: { width: "100%", padding: "12px 24px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryBtn: { padding: "12px 24px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  linkBtn: { marginTop: 24, background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", textDecoration: "underline" },
  outlineBtn: { padding: "8px 16px", background: "transparent", border: "1px solid #27272a", borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer" },
  container: { minHeight: "100vh", background: "#0A0A0A", color: "#fff", position: "relative" },
  gridBg: { position: "fixed", inset: 0, opacity: 0.15, pointerEvents: "none", backgroundImage: "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)", backgroundSize: "40px 40px" },
  header: { position: "relative", zIndex: 10, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  logoTitle: { fontSize: 18, fontWeight: 700, color: "white" },
  logoSubtitle: { fontSize: 12, color: "#9ca3af" },
  homeMain: { position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px", display: "flex", flexDirection: "column", alignItems: "center" },
  badge: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 9999, background: "rgba(255, 255, 255, 0.05)", border: "1px solid #27272a", marginBottom: 32 },
  badgeTag: { fontSize: 10, fontWeight: 700, color: "#A855F7", background: "rgba(168, 85, 247, 0.2)", padding: "2px 8px", borderRadius: 4 },
  headline: { fontSize: "clamp(48px, 8vw, 72px)", fontWeight: 700, textAlign: "center", letterSpacing: "-0.02em", marginBottom: 24, lineHeight: 1.1 },
  gradientText: { background: "linear-gradient(to right, #e879f9, #a855f7, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "italic" },
  subtitle: { fontSize: "clamp(16px, 2.5vw, 20px)", textAlign: "center", color: "#9ca3af", maxWidth: 640, marginBottom: 48, lineHeight: 1.6 },
  promptWrapper: { width: "100%", maxWidth: 768, position: "relative", marginBottom: 32 },
  promptGlow: { position: "absolute", inset: -4, background: "linear-gradient(to right, #A855F7, #3b82f6)", borderRadius: 16, filter: "blur(20px)", opacity: 0.2 },
  promptBox: { position: "relative", background: "#0F0F0F", borderRadius: 12, border: "1px solid #27272a", overflow: "hidden" },
  promptInput: { padding: 20, display: "flex", gap: 16, alignItems: "flex-start" },
  textarea: { flex: 1, background: "transparent", border: "none", color: "#e5e7eb", fontSize: 18, resize: "none", outline: "none", minHeight: 56 },
  kbd: { display: "flex", gap: 4 },
  key: { padding: "4px 8px", fontSize: 12, border: "1px solid #27272a", borderRadius: 4, background: "#1C1C1C", color: "#6b7280" },
  promptDivider: { height: 1, background: "#27272a" },
  promptBottom: { padding: "12px 20px", background: "#121212", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  chip: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#9ca3af", fontSize: 14, cursor: "pointer" },
  chipActive: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", background: "#27272a", color: "#fff", fontSize: 14, cursor: "pointer" },
  generateBtn: { padding: "10px 24px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)" },
  quickPrompts: { display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 48 },
  quickBtn: { padding: "6px 14px", borderRadius: 9999, border: "1px solid #27272a", background: "rgba(255, 255, 255, 0.05)", color: "#9ca3af", fontSize: 14, cursor: "pointer" },
  projectsSection: { width: "100%", maxWidth: 1000 },
  projectsTitle: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  emptyState: { textAlign: "center", padding: 48, border: "2px dashed #27272a", borderRadius: 16 },
  projectsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 },
  projectCard: { background: "#111", borderRadius: 12, border: "1px solid #27272a", overflow: "hidden", position: "relative" },
  projectPreview: { aspectRatio: "16/10", background: "#0a0a0a", cursor: "pointer", overflow: "hidden" },
  projectIframe: { width: "200%", height: "200%", border: "none", transform: "scale(0.5)", transformOrigin: "top left", pointerEvents: "none" },
  projectEmpty: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  projectInfo: { padding: 16 },
  projectName: { fontSize: 16, fontWeight: 600, marginBottom: 4, cursor: "pointer", color: "#fff" },
  projectDate: { fontSize: 13, color: "#6b7280" },
  deleteBtn: { position: "absolute", top: 8, right: 8, width: 32, height: 32, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  questionsContainer: { minHeight: "100vh", background: "#0A0A0A", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 },
  backBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", marginBottom: 24, alignSelf: "flex-start" },
  questionCard: { width: "100%", maxWidth: 600, background: "#111", borderRadius: 16, border: "1px solid #27272a", padding: 32 },
  progressBar: { height: 4, background: "#27272a", borderRadius: 2, marginBottom: 24, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(to right, #A855F7, #6366f1)", borderRadius: 2, transition: "width 0.3s ease" },
  questionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  questionNum: { fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" },
  questionTag: { fontSize: 12, color: "#A855F7", background: "rgba(168, 85, 247, 0.1)", padding: "4px 12px", borderRadius: 9999 },
  questionTitle: { fontSize: 24, fontWeight: 600, marginBottom: 8 },
  optionsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 },
  optionBtn: { padding: "14px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 10, color: "#d1d5db", fontSize: 14, cursor: "pointer", textAlign: "left" },
  optionSelected: { background: "rgba(168, 85, 247, 0.1)", borderColor: "#A855F7", color: "white" },
  builderContainer: { height: "100vh", display: "flex", background: "#0A0A0A" },
  chatPanel: { display: "flex", flexDirection: "column", borderRight: "1px solid #27272a", minWidth: 300 },
  chatHeader: { padding: 16, borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 12 },
  homeBtn: { width: 40, height: 40, borderRadius: 8, background: "#A855F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" },
  messagesArea: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 },
  userMsg: { maxWidth: "85%", borderRadius: 16, padding: "12px 16px", background: "#A855F7", color: "white" },
  assistantMsg: { maxWidth: "85%", borderRadius: 16, padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", color: "#e5e7eb" },
  codeIndicator: { marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 13, color: "#22c55e" },
  buildingMsg: { borderRadius: 16, padding: "16px 20px", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #A855F7", display: "flex", alignItems: "center", gap: 14 },
  buildingIcon: { width: 40, height: 40, borderRadius: 10, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 2s linear infinite" },
  inputArea: { padding: 16, borderTop: "1px solid #27272a" },
  chatInput: { flex: 1, padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 12, color: "white", fontSize: 14, resize: "none", outline: "none" },
  sendBtn: { padding: "12px 16px", background: "#A855F7", border: "none", borderRadius: 12, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  resizer: { width: 12, background: "#0A0A0A", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" },
  resizerLine: { width: 4, height: 40, background: "#27272a", borderRadius: 2 },
  previewPanel: { display: "flex", flexDirection: "column", background: "#111", minWidth: 300 },
  previewHeader: { padding: 16, borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center" },
  tabActive: { padding: "8px 16px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  tabInactive: { padding: "8px 16px", background: "transparent", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  liveBadge: { fontSize: 9, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 6px", borderRadius: 4, marginLeft: 8 },
  downloadBtn: { padding: "8px 16px", background: "transparent", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer" },
  previewContent: { flex: 1, padding: 16, overflow: "hidden" },
  emptyPreview: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "2px dashed #27272a" },
  iframe: { width: "100%", height: "100%", background: "white", borderRadius: 8, border: "none" },
  codeView: { height: "100%", overflow: "auto", borderRadius: 12, background: "#0A0A0A", border: "1px solid #27272a" },
  codeContent: { padding: 16, fontSize: 14, color: "#d1d5db", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 },
};
