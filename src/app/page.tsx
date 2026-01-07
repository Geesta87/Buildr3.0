"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase, Project } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import logger from "@/lib/logger";

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

// Smart pre-set questions - NOW ONLY USED AS FALLBACK
// The AI will generate custom questions based on the specific prompt
const FALLBACK_QUESTIONS: Question[] = [
  { id: "name", question: "What's your business or project name?", options: [], allowMultiple: false, hasOther: true },
  { id: "style", question: "What style do you prefer?", options: ["Modern & Minimal", "Bold & Colorful", "Dark & Premium", "Elegant & Professional"], allowMultiple: false, hasOther: false },
  { id: "heroMedia", question: "What do you want for the hero section?", options: ["🎬 Video Background (more dynamic)", "📷 Photo Background (classic)"], allowMultiple: false, hasOther: false },
];

// AI-Generated Questions Prompt - This creates SMART, CONTEXTUAL questions
const SMART_QUESTIONS_PROMPT = `You are Buildr's intelligent question generator. Based on the user's prompt, generate 3-4 highly relevant questions to gather the information needed to build their perfect website.

CRITICAL RULES:
1. Questions must be SPECIFIC to what the user asked for - not generic
2. If they mention a brand (Nike, Apple, etc.), acknowledge it and ask relevant questions for THAT type of business
3. If they upload an image, factor that into your understanding
4. Options should be relevant to their specific industry/niche
5. Never ask obvious questions if the answer is already in their prompt
6. Think about what YOU would need to know to build this specific website

RESPONSE FORMAT (JSON only, no explanation):
[
  {
    "id": "unique_id",
    "question": "The question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "allowMultiple": false,
    "hasOther": true
  }
]

EXAMPLES:

User: "Nike website"
Response:
[
  {"id": "focus", "question": "What's the main focus of this Nike site?", "options": ["Running Shoes", "Basketball/Jordan", "Training & Fitness", "Lifestyle/Streetwear", "Full Product Catalog"], "allowMultiple": false, "hasOther": true},
  {"id": "audience", "question": "Who's the target audience?", "options": ["Athletes & Runners", "Sneakerheads & Collectors", "Casual Fitness Enthusiasts", "Youth & Streetwear Fans"], "allowMultiple": false, "hasOther": false},
  {"id": "features", "question": "What key features do you need?", "options": ["Product Showcase", "Size Guide", "New Releases Section", "Athlete Endorsements", "Shop Now CTAs"], "allowMultiple": true, "hasOther": false},
  {"id": "heroMedia", "question": "What style for the hero?", "options": ["🎬 Dynamic Video (athletes in action)", "📷 Bold Product Photography", "🎨 Animated/Interactive"], "allowMultiple": false, "hasOther": false}
]

User: "Mexican restaurant in Austin"
Response:
[
  {"id": "name", "question": "What's your restaurant name?", "options": [], "allowMultiple": false, "hasOther": true},
  {"id": "style", "question": "What's the vibe?", "options": ["Authentic Street Tacos", "Upscale Modern Mexican", "Family Cantina Style", "Tex-Mex Casual"], "allowMultiple": false, "hasOther": false},
  {"id": "features", "question": "What do you need?", "options": ["Online Menu with Photos", "Table Reservations", "Online Ordering/Pickup", "Happy Hour Specials", "Catering Info"], "allowMultiple": true, "hasOther": false},
  {"id": "heroMedia", "question": "Hero section style?", "options": ["🎬 Video of sizzling food", "📷 Beautiful dish photography", "🎨 Colorful Mexican design"], "allowMultiple": false, "hasOther": false}
]

User: "Law firm website"
Response:
[
  {"id": "name", "question": "What's your firm name?", "options": [], "allowMultiple": false, "hasOther": true},
  {"id": "practice", "question": "What's your practice area?", "options": ["Personal Injury", "Criminal Defense", "Family Law", "Business/Corporate", "Estate Planning", "Immigration"], "allowMultiple": true, "hasOther": true},
  {"id": "features", "question": "What should the site emphasize?", "options": ["Case Results/Wins", "Attorney Profiles", "Free Consultation CTA", "Client Testimonials", "Practice Area Pages"], "allowMultiple": true, "hasOther": false},
  {"id": "tone", "question": "What tone fits your firm?", "options": ["Aggressive & Confident", "Compassionate & Approachable", "Prestigious & Established", "Modern & Innovative"], "allowMultiple": false, "hasOther": false}
]

REMEMBER: Be specific to their prompt. "Nike" is athletic footwear, not generic ecommerce. "Plumber" needs trust badges and emergency contact, not product grids. Think deeply about what makes sense.`;

// Get template category for API
const getTemplateCategory = (prompt: string): string | null => {
  const lower = prompt.toLowerCase();
  if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("food") || lower.includes("menu") || lower.includes("bistro") || lower.includes("bakery")) return "restaurant";
  if (lower.includes("plumber") || lower.includes("electrician") || lower.includes("hvac") || lower.includes("contractor") || lower.includes("handyman") || lower.includes("cleaning") || lower.includes("landscaping") || lower.includes("roofing") || lower.includes("painting") || lower.includes("repair") || lower.includes("service business")) return "local-service";
  if (lower.includes("fitness") || lower.includes("gym") || lower.includes("yoga") || lower.includes("crossfit") || lower.includes("trainer") || lower.includes("workout")) return "fitness";
  if (lower.includes("agency") || lower.includes("marketing agency") || lower.includes("digital agency") || lower.includes("creative agency") || lower.includes("consulting")) return "agency";
  if (lower.includes("saas") || lower.includes("software") || lower.includes("app") || lower.includes("platform") || lower.includes("startup") || lower.includes("tool")) return "saas";
  return null;
};

// Generate AI acknowledgment based on prompt
const generateAcknowledgment = (prompt: string): string => {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("food") || lower.includes("menu") || lower.includes("bistro") || lower.includes("bakery")) {
    return `I'll build you a stunning restaurant website with an elegant dark theme featuring:
• Eye-catching hero section with your restaurant name
• Interactive menu with categories (appetizers, mains, desserts, drinks)
• Online reservation system
• Photo gallery showcasing your dishes
• Customer reviews and testimonials
• Location map with hours of operation

The design will have a sophisticated fine-dining feel. Let me ask a few questions to customize it perfectly for you.`;
  }
  
  if (lower.includes("plumber") || lower.includes("electrician") || lower.includes("hvac") || lower.includes("contractor") || lower.includes("handyman") || lower.includes("cleaning") || lower.includes("landscaping") || lower.includes("roofing") || lower.includes("painting") || lower.includes("repair") || lower.includes("service business")) {
    return `I'll create a professional service business website designed to generate leads and build trust. It will include:
• Prominent phone number and "Get a Quote" button
• Trust badges (Licensed, Insured, 5-star rated)
• Services overview with clear descriptions
• Customer reviews and testimonials
• Service areas you cover
• Easy-to-use contact form
• Business hours and location

The design will feel professional and trustworthy. Let me ask a few questions to customize it for your business.`;
  }
  
  if (lower.includes("fitness") || lower.includes("gym") || lower.includes("yoga") || lower.includes("crossfit") || lower.includes("trainer") || lower.includes("workout")) {
    return `I'll create an energetic fitness website that motivates visitors to take action. It will include:
• Bold hero section with strong call-to-action
• Class schedule or programs overview
• Trainer/instructor profiles
• Membership pricing tiers
• Transformation testimonials
• Contact info and location
• Free trial or consultation CTA

The design will feel bold and energetic. Let me ask a few questions to customize it for your fitness business.`;
  }
  
  if (lower.includes("agency") || lower.includes("marketing") || lower.includes("digital agency") || lower.includes("creative") || lower.includes("consulting")) {
    return `I'll build a professional agency website that showcases your expertise and wins clients. It will include:
• Impressive hero section with your value proposition
• Services breakdown with descriptions
• Case studies or portfolio section
• Client logos and testimonials
• Team section
• Contact form for inquiries

The design will feel bold and professional. Let me ask a few questions to customize it for your agency.`;
  }
  
  if (lower.includes("saas") || lower.includes("software") || lower.includes("app") || lower.includes("platform") || lower.includes("startup") || lower.includes("tool")) {
    return `I'll build a modern SaaS landing page designed to convert visitors into users. It will include:
• Compelling hero with clear value proposition
• Feature showcase with icons and descriptions  
• Pricing table with multiple tiers
• Customer testimonials and social proof
• FAQ section
• Strong call-to-action throughout

The design will feel modern and trustworthy. Let me ask a few questions to customize it for your product.`;
  }
  
  if (lower.includes("portfolio") || lower.includes("personal")) {
    return `I'll create a stunning portfolio website to showcase your work. It will include:
• Bold hero section with your name and title
• Project gallery with hover effects
• About section telling your story
• Skills or services you offer
• Testimonials from clients
• Contact form

Let me ask a few questions to customize it for you.`;
  }
  
  return `I'll create a professional website for "${prompt}" with:
• Eye-catching hero section
• Key features/services
• About section
• Testimonials
• Contact form

Let me ask a few questions to customize it perfectly.`;
};

