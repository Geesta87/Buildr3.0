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
  realestate: [
    { id: "type", question: "What type of real estate?", options: ["Residential Sales", "Commercial", "Property Management", "Luxury Homes", "Rentals", "Real Estate Agent"], allowMultiple: false, hasOther: true },
    { id: "features", question: "What features do you need?", options: ["Property Listings", "Search/Filters", "Agent Profiles", "Virtual Tours", "Contact Forms", "Neighborhood Info"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What style fits your brand?", options: ["Elegant & Luxury", "Modern & Clean", "Professional & Trust", "Warm & Inviting"], allowMultiple: false, hasOther: false },
  ],
  default: [
    { id: "purpose", question: "What's the main purpose?", options: ["Showcase Work", "Generate Leads", "Sell Products/Services", "Provide Information", "Build Community", "Book Appointments"], allowMultiple: false, hasOther: true },
    { id: "sections", question: "What sections do you need?", options: ["Hero Section", "About", "Services/Features", "Pricing", "Testimonials", "Contact"], allowMultiple: true, hasOther: false },
    { id: "style", question: "What style do you prefer?", options: ["Modern & Minimal", "Bold & Colorful", "Dark & Techy", "Elegant & Professional"], allowMultiple: false, hasOther: false },
  ],
};

// Get questions based on prompt keywords
const getQuestionsForPrompt = (prompt: string): Question[] => {
  const lower = prompt.toLowerCase();
  if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("food") || lower.includes("menu")) return QUESTION_SETS.restaurant;
  if (lower.includes("portfolio") || lower.includes("personal")) return QUESTION_SETS.portfolio;
  if (lower.includes("saas") || lower.includes("dashboard") || lower.includes("software") || lower.includes("app")) return QUESTION_SETS.saas;
  if (lower.includes("landing") || lower.includes("marketing")) return QUESTION_SETS.landing;
  if (lower.includes("ecommerce") || lower.includes("e-commerce") || lower.includes("store") || lower.includes("shop")) return QUESTION_SETS.ecommerce;
  if (lower.includes("fitness") || lower.includes("gym") || lower.includes("yoga") || lower.includes("training")) return QUESTION_SETS.fitness;
  if (lower.includes("real estate") || lower.includes("realestate") || lower.includes("property") || lower.includes("realtor")) return QUESTION_SETS.realestate;
  return QUESTION_SETS.default;
};

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
  const [stage, setStage] = useState<"auth" | "home" | "questions" | "builder">("auth");
  const [userPrompt, setUserPrompt] = useState("");
  const [isFirstBuild, setIsFirstBuild] = useState(true);
  
  // Questions (now instant, no AI generation)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [otherText, setOtherText] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
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
        setStage("home");
        loadProjects();
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setStage("home");
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
      const timer = setTimeout(() => saveProject(), 2000);
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
    const rect = containerRef.current.getBoundingClientRect();
    setPanelWidth(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 20), 80));
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
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
    else setAuthSent(true);
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
    const { data } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
    if (data) setProjects(data);
    setProjectsLoading(false);
  };

  const createProject = async (name: string, prompt: string) => {
    if (!user) return null;
    const { data } = await supabase.from("projects").insert({ user_id: user.id, name: name || "Untitled Project", preview_prompt: prompt }).select().single();
    if (data) {
      setCurrentProject(data);
      setProjects(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const saveProject = async () => {
    if (!currentProject || !currentCode) return;
    setSaveStatus("saving");
    const { error } = await supabase.from("projects").update({ code: currentCode, updated_at: new Date().toISOString() }).eq("id", currentProject.id);
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

  // Code extraction
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
    if (code.includes("animation")) return "Adding animations...";
    if (code.includes("hero")) return "Designing hero section...";
    if (code.includes("nav")) return "Creating navigation...";
    if (code.includes("<style")) return "Writing styles...";
    return "Building...";
  };

  // Handle prompt submission - instantly get questions
  const handleGenerate = () => {
    if (!input.trim()) return;
    setUserPrompt(input);
    setQuestions(getQuestionsForPrompt(input)); // Instant!
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    setStage("questions");
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (currentQuestion?.allowMultiple) {
      setSelectedOptions(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleNextQuestion = () => {
    const finalAnswers = otherText ? [...selectedOptions, otherText] : selectedOptions;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: finalAnswers }));
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptions([]);
      setOtherText("");
    }
  };

  const handleImplement = async () => {
    const finalAnswers = { ...answers, [currentQuestion.id]: otherText ? [...selectedOptions, otherText] : selectedOptions };
    
    let buildPrompt = `Build me a ${userPrompt}.\n\nHere are my requirements:\n`;
    questions.forEach(q => {
      const ans = finalAnswers[q.id];
      if (ans && ans.length > 0) buildPrompt += `- ${q.question}: ${ans.join(", ")}\n`;
    });
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
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
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
      if (code) { setCurrentCode(code); setIsFirstBuild(false); }
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
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
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
      if (code) { setCurrentCode(code); setIsFirstBuild(false); }
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

  const handleBackToHome = () => {
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
    setQuestions([]);
    setIsFirstBuild(true);
    setBuildStatus("");
    setCurrentProject(null);
    setStage("home");
    loadProjects();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (stage === "home") handleGenerate();
      else if (stage === "builder") handleChatSubmit(e);
    }
  };

  const renderMessageContent = (content: string) => {
    let cleaned = content.replace(/```[\s\S]*?```/g, "").replace(/```[\s\S]*/g, "").replace(/\*\*/g, "").trim();
    if (!cleaned || cleaned.length < 3) return isFirstBuild ? "Building your website..." : "Implementing changes...";
    return cleaned;
  };

  // Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-gray-700 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ==================== AUTH SCREEN ====================
  if (stage === "auth") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#111] rounded-2xl border border-[#27272a] p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Buildr</h1>
            <p className="text-gray-400 text-sm mt-1">AI Website Builder</p>
          </div>

          {authSent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-gray-400 text-sm mb-6">We sent a magic link to <strong>{authEmail}</strong></p>
              <button onClick={() => setAuthSent(false)} className="text-sm text-gray-400 hover:text-white">Use a different email</button>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 bg-[#1C1C1C] border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              <button type="submit" className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                Continue with Email
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <p className="text-center text-gray-500 text-sm">No password needed. We'll send you a magic link.</p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==================== HOME SCREEN (with projects below) ====================
  if (stage === "home") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
        {/* Grid Background */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]" style={{
          backgroundImage: "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }} />

        {/* Header */}
        <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold">Buildr</span>
              <span className="block text-xs text-gray-400">AI Website Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button onClick={handleSignOut} className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800">Sign out</button>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 px-4 pb-20 pt-10 sm:pt-16">
          <div className="max-w-4xl mx-auto">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-gray-800">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-sm text-gray-300">Powered by Claude AI</span>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Opus 4.5</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-center tracking-tight mb-6 leading-[1.1]">
              <span className="text-white">Build </span>
              <span className="italic bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500 bg-clip-text text-transparent">anything</span>
              <br className="hidden md:block" />
              <span className="text-gray-400">with AI</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-center text-gray-400 max-w-2xl mx-auto mb-12">
              Describe your vision in plain English. Watch it come to life in seconds.
              <br className="hidden sm:block" />
              <span className="text-gray-500">No coding required.</span>
            </p>

            {/* Prompt Box */}
            <div className="w-full max-w-3xl mx-auto relative group mb-16">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500" />
              <div className="relative bg-[#0F0F0F] rounded-xl border border-[#27272a] shadow-2xl overflow-hidden">
                <div className="p-4 md:p-5 flex gap-4">
                  <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none text-lg resize-none h-14"
                    placeholder="Describe what you want to build..."
                  />
                  <div className="hidden sm:flex items-start gap-1.5 pt-2 text-gray-600">
                    <kbd className="px-2 py-1 text-xs border border-gray-700 rounded bg-gray-800">⌘</kbd>
                    <kbd className="px-2 py-1 text-xs border border-gray-700 rounded bg-gray-800">K</kbd>
                  </div>
                </div>
                <div className="h-px w-full bg-[#27272a]" />
                <div className="px-4 py-3 bg-[#121212] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-gray-800">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Plan with AI
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Screenshot
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Clone URL
                    </button>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!input.trim()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/25"
                  >
                    Generate
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap justify-center items-center gap-2 text-sm text-gray-500 mb-16">
              <span>Try:</span>
              {["Restaurant website", "Fitness landing page", "Portfolio", "SaaS pricing page"].map((prompt) => (
                <button key={prompt} onClick={() => setInput(prompt)} className="px-3 py-1 rounded-full border border-gray-800 bg-white/5 hover:border-purple-500/50 hover:text-purple-400">
                  {prompt}
                </button>
              ))}
            </div>

            {/* My Projects Section */}
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">My Projects</h2>
              </div>

              {projectsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-gray-700 border-t-purple-500 rounded-full animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-gray-400">No projects yet. Create your first one above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-[#111] rounded-xl border border-[#27272a] overflow-hidden group relative">
                      <div className="aspect-video bg-[#0a0a0a] cursor-pointer overflow-hidden" onClick={() => openProject(project)}>
                        {project.code ? (
                          <iframe srcDoc={project.code} className="w-[200%] h-[200%] border-none scale-50 origin-top-left pointer-events-none" sandbox="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold cursor-pointer hover:text-purple-400" onClick={() => openProject(project)}>{project.name}</h3>
                        <p className="text-sm text-gray-500">{new Date(project.updated_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteProject(project.id)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUESTIONS SCREEN ====================
  if (stage === "questions") {
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const canProceed = selectedOptions.length > 0 || otherText.trim().length > 0;

    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <button onClick={handleBackToHome} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          <div className="bg-[#111] rounded-2xl border border-[#27272a] p-8">
            <div className="h-1 bg-[#27272a] rounded-full mb-6 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">{userPrompt}</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">{currentQuestion?.question}</h2>
            {currentQuestion?.allowMultiple && <p className="text-gray-500 text-sm mb-6">Select all that apply</p>}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {currentQuestion?.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  className={`p-4 rounded-xl border text-left text-sm font-medium transition-all ${
                    selectedOptions.includes(option)
                      ? "bg-purple-500/10 border-purple-500 text-white"
                      : "bg-[#1C1C1C] border-[#27272a] text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {currentQuestion?.hasOther && (
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Other (please specify)</label>
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Type your answer..."
                  className="w-full px-4 py-3 bg-[#1C1C1C] border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              {currentQuestionIndex > 0 && (
                <button onClick={() => { setCurrentQuestionIndex(prev => prev - 1); setSelectedOptions(answers[questions[currentQuestionIndex - 1]?.id] || []); setOtherText(""); }} className="px-6 py-3 bg-[#1C1C1C] border border-[#27272a] rounded-lg text-gray-300 hover:bg-gray-800">
                  Back
                </button>
              )}
              <button
                onClick={isLastQuestion ? handleImplement : handleNextQuestion}
                disabled={!canProceed}
                className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                {isLastQuestion ? "Build My Website" : "Next"}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={isLastQuestion ? "M13 10V3L4 14h7v7l9-11h-7z" : "M14 5l7 7m0 0l-7 7m7-7H3"} />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== BUILDER VIEW ====================
  return (
    <div ref={containerRef} className="h-screen flex bg-[#0A0A0A]">
      {/* Chat Panel */}
      <div className="flex flex-col border-r border-[#27272a]" style={{ width: `${panelWidth}%`, minWidth: 300 }}>
        <div className="p-4 border-b border-[#27272a] flex items-center gap-3">
          <button onClick={handleBackToHome} className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 hover:bg-purple-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <div>
            <h1 className="font-semibold">{currentProject?.name || "Buildr"}</h1>
            <p className="text-xs text-gray-400">{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "All changes saved" : "Unsaved changes"}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-purple-500 text-white" : "bg-[#1C1C1C] border border-[#27272a] text-gray-200"}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>
                {msg.code && (
                  <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-2 text-xs opacity-75">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Ready — check the preview
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-5 py-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border border-purple-500/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center animate-spin">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{isFirstBuild ? "Building your website" : "Implementing changes"}</p>
                    <p className="text-xs text-purple-400">{buildStatus}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[#27272a]">
          <form onSubmit={handleChatSubmit} className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for changes..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-[#1C1C1C] border border-[#27272a] text-white placeholder-gray-500 resize-none text-sm focus:border-purple-500 focus:outline-none"
              rows={1}
            />
            <button type="submit" disabled={!input.trim() || isLoading} className="px-4 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Resizer */}
      <div onMouseDown={handleMouseDown} className="w-3 bg-[#0A0A0A] cursor-col-resize flex items-center justify-center hover:bg-purple-500/20">
        <div className="w-1 h-10 bg-[#27272a] rounded-full" />
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col bg-[#111]" style={{ minWidth: 300 }}>
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setViewMode("preview")} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${viewMode === "preview" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            <button onClick={() => setViewMode("code")} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${viewMode === "code" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code
              {isLoading && streamingCode && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse">LIVE</span>}
            </button>
          </div>
          {currentCode && (
            <button onClick={handleDownload} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1C1C1C] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          {!currentCode && !streamingCode ? (
            <div className="h-full flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed border-[#27272a]">
              <svg className="w-12 h-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-gray-400">Your preview will appear here</p>
            </div>
          ) : viewMode === "preview" ? (
            <iframe srcDoc={currentCode} className="w-full h-full bg-white rounded-lg border-0" sandbox="allow-scripts allow-same-origin" title="Preview" />
          ) : (
            <div className="h-full overflow-auto rounded-xl bg-[#0A0A0A] border border-[#27272a]">
              <pre className="p-4 text-sm font-mono text-gray-300 whitespace-pre-wrap">{currentCode || streamingCode}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
