import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'tu-anon-key';

// Check if the URL string has a valid protocol. Vercel builds fail if this is a plain domain.
const safeUrl = supabaseUrl.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}`;

export const supabase = createClient(safeUrl, supabaseKey);
