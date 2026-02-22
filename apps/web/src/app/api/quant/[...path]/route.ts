import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const QUANT_API_URL = process.env.QUANT_API_URL;

async function proxyRequest(request: Request, params: { path: string[] }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!QUANT_API_URL) {
    return NextResponse.json(
      { error: "QUANT_API_URL not configured" },
      { status: 503 },
    );
  }

  const path = params.path.join("/");
  const url = `${QUANT_API_URL}/api/${path}`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(15_000),
    };

    if (request.method === "POST") {
      fetchOptions.body = await request.text();
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      return NextResponse.json(
        { error: `Quant API error: ${res.statusText}`, details: errorText },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "Quant API timed out" : "Failed to reach Quant API" },
      { status: 502 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, await params);
}
