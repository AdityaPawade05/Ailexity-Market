/**
 * Shared AI utility for Ailexity Market
 * Uses Google Gemini API (free tier) with automatic retry & model fallback
 */

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const SYSTEM_PROMPT = `You are Ailexity Market's AI assistant — a friendly, knowledgeable helper for a digital marketplace that sells ebooks, courses, and SaaS products.

Your capabilities:
- Help buyers discover products, compare options, and answer questions about purchases
- Help sellers with listing tips, pricing strategies, and best practices
- Answer general questions about how Ailexity Market works
- Provide guidance on account management, following creators, and communities

Your personality:
- Warm, professional, and concise
- Use emoji sparingly (1-2 per message max)
- Keep responses under 150 words unless the user asks for detail
- If you don't know something specific about a product, suggest the user check the product page or contact the seller

Important rules:
- Never make up product names, prices, or seller names
- Never share personal data or give financial/legal advice
- If asked about something unrelated to the marketplace, politely redirect
- Always be helpful and solution-oriented`;

// Models to try in order — each has its own separate quota
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

/** Helper: wait for ms */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call a specific Gemini model with retry
 */
async function callGeminiModel(
  model: string,
  messages: ChatMessage[],
  retries = 2
): Promise<string> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.7,
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      throw new Error("Empty response from Gemini");
    }

    const errBody = await res.text();

    // If rate limited and we have retries left, wait and retry
    if (res.status === 429 && attempt < retries) {
      // Parse retry delay from response, default to 10s
      let delayMs = 10000;
      try {
        const errJson = JSON.parse(errBody);
        const retryInfo = errJson.error?.details?.find(
          (d: { "@type": string }) =>
            d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay);
          if (!isNaN(seconds)) delayMs = (seconds + 1) * 1000;
        }
      } catch {
        // Use default delay
      }

      console.log(
        `[AI] ${model} rate limited (attempt ${attempt + 1}/${retries + 1}), waiting ${delayMs}ms...`
      );
      await sleep(delayMs);
      continue;
    }

    // Not rate limited or out of retries — throw
    throw new Error(`${model} error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  throw new Error(`${model}: All retries exhausted`);
}

/**
 * Try multiple Gemini models — each has separate rate limit quotas
 */
async function callGemini(messages: ChatMessage[]): Promise<string> {
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[AI] Trying ${model}...`);
      return await callGeminiModel(model, messages, 1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[AI] ${model} failed: ${msg}`);
      errors.push(`${model}: ${msg}`);
      // Continue to next model
    }
  }

  throw new Error(`All Gemini models failed:\n${errors.join("\n")}`);
}

/**
 * Call OpenAI API (fallback)
 */
async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return (
    data.choices?.[0]?.message?.content ||
    "I'm sorry, I couldn't generate a response. Please try again."
  );
}

/**
 * Main AI call — tries Gemini models with retry, then OpenAI fallback
 */
export async function callAI(messages: ChatMessage[]): Promise<string> {
  if (GEMINI_API_KEY) {
    try {
      return await callGemini(messages);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[AI] All Gemini models failed:", errMsg);

      // Try OpenAI fallback if available
      if (OPENAI_API_KEY) {
        console.log("[AI] Trying OpenAI fallback...");
        return await callOpenAI(messages);
      }

      // No fallback — throw with clear message
      throw new Error(`AI service unavailable: ${errMsg}`);
    }
  }

  if (OPENAI_API_KEY) {
    return await callOpenAI(messages);
  }

  throw new Error(
    "No AI API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env"
  );
}
