export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes("your-project-ref") &&
  !supabasePublishableKey.includes("your_key"),
);

export function requireSupabaseConfig() {
  if (!isSupabaseConfigured || !supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase is not configured. Copy .env.example to .env.local and add the project credentials.");
  }
  return { supabaseUrl, supabasePublishableKey };
}
