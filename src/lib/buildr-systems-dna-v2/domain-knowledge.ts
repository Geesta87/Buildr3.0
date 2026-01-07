// ============================================================================
// BUILDR SYSTEMS DNA v2 - DOMAIN KNOWLEDGE
// ============================================================================
// Baked-in intelligence for 20+ industries and common system patterns.
// This is what makes Buildr "know" how businesses actually work.
// ============================================================================

export const DOMAIN_KNOWLEDGE: Record<string, DomainKnowledge> = {

  // ==========================================================================
  // FOOD & HOSPITALITY
  // ==========================================================================

  "restaurant": {
    industry: "Restaurant",
    keywords: ["restaurant", "dining", "eatery", "bistro", "diner", "grill", "steakhouse", "sushi", "italian", "mexican", "thai", "chinese", "indian"],
    
    howThisBusinessWorks: `
      Restaurants serve food to customers either dine-in, takeout, or delivery.
      Revenue comes from food/drink sales. Success depends on food quality, 
      service, ambiance, and increasingly online presence.
      
      Customer journey: Discover → Evaluate (menu, reviews, photos) → Visit/Order → Experience → Review/Return
    `,
    
    userTypes: [
      { name: "Diner/Customer", does: "Browse menu, make reservations, order food, pay, leave reviews" },
      { name: "Restaurant Owner", does: "Manage menu, view reservations, track orders, see analytics" },
      { name: "Staff", does: "Take orders, manage tables, process payments (if system includes this)" }
    ],
    
    commonFeatures: [
      "Menu with categories, descriptions, prices, photos",
      "Online ordering (pickup and/or delivery)",
      "Table reservations",
      "Hours and location with map",
      "Photo gallery (food, ambiance)",
      "Reviews/testimonials",
      "Contact information",
      "Special offers/happy hour",
      "Private events/catering info"
    ],
    
    keyPatterns: [
      "Menu is THE most important element — make it scannable and appetizing",
      "Food photography is crucial — bad photos = no customers",
      "Mobile-first — most people search restaurants on phones",
      "Hours and location must be instantly visible",
      "Online ordering should be frictionless (minimal clicks to checkout)",
      "Reviews build trust — feature them prominently"
    ],
    
    commonDataModels: [
      { entity: "MenuItem", fields: ["name", "description", "price", "category", "image", "dietary_tags", "available"] },
      { entity: "Category", fields: ["name", "display_order", "description"] },
      { entity: "Reservation", fields: ["customer_name", "phone", "email", "party_size", "date", "time", "status", "notes"] },
      { entity: "Order", fields: ["customer_id", "items", "subtotal", "tax", "tip", "total", "type", "status", "created_at"] },
      { entity: "OrderItem", fields: ["order_id", "menu_item_id", "quantity", "modifications", "price"] }
    ],
    
    industrySpecificTerms: ["covers", "table turn", "86'd", "comp", "prix fixe", "a la carte", "POS"],
    
    questionsToAsk: [
      {
        question: "What should customers be able to do on your site?",
        options: ["View menu only", "View menu + make reservations", "View menu + order online (pickup)", "View menu + order online (pickup & delivery)", "All of the above"],
        why: "Determines complexity — menu-only is simple, online ordering is moderate, full system is complex"
      }
    ]
  },

  "cafe_coffee": {
    industry: "Cafe / Coffee Shop",
    keywords: ["cafe", "coffee", "coffee shop", "espresso", "coffeehouse", "tea", "boba", "juice bar"],
    
    howThisBusinessWorks: `
      Coffee shops sell beverages and light food. High volume, lower ticket size.
      Focus on speed, consistency, and atmosphere. Many have loyalty programs.
      Often a "third place" between home and work — ambiance matters.
    `,
    
    userTypes: [
      { name: "Customer", does: "Order drinks/food, earn loyalty points, mobile order ahead" },
      { name: "Owner/Manager", does: "Manage menu, view sales, manage loyalty program" }
    ],
    
    commonFeatures: [
      "Menu with drinks and food",
      "Online ordering / order ahead",
      "Loyalty program (very common in coffee)",
      "Store locations and hours",
      "WiFi information",
      "Ambiance photos",
      "Catering/bulk orders"
    ],
    
    keyPatterns: [
      "Mobile ordering is increasingly expected",
      "Loyalty programs drive repeat visits (Starbucks model)",
      "Speed matters — customers want quick service",
      "Customization is big (milk type, sweetness, etc.)",
      "Morning rush is critical — system must be fast"
    ],
    
    questionsToAsk: [
      {
        question: "Do you want a loyalty/rewards program?",
        options: ["Yes, points per purchase", "Yes, punch card style (10th drink free)", "No, just basic website"],
        why: "Loyalty is huge in coffee — determines system complexity"
      }
    ]
  },

  "bakery": {
    industry: "Bakery",
    keywords: ["bakery", "bakeshop", "pastry", "cakes", "cupcakes", "bread", "patisserie"],
    
    howThisBusinessWorks: `
      Bakeries sell baked goods — bread, pastries, cakes. Often split between 
      walk-in retail and custom orders (especially cakes for events).
      Custom cakes require consultation and deposits.
    `,
    
    userTypes: [
      { name: "Customer", does: "Browse products, place custom orders, schedule pickup" },
      { name: "Owner", does: "Manage products, handle custom orders, view calendar" }
    ],
    
    commonFeatures: [
      "Product gallery with categories",
      "Custom cake/order request form",
      "Order ahead for pickup",
      "Pricing (may be ranges for custom)",
      "Flavor/size options",
      "Event catering info",
      "Hours and location"
    ],
    
    keyPatterns: [
      "Photography is essential — baked goods sell visually",
      "Custom orders need lead time (often 48-72 hours minimum)",
      "Deposits are common for custom cakes",
      "Seasonal items change frequently",
      "Dietary options matter (gluten-free, vegan)"
    ],
    
    questionsToAsk: [
      {
        question: "Do you do custom orders (cakes, large orders)?",
        options: ["Yes, custom cakes are a big part of our business", "Sometimes, for events", "No, just walk-in retail"],
        why: "Custom orders need a different flow (consultation, deposits, lead time)"
      }
    ]
  },

  "food_truck": {
    industry: "Food Truck",
    keywords: ["food truck", "mobile food", "street food"],
    
    howThisBusinessWorks: `
      Mobile food service — location changes. Customers need to find where you are.
      Often social media driven. Events and catering are common revenue sources.
    `,
    
    userTypes: [
      { name: "Customer", does: "Find location, view menu, maybe pre-order" },
      { name: "Owner", does: "Update location, manage menu, book events" }
    ],
    
    commonFeatures: [
      "Current location display (crucial)",
      "Schedule/route calendar",
      "Menu",
      "Social media links",
      "Event booking/catering",
      "Pre-order option"
    ],
    
    keyPatterns: [
      "Location updates are THE key feature",
      "Social media integration is critical",
      "Schedule should show where you'll be this week",
      "Event booking drives significant revenue"
    ]
  },

  "catering": {
    industry: "Catering",
    keywords: ["catering", "event catering", "corporate catering", "wedding catering"],
    
    howThisBusinessWorks: `
      Catering serves food for events — weddings, corporate, parties.
      High ticket, relationship-driven. Requires consultation and planning.
      Lead times are long (weeks to months).
    `,
    
    userTypes: [
      { name: "Event Planner/Customer", does: "Browse menus, request quote, book service" },
      { name: "Catering Manager", does: "Manage inquiries, create proposals, track events" }
    ],
    
    commonFeatures: [
      "Menu packages (per person pricing)",
      "Event type options (wedding, corporate, party)",
      "Quote request form (critical)",
      "Portfolio/past events gallery",
      "Testimonials",
      "Service area"
    ],
    
    keyPatterns: [
      "Quote/inquiry form is the main CTA (not direct booking)",
      "Per-person pricing is standard",
      "Photos of past events build trust",
      "Testimonials from event planners are powerful"
    ]
  },

  "bar_nightlife": {
    industry: "Bar / Nightlife",
    keywords: ["bar", "pub", "nightclub", "lounge", "brewery", "taproom", "wine bar"],
    
    howThisBusinessWorks: `
      Bars sell drinks, atmosphere, and experience. Events (live music, trivia) 
      drive traffic. Age verification matters. Late hours.
    `,
    
    userTypes: [
      { name: "Customer", does: "Check events, view drink menu, reserve tables/VIP" },
      { name: "Owner", does: "Manage events, update specials, handle reservations" }
    ],
    
    commonFeatures: [
      "Events calendar",
      "Drink menu / specials",
      "Reservation / bottle service",
      "Atmosphere photos",
      "Hours (especially late night)",
      "Age verification notice",
      "Social media links"
    ],
    
    keyPatterns: [
      "Events are the main draw — prominently feature them",
      "Atmosphere/vibe is key — use photos and video",
      "Specials and happy hour drive traffic",
      "Social media is where the audience lives"
    ]
  },

  // ==========================================================================
  // PET SERVICES
  // ==========================================================================

  "dog_grooming": {
    industry: "Dog Grooming",
    keywords: ["dog grooming", "pet grooming", "groomer", "dog spa", "pet spa", "mobile grooming", "dog bath"],
    
    howThisBusinessWorks: `
      Dog groomers provide bathing, haircuts, nail trims, and other hygiene services.
      Customers typically book every 4-6 weeks. Trust is critical — people are 
      protective of their pets. Mobile groomers go to the customer's home.
      
      Customer journey: Search → Check reviews/photos → Book → Service → Rebook
    `,
    
    userTypes: [
      { name: "Pet Owner", does: "Book appointments, manage pet profiles, view history, earn loyalty" },
      { name: "Groomer/Owner", does: "Manage schedule, view appointments, track clients, manage services" }
    ],
    
    commonFeatures: [
      "Service menu with pricing by dog size",
      "Online booking with pet info",
      "Pet profiles (name, breed, size, temperament, notes)",
      "Before/after photo gallery",
      "Reviews from pet parents",
      "Loyalty program (very effective in pet services)",
      "Reminders for next grooming",
      "Service area (for mobile)"
    ],
    
    keyPatterns: [
      "Pet profiles are essential — groomers need to know the dog",
      "Pricing varies by size (small/medium/large/XL)",
      "Before/after photos are powerful marketing",
      "Trust signals matter — certifications, reviews",
      "Loyalty programs drive rebooking",
      "Reminders reduce no-shows and increase retention",
      "Mobile grooming: convenience is the value prop"
    ],
    
    commonDataModels: [
      { entity: "Pet", fields: ["name", "breed", "size", "weight", "age", "temperament", "special_needs", "photo", "owner_id"] },
      { entity: "Owner", fields: ["name", "email", "phone", "address", "pets", "points_balance"] },
      { entity: "Service", fields: ["name", "description", "price_small", "price_medium", "price_large", "price_xl", "duration", "points_earned"] },
      { entity: "Appointment", fields: ["pet_id", "service_id", "date", "time", "status", "notes", "groomer_id"] }
    ],
    
    questionsToAsk: [
      {
        question: "How should customers earn loyalty points?",
        options: ["Per appointment (e.g., 10 points per visit)", "Per dollar spent ($1 = 1 point)", "Per service type (full groom = 25 pts, bath = 15 pts)", "No loyalty program"],
        why: "Loyalty is highly effective in grooming — need to know the structure"
      },
      {
        question: "Are you mobile or do customers come to you?",
        options: ["Mobile — we go to customers", "Fixed location — customers come to us", "Both"],
        why: "Mobile needs service area; fixed needs address and possibly online check-in"
      }
    ]
  },

  "pet_boarding": {
    industry: "Pet Boarding / Daycare",
    keywords: ["pet boarding", "dog boarding", "kennel", "pet hotel", "doggy daycare", "pet daycare", "dog sitting"],
    
    howThisBusinessWorks: `
      Pet boarding cares for pets when owners travel. Daycare is daytime only.
      Trust is paramount — people are leaving their "babies." Tours are common 
      before first booking. Vaccination records required.
    `,
    
    userTypes: [
      { name: "Pet Owner", does: "Book stays, submit vaccination records, get updates" },
      { name: "Staff", does: "Manage reservations, send updates, track pets" }
    ],
    
    commonFeatures: [
      "Booking for overnight or daycare",
      "Vaccination record upload/verification",
      "Pet profiles with detailed info",
      "Daily updates (photos, notes) — HUGE selling point",
      "Webcam/live viewing",
      "Pricing by size and duration",
      "Add-on services (grooming, training)",
      "Tour scheduling"
    ],
    
    keyPatterns: [
      "Vaccination verification is legally required",
      "Daily updates (photos) are expected and drive loyalty",
      "Webcams are a major differentiator",
      "First-time customers often want a tour",
      "Emergency contact info is critical"
    ]
  },

  "veterinary": {
    industry: "Veterinary Clinic",
    keywords: ["vet", "veterinary", "veterinarian", "animal hospital", "pet clinic"],
    
    howThisBusinessWorks: `
      Veterinary clinics provide medical care for animals. Mix of routine 
      (checkups, vaccinations) and urgent care. Trust and credentials matter.
    `,
    
    userTypes: [
      { name: "Pet Owner", does: "Book appointments, view records, request refills" },
      { name: "Vet Staff", does: "Manage appointments, update records, communicate" }
    ],
    
    commonFeatures: [
      "Appointment booking",
      "Services list (checkups, surgery, emergency)",
      "Doctor/staff profiles with credentials",
      "Pet portal (records, vaccination history)",
      "Pharmacy / prescription refills",
      "Emergency contact info",
      "New patient forms"
    ],
    
    keyPatterns: [
      "Credentials and trust are paramount",
      "Emergency hours/contact must be prominent",
      "Online forms save time at check-in",
      "Pet portal for records is increasingly expected"
    ]
  },

  // ==========================================================================
  // BEAUTY & WELLNESS
  // ==========================================================================

  "salon": {
    industry: "Hair Salon",
    keywords: ["salon", "hair salon", "hairdresser", "hair stylist", "beauty salon"],
    
    howThisBusinessWorks: `
      Hair salons provide haircuts, coloring, styling. Clients often have 
      preferred stylists. Appointments are essential. Visual portfolio matters.
    `,
    
    userTypes: [
      { name: "Client", does: "Book appointments, choose stylist, view portfolio" },
      { name: "Stylist", does: "Manage their schedule, view client history" },
      { name: "Owner", does: "Manage staff, view all bookings, analytics" }
    ],
    
    commonFeatures: [
      "Service menu with pricing",
      "Stylist profiles with portfolios",
      "Online booking with stylist selection",
      "Before/after gallery",
      "Reviews",
      "Products for sale (optional)"
    ],
    
    keyPatterns: [
      "Stylist selection is critical — clients are loyal to people",
      "Portfolio photos show skill",
      "Pricing varies by stylist level (junior, senior, master)",
      "Add-on services are common (treatment, blowout)"
    ],
    
    questionsToAsk: [
      {
        question: "When booking, do clients choose a specific stylist?",
        options: ["Yes, clients book with their preferred stylist", "No, any available stylist", "Both options"],
        why: "Affects booking flow complexity"
      }
    ]
  },

  "barbershop": {
    industry: "Barbershop",
    keywords: ["barber", "barbershop", "barber shop", "men's haircut", "fade", "shave"],
    
    howThisBusinessWorks: `
      Barbershops serve men's haircuts and grooming. Often walk-in friendly 
      but appointments increasingly common. Strong community/culture aspect.
    `,
    
    userTypes: [
      { name: "Client", does: "Book or walk in, choose barber" },
      { name: "Barber", does: "Manage their chair, view queue" }
    ],
    
    commonFeatures: [
      "Services (cuts, fades, shaves, beard trims)",
      "Barber profiles",
      "Online booking or queue/waitlist",
      "Gallery of cuts",
      "Pricing",
      "Walk-in wait times"
    ],
    
    keyPatterns: [
      "Walk-in culture is strong — show current wait times",
      "Barber selection matters",
      "Gallery of fade/style work is important",
      "Often has strong brand/culture identity"
    ]
  },

  "spa": {
    industry: "Spa / Massage",
    keywords: ["spa", "massage", "day spa", "wellness spa", "massage therapy", "facial", "body treatment"],
    
    howThisBusinessWorks: `
      Spas provide relaxation and therapeutic services. Higher-end experience.
      Appointments required. Ambiance and experience are part of the product.
    `,
    
    userTypes: [
      { name: "Client", does: "Book treatments, purchase packages, manage membership" },
      { name: "Therapist", does: "Manage schedule, view client preferences" },
      { name: "Owner", does: "Manage services, packages, staff, analytics" }
    ],
    
    commonFeatures: [
      "Service menu with descriptions and duration",
      "Online booking",
      "Packages and memberships",
      "Gift cards (very popular)",
      "Ambiance photos",
      "Therapist profiles",
      "New client intake forms"
    ],
    
    keyPatterns: [
      "Ambiance photos sell the experience",
      "Gift cards are significant revenue — make prominent",
      "Packages/memberships drive retention",
      "Intake forms gather health info before appointment",
      "Upselling add-ons (aromatherapy, hot stones) is common"
    ]
  },

  "nail_salon": {
    industry: "Nail Salon",
    keywords: ["nail salon", "nails", "manicure", "pedicure", "nail spa"],
    
    howThisBusinessWorks: `
      Nail salons provide manicures, pedicures, nail art. Mix of walk-in and 
      appointments. Visual gallery of nail art is important.
    `,
    
    userTypes: [
      { name: "Client", does: "Book appointment, choose services, view nail art inspiration" },
      { name: "Tech/Owner", does: "Manage schedule, showcase work" }
    ],
    
    commonFeatures: [
      "Service menu (manicure, pedicure, gel, acrylic, art)",
      "Nail art gallery/inspiration",
      "Booking",
      "Pricing by service type",
      "Specials/packages"
    ],
    
    keyPatterns: [
      "Nail art gallery is a major draw — Instagram-style",
      "Walk-in wait times helpful",
      "Service add-ons common (gel, art, gems)"
    ]
  },

  "fitness_gym": {
    industry: "Fitness / Gym",
    keywords: ["gym", "fitness", "fitness center", "health club", "crossfit", "training", "workout"],
    
    howThisBusinessWorks: `
      Gyms provide space and equipment for exercise. Revenue from memberships 
      and personal training. Class schedules are key for boutique fitness.
    `,
    
    userTypes: [
      { name: "Member", does: "Sign up, view classes, book training, check in" },
      { name: "Trainer", does: "Manage clients, schedule sessions" },
      { name: "Owner", does: "Manage memberships, staff, analytics" }
    ],
    
    commonFeatures: [
      "Membership plans and pricing",
      "Class schedule",
      "Personal training info",
      "Facility photos/virtual tour",
      "Online signup",
      "Trainer profiles",
      "Hours and location"
    ],
    
    keyPatterns: [
      "Class schedule is critical for boutique/studio gyms",
      "Free trial or day pass is common lead magnet",
      "Transformation photos are powerful",
      "Community aspect matters"
    ]
  },

  "yoga_studio": {
    industry: "Yoga Studio",
    keywords: ["yoga", "yoga studio", "pilates", "meditation", "mindfulness"],
    
    howThisBusinessWorks: `
      Yoga studios offer classes in various styles. Class schedule is central.
      Often has membership/class pack model. Community focused.
    `,
    
    userTypes: [
      { name: "Student", does: "View schedule, book classes, buy packages" },
      { name: "Instructor", does: "Manage their classes, see attendance" },
      { name: "Owner", does: "Manage schedule, instructors, memberships" }
    ],
    
    commonFeatures: [
      "Class schedule with filters (style, instructor, level)",
      "Class descriptions and levels",
      "Instructor profiles",
      "Pricing (drop-in, packages, membership)",
      "Online booking",
      "New student info",
      "Workshops/events"
    ],
    
    keyPatterns: [
      "Schedule is the core feature",
      "Class level indicators important (beginner, intermediate, advanced)",
      "Instructor bios matter — students follow teachers",
      "First-class-free is common offer"
    ]
  },

  // ==========================================================================
  // HOME SERVICES
  // ==========================================================================

  "plumbing": {
    industry: "Plumbing",
    keywords: ["plumber", "plumbing", "plumber near me", "drain", "pipe", "water heater", "leak"],
    
    howThisBusinessWorks: `
      Plumbers fix water and drainage issues. Often emergency-driven — people 
      search when something breaks. Trust and speed are critical. Local SEO huge.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Find plumber, call or request quote, schedule service" },
      { name: "Business Owner", does: "Receive leads, manage schedule, track jobs" }
    ],
    
    commonFeatures: [
      "Services list (drain cleaning, water heaters, repairs, etc.)",
      "Emergency/24-7 availability (if offered)",
      "Service areas",
      "Trust signals (license, insurance, reviews)",
      "Phone number prominently displayed",
      "Request quote/schedule form",
      "Pricing (if transparent)"
    ],
    
    keyPatterns: [
      "Phone number must be huge and clickable — emergencies",
      "24/7 or 'same day' is major differentiator",
      "License number builds trust — display it",
      "Reviews are critical — people are wary of plumber scams",
      "Service area matters for local SEO",
      "Emergency vs scheduled — different urgency"
    ],
    
    commonDataModels: [
      { entity: "ServiceRequest", fields: ["name", "phone", "email", "address", "service_type", "urgency", "description", "status", "created_at"] }
    ]
  },

  "electrical": {
    industry: "Electrical",
    keywords: ["electrician", "electrical", "electric", "wiring", "panel", "outlet"],
    
    howThisBusinessWorks: `
      Electricians handle electrical systems — wiring, panels, repairs.
      Licensed trade with strict requirements. Mix of emergency and planned work.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request service, schedule appointment" },
      { name: "Owner", does: "Manage leads, schedule jobs" }
    ],
    
    commonFeatures: [
      "Services (repairs, installations, upgrades, inspections)",
      "Emergency service info",
      "License and certifications",
      "Service area",
      "Quote request",
      "Reviews"
    ],
    
    keyPatterns: [
      "License is required — display prominently",
      "Safety messaging builds trust",
      "Emergency service is common need",
      "Residential vs commercial distinction"
    ]
  },

  "hvac": {
    industry: "HVAC (Heating/Cooling)",
    keywords: ["hvac", "heating", "cooling", "air conditioning", "ac", "furnace", "heat pump"],
    
    howThisBusinessWorks: `
      HVAC companies install and repair heating/cooling systems. Seasonal 
      demand (summer AC, winter heating). Maintenance plans drive retention.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request service, schedule maintenance" },
      { name: "Owner", does: "Manage service calls, maintenance contracts" }
    ],
    
    commonFeatures: [
      "Services (installation, repair, maintenance)",
      "Emergency service",
      "Maintenance plans",
      "Brands serviced",
      "Financing options",
      "Service area",
      "Seasonal specials"
    ],
    
    keyPatterns: [
      "Maintenance plans are key revenue — promote them",
      "Emergency service critical (no AC in summer = urgent)",
      "Financing is common for big installations",
      "Seasonal marketing (AC tune-up spring, furnace tune-up fall)"
    ]
  },

  "cleaning": {
    industry: "Cleaning Service",
    keywords: ["cleaning", "house cleaning", "maid", "janitorial", "office cleaning", "cleaning service"],
    
    howThisBusinessWorks: `
      Cleaning services provide residential or commercial cleaning. 
      Recurring revenue model (weekly, bi-weekly). Trust is critical — 
      strangers in your home.
    `,
    
    userTypes: [
      { name: "Customer", does: "Get quote, book cleaning, schedule recurring" },
      { name: "Owner", does: "Manage schedule, staff, customers" }
    ],
    
    commonFeatures: [
      "Service types (standard, deep, move-in/out)",
      "Instant quote calculator",
      "Online booking",
      "Recurring schedule options",
      "Trust signals (background checks, insurance)",
      "Service area"
    ],
    
    keyPatterns: [
      "Online quote calculator is expected",
      "Background check/vetting is important trust signal",
      "Recurring (weekly/bi-weekly) is the goal — promote it",
      "Checklist of what's included"
    ]
  },

  "landscaping": {
    industry: "Landscaping / Lawn Care",
    keywords: ["landscaping", "lawn care", "lawn", "garden", "hardscape", "tree service"],
    
    howThisBusinessWorks: `
      Landscaping covers lawn maintenance, garden design, hardscaping.
      Seasonal work. Mix of one-time projects and recurring maintenance.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request quote, schedule service" },
      { name: "Owner", does: "Manage estimates, schedule crews" }
    ],
    
    commonFeatures: [
      "Services (lawn care, landscaping design, hardscaping, tree service)",
      "Portfolio of past work",
      "Quote request",
      "Recurring maintenance plans",
      "Service area"
    ],
    
    keyPatterns: [
      "Before/after photos are powerful",
      "Recurring maintenance (weekly mowing) is steady revenue",
      "Project portfolio shows capability for bigger jobs",
      "Seasonal services (fall cleanup, spring prep)"
    ]
  },

  "roofing": {
    industry: "Roofing",
    keywords: ["roofing", "roofer", "roof repair", "roof replacement", "shingles"],
    
    howThisBusinessWorks: `
      Roofing is project-based — repairs or replacements. Often storm-driven 
      demand. Big ticket, requires estimates. Trust critical for major purchase.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request inspection/estimate, review proposal" },
      { name: "Owner", does: "Manage leads, schedule estimates, track projects" }
    ],
    
    commonFeatures: [
      "Services (repair, replacement, inspection)",
      "Free estimate/inspection CTA",
      "Materials/brands offered",
      "Portfolio",
      "Financing options",
      "Insurance claim help",
      "Warranties"
    ],
    
    keyPatterns: [
      "Free inspection is the main CTA",
      "Insurance claim assistance is valuable selling point",
      "Financing is often needed for replacements",
      "Warranty information builds confidence"
    ]
  },

  "painting": {
    industry: "Painting",
    keywords: ["painter", "painting", "house painting", "interior painting", "exterior painting"],
    
    howThisBusinessWorks: `
      Painters do interior and exterior painting. Project-based with estimates.
      Visual portfolio important. Color consultation is value-add.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request estimate, select colors, schedule" },
      { name: "Owner", does: "Manage estimates, schedule jobs" }
    ],
    
    commonFeatures: [
      "Services (interior, exterior, commercial)",
      "Portfolio/gallery",
      "Free estimate",
      "Color consultation",
      "Reviews"
    ],
    
    keyPatterns: [
      "Before/after photos essential",
      "Color consultation is differentiator",
      "Prep work quality is selling point"
    ]
  },

  "pest_control": {
    industry: "Pest Control",
    keywords: ["pest control", "exterminator", "termite", "bugs", "rodent", "pest"],
    
    howThisBusinessWorks: `
      Pest control eliminates and prevents pests. Mix of emergency (see bug) 
      and preventive (quarterly treatments). Plans drive recurring revenue.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request service, sign up for plan" },
      { name: "Owner", does: "Manage service calls, maintenance plans" }
    ],
    
    commonFeatures: [
      "Pest types handled (list them — termites, ants, roaches, etc.)",
      "Treatment plans (quarterly, monthly)",
      "Emergency service",
      "Free inspection",
      "Eco-friendly options"
    ],
    
    keyPatterns: [
      "List specific pests — people search 'termite exterminator'",
      "Plans (quarterly) are the business model",
      "Free inspection is standard CTA",
      "Eco/pet-friendly is differentiator"
    ]
  },

  // ==========================================================================
  // PROFESSIONAL SERVICES
  // ==========================================================================

  "lawyer": {
    industry: "Legal / Law Firm",
    keywords: ["lawyer", "attorney", "law firm", "legal", "injury lawyer", "family law", "criminal defense"],
    
    howThisBusinessWorks: `
      Law firms provide legal services. Trust and credentials paramount.
      Free consultation is typical lead generator. Practice areas define focus.
    `,
    
    userTypes: [
      { name: "Potential Client", does: "Research attorneys, request consultation" },
      { name: "Attorney/Firm", does: "Receive leads, manage cases (if portal)" }
    ],
    
    commonFeatures: [
      "Practice areas",
      "Attorney profiles with credentials",
      "Free consultation CTA",
      "Case results/testimonials",
      "Blog/resources",
      "Contact form"
    ],
    
    keyPatterns: [
      "Practice areas must be clear — specialize messaging",
      "Credentials and bar memberships displayed",
      "Free consultation is standard offer",
      "Trust signals: awards, case results, 'No fee unless we win'",
      "Professional, serious tone"
    ],
    
    questionsToAsk: [
      {
        question: "What's your main practice area?",
        options: ["Personal Injury", "Family Law", "Criminal Defense", "Business/Corporate", "Estate Planning", "Immigration", "Multiple/General Practice"],
        why: "Messaging and imagery vary significantly by practice area"
      }
    ]
  },

  "accounting": {
    industry: "Accounting / Tax",
    keywords: ["accountant", "accounting", "cpa", "tax", "bookkeeping", "tax preparation"],
    
    howThisBusinessWorks: `
      Accountants provide tax, bookkeeping, and financial services. 
      Seasonal (tax season) and ongoing (monthly bookkeeping). 
      Trust and credentials critical.
    `,
    
    userTypes: [
      { name: "Client", does: "Submit documents, view returns, communicate" },
      { name: "Accountant", does: "Manage clients, documents, deadlines" }
    ],
    
    commonFeatures: [
      "Services (tax prep, bookkeeping, payroll, advisory)",
      "Who you serve (individuals, small business, etc.)",
      "About/credentials",
      "Client portal (document upload)",
      "Contact/consultation request"
    ],
    
    keyPatterns: [
      "CPA credential is key trust signal",
      "Client portal for documents is expected",
      "Tax deadline reminders are valuable",
      "Specialization helps (small business, real estate investors, etc.)"
    ]
  },

  "consulting": {
    industry: "Consulting",
    keywords: ["consultant", "consulting", "advisory", "business consultant", "strategy"],
    
    howThisBusinessWorks: `
      Consultants provide expertise and advice. Project or retainer based.
      Thought leadership and case studies drive leads.
    `,
    
    userTypes: [
      { name: "Potential Client", does: "Research, request consultation" },
      { name: "Consultant", does: "Showcase expertise, generate leads" }
    ],
    
    commonFeatures: [
      "Services/expertise areas",
      "Case studies/results",
      "About/bio",
      "Thought leadership (blog, resources)",
      "Contact/book consultation"
    ],
    
    keyPatterns: [
      "Case studies prove results",
      "Thought leadership builds authority",
      "Clear specialization helps positioning"
    ]
  },

  "real_estate": {
    industry: "Real Estate",
    keywords: ["real estate", "realtor", "real estate agent", "property", "homes for sale"],
    
    howThisBusinessWorks: `
      Real estate agents help buy/sell properties. Commission-based.
      Listings are key. Personal brand matters. Local expertise.
    `,
    
    userTypes: [
      { name: "Buyer/Seller", does: "Search listings, contact agent, request valuation" },
      { name: "Agent", does: "Manage listings, leads, client relationships" }
    ],
    
    commonFeatures: [
      "Listings (if IDX integration)",
      "Home valuation tool",
      "Agent profile",
      "Neighborhoods/areas served",
      "Testimonials",
      "Market updates/blog",
      "Contact"
    ],
    
    keyPatterns: [
      "Listings integration (MLS/IDX) is complex but valuable",
      "Home valuation is excellent lead magnet",
      "Testimonials from happy buyers/sellers are powerful",
      "Local expertise matters — feature neighborhoods"
    ]
  },

  "insurance": {
    industry: "Insurance",
    keywords: ["insurance", "insurance agent", "auto insurance", "home insurance", "life insurance"],
    
    howThisBusinessWorks: `
      Insurance agents sell policies and service clients. Trust and 
      education focused. Quote request is main conversion.
    `,
    
    userTypes: [
      { name: "Potential Client", does: "Get quotes, compare, purchase" },
      { name: "Agent", does: "Generate leads, service clients" }
    ],
    
    commonFeatures: [
      "Insurance types offered",
      "Quote request form",
      "About the agency",
      "Carriers represented",
      "Claims support info",
      "Educational content"
    ],
    
    keyPatterns: [
      "Quote request is main CTA",
      "List carriers represented",
      "Educational approach builds trust",
      "Claims support is differentiator"
    ]
  },

  // ==========================================================================
  // MEDICAL / HEALTH
  // ==========================================================================

  "dental": {
    industry: "Dental Practice",
    keywords: ["dentist", "dental", "teeth", "dental office", "orthodontist"],
    
    howThisBusinessWorks: `
      Dental practices provide preventive and restorative care. 
      Insurance relationships matter. Fear reduction is part of marketing.
    `,
    
    userTypes: [
      { name: "Patient", does: "Book appointments, view records, pay bills" },
      { name: "Office", does: "Manage appointments, patient records" }
    ],
    
    commonFeatures: [
      "Services (cleanings, fillings, cosmetic, etc.)",
      "Doctor/team profiles",
      "Online booking",
      "Insurance accepted",
      "Patient forms",
      "New patient specials",
      "Comfort amenities"
    ],
    
    keyPatterns: [
      "Fear/anxiety reduction is important messaging",
      "Insurance list is frequently searched",
      "New patient specials drive trials",
      "Before/after photos for cosmetic",
      "Online forms save office time"
    ]
  },

  "medical_clinic": {
    industry: "Medical Clinic",
    keywords: ["doctor", "clinic", "medical", "physician", "healthcare", "urgent care", "family medicine"],
    
    howThisBusinessWorks: `
      Medical clinics provide primary or specialty care. Insurance and 
      location drive patient choice. Trust and credentials essential.
    `,
    
    userTypes: [
      { name: "Patient", does: "Book appointments, access portal" },
      { name: "Staff", does: "Manage appointments, records" }
    ],
    
    commonFeatures: [
      "Services/specialties",
      "Provider profiles",
      "Online appointment booking",
      "Patient portal",
      "Insurance accepted",
      "New patient info",
      "Hours and location"
    ],
    
    keyPatterns: [
      "Provider credentials important",
      "Insurance list is critical",
      "Patient portal expected",
      "Telehealth options increasingly important"
    ]
  },

  "chiropractic": {
    industry: "Chiropractic",
    keywords: ["chiropractor", "chiropractic", "spine", "back pain", "adjustment"],
    
    howThisBusinessWorks: `
      Chiropractors provide spinal adjustments and related care. 
      Education-focused marketing. First visit special common.
    `,
    
    userTypes: [
      { name: "Patient", does: "Book appointment, learn about care" },
      { name: "Doctor", does: "Manage schedule, patient records" }
    ],
    
    commonFeatures: [
      "Services/techniques",
      "Conditions treated",
      "Doctor bio",
      "New patient special",
      "Educational content",
      "Testimonials",
      "Online booking"
    ],
    
    keyPatterns: [
      "Educational content builds trust (what is chiropractic?)",
      "New patient special is standard",
      "Conditions list helps SEO (back pain, headaches, etc.)",
      "Before/after or patient stories are powerful"
    ]
  },

  "mental_health": {
    industry: "Mental Health / Therapy",
    keywords: ["therapist", "therapy", "counseling", "psychologist", "mental health", "counselor"],
    
    howThisBusinessWorks: `
      Therapists provide mental health services. Privacy critical.
      Finding the right fit matters — personality/approach shown.
    `,
    
    userTypes: [
      { name: "Client", does: "Find therapist, book session" },
      { name: "Therapist", does: "Manage schedule, clients" }
    ],
    
    commonFeatures: [
      "Specialties/issues treated",
      "Approach/modalities",
      "Therapist bio (warm, relatable)",
      "Insurance/payment",
      "Contact/consultation request",
      "Telehealth options"
    ],
    
    keyPatterns: [
      "Warm, approachable tone",
      "Specialty areas matter (anxiety, couples, trauma)",
      "Privacy assurances",
      "Consultation helps find fit"
    ]
  },

  // ==========================================================================
  // RETAIL & CANNABIS
  // ==========================================================================

  "ecommerce": {
    industry: "E-commerce / Online Store",
    keywords: ["ecommerce", "online store", "shop", "store", "retail", "products"],
    
    howThisBusinessWorks: `
      E-commerce sells products online. Customer journey: browse → add to cart → 
      checkout → receive. Conversion optimization is key.
    `,
    
    userTypes: [
      { name: "Customer", does: "Browse, add to cart, checkout, track orders" },
      { name: "Owner", does: "Manage products, orders, inventory, analytics" }
    ],
    
    commonFeatures: [
      "Product catalog with categories",
      "Product pages (images, description, variants, price)",
      "Shopping cart",
      "Checkout flow",
      "User accounts (optional)",
      "Order tracking",
      "Search and filters",
      "Reviews"
    ],
    
    keyPatterns: [
      "Product photography is critical",
      "Cart abandonment is common — minimize checkout friction",
      "Trust signals (secure checkout, reviews, returns policy)",
      "Mobile shopping is majority of traffic"
    ]
  },

  "cannabis_dispensary": {
    industry: "Cannabis Dispensary",
    keywords: ["dispensary", "cannabis dispensary", "marijuana", "weed", "pot shop"],
    
    howThisBusinessWorks: `
      Dispensaries sell cannabis products. Highly regulated — age verification, 
      compliance required. Menu changes frequently. Online ordering common.
    `,
    
    userTypes: [
      { name: "Customer", does: "Browse menu, order online, pickup" },
      { name: "Budtender", does: "Process orders, advise customers" },
      { name: "Manager", does: "Manage inventory, compliance" }
    ],
    
    commonFeatures: [
      "Product menu with categories (flower, edibles, concentrates, etc.)",
      "Age verification gate",
      "Online ordering (pickup or delivery where legal)",
      "Deals/specials",
      "Store info (hours, location)",
      "Loyalty program"
    ],
    
    keyPatterns: [
      "Age verification is legally required",
      "Menu integration with POS (Dutchie, Jane, etc.) is common",
      "Deals drive traffic — feature prominently",
      "Product education helps customers"
    ]
  },

  "cannabis_cultivation": {
    industry: "Cannabis Cultivation / Farm",
    keywords: ["cannabis cultivation", "cannabis farm", "grow", "cultivation", "cannabis grower"],
    
    howThisBusinessWorks: `
      Cannabis farms grow and sell wholesale to dispensaries or manufacturers.
      Highly regulated — seed-to-sale tracking required. Compliance is critical.
    `,
    
    userTypes: [
      { name: "Farmer/Cultivator", does: "Track inventory, update batches, maintain compliance" },
      { name: "Wholesaler/Buyer", does: "Browse catalog, place orders" },
      { name: "Compliance Officer", does: "Generate reports, audit tracking" }
    ],
    
    commonFeatures: [
      "Inventory tracking (batch/lot based)",
      "Compliance fields (THC %, harvest date, test results)",
      "Catalog for wholesale buyers",
      "Order management",
      "Reporting for state compliance",
      "Chain of custody tracking"
    ],
    
    keyPatterns: [
      "METRC integration (CA) or equivalent state system",
      "Batch/lot tracking is legally required",
      "Test results must be tracked and available",
      "Chain of custody documentation",
      "Wholesale catalog for B2B sales"
    ],
    
    commonDataModels: [
      { entity: "Batch", fields: ["batch_id", "strain", "plant_count", "harvest_date", "status", "location"] },
      { entity: "Product", fields: ["name", "strain", "category", "thc_percent", "cbd_percent", "batch_id", "quantity", "price_wholesale"] },
      { entity: "TestResult", fields: ["batch_id", "lab", "test_date", "thc", "cbd", "terpenes", "contaminants", "pass_fail", "certificate_url"] },
      { entity: "Transfer", fields: ["from", "to", "products", "manifest_number", "date", "status"] }
    ],
    
    questionsToAsk: [
      {
        question: "What's the main purpose of this system?",
        options: [
          "Internal inventory tracking (just our farm)",
          "Wholesale catalog (buyers browse our products)",
          "Both inventory + wholesale catalog",
          "Full seed-to-sale with compliance reporting"
        ],
        why: "Complexity varies significantly — simple tracking vs full compliance system"
      }
    ]
  },

  // ==========================================================================
  // TECH & DIGITAL
  // ==========================================================================

  "saas": {
    industry: "SaaS / Software",
    keywords: ["saas", "software", "app", "platform", "startup", "tech"],
    
    howThisBusinessWorks: `
      SaaS companies sell software subscriptions. Marketing site converts 
      visitors to trials/demos. Product-led growth is common.
    `,
    
    userTypes: [
      { name: "Visitor", does: "Learn about product, sign up for trial, see pricing" },
      { name: "User", does: "Use the product (separate from marketing site)" }
    ],
    
    commonFeatures: [
      "Hero with clear value proposition",
      "Feature showcase",
      "Pricing table",
      "Social proof (logos, testimonials, case studies)",
      "Demo video or product screenshots",
      "FAQ",
      "CTA to sign up or request demo"
    ],
    
    keyPatterns: [
      "Clear value prop in hero (what it does, for whom)",
      "Feature highlights with benefits not just features",
      "Pricing transparency (or clear 'Contact Sales')",
      "Social proof from recognizable companies",
      "Demo or video shows the product"
    ]
  },

  "agency": {
    industry: "Digital Agency",
    keywords: ["agency", "digital agency", "marketing agency", "design agency", "web agency"],
    
    howThisBusinessWorks: `
      Agencies provide services (design, development, marketing) to clients.
      Portfolio and case studies drive leads. Project-based or retainer.
    `,
    
    userTypes: [
      { name: "Potential Client", does: "View work, learn about services, contact" },
      { name: "Agency", does: "Showcase work, generate leads" }
    ],
    
    commonFeatures: [
      "Services offered",
      "Portfolio/case studies",
      "Team/about",
      "Process explanation",
      "Contact/project inquiry form"
    ],
    
    keyPatterns: [
      "Portfolio is the main selling tool",
      "Case studies with results > just pretty pictures",
      "Process transparency builds trust",
      "Team personalities can differentiate"
    ]
  },

  // ==========================================================================
  // EVENTS & CREATIVE
  // ==========================================================================

  "photography": {
    industry: "Photography",
    keywords: ["photographer", "photography", "photos", "portraits", "wedding photographer"],
    
    howThisBusinessWorks: `
      Photographers sell shoots and images. Portfolio is everything.
      Session types vary (portrait, wedding, commercial). Booking required.
    `,
    
    userTypes: [
      { name: "Client", does: "View portfolio, book session, receive photos" },
      { name: "Photographer", does: "Showcase work, manage bookings, deliver" }
    ],
    
    commonFeatures: [
      "Portfolio gallery (the star of the show)",
      "Session types and pricing",
      "About/style",
      "Booking/contact",
      "Client galleries (optional)"
    ],
    
    keyPatterns: [
      "Portfolio quality = business quality in client's mind",
      "Style should be evident — photographers have a look",
      "Investment/pricing often on application (especially wedding)",
      "Client galleries for delivery are value-add"
    ],
    
    questionsToAsk: [
      {
        question: "What type of photography is your focus?",
        options: ["Portraits (family, headshots)", "Weddings/Events", "Commercial/Product", "Multiple types"],
        why: "Affects layout — wedding photographers have different needs than product photographers"
      }
    ]
  },

  "event_planning": {
    industry: "Event Planning",
    keywords: ["event planner", "event planning", "wedding planner", "party planner", "events"],
    
    howThisBusinessWorks: `
      Event planners coordinate events — weddings, corporate, parties.
      Portfolio and testimonials are key. Consultation required.
    `,
    
    userTypes: [
      { name: "Client", does: "View portfolio, request consultation" },
      { name: "Planner", does: "Showcase events, manage inquiries" }
    ],
    
    commonFeatures: [
      "Portfolio of past events",
      "Services (full planning, day-of coordination, etc.)",
      "Testimonials",
      "Process explanation",
      "Consultation request"
    ],
    
    keyPatterns: [
      "Photos of past events are crucial",
      "Testimonials from happy couples/clients",
      "Service tiers (full planning vs partial)",
      "Vendor relationships can be highlighted"
    ]
  },

  // ==========================================================================
  // EDUCATION
  // ==========================================================================

  "tutoring": {
    industry: "Tutoring / Education",
    keywords: ["tutor", "tutoring", "lessons", "teaching", "education", "learning"],
    
    howThisBusinessWorks: `
      Tutors provide one-on-one or group instruction. Subject expertise 
      and results matter. Scheduling is key.
    `,
    
    userTypes: [
      { name: "Student/Parent", does: "Find tutor, book sessions, track progress" },
      { name: "Tutor", does: "Manage schedule, students, materials" }
    ],
    
    commonFeatures: [
      "Subjects/levels offered",
      "Tutor bio and credentials",
      "Booking/scheduling",
      "Pricing",
      "Testimonials/results",
      "Online vs in-person"
    ],
    
    keyPatterns: [
      "Credentials and results matter",
      "Testimonials from parents are powerful",
      "Subject-specific landing pages help SEO",
      "Free consultation/assessment is common"
    ]
  },

  "online_courses": {
    industry: "Online Courses",
    keywords: ["course", "online course", "training", "workshop", "bootcamp", "class"],
    
    howThisBusinessWorks: `
      Course creators sell educational content. Can be self-paced or 
      cohort-based. Landing page optimizes for enrollment.
    `,
    
    userTypes: [
      { name: "Student", does: "Enroll, consume content, complete course" },
      { name: "Creator", does: "Create content, manage students, track progress" }
    ],
    
    commonFeatures: [
      "Course description and curriculum",
      "Instructor bio and credentials",
      "Testimonials/results",
      "Pricing (one-time or subscription)",
      "FAQ",
      "Preview/sample content",
      "Enrollment CTA"
    ],
    
    keyPatterns: [
      "Transformation/outcome focus (what will they achieve?)",
      "Social proof from past students",
      "Curriculum breakdown builds value",
      "Risk reversal (guarantee)",
      "Urgency/scarcity can drive enrollment"
    ]
  },

  // ==========================================================================
  // AUTOMOTIVE
  // ==========================================================================

  "auto_repair": {
    industry: "Auto Repair",
    keywords: ["auto repair", "mechanic", "car repair", "auto shop", "garage"],
    
    howThisBusinessWorks: `
      Auto shops repair and maintain vehicles. Trust is critical — people 
      fear being ripped off. Reviews and transparency matter.
    `,
    
    userTypes: [
      { name: "Customer", does: "Request quote, schedule service, approve repairs" },
      { name: "Shop", does: "Manage service, communicate with customers" }
    ],
    
    commonFeatures: [
      "Services (oil change, brakes, engine, etc.)",
      "Quote request or scheduler",
      "Trust signals (certifications, reviews)",
      "Makes/models served",
      "Hours and location"
    ],
    
    keyPatterns: [
      "Trust is paramount — ASE certification, reviews",
      "Transparency about pricing helps",
      "Appointment scheduling reduces friction",
      "Make/model expertise can differentiate"
    ]
  },

  "detailing": {
    industry: "Auto Detailing",
    keywords: ["auto detailing", "car detailing", "car wash", "mobile detailing", "ceramic coating"],
    
    howThisBusinessWorks: `
      Detailers clean and protect vehicles. Mobile detailing is growing.
      Visual before/after is powerful marketing.
    `,
    
    userTypes: [
      { name: "Customer", does: "View packages, book service" },
      { name: "Detailer", does: "Manage schedule, showcase work" }
    ],
    
    commonFeatures: [
      "Service packages with pricing",
      "Before/after gallery",
      "Online booking",
      "Mobile vs fixed location",
      "Add-on services (ceramic, PPF)"
    ],
    
    keyPatterns: [
      "Before/after photos are crucial",
      "Package pricing is standard",
      "Mobile convenience is selling point",
      "Upsells (ceramic coating, interior) drive revenue"
    ]
  },

  // ==========================================================================
  // CONSTRUCTION
  // ==========================================================================

  "construction": {
    industry: "Construction / Contractor",
    keywords: ["construction", "contractor", "general contractor", "builder", "remodel", "renovation"],
    
    howThisBusinessWorks: `
      Contractors build and remodel. Project-based, big tickets.
      Trust, portfolio, and references are critical.
    `,
    
    userTypes: [
      { name: "Homeowner", does: "Request estimate, review proposals, track project" },
      { name: "Contractor", does: "Manage leads, estimates, projects" }
    ],
    
    commonFeatures: [
      "Services (remodel, build, additions, etc.)",
      "Portfolio with project photos",
      "Free estimate CTA",
      "Testimonials/references",
      "License and insurance",
      "About/team",
      "Service area"
    ],
    
    keyPatterns: [
      "Portfolio is essential — show the work",
      "License and insurance must be displayed",
      "Process explanation builds confidence",
      "Financing options for big projects"
    ]
  },

  // ==========================================================================
  // NON-PROFIT
  // ==========================================================================

  "nonprofit": {
    industry: "Non-Profit / Charity",
    keywords: ["nonprofit", "non-profit", "charity", "foundation", "ngo", "church", "ministry"],
    
    howThisBusinessWorks: `
      Non-profits rely on donations and volunteers. Mission communication 
      and impact stories drive engagement.
    `,
    
    userTypes: [
      { name: "Donor", does: "Learn about cause, donate, see impact" },
      { name: "Volunteer", does: "Find opportunities, sign up" },
      { name: "Staff", does: "Manage donations, volunteers, programs" }
    ],
    
    commonFeatures: [
      "Mission and impact",
      "Donation (prominent CTA)",
      "Programs/initiatives",
      "Impact stories/testimonials",
      "Volunteer opportunities",
      "Events",
      "About/team"
    ],
    
    keyPatterns: [
      "Mission clarity is paramount",
      "Donate button must be prominent",
      "Impact stories show where money goes",
      "Transparency builds trust",
      "Events drive engagement"
    ]
  }
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DomainKnowledge {
  industry: string;
  keywords: string[];
  howThisBusinessWorks: string;
  userTypes: Array<{ name: string; does: string }>;
  commonFeatures: string[];
  keyPatterns: string[];
  commonDataModels?: Array<{ entity: string; fields: string[]; relationships?: string[] }>;
  industrySpecificTerms?: string[];
  questionsToAsk?: Array<{ question: string; options: string[]; why: string }>;
}

// ============================================================================
// DOMAIN DETECTION
// ============================================================================

export function detectDomain(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  
  for (const [key, domain] of Object.entries(DOMAIN_KNOWLEDGE)) {
    for (const keyword of domain.keywords) {
      if (lower.includes(keyword)) {
        return key;
      }
    }
  }
  
  return null; // Unknown domain — trigger research
}

// ============================================================================
// FORMAT DOMAIN KNOWLEDGE FOR PROMPT INJECTION
// ============================================================================

export function formatDomainKnowledge(domainKey: string): string {
  const domain = DOMAIN_KNOWLEDGE[domainKey];
  if (!domain) return '';
  
  let formatted = `
═══════════════════════════════════════════════════════════════════════════════
DOMAIN KNOWLEDGE: ${domain.industry.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

HOW THIS BUSINESS WORKS:
${domain.howThisBusinessWorks.trim()}

USER TYPES:
${domain.userTypes.map(u => `• ${u.name}: ${u.does}`).join('\n')}

COMMON FEATURES:
${domain.commonFeatures.map(f => `• ${f}`).join('\n')}

KEY PATTERNS (What works in this industry):
${domain.keyPatterns.map(p => `• ${p}`).join('\n')}
`;

  if (domain.commonDataModels) {
    formatted += `
DATA MODELS:
${domain.commonDataModels.map(m => `• ${m.entity}: ${m.fields.join(', ')}`).join('\n')}
`;
  }

  if (domain.industrySpecificTerms) {
    formatted += `
INDUSTRY TERMS: ${domain.industrySpecificTerms.join(', ')}
`;
  }

  return formatted;
}

export default DOMAIN_KNOWLEDGE;
