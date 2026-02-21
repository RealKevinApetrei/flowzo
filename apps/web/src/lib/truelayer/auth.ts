import { TRUELAYER_CONFIG, getRedirectUri } from "./config";

export function buildAuthUrl(state: string, origin: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: TRUELAYER_CONFIG.clientId,
    redirect_uri: getRedirectUri(origin),
    scope: TRUELAYER_CONFIG.scopes.join(" "),
    state,
    providers: "uk-ob-all uk-oauth-all",
  });

  return `${TRUELAYER_CONFIG.authUrl}/?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  origin: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${TRUELAYER_CONFIG.authUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: TRUELAYER_CONFIG.clientId,
      client_secret: TRUELAYER_CONFIG.clientSecret,
      redirect_uri: getRedirectUri(origin),
      code,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`TrueLayer token exchange failed: ${error}`);
  }

  return res.json();
}

export async function refreshToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${TRUELAYER_CONFIG.authUrl}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: TRUELAYER_CONFIG.clientId,
      client_secret: TRUELAYER_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`TrueLayer token refresh failed: ${error}`);
  }

  return res.json();
}
