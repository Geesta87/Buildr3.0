// ============================================================================
// BUILDR REACT/WEB APP GENERATION SYSTEM
// ============================================================================
// Upgrades Buildr from single HTML output to full React applications
// ============================================================================

// ============================================================================
// SECTION 1: APP TYPE DETECTION
// ============================================================================

export type AppType = 'html' | 'react-webapp' | 'react-dashboard' | 'react-fullstack';

export interface AppTypeAnalysis {
  type: AppType;
  confidence: number;
  reason: string;
  features: string[];
  suggestedStack: {
    framework: 'html' | 'nextjs';
    database: boolean;
    auth: boolean;
    api: boolean;
    realtime: boolean;
  };
}

export function detectAppType(userMessage: string): AppTypeAnalysis {
  const msg = userMessage.toLowerCase();
  
  // ========== FULL-STACK INDICATORS ==========
  const fullstackIndicators = [
    'with payments', 'stripe', 'checkout', 'subscription',
    'with api', 'rest api', 'graphql',
    'backend', 'server', 'api endpoints',
    'webhook', 'cron', 'scheduled',
    'email notifications', 'send email',
    'file upload', 'image upload',
    'multi-tenant', 'saas platform'
  ];
  
  // ========== WEB APP INDICATORS (Interactive, CRUD, State) ==========
  const webappIndicators = [
    // CRUD / Data Management
    'inventory', 'tracker', 'tracking', 'management system',
    'crm', 'customer relationship', 'lead management',
    'booking system', 'reservation system', 'scheduling',
    'appointment', 'calendar app',
    'todo', 'task manager', 'project management',
    'order management', 'order tracking',
    'invoice', 'billing', 'expense tracker',
    // Interactive Features
    'crud', 'add edit delete', 'create read update',
    'form submission', 'data entry',
    'real-time', 'live updates', 'sync',
    'collaboration', 'multi-user',
    'notifications', 'alerts',
    // Specific App Types
    'pos system', 'point of sale',
    'warehouse', 'stock management',
    'employee management', 'hr system',
    'patient management', 'medical records',
    'student portal', 'learning management',
    'recipe manager', 'meal planner',
    'workout tracker', 'fitness app',
    'budget app', 'finance tracker',
    'chat app', 'messaging',
    'social', 'feed', 'timeline'
  ];
  
  // ========== DASHBOARD INDICATORS ==========
  const dashboardIndicators = [
    'dashboard', 'admin panel', 'admin dashboard',
    'analytics', 'metrics', 'statistics',
    'reports', 'reporting', 'data visualization',
    'charts', 'graphs', 'kpi',
    'overview', 'summary view',
    'monitor', 'monitoring'
  ];
  
  // ========== HTML/STATIC INDICATORS ==========
  const htmlIndicators = [
    'landing page', 'landing site',
    'website for', 'website about',
    'portfolio', 'personal site',
    'coming soon', 'under construction',
    'one page', 'single page website',
    'brochure', 'informational',
    'restaurant website', 'cafe website',
    'gym website', 'fitness website',
    'salon website', 'spa website',
    'agency website', 'studio website',
    'blog', 'news site' // Static blogs
  ];
  
  // ========== NEGATIVE INDICATORS (Force HTML even if other keywords present) ==========
  const forceHtmlIndicators = [
    'simple website', 'basic website', 'just a website',
    'no backend', 'static', 'html only',
    'marketing site', 'promotional'
  ];
  
  // Count matches
  const fullstackScore = fullstackIndicators.filter(i => msg.includes(i)).length;
  const webappScore = webappIndicators.filter(i => msg.includes(i)).length;
  const dashboardScore = dashboardIndicators.filter(i => msg.includes(i)).length;
  const htmlScore = htmlIndicators.filter(i => msg.includes(i)).length;
  const forceHtml = forceHtmlIndicators.some(i => msg.includes(i));
  
  // Detect specific features requested
  const features: string[] = [];
  if (msg.includes('auth') || msg.includes('login') || msg.includes('sign up') || msg.includes('user account')) {
    features.push('authentication');
  }
  if (msg.includes('database') || msg.includes('store data') || msg.includes('save') || msg.includes('persist')) {
    features.push('database');
  }
  if (msg.includes('real-time') || msg.includes('live') || msg.includes('sync') || msg.includes('websocket')) {
    features.push('realtime');
  }
  if (msg.includes('chart') || msg.includes('graph') || msg.includes('visualization')) {
    features.push('charts');
  }
  if (msg.includes('table') || msg.includes('list') || msg.includes('grid')) {
    features.push('data-tables');
  }
  if (msg.includes('form') || msg.includes('input') || msg.includes('submit')) {
    features.push('forms');
  }
  if (msg.includes('search') || msg.includes('filter') || msg.includes('sort')) {
    features.push('search-filter');
  }
  if (msg.includes('notification') || msg.includes('alert') || msg.includes('toast')) {
    features.push('notifications');
  }
  if (msg.includes('dark mode') || msg.includes('theme')) {
    features.push('theming');
  }
  if (msg.includes('export') || msg.includes('download') || msg.includes('pdf') || msg.includes('csv')) {
    features.push('export');
  }
  
  // Decision logic
  if (forceHtml) {
    return {
      type: 'html',
      confidence: 0.9,
      reason: 'User explicitly requested simple/static site',
      features: [],
      suggestedStack: { framework: 'html', database: false, auth: false, api: false, realtime: false }
    };
  }
  
  if (fullstackScore >= 2 || (fullstackScore >= 1 && (webappScore >= 2 || dashboardScore >= 2))) {
    return {
      type: 'react-fullstack',
      confidence: 0.85,
      reason: `Full-stack indicators: ${fullstackIndicators.filter(i => msg.includes(i)).join(', ')}`,
      features,
      suggestedStack: { framework: 'nextjs', database: true, auth: true, api: true, realtime: features.includes('realtime') }
    };
  }
  
  if (dashboardScore >= 2 || (dashboardScore >= 1 && webappScore >= 1)) {
    return {
      type: 'react-dashboard',
      confidence: 0.8,
      reason: `Dashboard indicators: ${dashboardIndicators.filter(i => msg.includes(i)).join(', ')}`,
      features,
      suggestedStack: { framework: 'nextjs', database: true, auth: features.includes('authentication'), api: false, realtime: features.includes('realtime') }
    };
  }
  
  if (webappScore >= 2 || features.length >= 3) {
    return {
      type: 'react-webapp',
      confidence: 0.8,
      reason: `Web app indicators: ${webappIndicators.filter(i => msg.includes(i)).join(', ')}`,
      features,
      suggestedStack: { framework: 'nextjs', database: true, auth: features.includes('authentication'), api: false, realtime: features.includes('realtime') }
    };
  }
  
  if (htmlScore >= 1 || webappScore === 0) {
    return {
      type: 'html',
      confidence: 0.75,
      reason: 'Appears to be a marketing/informational site',
      features: [],
      suggestedStack: { framework: 'html', database: false, auth: false, api: false, realtime: false }
    };
  }
  
  // Default to webapp if unclear but has interactive features
  if (features.length >= 2) {
    return {
      type: 'react-webapp',
      confidence: 0.6,
      reason: 'Has interactive features that benefit from React',
      features,
      suggestedStack: { framework: 'nextjs', database: true, auth: false, api: false, realtime: false }
    };
  }
  
  // Final fallback to HTML
  return {
    type: 'html',
    confidence: 0.5,
    reason: 'Default - no strong indicators for React app',
    features: [],
    suggestedStack: { framework: 'html', database: false, auth: false, api: false, realtime: false }
  };
}

