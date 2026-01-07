// ============================================================================
// BUILDR SYSTEMS DNA v2 - AUTH PATTERNS MODULE
// ============================================================================
// Added when the system needs user accounts, login, or role-based access.
// Contains authentication flows, session management, and authorization patterns.
// ============================================================================

export const AUTH_PATTERNS = `
═══════════════════════════════════════════════════════════════════════════════
AUTH PATTERNS MODULE
═══════════════════════════════════════════════════════════════════════════════

## WHEN TO USE AUTHENTICATION

Use auth when:
- Users need personal accounts (track their orders, appointments, etc.)
- Different users see different data
- Admin/staff vs customer distinction needed
- Sensitive data requires protection

## SUPABASE AUTH SETUP

### Initialize Auth
\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>
\`\`\`

## AUTHENTICATION FLOWS

### Sign Up
\`\`\`javascript
async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });
  
  if (error) throw error;
  return data;
}
\`\`\`

### Sign In
\`\`\`javascript
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}
\`\`\`

### Sign Out
\`\`\`javascript
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // Redirect to login or home
  window.location.href = '/login.html';
}
\`\`\`

### Password Reset
\`\`\`javascript
async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html'
  });
  
  if (error) throw error;
}

// On the reset password page
async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
}
\`\`\`

### Get Current User
\`\`\`javascript
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Synchronous check (may be stale)
function getSession() {
  return supabase.auth.getSession();
}
\`\`\`

### Listen for Auth Changes
\`\`\`javascript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  
  if (event === 'SIGNED_IN') {
    // User signed in
    showAuthenticatedUI(session.user);
  } else if (event === 'SIGNED_OUT') {
    // User signed out
    showUnauthenticatedUI();
  } else if (event === 'TOKEN_REFRESHED') {
    // Token was refreshed
  } else if (event === 'USER_UPDATED') {
    // User data changed
  }
});
\`\`\`

## UI COMPONENTS

### Login Form
\`\`\`html
<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Welcome Back</h1>
      <p class="text-gray-600 mt-2">Sign in to your account</p>
    </div>
    
    <form id="login-form" class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input type="email" id="email" name="email" required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <input type="password" id="password" name="password" required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
      </div>
      
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2">
          <input type="checkbox" class="rounded border-gray-300">
          <span class="text-sm text-gray-600">Remember me</span>
        </label>
        <a href="/forgot-password.html" class="text-sm text-blue-600 hover:text-blue-700">Forgot password?</a>
      </div>
      
      <!-- Error message -->
      <div id="error-message" class="hidden bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm"></div>
      
      <button type="submit" id="submit-btn"
        class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
        Sign In
      </button>
    </form>
    
    <p class="text-center mt-6 text-gray-600">
      Don't have an account? <a href="/signup.html" class="text-blue-600 hover:text-blue-700 font-medium">Sign up</a>
    </p>
  </div>
</div>

<script>
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');
  
  // Hide previous errors
  errorEl.classList.add('hidden');
  
  // Show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw error;
    
    // Redirect to dashboard
    window.location.href = '/dashboard.html';
    
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});
</script>
\`\`\`

### Sign Up Form
\`\`\`html
<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Create Account</h1>
      <p class="text-gray-600 mt-2">Get started for free</p>
    </div>
    
    <form id="signup-form" class="space-y-6">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
        <input type="text" id="name" name="name" required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
      </div>
      
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input type="email" id="email" name="email" required
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <input type="password" id="password" name="password" required minlength="6"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
        <p class="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
      </div>
      
      <div id="error-message" class="hidden bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm"></div>
      
      <button type="submit" id="submit-btn"
        class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
        Create Account
      </button>
    </form>
    
    <p class="text-center mt-6 text-gray-600">
      Already have an account? <a href="/login.html" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
    </p>
  </div>
</div>

<script>
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  const submitBtn = document.getElementById('submit-btn');
  
  errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });
    
    if (error) throw error;
    
    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Show confirmation message
      document.getElementById('signup-form').innerHTML = \`
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
          <p class="text-gray-600">We sent a confirmation link to <strong>\${email}</strong></p>
        </div>
      \`;
    } else {
      // Direct login (no email confirmation)
      window.location.href = '/dashboard.html';
    }
    
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});
</script>
\`\`\`

## PROTECTED ROUTES

### Require Authentication
\`\`\`javascript
// Put this at the top of protected pages
async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Not logged in - redirect to login
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  
  return session.user;
}

// Usage at page load
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return; // Will redirect
  
  // User is authenticated - load page content
  initializePage(user);
});
\`\`\`

### Role-Based Access
\`\`\`javascript
async function requireRole(allowedRoles) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }
  
  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    // Not authorized
    window.location.href = '/unauthorized.html';
    return null;
  }
  
  return { user: session.user, role: profile.role };
}

// Usage
document.addEventListener('DOMContentLoaded', async () => {
  const result = await requireRole(['admin', 'staff']);
  if (!result) return;
  
  // User has admin or staff role
  initializeAdminPage(result.user, result.role);
});
\`\`\`

## USER MENU COMPONENT

\`\`\`html
<div class="relative" id="user-menu-container">
  <!-- Logged Out State -->
  <div id="auth-buttons" class="flex items-center gap-4">
    <a href="/login.html" class="text-gray-600 hover:text-gray-900">Sign In</a>
    <a href="/signup.html" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Get Started</a>
  </div>
  
  <!-- Logged In State -->
  <div id="user-menu" class="hidden">
    <button id="user-menu-btn" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
      <img id="user-avatar" src="/default-avatar.png" alt="User" class="w-8 h-8 rounded-full">
      <span id="user-name" class="text-sm font-medium text-gray-700">User</span>
      <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
    
    <!-- Dropdown -->
    <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
      <a href="/dashboard.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Dashboard</a>
      <a href="/settings.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Settings</a>
      <hr class="my-2">
      <button onclick="handleSignOut()" class="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100">
        Sign Out
      </button>
    </div>
  </div>
</div>

<script>
// Check auth state on load
supabase.auth.onAuthStateChange((event, session) => {
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  
  if (session) {
    authButtons.classList.add('hidden');
    userMenu.classList.remove('hidden');
    
    // Update user info
    document.getElementById('user-name').textContent = session.user.user_metadata?.full_name || session.user.email;
    
    if (session.user.user_metadata?.avatar_url) {
      document.getElementById('user-avatar').src = session.user.user_metadata.avatar_url;
    }
  } else {
    authButtons.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
});

// Toggle dropdown
document.getElementById('user-menu-btn')?.addEventListener('click', () => {
  document.getElementById('user-dropdown').classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('user-menu-container');
  if (!container?.contains(e.target)) {
    document.getElementById('user-dropdown')?.classList.add('hidden');
  }
});

// Sign out handler
async function handleSignOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}
</script>
\`\`\`

## ROLE-BASED UI

### Show/Hide Based on Role
\`\`\`javascript
async function setupRoleBasedUI() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return;
  
  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  const role = profile?.role || 'user';
  
  // Show elements based on role
  document.querySelectorAll('[data-role]').forEach(el => {
    const allowedRoles = el.dataset.role.split(',');
    if (!allowedRoles.includes(role)) {
      el.remove(); // or el.classList.add('hidden')
    }
  });
}

// Usage in HTML
// <button data-role="admin">Delete User</button>
// <a href="/admin" data-role="admin,staff">Admin Panel</a>
\`\`\`

### Different Views by Role
\`\`\`javascript
async function renderDashboard() {
  const user = await requireAuth();
  if (!user) return;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  switch (profile?.role) {
    case 'admin':
      renderAdminDashboard();
      break;
    case 'staff':
      renderStaffDashboard();
      break;
    default:
      renderCustomerDashboard();
  }
}
\`\`\`

## SECURITY BEST PRACTICES

### Client-Side Validation is NOT Security
\`\`\`javascript
// ❌ WRONG - This can be bypassed
if (user.role === 'admin') {
  // Show admin features
}

// ✅ RIGHT - Use RLS on the database
// Even if someone bypasses the UI, the database will reject unauthorized requests
\`\`\`

### Always Use RLS
\`\`\`sql
-- Users can only see their own data
CREATE POLICY "Users see own data"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- This means even if someone manipulates the client code,
-- they can ONLY access their own orders
\`\`\`

### Don't Trust Client Data
\`\`\`javascript
// ❌ WRONG - Client sets the user_id
await supabase.from('orders').insert({
  user_id: someUserId, // Could be manipulated!
  ...orderData
});

// ✅ RIGHT - Server/RLS sets user_id
// Use a database trigger or RLS policy that automatically sets user_id to auth.uid()
\`\`\`

### Session Handling
\`\`\`javascript
// Always verify session server-side for sensitive operations
// The anon key only has access to what RLS allows
// For admin operations, use service role key on backend only
\`\`\`
`;

export default AUTH_PATTERNS;
