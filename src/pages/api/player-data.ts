import type { APIRoute } from "astro";
import { SKILLS, type PlayerProfile, type SkillValue } from "@/types/runescape";

// RuneScape Platform APIs (https://developer.runescape.com/platform/).
// No API key needed; Jagex asks for a descriptive User-Agent.
const ADVENTURERS_LOG = "https://secure.runescape.com/m=adventurers-log/api/v1";
const HISCORES = "https://secure.runescape.com/m=hiscore/index_lite.json";
const USER_AGENT = "astro-runescape character site (github.com/jacobproffer/astro-runescape)";

const platformFetch = (url: string, signal: AbortSignal) =>
  fetch(url, { signal, headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });

// RS3 combat level (https://runescape.wiki/w/Combat_level):
// floor((1.3 * max(Att+Str, 2Mag, 2Rng, 2Necro) + Def + Const
// + floor(Pray/2) + floor(Summ/2)) / 4).
// Attack, Strength, Ranged, Magic and Necromancy count up to 120; the rest cap at 99 (max 152).
const computeCombatLevel = (levels: Record<string, number>): number => {
  const l = (key: string, cap: number) => Math.min(levels[key] ?? 1, cap);
  const offence = Math.max(
    l("attack", 120) + l("strength", 120),
    2 * l("magic", 120),
    2 * l("ranged", 120),
    2 * l("necromancy", 120)
  );
  return Math.floor(
    (1.3 * offence +
      l("defence", 99) +
      Math.max(l("hitpoints", 99), 10) +
      Math.floor(l("prayer", 99) / 2) +
      Math.floor(l("summoning", 99) / 2)) /
      4
  );
};

// Map the Platform API responses onto the profile shape the site renders
const buildProfile = (
  fallbackName: string,
  playerData: any,
  events: any,
  hiscores: any
): PlayerProfile => {
  const skills = playerData.skills && typeof playerData.skills === "object" ? playerData.skills : {};
  const hiscoreSkills: any[] = Array.isArray(hiscores?.skills) ? hiscores.skills : [];
  const rankByName = new Map<string, number>(
    hiscoreSkills.map((s) => [String(s?.name ?? "").toLowerCase(), Number(s?.rank ?? -1)])
  );

  const levels: Record<string, number> = {};
  const skillvalues: SkillValue[] = SKILLS.map((skill) => {
    const entry = skills[skill.key] ?? {};
    const level = Number(entry.level) || 1;
    levels[skill.key] = level;
    return {
      id: skill.id,
      level,
      xp: Number(entry.fine_xp) || 0,
      rank: rankByName.get(skill.hiscore.toLowerCase()) ?? -1,
    };
  });

  const quests: any[] =
    playerData.quests && typeof playerData.quests === "object"
      ? Object.values(playerData.quests)
      : [];
  const countQuests = (status: string) => quests.filter((q) => q?.status === status).length;

  const overallRank = rankByName.get("overall");

  return {
    name: typeof playerData.name === "string" ? playerData.name : fallbackName,
    combatlevel: computeCombatLevel(levels),
    totalskill: skillvalues.reduce((sum, s) => sum + s.level, 0),
    totalxp: Math.floor(skillvalues.reduce((sum, s) => sum + s.xp, 0) / 10),
    questscomplete: countQuests("COMPLETED"),
    questsstarted: countQuests("STARTED"),
    questsnotstarted: countQuests("NOT_STARTED"),
    questpoints: Number(playerData.qp) || 0,
    rank: overallRank && overallRank > 0 ? overallRank.toLocaleString("en-US") : null,
    skillvalues,
    activities: (Array.isArray(events?.events) ? events.events : []).map((e: any) => ({
      date: String(e?.date ?? ""),
      text: String(e?.text ?? ""),
      details: String(e?.details ?? "").replace(/\s+/g, " ").trim(),
      type: String(e?.type ?? ""),
    })),
  };
};

// Simple in-memory cache to reduce external API calls
interface CacheEntry {
  data: PlayerProfile;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (Adventurer's Log itself caches for up to 10)

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    const encoded = encodeURIComponent(characterName);
    let results: [Response, Response | null, Response | null];
    try {
      // Player Data is required; Player Events and Hiscores are optional extras
      results = await Promise.all([
        platformFetch(
          `${ADVENTURERS_LOG}/playerData/${encoded}?includeSkills=true&includeQuests=true`,
          controller.signal
        ),
        platformFetch(`${ADVENTURERS_LOG}/playerEvents/${encoded}`, controller.signal).catch(
          () => null
        ),
        platformFetch(`${HISCORES}?player=${encoded}`, controller.signal).catch(() => null),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
    const [dataRes, eventsRes, hiscoreRes] = results;

    const playerData = await dataRes.json().catch(() => null);
    if (!dataRes.ok || !playerData || typeof playerData !== "object") {
      const code = playerData?.error;
      const message =
        code === "PLAYER_NOT_FOUND"
          ? `Player "${characterName}" was not found`
          : `Failed to fetch player data${code ? `: ${code}` : ""}`;
      return new Response(JSON.stringify({ error: message }), {
        status: dataRes.ok ? 502 : dataRes.status,
        headers: createHeaders(60), // Short cache for errors
      });
    }

    const events = eventsRes?.ok ? await eventsRes.json().catch(() => null) : null;
    const hiscores = hiscoreRes?.ok ? await hiscoreRes.json().catch(() => null) : null;

    const profile = buildProfile(characterName, playerData, events, hiscores);

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