// ============================================================================
// SECTION 2: PROJECT FILE STRUCTURE
// ============================================================================

export interface ProjectFile {
  path: string;
  content: string;
  language: 'typescript' | 'tsx' | 'json' | 'css' | 'html';
}

export interface ProjectStructure {
  files: ProjectFile[];
  entryPoint: string;
  packageJson: object;
}

// Base Next.js project structure
export const NEXTJS_BASE_FILES: ProjectFile[] = [
  {
    path: 'package.json',
    language: 'json',
    content: JSON.stringify({
      name: "buildr-app",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint"
      },
      dependencies: {
        "next": "14.2.0",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "@supabase/supabase-js": "^2.39.0",
        "lucide-react": "^0.309.0",
        "recharts": "^2.10.0",
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.0"
      },
      devDependencies: {
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "typescript": "^5",
        "tailwindcss": "^3.4.0",
        "autoprefixer": "^10.4.0",
        "postcss": "^8.4.0"
      }
    }, null, 2)
  },
  {
    path: 'tsconfig.json',
    language: 'json',
    content: JSON.stringify({
      compilerOptions: {
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] }
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"]
    }, null, 2)
  },
  {
    path: 'tailwind.config.ts',
    language: 'typescript',
    content: `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
    },
  },
  plugins: [],
}
export default config`
  },
  {
    path: 'src/lib/utils.ts',
    language: 'typescript',
    content: `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`
  },
  {
    path: 'src/lib/supabase.ts',
    language: 'typescript',
    content: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type-safe database types (customize based on your schema)
export type Database = {
  public: {
    Tables: {
      // Add your table types here
    }
  }
}`
  },
  {
    path: 'src/app/globals.css',
    language: 'css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --border: 214.3 31.8% 91.4%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`
  },
  {
    path: 'src/app/layout.tsx',
    language: 'tsx',
    content: `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Buildr App',
  description: 'Built with Buildr',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`
  }
];

