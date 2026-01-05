"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [streamingCode, setStreamingCode] = useState<string>("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [streamingContent, setStreamingContent] = useState("");
  const [buildStatus, setBuildStatus] = useState<string>("");
  
  // Flow states
  const [stage, setStage] = useState<"home" | "questions" | "builder">("home");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Handle panel resize
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
    if (code.includes("testimonial")) return "Adding testimonials...";
    if (code.includes("pricing")) return "Building pricing section...";
    if (code.includes("feature")) return "Adding features...";
    if (code.includes("hero")) return "Designing hero section...";
    if (code.includes("nav")) return "Creating navigation...";
    if (code.includes("</style>")) return "Styling complete...";
    if (code.includes("font-family")) return "Setting up typography...";
    if (code.includes("background")) return "Adding colors...";
    if (code.includes("<style")) return "Writing styles...";
    if (code.includes("<head")) return "Setting up structure...";
    if (code.includes("<!DOCTYPE")) return "Starting build...";
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

Analyze this request and generate 3-4 specific clarifying questions that will help you build exactly what I need. Return ONLY a JSON array with this format (no other text):

[
  {
    "question": "The question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "allowMultiple": false,
    "hasOther": true
  }
]

Rules:
- Questions should be specific to "${prompt}", not generic
- Options should be relevant choices for that specific type of project
- Use simple, non-technical language
- First question should clarify the core purpose/goal
- Include style/vibe question
- Include a question about key features or sections needed
- allowMultiple should be true for features/sections questions
- hasOther allows custom input when true`
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

      // Extract JSON from response
      const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        setAiQuestions(questions);
      } else {
        // Fallback questions
        setAiQuestions([
          { question: "What's the main purpose of this project?", options: ["Showcase work", "Generate leads", "Sell products", "Provide information"], allowMultiple: false, hasOther: true },
          { question: "What style do you prefer?", options: ["Modern & Minimal", "Bold & Colorful", "Dark & Techy", "Elegant & Professional"], allowMultiple: false, hasOther: false },
          { question: "What key sections do you need?", options: ["Hero Section", "About", "Features", "Contact", "Pricing", "Testimonials"], allowMultiple: true, hasOther: true },
        ]);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      // Fallback
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
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: finalAnswers }));
    
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptions([]);
      setOtherText("");
    }
  };

  const handleImplement = async () => {
    const finalAnswers = { ...answers, [currentQuestionIndex]: otherText ? [...selectedOptions, otherText] : selectedOptions };
    
    // Build the prompt from answers
    let buildPrompt = `Build me a ${userPrompt}.\n\nHere are my requirements:\n`;
    aiQuestions.forEach((q, idx) => {
      const ans = finalAnswers[idx];
      if (ans && ans.length > 0) {
        buildPrompt += `- ${q.question}: ${ans.join(", ")}\n`;
      }
    });
    buildPrompt += "\nCreate this now. Make it stunning and professional.";

    setStage("builder");
    setViewMode("code");
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: buildPrompt,
    };

    setMessages([userMessage]);
    setIsLoading(true);
    setStreamingContent("");
    setStreamingCode("");
    setBuildStatus("Starting...");

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
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent,
        code: code || undefined,
      }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) {
        setCurrentCode(code);
        setIsFirstBuild(false);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
      setBuildStatus("");
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
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    setStreamingCode("");
    setBuildStatus("Implementing changes...");

    try {
      // Build context with current code
      const systemContext = isFirstBuild 
        ? ""
        : `\n\nCurrent website code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nThe user wants changes. Confirm what you're doing briefly, then output the FULL updated code.`;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.role === "user" && m.id === userMessage.id 
              ? m.content + systemContext
              : m.content,
          })),
          isFollowUp: !isFirstBuild,
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
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent,
        code: code || undefined,
      }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) {
        setCurrentCode(code);
        setIsFirstBuild(false);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error. Please try again.",
      }]);
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
    a.download = "buildr-export.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setMessages([]);
    setCurrentCode("");
    setStreamingContent("");
    setStreamingCode("");
    setStage("home");
    setInput("");
    setUserPrompt("");
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    setAiQuestions([]);
    setIsFirstBuild(true);
    setBuildStatus("");
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
    let cleaned = content.replace(/```[\s\S]*?```/g, "").trim();
    if (isStreaming || cleaned.includes("```")) {
      cleaned = cleaned.replace(/```[\s\S]*/g, "").trim();
    }
    cleaned = cleaned.replace(/\*\*/g, "").trim();
    if (!cleaned || cleaned.length < 3) {
      return isFirstBuild ? "Building your website..." : "Implementing changes...";
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
            <span style={styles.badgeTag}>OPUS</span>
          </div>

          <h1 style={styles.headline}>
            <span style={{ color: "#fff" }}>Build </span>
            <span style={styles.gradientText}>anything</span>
            <br />
            <span style={{ color: "#6b7280" }}>with AI</span>
          </h1>

          <p style={styles.subtitle}>
            Describe your vision. Get a stunning website in seconds.
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
            {["Restaurant website", "Fitness app landing page", "Photography portfolio", "SaaS pricing page"].map((prompt) => (
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
              
              {currentQuestion.allowMultiple && (
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
                      setSelectedOptions(answers[currentQuestionIndex - 1] || []);
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
          ) : null}
        </main>
      </div>
    );
  }

  // ==================== BUILDER VIEW ====================
  return (
    <div ref={containerRef} style={styles.builderContainer}>
      <style jsx global>{globalStyles}</style>
      
      {/* Left: Chat */}
      <div style={{ ...styles.chatPanel, width: `${panelWidth}%` }}>
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
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        style={styles.resizer}
        onMouseDown={handleMouseDown}
      >
        <div style={styles.resizerLine} />
      </div>

      {/* Right: Preview */}
      <div style={{ ...styles.previewPanel, width: `${100 - panelWidth}%` }}>
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
              {isLoading && streamingCode && (
                <span style={styles.liveIndicator}>LIVE</span>
              )}
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
            <iframe
              srcDoc={currentCode}
              style={styles.iframe}
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
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
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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
  loadingQuestions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    border: "3px solid #27272a",
    borderTopColor: "#A855F7",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
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
  builderContainer: {
    height: "100vh",
    display: "flex",
    background: "#0A0A0A",
  },
  chatPanel: {
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #27272a",
    minWidth: 300,
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
  buildingMessage: {
    borderRadius: 16,
    padding: "16px 20px",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    border: "1px solid #A855F7",
    boxShadow: "0 0 30px rgba(168, 85, 247, 0.15)",
  },
  buildingHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  buildingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "rgba(168, 85, 247, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "spin 2s linear infinite",
  },
  buildingTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 2,
  },
  buildingStatus: {
    fontSize: 13,
    color: "#A855F7",
    fontWeight: 500,
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
  resizer: {
    width: 12,
    background: "#0A0A0A",
    cursor: "col-resize",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  resizerLine: {
    width: 4,
    height: 40,
    background: "#27272a",
    borderRadius: 2,
  },
  previewPanel: {
    display: "flex",
    flexDirection: "column",
    background: "#111",
    minWidth: 300,
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
  liveIndicator: {
    fontSize: 9,
    fontWeight: 700,
    color: "#fff",
    background: "#ef4444",
    padding: "2px 6px",
    borderRadius: 4,
    marginLeft: 8,
    animation: "pulse 1s ease-in-out infinite",
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
