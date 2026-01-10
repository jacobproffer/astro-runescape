import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const characterName = url.searchParams.get("username") || "Apone";

  try {
    // Set up timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(
      `https://apps.runescape.com/runemetrics/profile/profile?user=${encodeURIComponent(characterName)}&activities=20`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Failed to fetch profile: ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid API response structure" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure arrays exist and are valid
    const profile = {
      ...data,
      activities: Array.isArray(data.activities) ? data.activities : [],
      skillvalues: Array.isArray(data.skillvalues) ? data.skillvalues : [],
    };

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return new Response(
        JSON.stringify({
          error: "Request timed out. The RuneScape API is not responding.",
        }),
        { status: 504, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