// ============================================================================
// SECTION 3: REACT GENERATION PROMPTS
// ============================================================================

export const REACT_WEBAPP_PROMPT = `You are Buildr, an expert React/Next.js developer. You build production-ready web applications.

## OUTPUT FORMAT

You MUST output a complete multi-file React application. For each file, use this format:

\`\`\`filepath:src/app/page.tsx
// file content here
\`\`\`

\`\`\`filepath:src/components/Header.tsx
// file content here  
\`\`\`

## REQUIRED FILES

Every app must include:
1. \`src/app/page.tsx\` - Main page
2. \`src/app/layout.tsx\` - Root layout
3. \`src/components/\` - Reusable components
4. \`src/lib/utils.ts\` - Utility functions

## TECH STACK

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts (if needed)
- **Database**: Supabase (use placeholder functions)
- **State**: React useState/useReducer

## COMPONENT PATTERNS

\`\`\`tsx
// Always use TypeScript with proper interfaces
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        variant === 'primary' && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === 'secondary' && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      )}
    >
      {children}
    </button>
  )
}
\`\`\`

## DATA PATTERNS

\`\`\`tsx
// Use realistic mock data with proper types
interface Item {
  id: string
  name: string
  status: 'active' | 'inactive'
  createdAt: Date
}

// Initial mock data (will be replaced with Supabase)
const initialItems: Item[] = [
  { id: '1', name: 'Item One', status: 'active', createdAt: new Date() },
  // ...
]

// CRUD operations (placeholder for Supabase)
const [items, setItems] = useState<Item[]>(initialItems)

const addItem = (item: Omit<Item, 'id' | 'createdAt'>) => {
  setItems(prev => [...prev, { ...item, id: crypto.randomUUID(), createdAt: new Date() }])
}

const updateItem = (id: string, updates: Partial<Item>) => {
  setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
}

const deleteItem = (id: string) => {
  setItems(prev => prev.filter(item => item.id !== id))
}
\`\`\`

## STYLING RULES

- Use Tailwind utility classes
- Dark mode support with \`dark:\` variants
- Responsive design with \`sm:\`, \`md:\`, \`lg:\` breakpoints
- Use CSS variables for theming (--background, --foreground, etc.)
- Consistent spacing scale (p-4, gap-6, etc.)

## INTERACTIVITY

- All buttons must have onClick handlers
- Forms must have onSubmit with preventDefault
- Loading states for async operations
- Error handling with user-friendly messages
- Toast/notification for actions

## ACCESSIBILITY

- Proper semantic HTML (nav, main, section, article)
- ARIA labels where needed
- Keyboard navigation support
- Focus states on interactive elements

## RESPONSE FORMAT

Brief acknowledgment, then output ALL files:

Building your [app type]...

\`\`\`filepath:src/app/page.tsx
[complete file]
\`\`\`

\`\`\`filepath:src/components/Sidebar.tsx
[complete file]
\`\`\`

[continue for all files]

Done - built [description] with [key features].`;

