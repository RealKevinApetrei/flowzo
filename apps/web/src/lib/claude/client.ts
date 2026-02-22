const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: "text"; text: string }>;
}

// ── In-memory cache (server-side, per-instance) ──────────────────────────────
// Prevents duplicate API calls for identical prompts within 10 minutes.
// This is the main cost control — same page reload won't re-call Claude.
const cache = new Map<string, { text: string; expires: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(system: string, messages: ClaudeMessage[]): string {
  return `${system}::${messages.map((m) => m.content).join("::")}`;
}

// ── Rate limiter (simple sliding window) ─────────────────────────────────────
// Max 20 Claude calls per minute across all endpoints. Prevents runaway costs.
const callTimestamps: number[] = [];
const MAX_CALLS_PER_MINUTE = 20;

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove timestamps older than 1 minute
  while (callTimestamps.length > 0 && callTimestamps[0] < now - 60000) {
    callTimestamps.shift();
  }
  return callTimestamps.length >= MAX_CALLS_PER_MINUTE;
}

// ── Main client ──────────────────────────────────────────────────────────────

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 256, // Reduced from 512 — most responses are 2-3 sentences
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "[Claude API key not configured]";
  }

  // Check cache first
  const key = getCacheKey(systemPrompt, messages);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.text;
  }

  // Rate limit check
  if (isRateLimited()) {
    console.warn("[Claude] Rate limited — too many calls per minute");
    return "[AI is busy — try again in a moment]";
  }

  try {
    callTimestamps.push(Date.now());

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[Claude] API error:", res.status, error);
      return "[Unable to generate explanation right now]";
    }

    const data: ClaudeResponse = await res.json();
    const text = data.content[0]?.text ?? "[No response]";

    // Cache the result
    cache.set(key, { text, expires: Date.now() + CACHE_TTL_MS });

    // Evict old cache entries (keep max 100)
    if (cache.size > 100) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    return text;
  } catch (error) {
    console.error("[Claude] API call failed:", error);
    return "[Unable to generate explanation right now]";
  }
}
