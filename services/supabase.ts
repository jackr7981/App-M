import { createClient } from '@supabase/supabase-js';

// Access environment variables securely
// Support both Vite (import.meta.env) and standard process.env
const getEnvVar = (key: string, viteKey?: string) => {
  // 1. Try Vite import.meta.env
  try {
    const meta = import.meta as any;
    if (typeof meta !== 'undefined' && meta.env) {
      if (viteKey && meta.env[viteKey]) return meta.env[viteKey];
      if (meta.env[key]) return meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  
  // 2. Try process.env
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      if (viteKey && process.env[viteKey]) return process.env[viteKey];
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  
  return undefined;
};

// USE PROVIDED CREDENTIALS IF ENV VARS ARE MISSING
const PROVIDED_URL = 'https://zlgfadgwlwreezwegpkx.supabase.co';
const PROVIDED_KEY = 'sb_publishable_WLb8f8ArmmJm931BFjD0gQ_PjRuovGR';

const supabaseUrl = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL') || PROVIDED_URL;
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') || PROVIDED_KEY;

// Check if properly configured
export const isConfigured = !!(supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co');

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
// Force Live Mode since credentials are provided
export const isMockMode = false;

if (!isConfigured) {
  console.warn("Supabase credentials missing!");
} else {
  console.log("Supabase Live Mode Active:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to construct public URL for images
export const getStorageUrl = (bucket: string, path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Already a URL
  
  // If we are using mock mode (legacy check), return placeholder
  if (isMockMode) return path.startsWith('data:') ? path : `https://placehold.co/400?text=${path}`; 
  
  // Real Supabase Public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};