export const REACT_DASHBOARD_PROMPT = `You are Buildr, an expert React/Next.js developer. You build production-ready dashboards.

## OUTPUT FORMAT

Output a complete multi-file dashboard application:

\`\`\`filepath:src/app/page.tsx
// Dashboard home
\`\`\`

\`\`\`filepath:src/app/layout.tsx
// Layout with sidebar
\`\`\`

\`\`\`filepath:src/components/Sidebar.tsx
// Navigation sidebar
\`\`\`

## DASHBOARD STRUCTURE

\`\`\`
src/
├── app/
│   ├── page.tsx              # Dashboard overview
│   ├── layout.tsx            # Sidebar + header layout
│   ├── analytics/
│   │   └── page.tsx          # Analytics page
│   ├── [resource]/
│   │   └── page.tsx          # CRUD pages
│   └── settings/
│       └── page.tsx          # Settings
├── components/
│   ├── Sidebar.tsx           # Navigation
│   ├── Header.tsx            # Top bar
│   ├── StatsCard.tsx         # Metric cards
│   ├── DataTable.tsx         # Tables
│   └── Chart.tsx             # Charts
└── lib/
    └── utils.ts
\`\`\`

## DASHBOARD COMPONENTS

### Sidebar
\`\`\`tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Settings, BarChart } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  
  return (
    <aside className="w-64 bg-background border-r min-h-screen p-4">
      <div className="font-bold text-xl mb-8">Dashboard</div>
      <nav className="space-y-2">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              pathname === item.href 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
\`\`\`

### Stats Card
\`\`\`tsx
interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <div className="bg-background border rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <p className={cn("text-sm mt-1", change >= 0 ? "text-green-500" : "text-red-500")}>
              {change >= 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  )
}
\`\`\`

### Data Table
\`\`\`tsx
interface Column<T> {
  key: keyof T
  label: string
  render?: (value: T[keyof T], row: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
}

export function DataTable<T extends { id: string }>({ data, columns, onRowClick }: DataTableProps<T>) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {columns.map(col => (
              <th key={String(col.key)} className="text-left p-4 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr 
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn("border-t", onRowClick && "cursor-pointer hover:bg-muted/50")}
            >
              {columns.map(col => (
                <td key={String(col.key)} className="p-4">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
\`\`\`

## CHARTS (Recharts)

\`\`\`tsx
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { month: 'Jan', revenue: 4000 },
  { month: 'Feb', revenue: 3000 },
  // ...
]

export function RevenueChart() {
  return (
    <div className="bg-background border rounded-xl p-6">
      <h3 className="font-semibold mb-4">Revenue Overview</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-muted-foreground" />
            <YAxis className="text-muted-foreground" />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
\`\`\`

## RESPONSE FORMAT

Brief acknowledgment, then complete dashboard files.`;

export const REACT_FULLSTACK_PROMPT = `You are Buildr, building a full-stack Next.js application with:
- Next.js 14 App Router
- Supabase for database & auth
- Server Actions for mutations
- API routes for complex logic

## FILE STRUCTURE

\`\`\`
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── api/
│   │   └── [route]/route.ts    # API endpoints
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       └── [pages]/page.tsx
├── components/
├── lib/
│   ├── supabase.ts
│   ├── auth.ts
│   └── actions.ts              # Server actions
└── types/
    └── index.ts
\`\`\`

## SERVER ACTIONS

\`\`\`tsx
// src/lib/actions.ts
'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'

export async function createItem(formData: FormData) {
  const name = formData.get('name') as string
  
  const { error } = await supabase
    .from('items')
    .insert({ name })
  
  if (error) throw new Error(error.message)
  
  revalidatePath('/items')
}
\`\`\`

## API ROUTES

\`\`\`tsx
// src/app/api/items/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('items')
    .insert(body)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data, { status: 201 })
}
\`\`\`

## AUTH PATTERN

\`\`\`tsx
// src/lib/auth.ts
import { supabase } from './supabase'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
\`\`\`

Output all files needed for a complete full-stack application.`;

// ============================================================================
// SECTION 4: FILE PARSING FROM AI RESPONSE
// ============================================================================

export interface ParsedFile {
  path: string;
  content: string;
}

export function parseMultiFileResponse(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  
  // Pattern 1: ```filepath:path/to/file.tsx
  const filepathPattern = /```filepath:([^\n]+)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  
  while ((match = filepathPattern.exec(response)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2].trim()
    });
  }
  
  // Pattern 2: ```tsx title="path/to/file.tsx" or ```tsx file="..."
  const titlePattern = /```(?:tsx?|jsx?|json|css)\s+(?:title|file)=["']([^"']+)["']\n([\s\S]*?)```/g;
  
  while ((match = titlePattern.exec(response)) !== null) {
    // Don't add duplicates
    if (!files.some(f => f.path === match![1].trim())) {
      files.push({
        path: match[1].trim(),
        content: match[2].trim()
      });
    }
  }
  
  // Pattern 3: // File: path/to/file.tsx at start of code block
  const fileCommentPattern = /```(?:tsx?|jsx?|json|css)\n\/\/\s*(?:File|PATH|file|path):\s*([^\n]+)\n([\s\S]*?)```/g;
  
  while ((match = fileCommentPattern.exec(response)) !== null) {
    if (!files.some(f => f.path === match![1].trim())) {
      files.push({
        path: match[1].trim(),
        content: match[2].trim()
      });
    }
  }
  
  return files;
}

// ============================================================================
// SECTION 5: EXPORTS
// ============================================================================

export default {
  detectAppType,
  parseMultiFileResponse,
  REACT_WEBAPP_PROMPT,
  REACT_DASHBOARD_PROMPT,
  REACT_FULLSTACK_PROMPT,
  NEXTJS_BASE_FILES
};