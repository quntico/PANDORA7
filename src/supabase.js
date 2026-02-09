import { createClient } from '@supabase/supabase-js';

// FULLY HARDCODED CREDENTIALS FOR PRODUCTION DEBUGGING
// This bypasses any environment variable injection issues completely.

const supabaseUrl = 'https://tbqoreremmusplbznmfn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicW9yZXJlbW11c3BsYnpubWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDc2NDIsImV4cCI6MjA4NjE4MzY0Mn0.Z2rLoB4CYRGfq-yahkTsTpzXqXhya1pJzHcLw2arblg';

/*
console.log('[Debug] Force using hardcoded URL:', supabaseUrl);
*/

// Create client directly
const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

export const supabase = client;
