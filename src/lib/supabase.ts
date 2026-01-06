import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tnourkhkwkowweuiszcn.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRub3Vya2hrd2tvd3dldWlzemNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTc3ODYsImV4cCI6MjA4MzIzMzc4Nn0.YaiSQaBcxVKHeSPXJmMZnYK8FdFlNP4-5uwYv6LEPBA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Project {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  preview_prompt: string | null;
  created_at: string;
  updated_at: string;
}
