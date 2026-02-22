const isSandbox = process.env.TRUELAYER_ENV !== "production";

export const TRUELAYER_CONFIG = {
  env: isSandbox ? "sandbox" : "production",
  authUrl: isSandbox
    ? "https://auth.truelayer-sandbox.com"
    : "https://auth.truelayer.com",
  apiUrl: isSandbox
    ? "https://api.truelayer-sandbox.com"
    : "https://api.truelayer.com",
  clientId: process.env.TRUELAYER_CLIENT_ID ?? "",
  clientSecret: process.env.TRUELAYER_CLIENT_SECRET ?? "",
  scopes: ["info", "accounts", "balance", "transactions", "offline_access"],
  providers: isSandbox
    ? "uk-cs-mock"
    : "uk-ob-all uk-oauth-all",
} as const;

/** Resolve the true origin from a request, handling Vercel's forwarded headers
 *  and falling back to NEXT_PUBLIC_APP_URL or the raw request URL. */
export function resolveOrigin(request: Request): string {
  // 1. Prefer configured app URL (guaranteed to match TrueLayer Console)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 2. Use Vercel's forwarded headers (correct proto + host behind proxy)
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    return `${proto}://${host}`;
  }

  // 3. Fallback to raw request URL origin
  return new URL(request.url).origin;
}

/** Build the redirect URI from the request origin so it always matches
 *  the actual URL the user is visiting (localhost, Vercel preview, prod). */
export function getRedirectUri(origin: string): string {
  return `${origin}/api/truelayer/callback`;
}

// Startup validation — warn if TrueLayer is misconfigured
if (typeof process !== "undefined" && process.env) {
  if (!TRUELAYER_CONFIG.clientId) {
    console.warn("[TrueLayer] TRUELAYER_CLIENT_ID is not set — bank connections will fail");
  }
  if (!TRUELAYER_CONFIG.clientSecret) {
    console.warn("[TrueLayer] TRUELAYER_CLIENT_SECRET is not set — token exchange will fail");
  }
}
