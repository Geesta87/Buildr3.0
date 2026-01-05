"use client";

import { useState, useRef, useEffect } from "react";

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
  hasOther: boolean;
}

const QUESTIONS: Record<string, Question[]> = {
  default: [
    {
      id: "purpose",
      question: "What type of website do you need?",
      options: ["Landing Page", "Business Website", "Portfolio", "E-commerce Store", "Blog", "Web Application"],
      hasOther: true,
    },
    {
      id: "style",
      question: "What style fits your vision?",
      options: ["Modern & Minimal", "Bold & Colorful", "Dark & Techy", "Elegant & Professional", "Playful & Fun"],
      hasOther: true,
    },
    {
      id: "sections",
      question: "What sections do you need?",
      options: ["Hero Section", "About Us", "Services/Features", "Pricing", "Testimonials", "Contact Form", "FAQ"],
      hasOther: false,
    },
  ],
  "saas dashboard": [
    {
      id: "product",
      question: "What does your product do?",
      options: ["Project Management", "Analytics & Reporting", "CRM / Sales", "Marketing Tools", "Finance & Accounting", "Team Collaboration"],
      hasOther: true,
    },
    {
      id: "widgets",
      question: "What should the dashboard show?",
      options: ["Charts & Graphs", "Data Tables", "User Activity", "Revenue/Sales Numbers", "Tasks & To-dos", "Notifications"],
      hasOther: false,
    },
    {
      id: "style",
      question: "What style fits your brand?",
      options: ["Dark & Techy", "Light & Clean", "Colorful & Modern", "Minimal & Professional"],
      hasOther: false,
    },
  ],
  "portfolio": [
    {
      id: "type",
      question: "What type of portfolio?",
      options: ["Designer / Creative", "Developer", "Photographer", "Artist", "Freelancer", "Agency"],
      hasOther: true,
    },
    {
      id: "sections",
      question: "What sections do you need?",
      options: ["Hero / Intro", "Project Gallery", "About Me", "Skills", "Testimonials", "Contact"],
      hasOther: false,
    },
    {
      id: "style",
      question: "What vibe do you want?",
      options: ["Minimal & Clean", "Bold & Creative", "Dark & Moody", "Bright & Friendly"],
      hasOther: false,
    },
  ],
  "landing page": [
    {
      id: "goal",
      question: "What's the main goal?",
      options: ["Get Sign-ups", "Sell a Product", "Book Appointments", "Generate Leads", "Promote an Event"],
      hasOther: true,
    },
    {
      id: "sections",
      question: "What sections do you need?",
      options: ["Hero with CTA", "Features/Benefits", "Pricing", "Testimonials", "FAQ", "Contact Form"],
      hasOther: false,
    },
    {
      id: "style",
      question: "What style fits your brand?",
      options: ["Modern & Minimal", "Bold & Colorful", "Professional & Corporate", "Playful & Fun"],
      hasOther: false,
    },
  ],
  "e-commerce store": [
    {
      id: "products",
      question: "What are you selling?",
      options: ["Clothing & Fashion", "Electronics", "Food & Beverages", "Digital Products", "Home & Furniture", "Beauty & Health"],
      hasOther: true,
    },
    {
      id: "features",
      question: "What features do you need?",
      options: ["Product Grid", "Shopping Cart", "Search & Filters", "Reviews", "Wishlist", "Categories"],
      hasOther: false,
    },
    {
      id: "style",
      question: "What style fits your brand?",
      options: ["Minimal & Elegant", "Bold & Trendy", "Luxury & Premium", "Fun & Colorful"],
      hasOther: false,
    },
  ],
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [streamingContent, setStreamingContent] = useState("");
  
  // Flow states
  const [stage, setStage] = useState<"home" | "questions" | "builder">("home");
  const [userPrompt, setUserPrompt] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [otherText, setOtherText] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const getQuestionsForPrompt = (prompt: string): Question[] => {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("saas") || lowerPrompt.includes("dashboard")) {
      return QUESTIONS["saas dashboard"];
    } else if (lowerPrompt.includes("portfolio")) {
      return QUESTIONS["portfolio"];
    } else if (lowerPrompt.includes("landing")) {
      return QUESTIONS["landing page"];
    } else if (lowerPrompt.includes("ecommerce") || lowerPrompt.includes("e-commerce") || lowerPrompt.includes("store") || lowerPrompt.includes("shop")) {
      return QUESTIONS["e-commerce store"];
    }
    return QUESTIONS["default"];
  };

  const currentQuestions = getQuestionsForPrompt(userPrompt);
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const isMultiSelect = currentQuestion?.id === "sections" || currentQuestion?.id === "widgets" || currentQuestion?.id === "features";

  const extractCode = (text: string): string | null => {
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/);
    if (htmlMatch) return htmlMatch[1].trim();
    const codeMatch = text.match(/```\n([\s\S]*?)```/);
    if (codeMatch && (codeMatch[1].includes("<!DOCTYPE") || codeMatch[1].includes("<html"))) {
      return codeMatch[1].trim();
    }
    return null;
  };

  const handleGenerate = () => {
    if (!input.trim()) return;
    setUserPrompt(input);
    setStage("questions");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
  };

  const handleOptionSelect = (option: string) => {
    if (isMultiSelect) {
      setSelectedOptions(prev => 
        prev.includes(option) 
          ? prev.filter(o => o !== option)
          : [...prev, option]
      );
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleNextQuestion = () => {
    const finalAnswers = otherText ? [...selectedOptions, otherText] : selectedOptions;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: finalAnswers }));
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptions([]);
      setOtherText("");
    }
  };

  const handleImplement = async () => {
    const finalAnswers = { ...answers, [currentQuestion.id]: otherText ? [...selectedOptions, otherText] : selectedOptions };
    
    // Build the prompt from answers
    let buildPrompt = `Build me a ${userPrompt}.\n\nHere are my preferences:\n`;
    Object.entries(finalAnswers).forEach(([key, values]) => {
      if (values.length > 0) {
        buildPrompt += `- ${key}: ${values.join(", ")}\n`;
      }
    });
    buildPrompt += "\nPlease create this now. Make it look stunning and professional.";

    setStage("builder");
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: buildPrompt,
    };

    setMessages([userMessage]);
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: buildPrompt }],
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
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent,
        code: code || undefined,
      }]);
      setStreamingContent("");
      if (code) setCurrentCode(code);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error. Please check your API key and try again.",
      }]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
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
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent,
        code: code || undefined,
      }]);
      setStreamingContent("");
      if (code) setCurrentCode(code);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error. Please try again.",
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
    setStage("home");
    setInput("");
    setUserPrompt("");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (stage === "home") {
        handleGenerate();
      } else if (stage === "builder") {
        handleChatSubmit(e);
      }
    }
  };

  const renderMessageContent = (content: string, isStreaming: boolean = false) => {
    // Remove complete code blocks
    let cleaned = content.replace(/```[\s\S]*?```/g, "").trim();
    
    // If streaming, also remove incomplete code blocks (starts with ``` but no closing)
    if (isStreaming || cleaned.includes("```")) {
      cleaned = cleaned.replace(/```[\s\S]*/g, "").trim();
    }
    
    // Remove asterisks and clean up
    cleaned = cleaned.replace(/\*\*/g, "").trim();
    
    // If nothing left, show a building message
    if (!cleaned || cleaned.length < 3) {
      return "Building your website...";
    }
    
    return cleaned;
  };

  // ==================== HOME SCREEN ====================
  if (stage === "home") {
    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.gridBg} />
        
        <header style={styles.header}>
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
        </header>

        <main style={styles.main}>
          <div style={styles.badge}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span style={styles.badgeText}>Powered by Claude AI</span>
            <span style={styles.badgeTag}>OPUS 4.5</span>
          </div>

          <h1 style={styles.headline}>
            <span style={{ color: "#fff" }}>Build </span>
            <span style={styles.gradientText}>anything</span>
            <br />
            <span style={{ color: "#6b7280" }}>with AI</span>
          </h1>

          <p style={styles.subtitle}>
            Describe your vision in plain English. Watch it come to life in seconds.
            <br />
            <span style={{ color: "#6b7280" }}>No coding required.</span>
          </p>

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
                  style={{
                    ...styles.btnGenerate,
                    opacity: !input.trim() ? 0.5 : 1,
                    cursor: !input.trim() ? "not-allowed" : "pointer",
                  }}
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
            {["SaaS Dashboard", "Portfolio", "E-commerce Store", "Landing Page"].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                style={styles.quickPromptBtn}
              >
                {prompt}
              </button>
            ))}
          </div>
        </main>

        <footer style={styles.footer}>
          © 2024 Buildr Inc. All rights reserved.
        </footer>
      </div>
    );
  }

  // ==================== QUESTIONS SCREEN ====================
  if (stage === "questions") {
    const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1;
    const canProceed = selectedOptions.length > 0 || otherText.trim().length > 0;

    return (
      <div style={styles.container}>
        <style jsx global>{globalStyles}</style>
        <div style={styles.gridBg} />

        <header style={styles.header}>
          <div style={styles.logoSection}>
            <button onClick={handleClear} style={styles.backBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div style={styles.logoTitle}>Buildr</div>
              <div style={styles.logoSubtitle}>AI Website Builder</div>
            </div>
          </div>
        </header>

        <main style={styles.questionsMain}>
          <div style={styles.questionCard}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }} />
            </div>
            
            <div style={styles.questionHeader}>
              <span style={styles.questionNumber}>Question {currentQuestionIndex + 1} of {currentQuestions.length}</span>
              <span style={styles.projectType}>{userPrompt}</span>
            </div>

            <h2 style={styles.questionTitle}>{currentQuestion.question}</h2>
            
            {isMultiSelect && (
              <p style={styles.multiSelectHint}>Select all that apply</p>
            )}

            <div style={styles.optionsGrid}>
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  style={{
                    ...styles.optionBtn,
                    ...(selectedOptions.includes(option) ? styles.optionBtnSelected : {}),
                  }}
                >
                  <div style={{
                    ...styles.optionRadio,
                    ...(selectedOptions.includes(option) ? styles.optionRadioSelected : {}),
                  }}>
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
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Type your answer..."
                  style={styles.otherInput}
                />
              </div>
            )}

            <div style={styles.questionActions}>
              {currentQuestionIndex > 0 && (
                <button
                  onClick={() => {
                    setCurrentQuestionIndex(prev => prev - 1);
                    setSelectedOptions(answers[currentQuestions[currentQuestionIndex - 1].id] || []);
                    setOtherText("");
                  }}
                  style={styles.btnSecondary}
                >
                  Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {isLastQuestion ? (
                <button
                  onClick={handleImplement}
                  disabled={!canProceed}
                  style={{
                    ...styles.btnImplement,
                    opacity: !canProceed ? 0.5 : 1,
                    cursor: !canProceed ? "not-allowed" : "pointer",
                  }}
                >
                  Build My Website
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  disabled={!canProceed}
                  style={{
                    ...styles.btnNext,
                    opacity: !canProceed ? 0.5 : 1,
                    cursor: !canProceed ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== BUILDER VIEW ====================
  return (
    <div style={styles.builderContainer}>
      <style jsx global>{globalStyles}</style>
      
      {/* Left: Chat */}
      <div style={styles.chatPanel}>
        <div style={styles.chatHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={handleClear} style={styles.homeBtn}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            <div>
              <div style={styles.logoTitle}>Buildr</div>
              <div style={styles.logoSubtitle}>AI Website Builder</div>
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
                    Website ready — check the preview
                  </div>
                )}
              </div>
            </div>
          ))}

          {streamingContent && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={styles.assistantMessage}>
                <p style={styles.messageText}>{renderMessageContent(streamingContent, true)}</p>
              </div>
            </div>
          )}

          {isLoading && !streamingContent && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={styles.loadingMessage}>
                <span style={styles.loadingDot} />
                <span style={{ ...styles.loadingDot, animationDelay: "0.15s" }} />
                <span style={{ ...styles.loadingDot, animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <form onSubmit={handleChatSubmit} style={styles.inputForm}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for changes..."
              disabled={isLoading}
              style={styles.chatInput}
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? (
                <div style={styles.spinner} />
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Preview */}
      <div style={styles.previewPanel}>
        <div style={styles.previewHeader}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setViewMode("preview")}
              style={viewMode === "preview" ? styles.tabActive : styles.tabInactive}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
            <button
              onClick={() => setViewMode("code")}
              style={viewMode === "code" ? styles.tabActive : styles.tabInactive}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code
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
          {!currentCode ? (
            <div style={styles.emptyPreview}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Building your website...</p>
            </div>
          ) : viewMode === "preview" ? (
            <iframe
              srcDoc={currentCode}
              style={styles.iframe}
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          ) : (
            <div style={styles.codeView}>
              <pre style={styles.codeContent}>{currentCode}</pre>
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
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0A0A0A;
    color: #fff;
    -webkit-font-smoothing: antialiased;
  }
  
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0A0A0A; }
  ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0A0A0A",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  gridBg: {
    position: "fixed",
    inset: 0,
    opacity: 0.15,
    pointerEvents: "none",
    backgroundImage: "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
    WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
  },
  header: {
    position: "relative",
    zIndex: 10,
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#A855F7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)",
  },
  logoTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 18,
    fontWeight: 700,
    color: "white",
  },
  logoSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
  },
  main: {
    position: "relative",
    zIndex: 10,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px 80px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 9999,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid #27272a",
    marginBottom: 32,
  },
  badgeText: {
    fontSize: 14,
    color: "#d1d5db",
  },
  badgeTag: {
    fontSize: 10,
    fontWeight: 700,
    color: "#A855F7",
    background: "rgba(168, 85, 247, 0.2)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  headline: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: "clamp(48px, 8vw, 72px)",
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: "-0.02em",
    marginBottom: 24,
    lineHeight: 1.1,
  },
  gradientText: {
    background: "linear-gradient(to right, #e879f9, #a855f7, #6366f1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontStyle: "italic",
  },
  subtitle: {
    fontSize: "clamp(16px, 2.5vw, 20px)",
    textAlign: "center",
    color: "#9ca3af",
    maxWidth: 640,
    marginBottom: 48,
    lineHeight: 1.6,
  },
  promptWrapper: {
    width: "100%",
    maxWidth: 768,
    position: "relative",
  },
  promptGlow: {
    position: "absolute",
    inset: -4,
    background: "linear-gradient(to right, #A855F7, #3b82f6)",
    borderRadius: 16,
    filter: "blur(20px)",
    opacity: 0.2,
  },
  promptBox: {
    position: "relative",
    background: "#0F0F0F",
    borderRadius: 12,
    border: "1px solid #27272a",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
  },
  promptInputArea: {
    padding: 20,
    display: "flex",
    gap: 16,
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#e5e7eb",
    fontSize: 18,
    fontFamily: "'Inter', sans-serif",
    resize: "none",
    outline: "none",
    minHeight: 56,
  },
  promptDivider: {
    height: 1,
    background: "#27272a",
  },
  promptBottom: {
    padding: "12px 20px",
    background: "#0A0A0A",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnGenerate: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    color: "white",
    background: "#A855F7",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)",
    fontFamily: "'Inter', sans-serif",
  },
  quickPrompts: {
    marginTop: 32,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
  },
  quickPromptBtn: {
    padding: "6px 14px",
    borderRadius: 9999,
    border: "1px solid #27272a",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#9ca3af",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
  },
  footer: {
    position: "relative",
    zIndex: 10,
    padding: 24,
    textAlign: "center",
    fontSize: 12,
    color: "#4b5563",
  },
  // Questions Screen
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#1C1C1C",
    border: "1px solid #27272a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    cursor: "pointer",
  },
  questionsMain: {
    position: "relative",
    zIndex: 10,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  questionCard: {
    width: "100%",
    maxWidth: 600,
    background: "#111",
    borderRadius: 16,
    border: "1px solid #27272a",
    padding: 32,
  },
  progressBar: {
    height: 4,
    background: "#27272a",
    borderRadius: 2,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(to right, #A855F7, #6366f1)",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  projectType: {
    fontSize: 12,
    color: "#A855F7",
    background: "rgba(168, 85, 247, 0.1)",
    padding: "4px 12px",
    borderRadius: 9999,
  },
  questionTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 24,
    fontWeight: 600,
    color: "white",
    marginBottom: 8,
  },
  multiSelectHint: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
    marginBottom: 24,
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "#1C1C1C",
    border: "1px solid #27272a",
    borderRadius: 10,
    color: "#d1d5db",
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.2s",
  },
  optionBtnSelected: {
    background: "rgba(168, 85, 247, 0.1)",
    borderColor: "#A855F7",
    color: "white",
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: "2px solid #4b5563",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionRadioSelected: {
    background: "#A855F7",
    borderColor: "#A855F7",
  },
  otherSection: {
    marginBottom: 24,
  },
  otherLabel: {
    display: "block",
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 8,
  },
  otherInput: {
    width: "100%",
    padding: "12px 16px",
    background: "#1C1C1C",
    border: "1px solid #27272a",
    borderRadius: 8,
    color: "white",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
  },
  questionActions: {
    display: "flex",
    gap: 12,
  },
  btnSecondary: {
    padding: "12px 24px",
    background: "#1C1C1C",
    border: "1px solid #27272a",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  btnNext: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px",
    background: "#A855F7",
    border: "none",
    borderRadius: 8,
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  btnImplement: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px",
    background: "linear-gradient(to right, #A855F7, #6366f1)",
    border: "none",
    borderRadius: 8,
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.3)",
  },
  // Builder View
  builderContainer: {
    height: "100vh",
    display: "flex",
    background: "#0A0A0A",
  },
  chatPanel: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #27272a",
  },
  chatHeader: {
    padding: 16,
    borderBottom: "1px solid #27272a",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#A855F7",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(168, 85, 247, 0.25)",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  userMessage: {
    maxWidth: "85%",
    borderRadius: 16,
    padding: "12px 16px",
    background: "#A855F7",
    color: "white",
  },
  assistantMessage: {
    maxWidth: "85%",
    borderRadius: 16,
    padding: "12px 16px",
    background: "#1C1C1C",
    border: "1px solid #27272a",
    color: "#e5e7eb",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  codeIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    fontSize: 13,
    color: "#22c55e",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  loadingMessage: {
    borderRadius: 16,
    padding: "12px 16px",
    background: "#1C1C1C",
    border: "1px solid #27272a",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#A855F7",
    animation: "bounce 0.6s ease-in-out infinite",
  },
  inputArea: {
    padding: 16,
    borderTop: "1px solid #27272a",
  },
  inputForm: {
    display: "flex",
    gap: 12,
  },
  chatInput: {
    flex: 1,
    padding: "12px 16px",
    background: "#1C1C1C",
    border: "1px solid #27272a",
    borderRadius: 12,
    color: "white",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    resize: "none",
    outline: "none",
  },
  sendBtn: {
    padding: "12px 16px",
    background: "#A855F7",
    border: "none",
    borderRadius: 12,
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  // Preview Panel
  previewPanel: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    background: "#111",
  },
  previewHeader: {
    padding: 16,
    borderBottom: "1px solid #27272a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabActive: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    background: "#A855F7",
    border: "none",
    borderRadius: 8,
    color: "white",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  tabInactive: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  downloadBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  previewContent: {
    flex: 1,
    padding: 16,
    overflow: "hidden",
  },
  emptyPreview: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: "2px dashed #27272a",
  },
  iframe: {
    width: "100%",
    height: "100%",
    background: "white",
    borderRadius: 8,
    border: "none",
  },
  codeView: {
    height: "100%",
    overflow: "auto",
    borderRadius: 12,
    background: "#0A0A0A",
    border: "1px solid #27272a",
  },
  codeContent: {
    padding: 16,
    fontSize: 14,
    color: "#d1d5db",
    whiteSpace: "pre-wrap",
    fontFamily: "monospace",
    margin: 0,
  },
};
