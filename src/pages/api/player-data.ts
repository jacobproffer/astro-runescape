import type { APIRoute } from "astro";

// Simple in-memory cache to reduce external API calls
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper to create response headers with CORS and caching
const createHeaders = (maxAge: number = 300) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
});

// Validate username input
const validateUsername = (
  username: string
): { valid: boolean; error?: string } => {
  // Trim whitespace
  const trimmed = username.trim();

  // Check if empty
  if (!trimmed) {
    return { valid: false, error: "Username cannot be empty" };
  }

  // Check length (RuneScape usernames are typically 1-12 characters, but can include spaces)
  if (trimmed.length > 12) {
    return { valid: false, error: "Username must be 12 characters or less" };
  }

  // Validate characters: alphanumeric, spaces, underscores, and hyphens
  // RuneScape usernames can contain letters, numbers, spaces, underscores, and hyphens
  const validPattern = /^[a-zA-Z0-9 _-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username contains invalid characters. Only letters, numbers, spaces, underscores, and hyphens are allowed",
    };
  }

  return { valid: true };
};

export const GET: APIRoute = async ({ url }) => {
  const rawUsername = url.searchParams.get("username") || "Apone";

  // Validate and sanitize username
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: createHeaders(60),
    });
  }

  const characterName = rawUsername.trim();
  const cacheKey = characterName.toLowerCase();

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: createHeaders(),
    });
  }

  try {
    // Set up timeout for the entire operation (fetch + JSON parsing)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(
      `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(characterName)}&activities=20`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({
          error: `Failed to fetch profile: ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: createHeaders(60), // Short cache for errors
        }
      );
    }

    // Parse JSON with timeout still active
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      clearTimeout(timeoutId);
      return new Response(
        JSON.stringify({ error: "Failed to parse API response" }),
        { status: 500, headers: createHeaders(60) }
      );
    }

    // Clear timeout after successful JSON parsing
    clearTimeout(timeoutId);

    // Validate response structure
    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid API response structure" }),
        { status: 500, headers: createHeaders(60) }
      );
    }

    // Ensure arrays exist and are valid
    const profile = {
      ...data,
      activities: Array.isArray(data.activities) ? data.activities : [],
      skillvalues: Array.isArray(data.skillvalues) ? data.skillvalues : [],
    };

    // Store in cache
    cache.set(cacheKey, {
      data: profile,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (keep cache size manageable)
    if (cache.size > 100) {
      const oldestKey = Array.from(cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0][0];
      cache.delete(oldestKey);
    }

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: createHeaders(),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return new Response(
        JSON.stringify({
          error: "Request timed out. The RuneScape API is not responding.",
        }),
        { status: 504, headers: createHeaders(30) }
      );
    }

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error occurred",
      }),
      { status: 500, headers: createHeaders(60) }
    );
  }
};

// Handle OPTIONS for CORS preflight requests
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: createHeaders(),
  });
};
