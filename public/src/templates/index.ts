// Template definitions with metadata
export interface Template {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  description: string;
  style: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "restaurant-1",
    name: "The Red Plate - Elegant Restaurant",
    category: "restaurant",
    keywords: ["restaurant", "cafe", "food", "dining", "menu", "bistro", "eatery", "grill", "kitchen", "bar"],
    description: "Dark elegant restaurant template with menu tabs, reservation form, testimonials, and location section",
    style: "Dark theme with red accent (#d41132), Work Sans font, elegant fine-dining feel"
  },
  {
    id: "restaurant-2", 
    name: "The Red Plate - Alternative",
    category: "restaurant",
    keywords: ["restaurant", "cafe", "food", "dining", "menu", "bistro", "eatery", "grill", "kitchen", "bar"],
    description: "Alternative dark restaurant template with similar elegant styling",
    style: "Dark theme with red accent (#d41132), Work Sans font, fine-dining atmosphere"
  },
  {
    id: "local-service-1",
    name: "ServicePro - Professional Services",
    category: "local-service",
    keywords: ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "service", "cleaning", "landscaping", "roofing", "painting", "moving", "pest control", "locksmith", "appliance"],
    description: "Light professional service template with hero, trust badges, services grid, reviews, and contact form",
    style: "Light theme with blue accent (#2463eb), Inter font, trustworthy professional feel"
  },
  {
    id: "local-service-2",
    name: "LocalPro - Expert Services",
    category: "local-service", 
    keywords: ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "service", "cleaning", "landscaping", "roofing", "painting", "moving", "pest control", "locksmith", "appliance"],
    description: "Light service template with green accent, 24/7 emergency badge, fast response time highlight",
    style: "Light theme with green accent (#16a34a), Inter font, urgent/reliable feel"
  },
  {
    id: "local-service-3",
    name: "Local Service - Variant 3",
    category: "local-service",
    keywords: ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "service", "cleaning", "landscaping", "roofing", "painting", "moving", "pest control", "locksmith", "appliance"],
    description: "Professional local service business template variant",
    style: "Clean professional design with trust indicators"
  },
  {
    id: "local-service-4",
    name: "Local Service - Variant 4",
    category: "local-service",
    keywords: ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "service", "cleaning", "landscaping", "roofing", "painting", "moving", "pest control", "locksmith", "appliance"],
    description: "Professional local service business template variant",
    style: "Clean professional design with service highlights"
  },
  {
    id: "local-service-5",
    name: "Local Service - Variant 5",
    category: "local-service",
    keywords: ["plumber", "plumbing", "electrician", "electrical", "hvac", "contractor", "handyman", "repair", "service", "cleaning", "landscaping", "roofing", "painting", "moving", "pest control", "locksmith", "appliance"],
    description: "Professional local service business template variant",
    style: "Clean professional design with comprehensive sections"
  }
];

// Find best matching template based on user prompt
export function findTemplateForPrompt(prompt: string): Template | null {
  const lower = prompt.toLowerCase();
  
  // Score each template based on keyword matches
  let bestMatch: Template | null = null;
  let bestScore = 0;
  
  for (const template of TEMPLATES) {
    let score = 0;
    for (const keyword of template.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length; // Longer matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }
  
  return bestMatch;
}

// Get template category for a prompt
export function getTemplateCategoryForPrompt(prompt: string): string {
  const template = findTemplateForPrompt(prompt);
  return template?.category || "default";
}

// Generate AI acknowledgment based on detected template
export function generateAcknowledgment(prompt: string): string {
  const template = findTemplateForPrompt(prompt);
  
  if (!template) {
    return `I'll create a professional website for "${prompt}" with a modern design, hero section, features, testimonials, and contact form. Let me ask a few questions to customize it perfectly for you.`;
  }
  
  if (template.category === "restaurant") {
    return `I'll build you a stunning restaurant website with an elegant dark theme, interactive menu sections, reservation system, photo gallery, testimonials, and location/hours information. The design will have a sophisticated fine-dining feel. Let me ask a few questions to customize it for your restaurant.`;
  }
  
  if (template.category === "local-service") {
    return `I'll create a professional service business website designed to generate leads and build trust. It will include a prominent phone number and quote button, trust badges (licensed, insured), services overview, customer reviews, service areas, and a contact form. Let me ask a few questions to customize it for your business.`;
  }
  
  return `I'll create a professional website for "${prompt}" with modern styling and all the essential sections. Let me ask a few questions to customize it perfectly.`;
}