// Fallback questions - used if AI generation fails
const getQuestionsForPrompt = (): Question[] => {
  return FALLBACK_QUESTIONS;
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
  const [acknowledgment, setAcknowledgment] = useState<string>("");
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);
  
  const [panelWidth, setPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [error, setError] = useState<{ message: string; retryFn: (() => void) | null } | null>(null);
  const [chatMode, setChatMode] = useState<"plan" | "build">("build");
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string; base64?: string }[]>([]);
  
  // Plan implementation state
  const [pendingPlan, setPendingPlan] = useState<string | null>(null); // Stores the plan text to implement
  
  // Build quality mode
  const [premiumMode, setPremiumMode] = useState(false); // false = Fast (Haiku), true = Premium (Sonnet/Opus)
  
  // Feature toggles for builds
  const [features, setFeatures] = useState({
    aos: true,           // AOS Scroll Animations (default ON - always looks better)
    darkMode: false,     // Dark/Light mode toggle
    typedJs: false,      // Typewriter effect in hero
    confetti: true,      // Confetti on form submit (default ON)
    lottie: false,       // Lottie animations
    leafletMap: false,   // Interactive map
    web3forms: false,    // Working contact form (needs API key)
    tawkTo: false,       // Live chat widget
    pwa: false,          // PWA support
    aiImages: false,     // AI-generated images (needs Replicate API key)
  });
  
  // Undo/Redo state
  const [codeHistory, setCodeHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Color Palette state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string; accent: string; background: string; text: string }>({ primary: "#A855F7", secondary: "#6366f1", accent: "#22c55e", background: "#ffffff", text: "#111111" });
  
  // Device Preview state
  const [devicePreview, setDevicePreview] = useState<"desktop" | "tablet" | "mobile">("desktop");
  
  // Preview refresh and page navigation
  const [previewKey, setPreviewKey] = useState(0); // Incrementing this forces iframe refresh
  const [detectedPages, setDetectedPages] = useState<{ id: string; name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<string>(""); // Current page/section to view
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  
  // ========== SELF-AWARE AI SYSTEM ==========
  // Preview error tracking
  const [previewErrors, setPreviewErrors] = useState<{ type: string; message: string; timestamp: number }[]>([]);
  // Code issues detected by validator
  const [codeIssues, setCodeIssues] = useState<{ severity: "error" | "warning" | "info"; message: string; fix?: string }[]>([]);
  // Build context memory
  const [buildContext, setBuildContext] = useState<{
    projectType: string;
    features: string[];
    lastBuildTime: number;
    sectionsBuilt: string[];
    userRequests: string[];
  }>({ projectType: "", features: [], lastBuildTime: 0, sectionsBuilt: [], userRequests: [] });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ========== CODE VALIDATOR ==========
  // Analyzes generated code for common issues
  const validateCode = useCallback((code: string): { severity: "error" | "warning" | "info"; message: string; fix?: string }[] => {
    const issues: { severity: "error" | "warning" | "info"; message: string; fix?: string }[] = [];
    
    if (!code) return issues;
    
    // CRITICAL: Check for broken Tailwind config (causes blank page)
    if (code.includes('id="tailwind-config"') || code.includes("id='tailwind-config'")) {
      issues.push({
        severity: "error",
        message: "Tailwind config error - page may appear blank due to broken CSS setup",
        fix: "Remove id='tailwind-config' from the script tag - config must be inline without id"
      });
    }
    
    // CRITICAL: Check if the build appears empty/broken
    const hasBody = code.includes("<body");
    const bodyContent = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContentLength = bodyContent ? bodyContent[1].replace(/<[^>]*>/g, '').trim().length : 0;
    
    // Check for essentially empty body (just whitespace or very little content)
    if (hasBody && bodyContentLength < 100) {
      issues.push({
        severity: "error",
        message: "Website appears empty - content may not have generated properly",
        fix: "Try regenerating with 'Make it again' or describe what you want more specifically"
      });
    }
    
    // Check if hero section exists but is empty
    const heroMatch = code.match(/<section[^>]*(?:id|class)=[^>]*hero[^>]*>([\s\S]*?)<\/section>/i);
    if (heroMatch) {
      const heroContent = heroMatch[1].replace(/<[^>]*>/g, '').trim();
      if (heroContent.length < 20) {
        issues.push({
          severity: "error",
          message: "Hero section appears empty - may be a generation issue",
          fix: "Ask to 'Add content to the hero section' or 'Rebuild the hero'"
        });
      }
    }
    
    // Check for forms without handlers
    if (code.includes("<form") && !code.includes("onsubmit") && !code.includes("addEventListener")) {
      issues.push({
        severity: "warning",
        message: "Form found without submit handler - form won't process submissions",
        fix: "Add form validation and submit handler with success feedback"
      });
    }
    
    // Check for buttons without onclick or type
    const buttonMatches = code.match(/<button[^>]*>/gi) || [];
    buttonMatches.forEach(btn => {
      if (!btn.includes("onclick") && !btn.includes("type=") && !btn.includes("submit")) {
        issues.push({
          severity: "warning", 
          message: "Button found without click handler - may not be functional",
          fix: "Add onclick handler or proper type attribute"
        });
      }
    });
    
    // Check for navigation links
    if (code.includes('href="#"') && !code.includes("scroll-behavior")) {
      issues.push({
        severity: "info",
        message: "Anchor links with # may not scroll smoothly",
        fix: "Add scroll-behavior: smooth to html element"
      });
    }
    
    // Check for mobile menu without toggle
    if ((code.includes("mobile-menu") || code.includes("hamburger") || code.includes("menu-toggle")) && 
        !code.includes("classList.toggle") && !code.includes("classList.add")) {
      issues.push({
        severity: "warning",
        message: "Mobile menu detected but no toggle functionality found",
        fix: "Add JavaScript to toggle mobile menu visibility"
      });
    }
    
    // Check for images without alt text
    const imgMatches = code.match(/<img[^>]*>/gi) || [];
    imgMatches.forEach(img => {
      if (!img.includes("alt=")) {
        issues.push({
          severity: "info",
          message: "Image found without alt text - affects accessibility",
          fix: "Add descriptive alt attribute to images"
        });
      }
    });
    
    // Check for phone numbers not using tel: links
    const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    if (phonePattern.test(code) && !code.includes("tel:")) {
      issues.push({
        severity: "info",
        message: "Phone number found but not clickable on mobile",
        fix: "Wrap phone numbers in <a href='tel:...'> tags"
      });
    }
    
    // Check for email not using mailto:
    if (code.includes("@") && code.includes(".com") && !code.includes("mailto:")) {
      issues.push({
        severity: "info",
        message: "Email address found but not clickable",
        fix: "Wrap email in <a href='mailto:...'> tag"
      });
    }
    
    // Check for missing viewport meta
    if (!code.includes("viewport")) {
      issues.push({
        severity: "error",
        message: "Missing viewport meta tag - site won't be mobile responsive",
        fix: "Add <meta name='viewport' content='width=device-width, initial-scale=1.0'>"
      });
    }
    
    // Check for CSS that might hide content
    if (code.includes("display: none") || code.includes("display:none") || 
        code.includes("visibility: hidden") || code.includes("opacity: 0")) {
      // Check if it's conditional (like for mobile menu)
      if (!code.includes("@media") && !code.includes("hidden") && !code.includes("toggle")) {
        issues.push({
          severity: "warning",
          message: "CSS hiding content detected - some elements may not be visible",
          fix: "Check for display:none or visibility:hidden that shouldn't be there"
        });
      }
    }
    
    return issues;
  }, []);

  // ========== DETECT SECTIONS BUILT ==========
  const detectSections = useCallback((code: string): string[] => {
    const sections: string[] = [];
    
    if (code.includes("hero") || code.includes("Hero")) sections.push("hero");
    if (code.includes("nav") || code.includes("Nav") || code.includes("header")) sections.push("navigation");
    if (code.includes("about") || code.includes("About")) sections.push("about");
    if (code.includes("service") || code.includes("Service")) sections.push("services");
    if (code.includes("pricing") || code.includes("Pricing")) sections.push("pricing");
    if (code.includes("testimonial") || code.includes("Testimonial") || code.includes("review")) sections.push("testimonials");
    if (code.includes("contact") || code.includes("Contact")) sections.push("contact");
    if (code.includes("footer") || code.includes("Footer")) sections.push("footer");
    if (code.includes("faq") || code.includes("FAQ") || code.includes("accordion")) sections.push("faq");
    if (code.includes("gallery") || code.includes("Gallery") || code.includes("portfolio")) sections.push("gallery");
    if (code.includes("team") || code.includes("Team")) sections.push("team");
    if (code.includes("feature") || code.includes("Feature")) sections.push("features");
    if (code.includes("cta") || code.includes("CTA") || code.includes("call-to-action")) sections.push("cta");
    if (code.includes("menu") && (code.includes("food") || code.includes("dish") || code.includes("price"))) sections.push("menu");
    
    return sections;
  }, []);

  // ========== DETECT PAGES/VIEWS ==========
  // Detects multiple pages, tabs, or views in the generated code
  const detectPages = useCallback((code: string): { id: string; name: string }[] => {
    const pages: { id: string; name: string }[] = [];
    
    if (!code) return pages;
    
    // Always add "Full Page" as the first option
    pages.push({ id: "", name: "📄 Full Page" });
    
    // Detect sections with IDs (common for single-page sites)
    const sectionMatches = code.match(/id=["']([^"']+)["'][^>]*>/gi) || [];
    const seenIds = new Set<string>();
    
    sectionMatches.forEach(match => {
      const idMatch = match.match(/id=["']([^"']+)["']/i);
      if (idMatch && idMatch[1]) {
        const id = idMatch[1];
        // Skip common utility IDs
        if (!seenIds.has(id) && !["root", "app", "__next", "main", "content"].includes(id.toLowerCase())) {
          seenIds.add(id);
          // Format the name nicely
          const name = id.replace(/-/g, " ").replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
          const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
          pages.push({ id: `#${id}`, name: `📍 ${formattedName}` });
        }
      }
    });
    
    // Detect multi-page indicators (tabs, routes, page dividers)
    // Look for data-page or page class patterns
    const pageMatches = code.match(/data-page=["']([^"']+)["']/gi) || [];
    pageMatches.forEach(match => {
      const pageMatch = match.match(/data-page=["']([^"']+)["']/i);
      if (pageMatch && pageMatch[1] && !seenIds.has(pageMatch[1])) {
        seenIds.add(pageMatch[1]);
        const name = pageMatch[1].replace(/-/g, " ").replace(/_/g, " ");
        pages.push({ id: `[data-page="${pageMatch[1]}"]`, name: `📑 ${name.charAt(0).toUpperCase() + name.slice(1)}` });
      }
    });
    
    // Detect dashboard-style pages (common patterns)
    if (code.includes("dashboard")) pages.push({ id: "#dashboard", name: "📊 Dashboard" });
    if (code.includes("settings") && !seenIds.has("settings")) pages.push({ id: "#settings", name: "⚙️ Settings" });
    if (code.includes("profile") && !seenIds.has("profile")) pages.push({ id: "#profile", name: "👤 Profile" });
    if (code.includes("users") && !seenIds.has("users")) pages.push({ id: "#users", name: "👥 Users" });
    if (code.includes("analytics") && !seenIds.has("analytics")) pages.push({ id: "#analytics", name: "📈 Analytics" });
    
    // Only return pages array if we found more than just "Full Page"
    return pages.length > 1 ? pages : [];
  }, []);

  // ========== UPDATE DETECTED PAGES WHEN CODE CHANGES ==========
  useEffect(() => {
    if (currentCode) {
      const pages = detectPages(currentCode);
      setDetectedPages(pages);
      // Reset to full page view when code changes
      setCurrentPage("");
    }
  }, [currentCode, detectPages]);

  // ========== REFRESH PREVIEW ==========
  const refreshPreview = useCallback(() => {
    setPreviewKey(prev => prev + 1);
    setPreviewErrors([]); // Clear errors on refresh
  }, []);

  // ========== SCROLL TO SECTION IN PREVIEW ==========
  const scrollToSection = useCallback((sectionId: string) => {
    setCurrentPage(sectionId);
    setShowPageDropdown(false);
    
    if (sectionId && iframeRef.current?.contentWindow) {
      // Post message to iframe to scroll to section
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({
          type: "SCROLL_TO_SECTION",
          sectionId: sectionId
        }, "*");
      }, 100);
    }
  }, []);

  // ========== UPDATE BUILD CONTEXT ==========
  const updateBuildContext = useCallback((code: string, userRequest: string) => {
    const sections = detectSections(code);
    setBuildContext(prev => ({
      ...prev,
      lastBuildTime: Date.now(),
      sectionsBuilt: sections,
      userRequests: [...prev.userRequests.slice(-9), userRequest], // Keep last 10 requests
    }));
  }, [detectSections]);

  // ========== GENERATE AI CONTEXT ==========
  // Creates context string for the AI about current state
  const generateAIContext = useCallback((): string => {
    let context = "";
    
    // Add code issues if any
    if (codeIssues.length > 0) {
      context += "\n\n[CODE ISSUES DETECTED]\n";
      codeIssues.forEach(issue => {
        context += `- ${issue.severity.toUpperCase()}: ${issue.message}`;
        if (issue.fix) context += ` (Suggested fix: ${issue.fix})`;
        context += "\n";
      });
    }
    
    // Add preview errors if any
    if (previewErrors.length > 0) {
      context += "\n\n[PREVIEW ERRORS]\n";
      previewErrors.slice(-5).forEach(err => {
        context += `- ${err.type}: ${err.message}\n`;
      });
    }
    
    // Add build context
    if (buildContext.sectionsBuilt.length > 0) {
      context += `\n\n[CURRENT WEBSITE SECTIONS]: ${buildContext.sectionsBuilt.join(", ")}`;
    }
    
    if (buildContext.userRequests.length > 0) {
      context += `\n\n[RECENT USER REQUESTS]: ${buildContext.userRequests.slice(-3).join(" | ")}`;
    }
    
    return context;
  }, [codeIssues, previewErrors, buildContext]);

  // ========== AUTO-FIX BROKEN TAILWIND CONFIG ==========
  // Fixes the id="tailwind-config" issue that causes blank pages
  const fixTailwindConfig = useCallback((code: string): string => {
    if (!code) return code;
    
    // Check if the broken pattern exists
    if (!code.includes('id="tailwind-config"') && !code.includes("id='tailwind-config'")) {
      return code;
    }
    
    console.log("[Buildr] Auto-fixing broken Tailwind config...");
    
    // Fix pattern: Remove id="tailwind-config" from script tags
    let fixedCode = code
      .replace(/<script\s+id=["']tailwind-config["']\s*>/gi, '<script>')
      .replace(/<script\s+id=["']tailwind-config["']/gi, '<script');
    
    return fixedCode;
  }, []);

  // ========== INJECT ERROR TRACKING INTO PREVIEW ==========
  // Adds error catching script to the generated code
  const injectErrorTracking = useCallback((code: string): string => {
    if (!code) return code;
    
    // First, auto-fix any broken Tailwind config
    let processedCode = fixTailwindConfig(code);
    
    const errorTrackingScript = `
<base target="_self">
<script>
// PREVENT NAVIGATION - Keep all links within preview
document.addEventListener('click', function(e) {
  var target = e.target;
  while (target && target.tagName !== 'A') {
    target = target.parentElement;
  }
  if (target && target.tagName === 'A') {
    var href = target.getAttribute('href');
    // Allow anchor links to scroll
    if (href && href.startsWith('#')) {
      e.preventDefault();
      var id = href.substring(1);
      var element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    // Prevent all other navigation
    if (href && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
      e.preventDefault();
      console.log('Navigation prevented in preview:', href);
    }
  }
}, true);

// Error tracking for Buildr preview
window.onerror = function(message, source, lineno, colno, error) {
  window.parent.postMessage({
    type: 'PREVIEW_ERROR',
    errorType: 'JavaScript Error',
    message: message + (lineno ? ' (line ' + lineno + ')' : ''),
    source: source
  }, '*');
  return false;
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
  window.parent.postMessage({
    type: 'PREVIEW_ERROR',
    errorType: 'Promise Rejection',
    message: event.reason ? event.reason.toString() : 'Unhandled promise rejection'
  }, '*');
};

// Track form submissions without handlers
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('form').forEach(function(form) {
    if (!form.onsubmit && !form.hasAttribute('action')) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        window.parent.postMessage({
          type: 'PREVIEW_ERROR',
          errorType: 'Form Issue',
          message: 'Form submitted but no handler defined'
        }, '*');
      });
    }
  });
  
  // Track broken images
  document.querySelectorAll('img').forEach(function(img) {
    img.onerror = function() {
      window.parent.postMessage({
        type: 'PREVIEW_ERROR',
        errorType: 'Broken Image',
        message: 'Failed to load image: ' + (img.src || 'unknown')
      }, '*');
    };
  });
});

// Log successful load
window.addEventListener('load', function() {
  window.parent.postMessage({
    type: 'PREVIEW_LOADED',
    message: 'Preview loaded successfully'
  }, '*');
});

// Listen for scroll commands from parent
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SCROLL_TO_SECTION') {
    var sectionId = event.data.sectionId;
    if (sectionId) {
      var element = document.querySelector(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
});
</script>
`;
    
    // Inject before </head> or at the start if no head
    if (processedCode.includes('</head>')) {
      return processedCode.replace('</head>', errorTrackingScript + '</head>');
    } else if (processedCode.includes('<body')) {
      return processedCode.replace('<body', errorTrackingScript + '<body');
    } else {
      return errorTrackingScript + processedCode;
    }
  }, [fixTailwindConfig]);

  // ========== PREVIEW ERROR LISTENER ==========
  // Listen for errors from the iframe preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PREVIEW_ERROR") {
        const newError = {
          type: event.data.errorType || "JavaScript Error",
          message: event.data.message || "Unknown error",
          timestamp: Date.now()
        };
        setPreviewErrors(prev => [...prev.slice(-9), newError]); // Keep last 10 errors
        logger.error("ui_error", `Preview error: ${newError.message}`, undefined, { errorType: newError.type });
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ========== VALIDATE CODE ON CHANGE ==========
  useEffect(() => {
    if (currentCode) {
      const issues = validateCode(currentCode);
      setCodeIssues(issues);
      
      // Log if there are errors
      if (issues.filter(i => i.severity === "error").length > 0) {
        logger.warn("build_error", "Code validation found errors", { issues });
      }
    }
  }, [currentCode, validateCode]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Save builder state to localStorage
  const saveBuilderState = useCallback(() => {
    if (stage === "builder" && currentProject) {
      // Don't save if we're in the middle of loading/streaming
      if (isLoading) return;
      
      // Get existing state to avoid overwriting good code with empty
      const existingSaved = localStorage.getItem("buildr_state");
      let existingCode = "";
      if (existingSaved) {
        try {
          const existing = JSON.parse(existingSaved);
          existingCode = existing.currentCode || "";
        } catch {}
      }
      
      // Use existing code if current is empty but existing has content
      const codeToSave = currentCode || existingCode;
      
      const state = {
        stage,
        currentProject,
        messages,
        currentCode: codeToSave,
        userPrompt,
        isFirstBuild,
        viewMode,
        timestamp: Date.now(),
      };
      localStorage.setItem("buildr_state", JSON.stringify(state));
    }
  }, [stage, currentProject, messages, currentCode, userPrompt, isFirstBuild, viewMode, isLoading]);

  // Save state whenever relevant data changes
  useEffect(() => {
    if (stage === "builder") {
      saveBuilderState();
    }
  }, [stage, messages, currentCode, saveBuilderState]);

  // Clear saved state when going back to home
  const clearBuilderState = () => {
    localStorage.removeItem("buildr_state");
    // Keep backup for 24 hours in case user needs to recover
    // Don't remove buildr_backup here
  };

  // Backup current code whenever it changes (separate from main state)
  useEffect(() => {
    if (currentCode && currentCode.length > 100) {
      localStorage.setItem("buildr_backup", JSON.stringify({
        code: currentCode,
        userPrompt,
        timestamp: Date.now()
      }));
    }
  }, [currentCode, userPrompt]);

  // Function to recover from backup
  const recoverFromBackup = () => {
    try {
      const backup = localStorage.getItem("buildr_backup");
      if (backup) {
        const { code, userPrompt: savedPrompt, timestamp } = JSON.parse(backup);
        // Only recover if less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000 && code) {
          setCurrentCode(code);
          if (savedPrompt) setUserPrompt(savedPrompt);
          setIsFirstBuild(false);
          addToHistory(code);
          return true;
        }
      }
    } catch (e) {
      console.error("Failed to recover from backup:", e);
    }
    return false;
  };

  // Restore state on mount
  useEffect(() => {
    const restoreState = () => {
      try {
        const saved = localStorage.getItem("buildr_state");
        if (saved) {
          const state = JSON.parse(saved);
          // Only restore if less than 1 hour old
          if (Date.now() - state.timestamp < 60 * 60 * 1000) {
            setCurrentProject(state.currentProject);
            setMessages(state.messages || []);
            setCurrentCode(state.currentCode || "");
            setUserPrompt(state.userPrompt || "");
            setIsFirstBuild(state.isFirstBuild ?? true);
            setViewMode(state.viewMode || "preview");
            return "builder";
          } else {
            localStorage.removeItem("buildr_state");
          }
        }
      } catch (e) {
        console.error("Failed to restore state:", e);
        localStorage.removeItem("buildr_state");
      }
      return null;
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const restoredStage = restoreState();
        if (restoredStage === "builder") {
          setStage("builder");
        } else {
          setStage("home");
        }
        loadProjects();
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { 
        // Only change stage if we're in auth state - don't interrupt active building
        setStage(currentStage => {
          if (currentStage === "auth") {
            const restoredStage = restoreState();
            if (restoredStage === "builder") {
              return "builder";
            }
            loadProjects();
            return "home";
          }
          // Already in home/questions/builder - don't change
          return currentStage;
        });
      } else { 
        setStage("auth"); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Save state when tab becomes hidden or before unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && stage === "builder") {
        saveBuilderState();
      }
    };
    const handleBeforeUnload = () => {
      if (stage === "builder") {
        saveBuilderState();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [stage, saveBuilderState]);

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

  // Generate a relevant project name based on the prompt
  const generateProjectName = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    
    // Try to extract actual business name from prompt
    // Patterns like "Build me a website for [Name]" or "[Name] plumbing" or "called [Name]"
    const namePatterns = [
      /(?:for|called|named)\s+["']?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i,
      /^([A-Z][a-zA-Z]+(?:'s)?)\s+(?:plumbing|restaurant|cafe|gym|salon|agency|cleaning|landscaping|roofing)/i,
      /["']([^"']+)["']/,
    ];
    
    for (const pattern of namePatterns) {
      const match = prompt.match(pattern);
      if (match && match[1] && match[1].length > 2 && match[1].length < 30) {
        // Found a business name, use it with the business type
        const businessName = match[1].trim();
        const businessType = detectBusinessType(lower);
        if (businessType) {
          return `${businessName} - ${businessType}`;
        }
        return businessName;
      }
    }
    
    // No name found, generate based on business type
    const businessTypes: Record<string, { names: string[], suffix: string }> = {
      plumbing: { names: ["ProPipe", "FlowFix", "PipeMaster", "DrainPro", "AquaFix"], suffix: "Plumbing" },
      plumber: { names: ["ProPipe", "FlowFix", "PipeMaster", "DrainPro", "AquaFix"], suffix: "Plumbing" },
      electrical: { names: ["VoltPro", "SparkTech", "PowerUp", "WirePro", "CircuitFix"], suffix: "Electric" },
      electrician: { names: ["VoltPro", "SparkTech", "PowerUp", "WirePro", "CircuitFix"], suffix: "Electric" },
      carpet: { names: ["FloorCraft", "CarpetPro", "SoftStep", "LuxFloor", "CozyFloors"], suffix: "Flooring" },
      flooring: { names: ["FloorCraft", "TilePro", "SolidStep", "PrimeFloors", "FloorMax"], suffix: "Flooring" },
      roofing: { names: ["TopRoof", "SkyShield", "RoofPro", "PeakTop", "ShingleMaster"], suffix: "Roofing" },
      hvac: { names: ["CoolAir", "ClimatePro", "AirFlow", "TempMaster", "ComfortZone"], suffix: "HVAC" },
      painting: { names: ["ColorPro", "BrushMaster", "PaintCraft", "FreshCoat", "PrimePaint"], suffix: "Painting" },
      cleaning: { names: ["SparkleClean", "PureShine", "FreshSpace", "CleanPro", "SpotlessHome"], suffix: "Cleaning" },
      landscaping: { names: ["GreenScape", "NaturePro", "GardenCraft", "LawnMaster", "EdenYards"], suffix: "Landscaping" },
      lawn: { names: ["GreenLawn", "TurfPro", "LawnCare", "GrassMaster", "YardPro"], suffix: "Lawn Care" },
      restaurant: { names: ["Savory", "TasteBud", "Culinary", "Flavors", "Gourmet"], suffix: "Restaurant" },
      cafe: { names: ["BrewHouse", "BeanBar", "CozyCup", "MorningBrew", "CafeBlend"], suffix: "Cafe" },
      coffee: { names: ["BrewCraft", "BeanRoast", "CupJoy", "JavaSpot", "RoastHouse"], suffix: "Coffee" },
      fitness: { names: ["FitPulse", "PowerGym", "ActiveLife", "StrengthZone", "PeakFit"], suffix: "Fitness" },
      gym: { names: ["IronCore", "FlexGym", "PowerHouse", "MuscleHub", "FitZone"], suffix: "Gym" },
      yoga: { names: ["ZenFlow", "BalanceYoga", "SereneMind", "PeaceStudio", "HarmonyYoga"], suffix: "Yoga" },
      salon: { names: ["StyleCut", "GlamHair", "BeautyBar", "ChicSalon", "TrendStyle"], suffix: "Salon" },
      barber: { names: ["SharpCuts", "ClassicBarber", "FreshFades", "TheBarberShop", "CleanCut"], suffix: "Barber" },
      spa: { names: ["BlissSpa", "SerenityDay", "GlowWell", "TranquilSpa", "ZenRetreat"], suffix: "Spa" },
      dental: { names: ["BrightSmile", "DentalCare", "SmilePro", "ToothDoc", "HealthyTeeth"], suffix: "Dental" },
      medical: { names: ["CarePlus", "HealthFirst", "MediCare", "WellClinic", "PrimeMed"], suffix: "Medical" },
      lawyer: { names: ["JusticePro", "LawFirst", "LegalEdge", "TrustLaw", "RightPath"], suffix: "Law" },
      attorney: { names: ["JusticePro", "LawFirst", "LegalEdge", "TrustLaw", "RightPath"], suffix: "Law" },
      agency: { names: ["PixelPro", "CreativeEdge", "BoldVision", "SparkAgency", "NexGen"], suffix: "Agency" },
      marketing: { names: ["GrowthPro", "BrandBoost", "MarketEdge", "ViralReach", "ClickMax"], suffix: "Marketing" },
      saas: { names: ["CloudSync", "DataFlow", "AppNova", "TechPulse", "SyncPro"], suffix: "Platform" },
      ecommerce: { names: ["ShopNow", "CartPro", "BuyEasy", "MarketHub", "StoreFront"], suffix: "Store" },
      construction: { names: ["BuildPro", "SolidCraft", "FoundationFirst", "SteelForge", "ConstructMax"], suffix: "Construction" },
      realestate: { names: ["HomeFind", "DreamHouse", "PropertyPro", "KeyRealty", "NestFinder"], suffix: "Realty" },
      "real estate": { names: ["HomeFind", "DreamHouse", "PropertyPro", "KeyRealty", "NestFinder"], suffix: "Realty" },
      photography: { names: ["LensCraft", "SnapPro", "FocusArt", "ShutterBox", "PixelPerfect"], suffix: "Photography" },
      wedding: { names: ["ForeverDay", "BlissWeddings", "DreamAisle", "LoveStory", "PerfectVows"], suffix: "Weddings" },
      pet: { names: ["PawsPro", "FurryFriends", "PetCare", "HappyTails", "Pawsome"], suffix: "Pet Care" },
      dog: { names: ["PawsPro", "WoofCare", "FurryFriends", "HappyPaws", "BarkBuddy"], suffix: "Pet Care" },
      auto: { names: ["AutoFix", "CarCare", "MotorPro", "DriveTech", "WheelWorks"], suffix: "Auto" },
      pool: { names: ["AquaPro", "PoolCare", "CrystalPools", "SplashMaster", "BlueWaters"], suffix: "Pool Service" },
      security: { names: ["SafeGuard", "SecurePro", "ShieldHome", "WatchDog", "ProtectAll"], suffix: "Security" },
      moving: { names: ["SwiftMove", "EasyHaul", "MovePro", "PackRight", "ReloCare"], suffix: "Moving" },
    };
    
    // Find matching business type
    for (const [key, config] of Object.entries(businessTypes)) {
      if (lower.includes(key)) {
        const randomName = config.names[Math.floor(Math.random() * config.names.length)];
        return `${randomName} ${config.suffix}`;
      }
    }
    
    // Generic fallback with timestamp for uniqueness
    const genericNames = ["WebCraft", "SitePro", "PageBuilder", "DigitalPro", "WebForge"];
    const randomGeneric = genericNames[Math.floor(Math.random() * genericNames.length)];
    return `${randomGeneric} Project`;
  };
  
  // Helper to detect business type for naming
  const detectBusinessType = (text: string): string | null => {
    const types: Record<string, string> = {
      plumbing: "Plumbing", plumber: "Plumbing",
      electrical: "Electric", electrician: "Electric",
      carpet: "Flooring", flooring: "Flooring",
      roofing: "Roofing", hvac: "HVAC",
      painting: "Painting", cleaning: "Cleaning",
      landscaping: "Landscaping", lawn: "Lawn Care",
      restaurant: "Restaurant", cafe: "Cafe", coffee: "Coffee",
      fitness: "Fitness", gym: "Gym", yoga: "Yoga",
      salon: "Salon", barber: "Barber", spa: "Spa",
      dental: "Dental", medical: "Medical",
      lawyer: "Law", attorney: "Law",
      agency: "Agency", marketing: "Marketing",
      construction: "Construction",
      photography: "Photography", wedding: "Weddings",
    };
    
    for (const [key, value] of Object.entries(types)) {
      if (text.includes(key)) return value;
    }
    return null;
  };

  const createProject = async (name: string, prompt: string) => {
    if (!user) return null;
    const coolName = generateProjectName(prompt);
    const { data } = await supabase.from("projects").insert({ user_id: user.id, name: coolName, preview_prompt: prompt }).select().single();
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

  const openProject = (project: Project) => { 
    // Clear previous state before loading new project
    setMessages([]); 
    setStreamingContent(""); 
    setStreamingCode(""); 
    setCodeHistory([]); 
    setHistoryIndex(-1);
    setPreviewErrors([]);
    setCodeIssues([]);
    clearBuilderState();
    
    // Load the selected project
    setCurrentProject(project); 
    setCurrentCode(project.code || ""); 
    setUserPrompt(project.preview_prompt || ""); 
    setStage("builder"); 
    setIsFirstBuild(!project.code); 
  };

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

  // Generate smart quick actions based on current code and project context
  const generateQuickActions = (code: string, projectType: string): string[] => {
    const actions: string[] = [];
    const lower = code.toLowerCase();
    
    // Check if build appears broken/empty - offer rebuild first
    const bodyContent = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const textContent = bodyContent ? bodyContent[1].replace(/<[^>]*>/g, '').trim().length : 0;
    
    if (textContent < 200) {
      // Site appears mostly empty - prioritize rebuild
      actions.push("🔄 Rebuild from scratch");
      actions.push("🔧 Fix missing content");
      actions.push("📝 Add hero section");
      return actions; // Return early with rebuild options
    }
    
    // ALWAYS show "Make Production Ready" as first action (most important)
    actions.push("🚀 Make Production Ready");
    
    // Analyze what's in the code and suggest relevant improvements
    if (lower.includes("hero")) {
      if (!lower.includes("video") && !lower.includes("animation")) actions.push("Add hero animation");
      if (!lower.includes("gradient")) actions.push("Add gradient background");
    }
    
    // Color suggestions
    if (lower.includes("#a855f7") || lower.includes("purple")) actions.push("Try blue color scheme");
    else if (lower.includes("#3b82f6") || lower.includes("blue")) actions.push("Try purple color scheme");
    else actions.push("Make colors bolder");
    
    // Typography
    if (!lower.includes("clamp(")) actions.push("Make headings larger");
    
    // CTA improvements
    if (lower.includes("button") || lower.includes("cta")) {
      actions.push("Make CTA more prominent");
    }
    
    // Section-based suggestions
    if (!lower.includes("testimonial") && !lower.includes("review")) actions.push("Add testimonials section");
    if (!lower.includes("faq")) actions.push("Add FAQ section");
    if (!lower.includes("footer") || lower.split("footer").length < 3) actions.push("Enhance footer");
    
    // Style suggestions
    if (!lower.includes("shadow")) actions.push("Add subtle shadows");
    if (!lower.includes("hover")) actions.push("Add hover effects");
    if (lower.includes("background: #fff") || lower.includes("background: white")) actions.push("Try dark theme");
    else if (lower.includes("#0a0a0a") || lower.includes("#111")) actions.push("Try light theme");
    
    // Project-type specific suggestions
    if (projectType.includes("restaurant")) {
      if (!lower.includes("reservation")) actions.push("Add reservation form");
      if (!lower.includes("menu")) actions.push("Enhance menu section");
      if (!lower.includes("gallery")) actions.push("Add photo gallery");
    } else if (projectType.includes("service") || projectType.includes("plumb") || projectType.includes("electric")) {
      if (!lower.includes("phone") && !lower.includes("call")) actions.push("Make phone number bigger");
      if (!lower.includes("badge") && !lower.includes("trust")) actions.push("Add trust badges");
      if (!lower.includes("service area")) actions.push("Add service areas map");
    } else if (projectType.includes("fitness") || projectType.includes("gym")) {
      if (!lower.includes("schedule") && !lower.includes("class")) actions.push("Add class schedule");
      if (!lower.includes("trainer")) actions.push("Add trainer profiles");
      if (!lower.includes("pricing") && !lower.includes("membership")) actions.push("Add pricing table");
    } else if (projectType.includes("saas") || projectType.includes("software")) {
      if (!lower.includes("pricing")) actions.push("Add pricing section");
      if (!lower.includes("feature")) actions.push("Highlight key features");
      if (!lower.includes("demo") && !lower.includes("screenshot")) actions.push("Add product screenshots");
    } else if (projectType.includes("agency")) {
      if (!lower.includes("case stud") && !lower.includes("portfolio")) actions.push("Add case studies");
      if (!lower.includes("client") && !lower.includes("logo")) actions.push("Add client logos");
      if (!lower.includes("team")) actions.push("Add team section");
    }
    
    // Always useful
    actions.push("Improve mobile layout");
    actions.push("Add more whitespace");
    
    // Return top 5 most relevant (shuffle slightly for variety)
    return actions.slice(0, 6);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: { name: string; type: string; url: string; base64?: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      
      // Convert to base64 for images
      if (file.type.startsWith("image/")) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newFiles.push({ name: file.name, type: file.type, url, base64 });
      } else {
        newFiles.push({ name: file.name, type: file.type, url });
      }
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ========== UNDO/REDO FUNCTIONS ==========
  const addToHistory = (code: string) => {
    if (!code || code === codeHistory[historyIndex]) return;
    
    // Remove any future history if we're not at the end
    const newHistory = codeHistory.slice(0, historyIndex + 1);
    newHistory.push(code);
    
    // Keep only last 20 versions to save memory
    if (newHistory.length > 20) {
      newHistory.shift();
      setCodeHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setCodeHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentCode(codeHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < codeHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentCode(codeHistory[newIndex]);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < codeHistory.length - 1;

  // ========== COLOR EXTRACTION & APPLICATION ==========
  const extractColorsFromCode = (code: string) => {
    const colors = {
      primary: "#A855F7",
      secondary: "#6366f1", 
      accent: "#22c55e",
      background: "#ffffff",
      text: "#111111"
    };
    
    // Extract hex colors from the code
    const hexMatches = code.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) || [];
    const colorCounts: Record<string, number> = {};
    
    hexMatches.forEach(color => {
      const normalized = color.toLowerCase();
      colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);
    
    // Categorize colors by luminance
    const getLuminance = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    
    const isGrayscale = (hex: string) => {
      if (hex.length === 4) return true;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
    };
    
    // Find primary color (most common non-grayscale color)
    const colorfulColors = sortedColors.filter(c => c.length === 7 && !isGrayscale(c));
    if (colorfulColors.length > 0) colors.primary = colorfulColors[0];
    if (colorfulColors.length > 1) colors.secondary = colorfulColors[1];
    if (colorfulColors.length > 2) colors.accent = colorfulColors[2];
    
    // Find background (lightest common color)
    const lightColors = sortedColors.filter(c => c.length === 7 && getLuminance(c) > 0.8);
    if (lightColors.length > 0) colors.background = lightColors[0];
    
    // Find text color (darkest common color)
    const darkColors = sortedColors.filter(c => c.length === 7 && getLuminance(c) < 0.2);
    if (darkColors.length > 0) colors.text = darkColors[0];
    
    return colors;
  };

  const applyColorScheme = (colorKey: string, newColor: string) => {
    if (!currentCode) return;
    
    const oldColor = extractedColors[colorKey as keyof typeof extractedColors];
    if (!oldColor || oldColor === newColor) return;
    
    // Replace all instances of the old color with the new color (case insensitive)
    const regex = new RegExp(oldColor.replace('#', '#'), 'gi');
    const newCode = currentCode.replace(regex, newColor);
    
    addToHistory(currentCode);
    setCurrentCode(newCode);
    setExtractedColors(prev => ({ ...prev, [colorKey]: newColor }));
    setQuickActions(generateQuickActions(newCode, userPrompt));
  };

  const applyPresetScheme = (scheme: { name: string; primary: string; secondary: string; accent: string }) => {
    if (!currentCode) return;
    
    let newCode = currentCode;
    
    // 1. Replace Tailwind config primary color definition
    newCode = newCode.replace(/"primary":\s*"#[a-fA-F0-9]{6}"/g, `"primary": "${scheme.primary}"`);
    newCode = newCode.replace(/'primary':\s*'#[a-fA-F0-9]{6}'/g, `'primary': '${scheme.primary}'`);
    
    // 2. Replace ALL saturated hex colors with the new primary
    newCode = newCode.replace(/#[a-fA-F0-9]{6}/g, (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const lightness = (max + min) / 2 / 255;
      
      // Skip very dark (near black) or very light (near white) colors
      if (lightness < 0.15 || lightness > 0.85) return hex;
      
      // If saturated (colorful), replace with primary
      if (saturation > 0.25) {
        return scheme.primary;
      }
      return hex;
    });
    
    // 3. Replace Tailwind color classes (bg-green-500 -> bg-blue-500)
    const tailwindColors = ["purple", "blue", "green", "red", "orange", "pink", "indigo", "teal", "cyan", "amber", "emerald", "violet", "rose", "fuchsia", "lime", "sky"];
    const targetTailwind = scheme.name.toLowerCase();
    
    for (const twColor of tailwindColors) {
      const regex = new RegExp(`(bg|text|border|from|to|via|ring|outline)-${twColor}-(\\d{2,3})`, "g");
      newCode = newCode.replace(regex, `$1-${targetTailwind}-$2`);
    }
    
    // 4. Replace accent-emerald or similar custom accent colors
    newCode = newCode.replace(/"accent-\w+":\s*"#[a-fA-F0-9]{6}"/g, `"accent-${targetTailwind}": "${scheme.secondary}"`);
    
    addToHistory(currentCode);
    setCurrentCode(newCode);
    setExtractedColors(prev => ({ ...prev, primary: scheme.primary, secondary: scheme.secondary, accent: scheme.accent }));
    setShowColorPicker(false);
    setQuickActions(generateQuickActions(newCode, userPrompt));
    
    // Show confirmation message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant", 
      content: `⚡ Color scheme changed to ${scheme.name} instantly!`
    }]);
  };

  // Color scheme presets
  const colorPresets = [
    { name: "Purple", primary: "#A855F7", secondary: "#7C3AED", accent: "#22c55e" },
    { name: "Blue", primary: "#3B82F6", secondary: "#1D4ED8", accent: "#F59E0B" },
    { name: "Green", primary: "#10B981", secondary: "#059669", accent: "#8B5CF6" },
    { name: "Red", primary: "#EF4444", secondary: "#DC2626", accent: "#3B82F6" },
    { name: "Orange", primary: "#F97316", secondary: "#EA580C", accent: "#06B6D4" },
    { name: "Teal", primary: "#14B8A6", secondary: "#0D9488", accent: "#F43F5E" },
    { name: "Pink", primary: "#EC4899", secondary: "#DB2777", accent: "#6366F1" },
    { name: "Indigo", primary: "#6366F1", secondary: "#4F46E5", accent: "#10B981" },
  ];

  // Update extracted colors when code changes
  useEffect(() => {
    if (currentCode) {
      const colors = extractColorsFromCode(currentCode);
      setExtractedColors(colors);
    }
  }, [currentCode]);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    setUserPrompt(input);
    setAcknowledgment(generateAcknowledgment(input));
    setTemplateCategory(getTemplateCategory(input));
    setCurrentQuestionIndex(0);
    setAnswers({});
    setSelectedOptions([]);
    setOtherText("");
    
    // Show loading state while generating questions
    setStage("questions");
    setQuestions([]); // Clear questions to show loading
    setBuildStatus("Analyzing your request...");
    
    try {
      // Call API to generate smart, context-aware questions
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [{ role: "user", content: input }], 
          mode: "smart_questions",
          // Include info about any uploaded files
          hasUploadedFiles: uploadedFiles.length > 0,
          uploadedFileNames: uploadedFiles.map(f => f.name)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
          setBuildStatus("");
          return;
        }
      }
      
      // Fallback to default questions if AI fails
      console.warn("AI question generation failed, using fallback");
      setQuestions(getQuestionsForPrompt());
      setBuildStatus("");
      
    } catch (err) {
      console.error("Error generating questions:", err);
      setQuestions(getQuestionsForPrompt());
      setBuildStatus("");
    }
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
    
    // Parse enhancement selections into features object
    const enhancementAnswers = finalAnswers["enhancements"] || [];
    const selectedFeatures = {
      aos: enhancementAnswers.some((a: string) => a.includes("Scroll Animations")) || features.aos,
      darkMode: enhancementAnswers.some((a: string) => a.includes("Dark/Light Mode")),
      typedJs: enhancementAnswers.some((a: string) => a.includes("Typewriter")),
      confetti: enhancementAnswers.some((a: string) => a.includes("Confetti")) || features.confetti,
      lottie: enhancementAnswers.some((a: string) => a.includes("Lottie")),
      leafletMap: enhancementAnswers.some((a: string) => a.includes("Map")),
      web3forms: features.web3forms,
      tawkTo: enhancementAnswers.some((a: string) => a.includes("Live Chat")),
      pwa: features.pwa,
      aiImages: enhancementAnswers.some((a: string) => a.includes("AI-Generated")),
    };
    setFeatures(selectedFeatures);
    
    const project = await createProject(userPrompt, buildPrompt);
    if (!project) return;
    
    // CRITICAL: Clear old project state before starting new build
    clearBuilderState();
    setCurrentCode(""); // Clear old code immediately
    setStreamingCode("");
    setCodeHistory([]);
    setHistoryIndex(-1);
    setPreviewErrors([]);
    setCodeIssues([]);
    
    setStage("builder");
    setViewMode("code");
    setError(null);
    
    // Show user message
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: buildPrompt };
    setMessages([userMessage]);
    
    // Step 1: Get AI acknowledgment (conversational response)
    try {
      const ackResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }], mode: "acknowledge" })
      });
      
      if (ackResponse.ok) {
        const ackData = await ackResponse.json();
        const ackMessage: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: ackData.content };
        setMessages(prev => [...prev, ackMessage]);
        
        // Brief pause to let user read acknowledgment
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.warn("Acknowledgment failed, continuing with build:", err);
    }
    
    // Step 2: Start building
    setIsLoading(true);
    setStreamingContent("");
    setBuildStatus("Building...");
    
    // Log build start
    const buildStartTime = Date.now();
    logger.buildStart(buildPrompt, project.id);
    
    // Store partial code for recovery
    let lastValidCode = "";
    let lastStreamedContent = "";
    
    const retryBuild = async () => {
      setError(null);
      setIsLoading(true);
      setBuildStatus("Retrying...");
      lastValidCode = "";
      lastStreamedContent = "";
      try {
        const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }], templateCategory, premiumMode, features: selectedFeatures }) });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
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
                    lastStreamedContent = fullContent;
                    setStreamingContent(fullContent); 
                    const partialCode = extractStreamingCode(fullContent); 
                    if (partialCode) { 
                      lastValidCode = partialCode;
                      setStreamingCode(partialCode); 
                      setBuildStatus(getBuildStatus(partialCode)); 
                    } 
                    const code = extractCode(fullContent); 
                    if (code) {
                      lastValidCode = code;
                      setCurrentCode(code);
                    }
                  } 
                } catch (parseErr) {
                  console.warn("Stream parse error:", parseErr);
                }
              }
            }
          }
        }
        const code = extractCode(fullContent);
        const finalCode = code || (lastValidCode.length > 500 ? lastValidCode : null);
        if (!finalCode && fullContent.length < 100) {
          throw new Error("Failed to generate website code. Please try again.");
        }
        
        // Get AI summary
        let summaryText = "✅ Your website is ready!";
        try {
          const sumResponse = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }], mode: "summary", currentCode: finalCode })
          });
          if (sumResponse.ok) {
            const sumData = await sumResponse.json();
            summaryText = sumData.content;
          }
        } catch { /* use default summary */ }
        
        setMessages(prev => {
          const filtered = prev.filter(m => m.role !== "assistant" || m.code);
          return [...filtered, { id: (Date.now() + 1).toString(), role: "assistant", content: summaryText, code: finalCode || undefined }];
        });
        setStreamingContent("");
        setStreamingCode("");
        if (finalCode) { setCurrentCode(finalCode); addToHistory(finalCode); setIsFirstBuild(false); setQuickActions(generateQuickActions(finalCode, userPrompt)); }
      } catch (err) {
        console.error("Build error:", err);
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        if (lastValidCode.length > 500) {
          setCurrentCode(lastValidCode);
          setMessages(prev => [...prev.filter(m => m.role !== "assistant" || m.code), 
            { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMessage}\n\nPartial code was recovered and is shown in preview.`, code: lastValidCode }
          ]);
        } else {
          setMessages(prev => [...prev.filter(m => m.role !== "assistant" || m.code), 
            { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMessage}` }
          ]);
        }
        setError({ message: errorMessage, retryFn: retryBuild });
      } finally { setIsLoading(false); setBuildStatus(""); }
    };

    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }], templateCategory, premiumMode, features: selectedFeatures }) });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
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
                  lastStreamedContent = fullContent;
                  setStreamingContent(fullContent); 
                  const partialCode = extractStreamingCode(fullContent); 
                  if (partialCode) { 
                    lastValidCode = partialCode;
                    setStreamingCode(partialCode); 
                    setBuildStatus(getBuildStatus(partialCode)); 
                  } 
                  const code = extractCode(fullContent); 
                  if (code) {
                    lastValidCode = code;
                    setCurrentCode(code);
                  }
                } 
              } catch (parseErr) {
                console.warn("Stream parse error:", parseErr);
                logger.streamError("JSON parse error in stream", fullContent.length, fullContent.slice(-200));
              }
            }
          }
        }
      }
      const code = extractCode(fullContent);
      const finalCode = code || (lastValidCode.length > 500 ? lastValidCode : null);
      if (!finalCode && fullContent.length < 100) {
        logger.codeExtractionFailed(fullContent.length, fullContent.slice(0, 500));
        throw new Error("Failed to generate website code. Please try again.");
      }
      if (!code && lastValidCode.length > 500) {
        logger.codeExtractionFailed(fullContent.length, fullContent.slice(-500));
        logger.recoverySuccess("partial_code", lastValidCode.length);
      }
      
      // Step 3: Get AI summary after successful build
      let summaryText = "✅ Your website is ready! Check out the preview and let me know if you'd like any changes.";
      try {
        const sumResponse = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt }], mode: "summary", currentCode: finalCode })
        });
        if (sumResponse.ok) {
          const sumData = await sumResponse.json();
          summaryText = sumData.content;
        }
      } catch (sumErr) {
        console.warn("Summary generation failed:", sumErr);
      }
      
      setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), role: "assistant", content: summaryText, code: finalCode || undefined }]);
      setStreamingContent("");
      setStreamingCode("");
      if (finalCode) { 
        setCurrentCode(finalCode); 
        addToHistory(finalCode); 
        setIsFirstBuild(false); 
        setQuickActions(generateQuickActions(finalCode, userPrompt));
        logger.buildSuccess(buildPrompt, finalCode.length, Date.now() - buildStartTime, project?.id);
      }
    } catch (err) {
      console.error("Build error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      logger.buildError(
        buildPrompt, 
        err instanceof Error ? err : errorMessage, 
        lastStreamedContent.length, 
        lastValidCode.slice(-500) || lastStreamedContent.slice(-500),
        Date.now() - buildStartTime,
        project?.id
      );
      if (lastValidCode.length > 500) {
        setCurrentCode(lastValidCode);
        logger.recoverySuccess("partial_code_on_error", lastValidCode.length);
        setMessages(prev => [...prev, 
          { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMessage}\n\nPartial code was recovered and is shown in preview.`, code: lastValidCode }
        ]);
      } else {
        setMessages(prev => [...prev, 
          { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMessage}` }
        ]);
      }
      setError({ message: errorMessage, retryFn: retryBuild });
    }
    finally { setIsLoading(false); setBuildStatus(""); }
  };
  
  // These functions are no longer needed - using API instead
  // const generateBuildConfirmation = ...
  // const generateBuildSummary = ...

  // ========== INSTANT EDITS (NO AI) ==========
  // Handle simple edits like color changes instantly without calling AI
  const tryInstantEdit = (userInput: string, code: string): string | null => {
    const lower = userInput.toLowerCase();
    
    // ========== INSTANT FONT CHANGE ==========
    const fontMap: Record<string, { name: string; link: string }> = {
      "playfair": { name: "Playfair Display", link: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" },
      "montserrat": { name: "Montserrat", link: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" },
      "poppins": { name: "Poppins", link: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" },
      "roboto": { name: "Roboto", link: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" },
      "inter": { name: "Inter", link: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" },
      "oswald": { name: "Oswald", link: "https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap" },
      "bebas": { name: "Bebas Neue", link: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
      "raleway": { name: "Raleway", link: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap" },
      "open sans": { name: "Open Sans", link: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap" },
      "lato": { name: "Lato", link: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap" },
      "nunito": { name: "Nunito", link: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap" },
      "quicksand": { name: "Quicksand", link: "https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" },
      "space grotesk": { name: "Space Grotesk", link: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" },
      "dm sans": { name: "DM Sans", link: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" },
      "cormorant": { name: "Cormorant Garamond", link: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap" },
    };
    
    // Check if this is a font change request
    const isFontRequest = /(font|typeface|typography)/i.test(lower) || 
                          /(change|use|switch|try).*font/i.test(lower);
    
    if (isFontRequest) {
      let targetFont: { name: string; link: string } | null = null;
      for (const [key, font] of Object.entries(fontMap)) {
        if (lower.includes(key)) {
          targetFont = font;
          break;
        }
      }
      
      if (targetFont) {
        let newCode = code;
        
        // Replace or add Google Fonts link
        const fontLinkRegex = /<link[^>]*fonts\.googleapis\.com[^>]*>/gi;
        if (fontLinkRegex.test(newCode)) {
          newCode = newCode.replace(fontLinkRegex, `<link href="${targetFont.link}" rel="stylesheet">`);
        } else {
          // Add before </head>
          newCode = newCode.replace('</head>', `<link href="${targetFont.link}" rel="stylesheet">\n</head>`);
        }
        
        // Update font-family in styles
        newCode = newCode.replace(/font-family:\s*['"][^'"]+['"]/gi, `font-family: '${targetFont.name}', sans-serif`);
        newCode = newCode.replace(/fontFamily:\s*['"][^'"]+['"]/gi, `fontFamily: '${targetFont.name}', sans-serif`);
        
        if (newCode !== code) return newCode;
      }
    }
    
    // ========== INSTANT COLOR CHANGE ==========
    // Common color mappings with Tailwind equivalents
    const colorMap: Record<string, { hex: string; tailwind: string }> = {
      "blue": { hex: "#3b82f6", tailwind: "blue" },
      "red": { hex: "#ef4444", tailwind: "red" },
      "green": { hex: "#22c55e", tailwind: "green" },
      "purple": { hex: "#a855f7", tailwind: "purple" },
      "orange": { hex: "#f97316", tailwind: "orange" },
      "yellow": { hex: "#eab308", tailwind: "yellow" },
      "pink": { hex: "#ec4899", tailwind: "pink" },
      "teal": { hex: "#14b8a6", tailwind: "teal" },
      "cyan": { hex: "#06b6d4", tailwind: "cyan" },
      "indigo": { hex: "#6366f1", tailwind: "indigo" },
      "gray": { hex: "#6b7280", tailwind: "gray" },
      "grey": { hex: "#6b7280", tailwind: "gray" },
      "gold": { hex: "#ca8a04", tailwind: "amber" },
      "amber": { hex: "#f59e0b", tailwind: "amber" },
      "emerald": { hex: "#10b981", tailwind: "emerald" },
      "lime": { hex: "#84cc16", tailwind: "lime" },
      "rose": { hex: "#f43f5e", tailwind: "rose" },
      "violet": { hex: "#8b5cf6", tailwind: "violet" },
      "sky": { hex: "#0ea5e9", tailwind: "sky" },
      "slate": { hex: "#64748b", tailwind: "slate" },
    };
    
    // AGGRESSIVE: Find ANY color name in the input
    let targetColor: string | null = null;
    for (const color of Object.keys(colorMap)) {
      if (lower.includes(color)) {
        targetColor = color;
        break;
      }
    }
    
    // If no color found, can't do instant edit
    if (!targetColor) return null;
    
    // Check if this seems like a color change (not "add orange button")
    const structuralWords = ["add", "remove", "delete", "insert", "create", "new", "button", "section", "image", "logo", "text", "heading", "footer", "header", "nav"];
    const hasStructural = structuralWords.some(word => lower.includes(word));
    
    // If structural word found, only proceed if also has "color" word
    if (hasStructural && !/(colou?r|theme|scheme|shade|tone)/i.test(lower)) {
      return null;
    }
    
    const colorInfo = colorMap[targetColor];
    let newCode = code;
    
    // 1. Replace Tailwind config primary color definition
    newCode = newCode.replace(/"primary":\s*"#[a-fA-F0-9]{6}"/g, `"primary": "${colorInfo.hex}"`);
    newCode = newCode.replace(/'primary':\s*'#[a-fA-F0-9]{6}'/g, `'primary': '${colorInfo.hex}'`);
    
    // 2. Replace hex colors that look like accents (saturated colors)
    newCode = newCode.replace(/#[a-fA-F0-9]{6}/g, (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const lightness = (max + min) / 2 / 255;
      
      // Skip very dark (near black) or very light (near white) colors
      if (lightness < 0.15 || lightness > 0.85) return hex;
      
      // If saturated (colorful), replace it
      if (saturation > 0.25) {
        return colorInfo.hex;
      }
      return hex;
    });
    
    // 3. Replace Tailwind color classes
    const tailwindColors = ["purple", "blue", "green", "red", "orange", "pink", "indigo", "teal", "cyan", "amber", "emerald", "violet", "rose", "fuchsia", "lime", "sky"];
    
    for (const twColor of tailwindColors) {
      const regex = new RegExp(`(bg|text|border|from|to|via|ring|outline)-${twColor}-(\\d{2,3})`, "g");
      newCode = newCode.replace(regex, `$1-${colorInfo.tailwind}-$2`);
    }
    
    // Check if we actually changed anything
    if (newCode === code) return null;
    
    return newCode;
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setError(null);
    
    // Build message content with uploaded files
    let messageContent = input.trim();
    if (uploadedFiles.length > 0) {
      const fileDescriptions = uploadedFiles.map(f => `[Uploaded: ${f.name}]`).join(" ");
      messageContent = `${messageContent}\n\n${fileDescriptions}`;
    }
    
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: messageContent };
    const userInput = input.trim();
    
    // TRY INSTANT EDIT FIRST (no AI needed for simple color changes)
    if (currentCode && !isFirstBuild && chatMode === "build") {
      const instantResult = tryInstantEdit(userInput, currentCode);
      if (instantResult) {
        // Success! Update instantly without AI
        setMessages(prev => [...prev, userMessage, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Done! ⚡ Updated instantly.",
          code: instantResult
        }]);
        setCurrentCode(instantResult);
        addToHistory(instantResult);
        setQuickActions(generateQuickActions(instantResult, userPrompt));
        setInput("");
        return; // Skip AI call entirely
      }
    }
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setUploadedFiles([]); // Clear uploaded files after sending
    setIsLoading(true);
    setStreamingContent("");
    setStreamingCode("");
    
    // Different behavior for Plan vs Build mode
    const isPlanMode = chatMode === "plan";
    
    // For BUILD mode edits (not plan mode, not first build), get acknowledgment first
    if (!isPlanMode && !isFirstBuild && currentCode) {
      setBuildStatus("Understanding your request...");
      
      // Step 1: Get AI acknowledgment of what it will do
      try {
        const ackResponse = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            messages: [{ role: "user", content: userInput }], 
            mode: "acknowledge_edit",
            currentCode: currentCode.slice(0, 2000) // Send snippet for context
          })
        });
        
        if (ackResponse.ok) {
          const ackData = await ackResponse.json();
          // Add acknowledgment message
          const ackMessage: Message = { 
            id: (Date.now() + 1).toString(), 
            role: "assistant", 
            content: ackData.content 
          };
          setMessages(prev => [...prev, ackMessage]);
          
          // Brief pause to let user see acknowledgment
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (err) {
        console.warn("Acknowledgment failed, continuing with edit:", err);
      }
      
      setBuildStatus("Implementing changes...");
    } else {
      setBuildStatus(isPlanMode ? "Thinking..." : "Building...");
    }

    const retryChat = async () => {
      setError(null);
      setIsLoading(true);
      setBuildStatus(isPlanMode ? "Retrying..." : "Retrying...");
      try {
        let systemContext = "";
        if (isPlanMode) {
          systemContext = currentCode ? `\n\nCurrent website code for reference:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nThe user wants to DISCUSS ideas, NOT implement yet. Give thoughtful suggestions, ask clarifying questions, and help them plan. Do NOT output code unless specifically asked.` : "\n\nThe user wants to discuss and plan ideas. Give thoughtful suggestions, ask clarifying questions, and help them brainstorm. Do NOT output code unless specifically asked.";
        }
        
        // For edits, only send latest message (not full history)
        const lastUserMessage = messages.filter(m => m.role === "user").pop();
        const messagesToSend = !isPlanMode && !isFirstBuild && lastUserMessage
          ? [lastUserMessage]
          : [...messages];
        
        // For build mode, send currentCode separately (not in message)
        const response = await fetch("/api/generate", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            messages: messagesToSend.map(m => ({ 
              role: m.role, 
              content: isPlanMode && m.role === "user" && m.content === userInput ? m.content + systemContext : m.content 
            })), 
            isFollowUp: !isFirstBuild, 
            isPlanMode, 
            premiumMode,
            currentCode: !isPlanMode && !isFirstBuild ? currentCode : undefined
          }) 
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
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
                try { const parsed = JSON.parse(line.slice(6)); if (parsed.content) { fullContent += parsed.content; setStreamingContent(fullContent); if (!isPlanMode) { const partialCode = extractStreamingCode(fullContent); if (partialCode) { setStreamingCode(partialCode); setBuildStatus(getBuildStatus(partialCode)); } const code = extractCode(fullContent); if (code) setCurrentCode(code); } } } catch {}
              }
            }
          }
        }
        const code = isPlanMode ? null : extractCode(fullContent);
        setMessages(prev => {
          const filtered = prev.filter(m => !(m.role === "assistant" && m.content.startsWith("⚠️")));
          return [...filtered, { id: (Date.now() + 1).toString(), role: "assistant", content: fullContent, code: code || undefined }];
        });
        setStreamingContent("");
        setStreamingCode("");
        if (code) { setCurrentCode(code); addToHistory(code); setIsFirstBuild(false); setQuickActions(generateQuickActions(code, userPrompt)); }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        setError({ message: errorMessage, retryFn: retryChat });
      } finally { setIsLoading(false); setBuildStatus(""); }
    };

    try {
      let systemContext = "";
      
      // For plan mode, add context for discussion
      if (isPlanMode) {
        systemContext = currentCode ? `\n\nCurrent website code for reference:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nThe user wants to DISCUSS ideas, NOT implement yet. Give thoughtful suggestions, ask clarifying questions, and help them plan. Do NOT output code unless specifically asked.` : "\n\nThe user wants to discuss and plan ideas. Give thoughtful suggestions, ask clarifying questions, and help them brainstorm. Do NOT output code unless specifically asked.";
      }
      // For build mode, DON'T add context here - let the API handle it based on request type
      // This prevents sending 28K of code for a simple "change color" request
      
      // Update build context with user request
      updateBuildContext(currentCode || "", userInput);
      
      // For simple edits, only send the current message (not full history)
      // This reduces token count significantly
      const messagesToSend = !isPlanMode && !isFirstBuild 
        ? [userMessage] // Just the edit request
        : [...messages, userMessage]; // Full history for new builds
      
      // Send currentCode separately so API can decide how to use it
      const response = await fetch("/api/generate", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          messages: messagesToSend.map(m => ({ 
            role: m.role, 
            content: isPlanMode && m.role === "user" && m.id === userMessage.id ? m.content + systemContext : m.content 
          })), 
          isFollowUp: !isFirstBuild, 
          isPlanMode, 
          premiumMode,
          currentCode: !isPlanMode && !isFirstBuild ? currentCode : undefined // Send code separately for edits
        }) 
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
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
              try { const parsed = JSON.parse(line.slice(6)); if (parsed.content) { fullContent += parsed.content; setStreamingContent(fullContent); if (!isPlanMode) { const partialCode = extractStreamingCode(fullContent); if (partialCode) { setStreamingCode(partialCode); setBuildStatus(getBuildStatus(partialCode)); } const code = extractCode(fullContent); if (code) setCurrentCode(code); } } } catch {}
            }
          }
        }
      }
      const code = isPlanMode ? null : extractCode(fullContent);
      
      // Generate completion message for edits
      let finalContent = fullContent;
      if (code && !isPlanMode && !isFirstBuild) {
        // For edits, add a brief completion note
        const completionNote = "\n\n✅ Changes applied! Let me know if you'd like any adjustments.";
        if (!fullContent.includes("✅") && !fullContent.includes("Done")) {
          finalContent = fullContent + completionNote;
        }
      }
      
      setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), role: "assistant", content: finalContent, code: code || undefined }]);
      setStreamingContent("");
      setStreamingCode("");
      if (code) { setCurrentCode(code); addToHistory(code); setIsFirstBuild(false); setQuickActions(generateQuickActions(code, userPrompt)); }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError({ message: errorMessage, retryFn: retryChat });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `⚠️ ${errorMessage}` }]);
    }
    finally { setIsLoading(false); setBuildStatus(""); }
  };

  // Handle quick action click
  const handleQuickAction = (action: string) => {
    // Check if this is the "Make Production Ready" action
    if (action.includes("Production Ready")) {
      // Set a special message and trigger production mode
      setInput("Make this website production-ready with full functionality");
    } else {
      setInput(action);
    }
    setChatMode("build");
  };

  // Handle implementing a plan from Plan mode
  const handleImplementPlan = async (planText: string) => {
    // Switch to build mode
    setChatMode("build");
    setPendingPlan(null);
    
    // Add user message showing they're implementing the plan
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: "Implement this plan" };
    setMessages(prev => [...prev, userMsg]);
    
    // Directly trigger the edit with the plan context
    setIsLoading(true);
    setBuildStatus("Implementing your plan...");
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Implement the following plan on the current website:\n\n${planText}` }],
          isFollowUp: true,
          isPlanMode: false,
          isProductionMode: false,
          premiumMode,
          currentCode
        })
      });
      
      if (!response.ok) throw new Error("Failed to implement plan");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");
      
      const decoder = new TextDecoder();
      let fullContent = "";
      let codeBuffer = "";
      let inCode = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        
        // Extract code
        if (!inCode && fullContent.includes("```html")) {
          inCode = true;
          codeBuffer = fullContent.split("```html")[1] || "";
        } else if (inCode) {
          codeBuffer += chunk;
        }
        
        if (codeBuffer.includes("```")) {
          const finalCode = codeBuffer.split("```")[0].trim();
          if (finalCode) {
            setStreamingCode(finalCode);
          }
        } else if (codeBuffer) {
          setStreamingCode(codeBuffer);
        }
        
        setStreamingContent(fullContent);
        setBuildStatus("Building changes...");
      }
      
      // Extract final code
      const codeMatch = fullContent.match(/```html\s*([\s\S]*?)\s*```/);
      const finalCode = codeMatch ? codeMatch[1].trim() : null;
      
      if (finalCode) {
        addToHistory(currentCode);
        setCurrentCode(finalCode);
        setQuickActions(generateQuickActions(finalCode, userPrompt));
      }
      
      const textContent = fullContent.replace(/```html[\s\S]*?```/g, "").replace(/```[\s\S]*/g, "").trim();
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: textContent || "Plan implemented!", 
        code: finalCode || undefined 
      }]);
      
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: `⚠️ Failed to implement plan: ${err instanceof Error ? err.message : "Unknown error"}` 
      }]);
    } finally {
      setIsLoading(false);
      setBuildStatus("");
      setStreamingContent("");
      setStreamingCode("");
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
    clearBuilderState();
    setMessages([]); setCurrentCode(""); setStreamingContent(""); setStreamingCode(""); setInput(""); setUserPrompt(""); setCurrentQuestionIndex(0); setAnswers({}); setSelectedOptions([]); setOtherText(""); setQuestions([]); setIsFirstBuild(true); setBuildStatus(""); setCurrentProject(null); setStage("home"); loadProjects();
    // Reset new states
    setCodeHistory([]); setHistoryIndex(-1); setShowColorPicker(false); setDevicePreview("desktop"); setQuickActions([]); setUploadedFiles([]); setChatMode("build"); setError(null);
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
          {/* Buildr Avatar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div style={{ position: "relative" }}>
              <img 
                src="/buildr-avatar.png" 
                alt="Buildr AI" 
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: "50%", 
                  border: "3px solid #A855F7",
                  boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)"
                }} 
              />
              <div style={{
                position: "absolute",
                bottom: 4,
                right: 4,
                width: 20,
                height: 20,
                background: "#22c55e",
                borderRadius: "50%",
                border: "3px solid #0a0a0a"
              }} />
            </div>
          </div>
          
          <div style={styles.badge}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span style={{ color: "#d1d5db", fontSize: 14 }}>Meet Buildr, your AI assistant</span>
            <span style={styles.badgeTag}>Online</span>
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
                        <div style={styles.projectThumbnailWrapper}>
                          <iframe 
                            srcDoc={project.code} 
                            style={styles.projectIframe} 
                            sandbox="allow-same-origin allow-scripts" 
                            title={project.name}
                            loading="lazy"
                          />
                          {/* Overlay to prevent interaction */}
                          <div style={styles.projectOverlay} />
                        </div>
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
    // Show loading state while AI generates questions
    if (questions.length === 0) {
      return (
        <div style={styles.questionsContainer}>
          <button onClick={handleBackToHome} style={styles.backBtn}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
          
          <div style={styles.questionCard}>
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ 
                width: 60, height: 60, borderRadius: "50%", 
                background: "linear-gradient(135deg, #A855F7 0%, #6366f1 100%)", 
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
                animation: "pulse 2s infinite"
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                Analyzing Your Request
              </h2>
              <p style={{ color: "#9ca3af", fontSize: 16, maxWidth: 400, margin: "0 auto" }}>
                Creating personalized questions for your <strong style={{ color: "#A855F7" }}>{userPrompt}</strong> website...
              </p>
              <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7", animation: "bounce 1s infinite" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7", animation: "bounce 1s infinite 0.1s" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A855F7", animation: "bounce 1s infinite 0.2s" }} />
              </div>
            </div>
          </div>
          
          <style>{`
            @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          `}</style>
        </div>
      );
    }
    
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const canProceed = currentQuestion?.options.length === 0 ? otherText.trim().length > 0 : (selectedOptions.length > 0 || otherText.trim().length > 0);
    return (
      <div style={styles.questionsContainer}>
        <button onClick={handleBackToHome} style={styles.backBtn}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        
        {/* AI Acknowledgment Card */}
        {currentQuestionIndex === 0 && acknowledgment && (
          <div style={styles.acknowledgmentCard}>
            <div style={styles.acknowledgmentHeader}>
              <div style={styles.aiAvatar}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <span style={{ fontWeight: 600 }}>Buildr AI</span>
            </div>
            <p style={styles.acknowledgmentText}>{acknowledgment}</p>
          </div>
        )}

        <div style={styles.questionCard}>
          <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} /></div>
          <div style={styles.questionHeader}>
            <span style={styles.questionNum}>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span style={styles.questionTag}>{userPrompt}</span>
          </div>
          <h2 style={styles.questionTitle}>{currentQuestion?.question}</h2>
          {currentQuestion?.allowMultiple && <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>Select all that apply</p>}
          
          {/* Show options grid if there are options, otherwise show text input */}
          {currentQuestion?.options && currentQuestion.options.length > 0 ? (
            <div style={styles.optionsGrid}>
              {currentQuestion.options.map((opt) => (
                <button key={opt} onClick={() => handleOptionSelect(opt)} style={{ ...styles.optionBtn, ...(selectedOptions.includes(opt) ? styles.optionSelected : {}) }}>{opt}</button>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <input type="text" value={otherText} onChange={(e) => setOtherText(e.target.value)} placeholder="Type your answer..." style={{ ...styles.input, fontSize: 18, padding: "16px 20px" }} autoFocus />
            </div>
          )}
          
          {currentQuestion?.hasOther && currentQuestion.options.length > 0 && (
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
  // Mobile Builder Layout
  if (isMobile) {
    return (
      <div style={styles.mobileBuilderContainer}>
        {/* Mobile Header */}
        <div style={styles.mobileHeader}>
          <button onClick={handleBackToHome} style={styles.mobileHomeBtn}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "white" }}>{currentProject?.name || "Buildr"}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{saveStatus === "saving" ? "Saving..." : "Saved"}</div>
          </div>
          {currentCode && <button onClick={handleDownload} style={styles.mobileDownloadBtn}>↓</button>}
        </div>

        {/* Mobile Tab Bar */}
        <div style={styles.mobileTabBar}>
          <button onClick={() => setMobileView("chat")} style={mobileView === "chat" ? styles.mobileTabActive : styles.mobileTabInactive}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Chat
          </button>
          <button onClick={() => setMobileView("preview")} style={mobileView === "preview" ? styles.mobileTabActive : styles.mobileTabInactive}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Preview
            {(currentCode || streamingCode) && <span style={styles.mobileDot} />}
          </button>
        </div>

        {/* Mobile Content */}
        {mobileView === "chat" ? (
          <div style={styles.mobileChatContainer}>
            <div style={styles.mobileChatMessages}>
              {messages.map((msg, msgIndex) => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={msg.role === "user" ? styles.userMsg : (msg.content.startsWith("⚠️") ? styles.errorMsg : styles.assistantMsg)}>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{renderMessageContent(msg.content)}</p>
                    {msg.code && <div style={styles.codeIndicator}>✓ Ready — tap Preview to see it</div>}
                    {/* Show Implement Plan button for plan mode responses */}
                    {msg.role === "assistant" && !msg.code && !msg.content.startsWith("⚠️") && !msg.content.startsWith("⚡") && msgIndex === messages.length - 1 && !isLoading && chatMode === "plan" && (
                      <button 
                        onClick={() => handleImplementPlan(msg.content)} 
                        style={styles.implementPlanBtn}
                      >
                        🚀 Implement This Plan
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                  <div style={styles.buildingMsg}>
                    <div style={styles.buildingIcon}><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg></div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{isFirstBuild ? "Building your website" : "Implementing changes"}</div>
                      <div style={{ fontSize: 13, color: "#A855F7" }}>{buildStatus}</div>
                    </div>
                  </div>
                </div>
              )}
              {error && !isLoading && (
                <div style={styles.errorBanner}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Something went wrong</div>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>{error.message}</div>
                      {error.retryFn && <button onClick={error.retryFn} style={styles.retryBtn}>Try Again</button>}
                    </div>
                    <button onClick={() => setError(null)} style={styles.dismissBtn}>✕</button>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Mobile Quick Actions */}
            {quickActions.length > 0 && !isLoading && currentCode && (
              <div style={styles.mobileQuickActions}>
                {quickActions.slice(0, 4).map((action, i) => (
                  <button key={i} onClick={() => handleQuickAction(action)} style={styles.mobileQuickActionBtn}>
                    {action}
                  </button>
                ))}
              </div>
            )}
            
            {/* Mobile File Upload Preview */}
            {uploadedFiles.length > 0 && (
              <div style={styles.mobileUploadedFiles}>
                {uploadedFiles.map((file, i) => (
                  <div key={i} style={styles.uploadedFileChip}>
                    {file.type.startsWith("image/") ? (
                      <img src={file.url} alt={file.name} style={{ width: 16, height: 16, borderRadius: 3, objectFit: "cover" }} />
                    ) : (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    <span style={{ fontSize: 11, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <button onClick={() => removeUploadedFile(i)} style={styles.removeFileBtn}>×</button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={styles.mobileInputArea}>
              {/* Mobile Mode Toggle */}
              <div style={styles.mobileModeToggle}>
                <button onClick={() => setChatMode("plan")} style={chatMode === "plan" ? styles.mobileModeActive : styles.mobileModeInactive}>💬 Plan</button>
                <button onClick={() => setChatMode("build")} style={chatMode === "build" ? styles.mobileModeActive : styles.mobileModeInactive}>⚡ Build</button>
              </div>
              <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.mobileUploadBtn}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={chatMode === "plan" ? "Discuss ideas..." : "Ask for changes..."} disabled={isLoading} style={styles.mobileChatInput} rows={1} />
                <button type="submit" disabled={!input.trim() || isLoading} style={{ ...styles.sendBtn, opacity: (!input.trim() || isLoading) ? 0.5 : 1, background: chatMode === "plan" ? "#6366f1" : "#A855F7" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={styles.mobilePreviewContainer}>
            <div style={styles.mobilePreviewToggle}>
              <button onClick={() => setViewMode("preview")} style={viewMode === "preview" ? styles.miniTabActive : styles.miniTabInactive}>Preview</button>
              <button onClick={() => setViewMode("code")} style={viewMode === "code" ? styles.miniTabActive : styles.miniTabInactive}>Code</button>
            </div>
            {!currentCode && !streamingCode ? (
              <div style={styles.emptyPreview}>
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <p style={{ color: "#9ca3af", marginTop: 16, fontSize: 14 }}>Your preview will appear here</p>
              </div>
            ) : viewMode === "preview" ? (
              <iframe srcDoc={injectErrorTracking(currentCode || streamingCode || "")} style={styles.mobileIframe} sandbox="allow-scripts allow-same-origin" title="Preview" />
            ) : (
              <div style={styles.mobileCodeView}><pre style={styles.codeContent}>{currentCode || streamingCode}</pre></div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop Builder Layout
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
          {messages.map((msg, msgIndex) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={msg.role === "user" ? styles.userMsg : (msg.content.startsWith("⚠️") ? styles.errorMsg : styles.assistantMsg)}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{renderMessageContent(msg.content)}</p>
                {msg.code && <div style={styles.codeIndicator}>✓ Ready — check the preview</div>}
                {/* Show Implement Plan button for plan mode responses (no code, assistant, not error, is last message) */}
                {msg.role === "assistant" && !msg.code && !msg.content.startsWith("⚠️") && !msg.content.startsWith("⚡") && msgIndex === messages.length - 1 && !isLoading && chatMode === "plan" && (
                  <button 
                    onClick={() => handleImplementPlan(msg.content)} 
                    style={styles.implementPlanBtn}
                  >
                    🚀 Implement This Plan
                  </button>
                )}
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
          {error && !isLoading && (
            <div style={styles.errorBanner}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 4 }}>Something went wrong</div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>{error.message}</div>
                  {error.retryFn && <button onClick={error.retryFn} style={styles.retryBtn}>Try Again</button>}
                </div>
                <button onClick={() => setError(null)} style={styles.dismissBtn}>✕</button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Quick Actions */}
        {quickActions.length > 0 && !isLoading && currentCode && (
          <div style={styles.quickActionsContainer}>
            <div style={styles.quickActionsScroll}>
              {quickActions.map((action, i) => (
                <button key={i} onClick={() => handleQuickAction(action)} style={styles.quickActionBtn}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* File Upload Preview */}
        {uploadedFiles.length > 0 && (
          <div style={styles.uploadedFilesBar}>
            {uploadedFiles.map((file, i) => (
              <div key={i} style={styles.uploadedFileChip}>
                {file.type.startsWith("image/") ? (
                  <img src={file.url} alt={file.name} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )}
                <span style={{ fontSize: 12, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                <button onClick={() => removeUploadedFile(i)} style={styles.removeFileBtn}>×</button>
              </div>
            ))}
          </div>
        )}
        
        <div style={styles.inputArea}>
          {/* Mode Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={styles.modeToggleContainer}>
              <button onClick={() => setChatMode("plan")} style={chatMode === "plan" ? styles.modeToggleActive : styles.modeToggleInactive}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Plan
              </button>
              <button onClick={() => setChatMode("build")} style={chatMode === "build" ? styles.modeToggleActive : styles.modeToggleInactive}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Build
              </button>
            </div>
            
            {/* Fast/Premium Toggle */}
            <div style={styles.qualityToggle} title={premiumMode ? "Premium: Higher quality, slower" : "Fast: Quick builds, good quality"}>
              <button onClick={() => setPremiumMode(false)} style={!premiumMode ? styles.qualityBtnActive : styles.qualityBtn}>
                ⚡ Fast
              </button>
              <button onClick={() => setPremiumMode(true)} style={premiumMode ? styles.qualityBtnActive : styles.qualityBtn}>
                🧠 Premium
              </button>
            </div>
          </div>
          
          <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            {/* File Upload Button */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*,.pdf,.txt,.doc,.docx" style={{ display: "none" }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.uploadBtn} title="Upload files">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder={chatMode === "plan" ? "Discuss ideas before building..." : "Ask for changes..."} 
              disabled={isLoading} 
              style={styles.chatInput} 
              rows={1} 
            />
            <button type="submit" disabled={!input.trim() || isLoading} style={{ ...styles.sendBtn, opacity: (!input.trim() || isLoading) ? 0.5 : 1, background: chatMode === "plan" ? "#6366f1" : "#A855F7" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      </div>

      <div onMouseDown={handleMouseDown} style={styles.resizer}><div style={styles.resizerLine} /></div>

      <div style={{ ...styles.previewPanel, width: `${100 - panelWidth}%` }}>
        <div style={styles.previewHeader}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setViewMode("preview")} style={viewMode === "preview" ? styles.tabActive : styles.tabInactive}>👁 Preview</button>
            <button onClick={() => setViewMode("code")} style={viewMode === "code" ? styles.tabActive : styles.tabInactive}>
              &lt;/&gt; Code
              {isLoading && streamingCode && <span style={styles.liveBadge}>LIVE</span>}
            </button>
            
            {/* Code Issues Indicator */}
            {currentCode && codeIssues.length > 0 && (
              <div style={styles.issuesBadge} title={`${codeIssues.filter(i => i.severity === "error").length} errors, ${codeIssues.filter(i => i.severity === "warning").length} warnings detected. The AI is aware and can fix these.`}>
                {codeIssues.filter(i => i.severity === "error").length > 0 ? "🔴" : "🟡"} {codeIssues.length} issue{codeIssues.length !== 1 ? "s" : ""}
              </div>
            )}
            
            {/* CRITICAL: Broken Build Warning */}
            {currentCode && codeIssues.some(i => i.message.includes("appears empty")) && (
              <div style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                animation: "pulse 2s infinite"
              }} onClick={() => setInput("Rebuild from scratch with all sections")}>
                ⚠️ Build incomplete - Click to rebuild
              </div>
            )}
            
            {/* Preview Errors Indicator */}
            {previewErrors.length > 0 && (
              <div style={styles.previewErrorBadge} title={`${previewErrors.length} runtime error(s) detected in preview`}>
                ⚠️ {previewErrors.length}
              </div>
            )}
            
            {/* Device Preview Toggle */}
            {viewMode === "preview" && currentCode && (
              <div style={styles.deviceToggle}>
                <button onClick={() => setDevicePreview("desktop")} style={devicePreview === "desktop" ? styles.deviceBtnActive : styles.deviceBtn} title="Desktop">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => setDevicePreview("tablet")} style={devicePreview === "tablet" ? styles.deviceBtnActive : styles.deviceBtn} title="Tablet">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={() => setDevicePreview("mobile")} style={devicePreview === "mobile" ? styles.deviceBtnActive : styles.deviceBtn} title="Mobile">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </button>
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Page Navigation Dropdown */}
            {currentCode && detectedPages.length > 0 && (
              <div style={{ position: "relative" }}>
                <button 
                  onClick={() => setShowPageDropdown(!showPageDropdown)} 
                  style={styles.pageDropdownBtn}
                  title="Navigate to page/section"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                  <span style={{ marginLeft: 6, fontSize: 12 }}>{currentPage ? detectedPages.find(p => p.id === currentPage)?.name || "Page" : "Pages"}</span>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ marginLeft: 4 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {showPageDropdown && (
                  <div style={styles.pageDropdownMenu}>
                    {detectedPages.map((page, i) => (
                      <button 
                        key={i} 
                        onClick={() => scrollToSection(page.id)}
                        style={{
                          ...styles.pageDropdownItem,
                          background: currentPage === page.id ? "#27272a" : "transparent"
                        }}
                      >
                        {page.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Refresh Preview Button */}
            {currentCode && (
              <button onClick={refreshPreview} style={styles.refreshBtn} title="Refresh Preview">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            )}
            
            {/* Undo/Redo Buttons */}
            {currentCode && (
              <div style={styles.undoRedoContainer}>
                <button onClick={handleUndo} disabled={!canUndo} style={{ ...styles.undoRedoBtn, opacity: canUndo ? 1 : 0.4 }} title="Undo">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <button onClick={handleRedo} disabled={!canRedo} style={{ ...styles.undoRedoBtn, opacity: canRedo ? 1 : 0.4 }} title="Redo">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                </button>
                {codeHistory.length > 1 && <span style={styles.historyBadge}>{historyIndex + 1}/{codeHistory.length}</span>}
              </div>
            )}
            
            {/* Color Palette Button */}
            {currentCode && (
              <button onClick={() => setShowColorPicker(!showColorPicker)} style={showColorPicker ? styles.colorBtnActive : styles.colorBtn} title="Color Palette">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              </button>
            )}
            
            {currentCode && <button onClick={handleDownload} style={styles.downloadBtn}>↓ Download</button>}
          </div>
        </div>
        
        {/* Color Picker Panel */}
        {showColorPicker && currentCode && (
          <div style={styles.colorPickerPanel}>
            <div style={styles.colorPickerHeader}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Color Scheme</span>
              <button onClick={() => setShowColorPicker(false)} style={styles.closeColorPicker}>✕</button>
            </div>
            
            {/* Current Colors */}
            <div style={styles.currentColors}>
              <div style={styles.colorItem}>
                <div style={{ ...styles.colorSwatch, background: extractedColors.primary }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Primary</span>
              </div>
              <div style={styles.colorItem}>
                <div style={{ ...styles.colorSwatch, background: extractedColors.secondary }} />
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Secondary</span>
              </div>
            </div>
            
            {/* Preset Schemes */}
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 8 }}>Quick Schemes</span>
              <div style={styles.presetGrid}>
                {colorPresets.map((preset, i) => (
                  <button key={i} onClick={() => applyPresetScheme(preset)} style={styles.presetBtn} title={preset.name}>
                    <div style={{ display: "flex", gap: 2 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: preset.primary }} />
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: preset.secondary }} />
                    </div>
                    <span style={{ fontSize: 10 }}>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* INSTANT COLOR BAR - Always visible when code exists */}
        {currentCode && !showColorPicker && (
          <div style={styles.instantColorBar}>
            <span style={{ fontSize: 11, color: "#9ca3af", marginRight: 8 }}>⚡ Instant:</span>
            {colorPresets.slice(0, 6).map((preset, i) => (
              <button 
                key={i} 
                onClick={() => applyPresetScheme(preset)} 
                style={styles.instantColorBtn}
                title={`Change to ${preset.name}`}
              >
                <div style={{ width: 16, height: 16, borderRadius: 4, background: preset.primary, border: "2px solid rgba(255,255,255,0.2)" }} />
              </button>
            ))}
          </div>
        )}
        
        <div style={styles.previewContent}>
          {!currentCode && !streamingCode ? (
            <div style={styles.emptyPreview}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <p style={{ color: "#9ca3af", marginTop: 16 }}>Your preview will appear here</p>
              {/* Show recover button if backup exists */}
              {typeof window !== 'undefined' && localStorage.getItem("buildr_backup") && (
                <button 
                  onClick={() => {
                    const recovered = recoverFromBackup();
                    if (recovered) {
                      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "✅ Previous build recovered from backup!" }]);
                    }
                  }} 
                  style={{ marginTop: 16, padding: "10px 20px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  🔄 Recover Last Build
                </button>
              )}
            </div>
          ) : viewMode === "preview" ? (
            <div style={styles.devicePreviewWrapper}>
              <iframe 
                key={previewKey}
                ref={iframeRef}
                srcDoc={injectErrorTracking(currentCode || streamingCode || "")} 
                style={{
                  ...styles.iframe,
                  width: devicePreview === "desktop" ? "100%" : devicePreview === "tablet" ? "768px" : "375px",
                  maxWidth: "100%",
                  margin: devicePreview !== "desktop" ? "0 auto" : undefined,
                  display: "block",
                  boxShadow: devicePreview !== "desktop" ? "0 0 0 1px #27272a" : undefined,
                }} 
                sandbox="allow-scripts allow-same-origin" 
                title="Preview" 
              />
            </div>
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
  projectPreview: { aspectRatio: "16/10", background: "#1a1a1a", cursor: "pointer", overflow: "hidden", position: "relative" },
  projectThumbnailWrapper: { width: "100%", height: "100%", position: "relative", overflow: "hidden" },
  projectIframe: { width: "1200px", height: "800px", border: "none", transform: "scale(0.234)", transformOrigin: "top left", pointerEvents: "none" },
  projectOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "transparent" },
  projectEmpty: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  projectInfo: { padding: 16 },
  projectName: { fontSize: 16, fontWeight: 600, marginBottom: 4, cursor: "pointer", color: "#fff" },
  projectDate: { fontSize: 13, color: "#6b7280" },
  deleteBtn: { position: "absolute", top: 8, right: 8, width: 32, height: 32, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  questionsContainer: { minHeight: "100vh", background: "#0A0A0A", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "24px 24px 48px", paddingTop: 48, overflowY: "auto" },
  backBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer", marginBottom: 24, alignSelf: "flex-start" },
  acknowledgmentCard: { width: "100%", maxWidth: 600, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderRadius: 16, border: "1px solid rgba(168, 85, 247, 0.3)", padding: 24, marginBottom: 24 },
  acknowledgmentHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  aiAvatar: { width: 36, height: 36, borderRadius: 10, background: "rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#A855F7" },
  acknowledgmentText: { color: "#e5e7eb", fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 },
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
  errorMsg: { maxWidth: "85%", borderRadius: 16, padding: "12px 16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5" },
  errorBanner: { background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: 16, color: "#fca5a5" },
  retryBtn: { padding: "8px 16px", background: "#ef4444", border: "none", borderRadius: 6, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  dismissBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer", padding: 4 },
  codeIndicator: { marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 13, color: "#22c55e" },
  implementPlanBtn: { marginTop: 12, padding: "10px 16px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", border: "none", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, width: "100%" },
  buildingMsg: { borderRadius: 16, padding: "16px 20px", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", border: "1px solid #A855F7", display: "flex", alignItems: "center", gap: 14 },
  buildingIcon: { width: 40, height: 40, borderRadius: 10, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 2s linear infinite" },
  inputArea: { padding: 16, borderTop: "1px solid #27272a" },
  chatInput: { flex: 1, padding: "12px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 12, color: "white", fontSize: 14, resize: "none", outline: "none" },
  sendBtn: { padding: "12px 16px", background: "#A855F7", border: "none", borderRadius: 12, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  resizer: { width: 12, background: "#0A0A0A", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" },
  resizerLine: { width: 4, height: 40, background: "#27272a", borderRadius: 2 },
  previewPanel: { display: "flex", flexDirection: "column", background: "#111", minWidth: 300, position: "relative" },
  previewHeader: { padding: 16, borderBottom: "1px solid #27272a", display: "flex", justifyContent: "space-between", alignItems: "center" },
  instantColorBar: { display: "flex", alignItems: "center", padding: "8px 16px", background: "#0a0a0a", borderBottom: "1px solid #27272a", gap: 6 },
  instantColorBtn: { padding: 4, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", transition: "transform 0.15s", display: "flex", alignItems: "center", justifyContent: "center" },
  tabActive: { padding: "8px 16px", background: "#A855F7", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  tabInactive: { padding: "8px 16px", background: "transparent", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 },
  liveBadge: { fontSize: 9, fontWeight: 700, color: "#fff", background: "#ef4444", padding: "2px 6px", borderRadius: 4, marginLeft: 8 },
  downloadBtn: { padding: "8px 16px", background: "transparent", border: "none", borderRadius: 8, color: "#9ca3af", fontSize: 14, cursor: "pointer" },
  previewContent: { flex: 1, padding: 16, overflow: "hidden" },
  emptyPreview: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 12, border: "2px dashed #27272a" },
  iframe: { width: "100%", height: "100%", background: "white", borderRadius: 8, border: "none" },
  codeView: { height: "100%", overflow: "auto", borderRadius: 12, background: "#0A0A0A", border: "1px solid #27272a" },
  codeContent: { padding: 16, fontSize: 14, color: "#d1d5db", whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0 },
  // Mobile styles
  mobileBuilderContainer: { height: "100vh", display: "flex", flexDirection: "column", background: "#0A0A0A" },
  mobileHeader: { padding: "12px 16px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", gap: 12 },
  mobileHomeBtn: { width: 40, height: 40, borderRadius: 8, background: "#1C1C1C", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", cursor: "pointer" },
  mobileDownloadBtn: { width: 40, height: 40, borderRadius: 8, background: "#A855F7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer", fontSize: 18, fontWeight: 600 },
  mobileTabBar: { display: "flex", borderBottom: "1px solid #27272a", background: "#111" },
  mobileTabActive: { flex: 1, padding: "14px 16px", background: "#0A0A0A", border: "none", borderBottom: "2px solid #A855F7", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative" },
  mobileTabInactive: { flex: 1, padding: "14px 16px", background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "#6b7280", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, position: "relative" },
  mobileDot: { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", position: "absolute", top: 10, right: "calc(50% - 40px)" },
  mobileChatContainer: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  mobileChatMessages: { flex: 1, overflowY: "auto", padding: 16 },
  mobileInputArea: { padding: 12, borderTop: "1px solid #27272a", background: "#111" },
  mobileChatInput: { flex: 1, padding: "12px 14px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 10, color: "white", fontSize: 15, resize: "none", outline: "none" },
  mobilePreviewContainer: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  mobilePreviewToggle: { display: "flex", gap: 8, padding: "12px 16px", background: "#111" },
  miniTabActive: { padding: "8px 16px", background: "#A855F7", border: "none", borderRadius: 6, color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  miniTabInactive: { padding: "8px 16px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#9ca3af", fontSize: 13, cursor: "pointer" },
  mobileIframe: { flex: 1, width: "100%", background: "white", border: "none" },
  mobileCodeView: { flex: 1, overflow: "auto", background: "#0A0A0A", padding: 12 },
  // Quick Actions styles
  quickActionsContainer: { padding: "8px 16px", borderTop: "1px solid #27272a", background: "#111" },
  quickActionsScroll: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 },
  quickActionBtn: { padding: "8px 14px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "#d1d5db", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" },
  mobileQuickActions: { display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", borderTop: "1px solid #27272a", background: "#111" },
  mobileQuickActionBtn: { padding: "6px 12px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#d1d5db", fontSize: 12, cursor: "pointer" },
  // Mode Toggle styles
  modeToggleContainer: { display: "flex", gap: 4, marginBottom: 10 },
  modeToggleActive: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#27272a", border: "none", borderRadius: 6, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  modeToggleInactive: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", border: "1px solid #27272a", borderRadius: 6, color: "#6b7280", fontSize: 12, cursor: "pointer" },
  mobileModeToggle: { display: "flex", gap: 6, marginBottom: 8 },
  mobileModeActive: { flex: 1, padding: "8px 12px", background: "#27272a", border: "none", borderRadius: 6, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  mobileModeInactive: { flex: 1, padding: "8px 12px", background: "transparent", border: "1px solid #27272a", borderRadius: 6, color: "#6b7280", fontSize: 12, cursor: "pointer" },
  // File Upload styles
  uploadBtn: { width: 44, height: 44, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 10, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  mobileUploadBtn: { width: 40, height: 40, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  uploadedFilesBar: { display: "flex", gap: 8, padding: "8px 16px", borderTop: "1px solid #27272a", background: "#111", overflowX: "auto" },
  mobileUploadedFiles: { display: "flex", gap: 6, padding: "8px 12px", borderTop: "1px solid #27272a", background: "#111", overflowX: "auto" },
  uploadedFileChip: { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#d1d5db", fontSize: 12 },
  removeFileBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 14, cursor: "pointer", padding: "0 2px", marginLeft: 2 },
  // Undo/Redo styles
  undoRedoContainer: { display: "flex", alignItems: "center", gap: 4, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #27272a" },
  undoRedoBtn: { width: 32, height: 32, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  historyBadge: { fontSize: 10, color: "#6b7280", marginLeft: 4 },
  // Device Preview styles
  deviceToggle: { display: "flex", gap: 2, marginLeft: 8, padding: "2px", background: "#1C1C1C", borderRadius: 6, border: "1px solid #27272a" },
  deviceBtn: { width: 28, height: 28, background: "transparent", border: "none", borderRadius: 4, color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  deviceBtnActive: { width: 28, height: 28, background: "#27272a", border: "none", borderRadius: 4, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  devicePreviewWrapper: { height: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "auto" },
  // Color Picker styles
  colorBtn: { width: 32, height: 32, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  colorBtnActive: { width: 32, height: 32, background: "#A855F7", border: "1px solid #A855F7", borderRadius: 6, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  colorPickerPanel: { position: "absolute", top: 56, right: 16, width: 240, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 12, padding: 16, zIndex: 100, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" },
  colorPickerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, color: "white" },
  closeColorPicker: { background: "none", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer" },
  currentColors: { display: "flex", gap: 12 },
  colorItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  colorSwatch: { width: 36, height: 36, borderRadius: 8, border: "2px solid #27272a", cursor: "pointer" },
  presetGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 },
  presetBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 8, background: "#111", border: "1px solid #27272a", borderRadius: 8, cursor: "pointer", color: "#9ca3af" },
  // Issue indicator badges
  issuesBadge: { padding: "4px 10px", background: "#27272a", borderRadius: 6, fontSize: 11, color: "#fbbf24", cursor: "help", marginLeft: 8 },
  previewErrorBadge: { padding: "4px 10px", background: "#7f1d1d", borderRadius: 6, fontSize: 11, color: "#fca5a5", cursor: "help", marginLeft: 4 },
  // Refresh button
  refreshBtn: { width: 32, height: 32, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  // Page dropdown styles
  pageDropdownBtn: { display: "flex", alignItems: "center", padding: "6px 12px", background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 6, color: "#d1d5db", cursor: "pointer", fontSize: 12 },
  pageDropdownMenu: { position: "absolute", top: "100%", left: 0, marginTop: 4, minWidth: 180, background: "#1C1C1C", border: "1px solid #27272a", borderRadius: 8, padding: 4, zIndex: 100, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" },
  pageDropdownItem: { display: "block", width: "100%", padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, color: "#d1d5db", fontSize: 12, textAlign: "left", cursor: "pointer" },
  // Quality toggle styles (Fast/Premium)
  qualityToggle: { display: "flex", gap: 2, padding: 2, background: "#1C1C1C", borderRadius: 6, border: "1px solid #27272a" },
  qualityBtn: { padding: "4px 10px", background: "transparent", border: "none", borderRadius: 4, color: "#6b7280", fontSize: 11, cursor: "pointer" },
  qualityBtnActive: { padding: "4px 10px", background: "#27272a", border: "none", borderRadius: 4, color: "#d1d5db", fontSize: 11, cursor: "pointer", fontWeight: 600 },
};
