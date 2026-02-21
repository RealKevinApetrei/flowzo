// Restrict CORS to app domain in production, allow all in dev
const allowedOrigin = Deno.env.get("CORS_ORIGIN") ?? "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
