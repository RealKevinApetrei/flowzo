// Restrict CORS to app domain in production, allow all in dev
// Set CORS_ORIGIN in Supabase Edge Function secrets for production
const allowedOrigin = Deno.env.get("CORS_ORIGIN") ??
  Deno.env.get("SITE_URL") ??
  (Deno.env.get("ENVIRONMENT") === "production" ? "https://flowzo.vercel.app" : "*");

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
