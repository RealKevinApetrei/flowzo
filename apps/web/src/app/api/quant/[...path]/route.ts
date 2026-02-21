import { NextResponse } from "next/server";

const QUANT_API_URL = process.env.QUANT_API_URL;

async function proxyRequest(request: Request, params: { path: string[] }) {
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
    };

    if (request.method === "POST") {
      fetchOptions.body = await request.text();
    }

    const res = await fetch(url, fetchOptions);
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Quant API" },
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
