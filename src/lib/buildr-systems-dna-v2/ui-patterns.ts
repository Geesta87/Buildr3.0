// ============================================================================
// BUILDR SYSTEMS DNA v2 - UI PATTERNS MODULE
// ============================================================================
// Added to the prompt when building anything with a frontend.
// Contains design patterns, component structures, and implementation guides.
// ============================================================================

export const UI_PATTERNS = `
═══════════════════════════════════════════════════════════════════════════════
UI PATTERNS MODULE
═══════════════════════════════════════════════════════════════════════════════

## CORE PRINCIPLES

1. **Mobile-First**: Design for mobile, enhance for desktop
2. **Hierarchy**: Most important info is largest and first
3. **Consistency**: Same patterns throughout
4. **Accessibility**: Works for everyone (ARIA, contrast, keyboard)
5. **Performance**: Fast loading, optimized images

## LAYOUT PATTERNS

### Marketing/Landing Pages
\`\`\`
┌─────────────────────────────────────┐
│           Navigation                │
├─────────────────────────────────────┤
│             Hero                    │
│    (value prop, CTA, image/video)   │
├─────────────────────────────────────┤
│         Trust Indicators            │
│    (logos, stats, badges)           │
├─────────────────────────────────────┤
│      Features / Services            │
├─────────────────────────────────────┤
│         Social Proof                │
│    (testimonials, reviews)          │
├─────────────────────────────────────┤
│        Call to Action               │
├─────────────────────────────────────┤
│            Footer                   │
└─────────────────────────────────────┘
\`\`\`

### Application/Dashboard
\`\`\`
┌──────┬──────────────────────────────┐
│      │        Top Bar               │
│ Side │   (search, user, notifs)     │
│ bar  ├──────────────────────────────┤
│      │     Main Content Area        │
│      │   ┌──────┬──────┬──────┐    │
│      │   │ Stat │ Stat │ Stat │    │
│      │   └──────┴──────┴──────┘    │
│      │   ┌──────────────────────┐   │
│      │   │     Data Table       │   │
│      │   └──────────────────────┘   │
└──────┴──────────────────────────────┘
\`\`\`

## COMPONENT LIBRARY

### Navigation (Responsive)
\`\`\`html
<nav class="bg-white shadow-sm sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4">
    <div class="flex justify-between items-center h-16">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2">
        <img src="/logo.svg" alt="Logo" class="h-8 w-auto">
        <span class="font-bold text-xl">Brand</span>
      </a>
      
      <!-- Desktop Menu -->
      <div class="hidden md:flex items-center gap-8">
        <a href="#features" class="text-gray-600 hover:text-gray-900 transition">Features</a>
        <a href="#pricing" class="text-gray-600 hover:text-gray-900 transition">Pricing</a>
        <a href="#contact" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          Get Started
        </a>
      </div>
      
      <!-- Mobile Menu Button -->
      <button id="mobile-menu-btn" class="md:hidden p-2 rounded-lg hover:bg-gray-100">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
    
    <!-- Mobile Menu (hidden by default) -->
    <div id="mobile-menu" class="hidden md:hidden pb-4 space-y-2">
      <a href="#features" class="block py-2 px-3 rounded-lg hover:bg-gray-100">Features</a>
      <a href="#pricing" class="block py-2 px-3 rounded-lg hover:bg-gray-100">Pricing</a>
      <a href="#contact" class="block py-2 px-3 bg-blue-600 text-white text-center rounded-lg">Get Started</a>
    </div>
  </div>
</nav>
\`\`\`

### Hero Section
\`\`\`html
<section class="bg-gradient-to-br from-blue-50 to-white py-20 lg:py-28">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
          Badge or Tagline
        </span>
        <h1 class="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Your Compelling Headline Here
        </h1>
        <p class="text-xl text-gray-600 mb-8 leading-relaxed">
          A clear description of your value proposition in one or two sentences.
        </p>
        <div class="flex flex-wrap gap-4">
          <a href="#" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/30">
            Primary CTA
          </a>
          <a href="#" class="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
            Secondary CTA
          </a>
        </div>
        <div class="flex items-center gap-6 mt-8 text-sm text-gray-500">
          <span class="flex items-center gap-1">✓ Free trial</span>
          <span class="flex items-center gap-1">✓ No credit card</span>
        </div>
      </div>
      <div class="relative">
        <img src="hero-image.jpg" alt="Hero" class="rounded-2xl shadow-2xl">
      </div>
    </div>
  </div>
</section>
\`\`\`

### Service/Feature Cards
\`\`\`html
<section class="py-20 bg-white">
  <div class="max-w-7xl mx-auto px-4">
    <div class="text-center mb-16">
      <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">Brief description of what you offer</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Card -->
      <div class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-200 transition group">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
          <svg class="w-6 h-6 text-blue-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Service Name</h3>
        <p class="text-gray-600 mb-4">Brief description of this service and the value it provides to customers.</p>
        <a href="#" class="text-blue-600 font-medium hover:text-blue-700 inline-flex items-center gap-1">
          Learn more <span>→</span>
        </a>
      </div>
      <!-- Repeat for other cards -->
    </div>
  </div>
</section>
\`\`\`

### Testimonials
\`\`\`html
<section class="py-20 bg-gray-50">
  <div class="max-w-7xl mx-auto px-4">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Testimonial Card -->
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <div class="flex items-center gap-1 mb-4">
          <!-- 5 stars -->
          <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
          <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
          <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
          <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
          <svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
        </div>
        <p class="text-gray-700 mb-6">"This is a genuine testimonial that speaks to the quality of service and results achieved."</p>
        <div class="flex items-center gap-3">
          <img src="avatar.jpg" alt="Customer" class="w-10 h-10 rounded-full object-cover">
          <div>
            <p class="font-semibold text-gray-900">Customer Name</p>
            <p class="text-sm text-gray-500">Role / Company</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
\`\`\`

### Contact Form
\`\`\`html
<section id="contact" class="py-20 bg-white">
  <div class="max-w-3xl mx-auto px-4">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-gray-900 mb-4">Get In Touch</h2>
      <p class="text-xl text-gray-600">We'd love to hear from you</p>
    </div>
    
    <form class="space-y-6" id="contact-form">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input type="text" id="name" name="name" required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" id="email" name="email" required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
        </div>
      </div>
      
      <div>
        <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">Phone (optional)</label>
        <input type="tel" id="phone" name="phone"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
      </div>
      
      <div>
        <label for="message" class="block text-sm font-medium text-gray-700 mb-2">Message</label>
        <textarea id="message" name="message" rows="4" required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"></textarea>
      </div>
      
      <button type="submit"
        class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition">
        Send Message
      </button>
    </form>
    
    <!-- Success Message (hidden by default) -->
    <div id="success-message" class="hidden text-center py-8">
      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
      <p class="text-gray-600">We'll get back to you soon.</p>
    </div>
  </div>
</section>
\`\`\`

### Footer
\`\`\`html
<footer class="bg-gray-900 text-white py-12">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid md:grid-cols-4 gap-8 mb-8">
      <!-- Brand -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <img src="/logo-white.svg" alt="Logo" class="h-8 w-auto">
          <span class="font-bold text-xl">Brand</span>
        </div>
        <p class="text-gray-400 text-sm">Brief description of your company and what you do.</p>
      </div>
      
      <!-- Links -->
      <div>
        <h4 class="font-semibold mb-4">Services</h4>
        <ul class="space-y-2 text-gray-400 text-sm">
          <li><a href="#" class="hover:text-white transition">Service One</a></li>
          <li><a href="#" class="hover:text-white transition">Service Two</a></li>
          <li><a href="#" class="hover:text-white transition">Service Three</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Company</h4>
        <ul class="space-y-2 text-gray-400 text-sm">
          <li><a href="#" class="hover:text-white transition">About Us</a></li>
          <li><a href="#" class="hover:text-white transition">Careers</a></li>
          <li><a href="#" class="hover:text-white transition">Contact</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Contact</h4>
        <ul class="space-y-2 text-gray-400 text-sm">
          <li>123 Main Street</li>
          <li>City, State 12345</li>
          <li><a href="tel:5551234567" class="hover:text-white transition">(555) 123-4567</a></li>
          <li><a href="mailto:info@example.com" class="hover:text-white transition">info@example.com</a></li>
        </ul>
      </div>
    </div>
    
    <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-gray-400 text-sm">© 2024 Brand Name. All rights reserved.</p>
      <div class="flex gap-4">
        <a href="#" class="text-gray-400 hover:text-white transition">Privacy Policy</a>
        <a href="#" class="text-gray-400 hover:text-white transition">Terms of Service</a>
      </div>
    </div>
  </div>
</footer>
\`\`\`

## DASHBOARD COMPONENTS

### Sidebar Navigation
\`\`\`html
<aside class="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
  <!-- Logo -->
  <div class="flex items-center gap-2 mb-8 px-2">
    <div class="w-8 h-8 bg-blue-600 rounded-lg"></div>
    <span class="font-bold text-lg">Dashboard</span>
  </div>
  
  <!-- Navigation -->
  <nav class="flex-1 space-y-1">
    <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800 text-white">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
      <span>Dashboard</span>
    </a>
    <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
      </svg>
      <span>Customers</span>
    </a>
    <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <span>Orders</span>
    </a>
    <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <span>Settings</span>
    </a>
  </nav>
  
  <!-- User -->
  <div class="border-t border-gray-800 pt-4 mt-4">
    <div class="flex items-center gap-3 px-2">
      <img src="avatar.jpg" alt="User" class="w-8 h-8 rounded-full">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">John Doe</p>
        <p class="text-xs text-gray-400 truncate">john@example.com</p>
      </div>
    </div>
  </div>
</aside>
\`\`\`

### Stats Cards
\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <!-- Stat Card -->
  <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div class="flex items-center justify-between mb-4">
      <span class="text-gray-500 text-sm font-medium">Total Revenue</span>
      <span class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </span>
    </div>
    <p class="text-3xl font-bold text-gray-900">$45,231</p>
    <p class="text-sm text-green-600 mt-1 flex items-center gap-1">
      <span>↑</span> 12% from last month
    </p>
  </div>
  
  <!-- More stat cards... -->
</div>
\`\`\`

### Data Table
\`\`\`html
<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
  <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
    <h3 class="font-semibold text-gray-900">Recent Orders</h3>
    <a href="#" class="text-blue-600 text-sm font-medium hover:text-blue-700">View All</a>
  </div>
  
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#ORD-001</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center gap-3">
              <img src="avatar.jpg" alt="" class="w-8 h-8 rounded-full">
              <span class="text-sm text-gray-900">John Doe</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$125.00</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Completed</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            <button class="text-blue-600 hover:text-blue-700 font-medium">View</button>
          </td>
        </tr>
        <!-- More rows... -->
      </tbody>
    </table>
  </div>
</div>
\`\`\`

### Modal
\`\`\`html
<!-- Modal Backdrop -->
<div id="modal-backdrop" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
  <!-- Modal Content -->
  <div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b">
      <h3 class="font-semibold text-lg text-gray-900">Modal Title</h3>
      <button onclick="closeModal()" class="p-1 hover:bg-gray-100 rounded-lg transition">
        <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <!-- Body -->
    <div class="px-6 py-4">
      <p class="text-gray-600">Modal content goes here.</p>
    </div>
    
    <!-- Footer -->
    <div class="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
      <button onclick="closeModal()" class="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition">
        Cancel
      </button>
      <button class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
        Confirm
      </button>
    </div>
  </div>
</div>

<script>
function openModal() {
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
}
</script>
\`\`\`

## JAVASCRIPT PATTERNS

### Mobile Menu Toggle
\`\`\`javascript
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('hidden');
});
\`\`\`

### Form Handling
\`\`\`javascript
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  // Show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  
  try {
    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Submit (replace with actual endpoint)
    // await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) });
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 1000));
    
    // Show success
    form.classList.add('hidden');
    document.getElementById('success-message').classList.remove('hidden');
    
  } catch (error) {
    alert('Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
\`\`\`

### Smooth Scroll
\`\`\`javascript
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile menu if open
      document.getElementById('mobile-menu')?.classList.add('hidden');
    }
  });
});
\`\`\`

### Tabs
\`\`\`javascript
document.querySelectorAll('[data-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabGroup = tab.closest('[data-tab-group]');
    const targetId = tab.dataset.tab;
    
    // Update active tab
    tabGroup.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show target content
    tabGroup.querySelectorAll('[data-tab-content]').forEach(content => {
      content.classList.toggle('hidden', content.dataset.tabContent !== targetId);
    });
  });
});
\`\`\`

## RESPONSIVE BREAKPOINTS

Use Tailwind's responsive prefixes:
- \`sm:\` - 640px and up (large phones)
- \`md:\` - 768px and up (tablets)
- \`lg:\` - 1024px and up (laptops)
- \`xl:\` - 1280px and up (desktops)
- \`2xl:\` - 1536px and up (large screens)

Example:
\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- 1 column on mobile, 2 on tablet, 3 on desktop -->
</div>
\`\`\`

## ACCESSIBILITY CHECKLIST

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus states are visible
- [ ] Interactive elements are keyboard accessible
- [ ] ARIA labels on icon-only buttons
- [ ] Proper heading hierarchy (h1 → h2 → h3)
`;

export default UI_PATTERNS;
