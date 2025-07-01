import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

export const psvSupabase = createClient(
  process.env.NEXT_PUBLIC_PSV_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_PSV_SUPABASE_ANON_KEY as string,
);
