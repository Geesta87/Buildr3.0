// ============================================================================
// BUILDR SYSTEMS DNA v2 - DATABASE PATTERNS MODULE
// ============================================================================
// Added when the system needs data persistence.
// Contains Supabase patterns, data modeling, and CRUD operations.
// ============================================================================

export const DATABASE_PATTERNS = `
═══════════════════════════════════════════════════════════════════════════════
DATABASE PATTERNS MODULE
═══════════════════════════════════════════════════════════════════════════════

## WHEN TO USE A DATABASE

Use persistent storage when:
- Data needs to survive page refresh
- Multiple users access the same data
- Data relationships exist (users have orders, orders have items)
- History/audit trails are needed
- Search/filter functionality required

## SUPABASE SETUP

### Including Supabase
\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>
\`\`\`

### Environment-Based Config
\`\`\`javascript
// For production, these should come from environment variables
const supabaseConfig = {
  url: window.SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || 'your-anon-key'
};

const supabase = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
\`\`\`

## DATA MODELING PRINCIPLES

### 1. Identify Entities
What "things" exist in your system?
- Users, Products, Orders, Appointments, etc.

### 2. Define Relationships
How do entities relate?
- One-to-Many: User has many Orders
- Many-to-Many: Products have many Categories, Categories have many Products
- One-to-One: User has one Profile

### 3. Determine Fields
What data does each entity need?
- Required vs optional
- Data types (text, number, date, boolean, json)
- Constraints (unique, not null)

## COMMON SCHEMA PATTERNS

### Users & Profiles
\`\`\`sql
-- Users are managed by Supabase Auth
-- Profiles extend user data

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
\`\`\`

### Products / Services
\`\`\`sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0
);
\`\`\`

### Orders / Transactions
\`\`\`sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);
\`\`\`

### Appointments / Bookings
\`\`\`sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  service_id UUID REFERENCES services(id),
  staff_id UUID REFERENCES profiles(id), -- optional: specific staff member
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, no-show
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true
);
\`\`\`

### Points / Loyalty
\`\`\`sql
CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  points INTEGER NOT NULL, -- positive for earned, negative for spent
  type TEXT NOT NULL, -- 'earned', 'redeemed', 'expired', 'adjustment'
  reason TEXT, -- 'appointment_completed', 'reward_redeemed', 'referral_bonus'
  reference_id UUID, -- ID of related appointment/redemption
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reward_id UUID REFERENCES rewards(id) NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, fulfilled, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper function to get user's current points balance
CREATE OR REPLACE FUNCTION get_points_balance(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(points) FROM points_ledger WHERE user_id = user_uuid),
    0
  );
END;
$$ LANGUAGE plpgsql;
\`\`\`

### Inventory
\`\`\`sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT, -- 'each', 'lb', 'oz', 'g', etc.
  reorder_level INTEGER, -- alert when below this
  cost DECIMAL(10,2),
  price DECIMAL(10,2),
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) NOT NULL,
  type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'count'
  quantity INTEGER NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

## CRUD OPERATIONS

### Create (Insert)
\`\`\`javascript
async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      description: product.description,
      price: product.price,
      category_id: product.categoryId
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
\`\`\`

### Read (Select)
\`\`\`javascript
// Get all
async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Get one
async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Get with relations
async function getProductsWithCategories() {
  const { data, error } = await supabase
    .from('products')
    .select(\`
      *,
      category:categories(id, name)
    \`)
    .eq('active', true);
  
  if (error) throw error;
  return data;
}

// Filter and search
async function searchProducts(query, categoryId) {
  let request = supabase
    .from('products')
    .select('*')
    .eq('active', true);
  
  if (query) {
    request = request.ilike('name', \`%\${query}%\`);
  }
  
  if (categoryId) {
    request = request.eq('category_id', categoryId);
  }
  
  const { data, error } = await request.order('name');
  
  if (error) throw error;
  return data;
}
\`\`\`

### Update
\`\`\`javascript
async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
\`\`\`

### Delete
\`\`\`javascript
async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Soft delete (preferred)
async function softDeleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('id', id);
  
  if (error) throw error;
}
\`\`\`

## REAL-TIME SUBSCRIPTIONS

### Subscribe to Changes
\`\`\`javascript
// Subscribe to all changes on a table
const subscription = supabase
  .channel('products-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      console.log('Change received:', payload);
      
      if (payload.eventType === 'INSERT') {
        // Add to local state
        addProductToUI(payload.new);
      } else if (payload.eventType === 'UPDATE') {
        // Update local state
        updateProductInUI(payload.new);
      } else if (payload.eventType === 'DELETE') {
        // Remove from local state
        removeProductFromUI(payload.old.id);
      }
    }
  )
  .subscribe();

// Unsubscribe when done
// subscription.unsubscribe();
\`\`\`

### Subscribe to Specific Records
\`\`\`javascript
// Subscribe to a specific order
const subscription = supabase
  .channel(\`order-\${orderId}\`)
  .on(
    'postgres_changes',
    { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'orders',
      filter: \`id=eq.\${orderId}\`
    },
    (payload) => {
      updateOrderStatus(payload.new);
    }
  )
  .subscribe();
\`\`\`

## ROW LEVEL SECURITY (RLS)

### Enable RLS
\`\`\`sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
\`\`\`

### Common Policies
\`\`\`sql
-- Anyone can read active products
CREATE POLICY "Public can read active products"
ON products FOR SELECT
USING (active = true);

-- Users can only read their own orders
CREATE POLICY "Users can read own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Admins can do everything
CREATE POLICY "Admins have full access"
ON products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
\`\`\`

## ERROR HANDLING PATTERN

\`\`\`javascript
async function safeQuery(queryFn) {
  try {
    const result = await queryFn();
    return { data: result, error: null };
  } catch (error) {
    console.error('Database error:', error);
    return { data: null, error: error.message };
  }
}

// Usage
const { data: products, error } = await safeQuery(() => getProducts());

if (error) {
  showErrorMessage('Failed to load products. Please try again.');
} else {
  renderProducts(products);
}
\`\`\`

## LOADING STATES

\`\`\`javascript
async function loadData() {
  // Show loading
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('content').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  
  try {
    const data = await fetchData();
    
    // Show content
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
    
    renderData(data);
    
  } catch (error) {
    // Show error
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-message').textContent = error.message;
  }
}
\`\`\`

## LOCAL STORAGE FALLBACK

For simpler apps or demos without Supabase:

\`\`\`javascript
const Storage = {
  get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  remove(key) {
    localStorage.removeItem(key);
  },
  
  // CRUD helpers
  getAll(collection) {
    return this.get(collection) || [];
  },
  
  add(collection, item) {
    const items = this.getAll(collection);
    const newItem = { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    items.push(newItem);
    this.set(collection, items);
    return newItem;
  },
  
  update(collection, id, updates) {
    const items = this.getAll(collection);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
      this.set(collection, items);
      return items[index];
    }
    return null;
  },
  
  delete(collection, id) {
    const items = this.getAll(collection);
    const filtered = items.filter(item => item.id !== id);
    this.set(collection, filtered);
  }
};

// Usage
const products = Storage.getAll('products');
const newProduct = Storage.add('products', { name: 'Widget', price: 9.99 });
Storage.update('products', newProduct.id, { price: 12.99 });
Storage.delete('products', newProduct.id);
\`\`\`
`;

export default DATABASE_PATTERNS;
