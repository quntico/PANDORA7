
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function test() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  try {
    const { data, error } = await supabase.from('projects_beta').select('*').limit(1);
    if (error) throw error;
    console.log('Supabase Success:', data);
  } catch (error) {
    console.error('Supabase Error:', error.message);
  }
}

test();
