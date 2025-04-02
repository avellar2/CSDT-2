import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '<sua-url-do-supabase>';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '<sua-chave-anonima>';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis supabaseUrl e supabaseKey são obrigatórias.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);