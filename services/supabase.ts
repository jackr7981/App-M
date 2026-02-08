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

const supabaseUrl = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

// Force Mock Mode to TRUE to run in simulation/demo mode.
export const isMockMode = true;

// Fallback for development/preview to prevent crash if keys aren't set
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseKey || 'placeholder-key';

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing! App may not function correctly.");
}

export const supabase = createClient(url, key);

// Helper to construct public URL for images
export const getStorageUrl = (bucket: string, path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path; // Already a URL
  // If we are using placeholder, return a generic placeholder or nothing
  if (isMockMode) return path.startsWith('data:') ? path : `https://placehold.co/400?text=${path}`; 
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};