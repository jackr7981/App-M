import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the chunk size warning limit to 2000kB (2MB)
    // This suppresses warnings for heavy libraries like PDF.js which are naturally large.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Explicitly split large libraries into separate chunks
          // This ensures that the main app loads faster and these libs are cached separately.
          'pdf-vendor': ['react-pdf', 'pdfjs-dist'],
          'ui-vendor': ['lucide-react'],
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'genai': ['@google/genai']
        }
      }
    }
  }
});