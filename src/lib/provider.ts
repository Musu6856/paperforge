const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-pro";

export function getProviderConfig() {
  return {
    apiKey:
      process.env.XIAOMI_API_KEY ||
      process.env.MIMO_API_KEY ||
      process.env.ANTHROPIC_API_KEY,
    baseUrl:
      process.env.XIAOMI_BASE_URL ||
      process.env.MIMO_BASE_URL ||
      DEFAULT_BASE_URL,
    model: process.env.XIAOMI_MODEL || process.env.MIMO_MODEL || DEFAULT_MODEL,
  };
}

export function jsonError(error: string, status: number, code: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function providerErrorResponse(response: Response) {
  const body = await response.text();
  console.error("Xiaomi MiMo API error:", {
    status: response.status,
    statusText: response.statusText,
    body,
  });

  if (response.status === 401 || response.status === 403) {
    return jsonError(
      "Xiaomi MiMo authentication failed. Check your API key in Vercel.",
      502,
      "mimo_auth_failed"
    );
  }

  if (response.status === 429) {
    return jsonError(
      "Xiaomi MiMo rate limit reached. Please try again later.",
      429,
      "mimo_rate_limited"
    );
  }

  return jsonError(
    "Xiaomi MiMo request failed. Check XIAOMI_MODEL and account access.",
    502,
    "mimo_request_failed"
  );
}
