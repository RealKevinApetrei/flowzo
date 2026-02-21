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

/** Build the redirect URI from the request origin so it always matches
 *  the actual URL the user is visiting (localhost, Vercel preview, prod). */
export function getRedirectUri(origin: string): string {
  return `${origin}/api/truelayer/callback`;
}
