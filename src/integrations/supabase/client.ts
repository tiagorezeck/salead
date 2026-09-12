import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zhyihwtgsctlpzspgsop.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeWlod3Rnc2N0bHB6c3Bnc29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODE1OTksImV4cCI6MjA5OTU1NzU5OX0.Eg8KGBN8HmyQ0vnpZLhhjrFBrvW0YnIqzKLwiKL6_Gk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
