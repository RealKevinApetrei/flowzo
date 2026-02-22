const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: "text"; text: string }>;
}

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 512,
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return "[Claude API key not configured]";
  }

  try {
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
      console.error("Claude API error:", error);
      return "[Unable to generate explanation right now]";
    }

    const data: ClaudeResponse = await res.json();
    return data.content[0]?.text ?? "[No response]";
  } catch (error) {
    console.error("Claude API call failed:", error);
    return "[Unable to generate explanation right now]";
  }
}
