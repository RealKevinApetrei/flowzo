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
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/truelayer/callback`,
  scopes: ["info", "accounts", "balance", "transactions", "offline_access"],
} as const;
