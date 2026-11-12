/**
 * Normalized player profile returned by /api/player-data.
 *
 * Built server-side from the RuneScape Platform APIs
 * (https://developer.runescape.com/platform/), which replaced RuneMetrics:
 * - Adventurer's Log Player Data API: skills (level + fine XP) and quests
 * - Adventurer's Log Player Events API: recent activities
 * - Hiscores Index Lite API: overall and per-skill ranks
 */
export interface PlayerProfile {
  name: string;
  combatlevel: number;
  totalskill: number;
  /** Total XP (whole XP, not fine XP). */
  totalxp: number;
  questscomplete: number;
  questsstarted: number;
  questsnotstarted: number;
  questpoints: number;
  /** Overall hiscore rank, formatted (e.g. "82,332"), or null if unranked/unavailable. */
  rank: string | null;
  activities: Activity[];
  skillvalues: SkillValue[];
}

export interface Activity {
  /** ISO 8601 timestamp. */
  date: string;
  details: string;
  text: string;
  type: string;
}

export interface SkillValue {
  level: number;
  /** Fine XP (XP × 10), same scale RuneMetrics used. */
  xp: number;
  /** Hiscore rank, or -1 if unranked/unavailable. */
  rank: number;
  id: number;
}

/**
 * Skills in RuneMetrics id order. `key` is the Player Data API skill key;
 * `hiscore` is the skill name used by the Hiscores Index Lite API.
 */
export const SKILLS: { id: number; name: string; key: string; hiscore: string }[] = [
  { id: 0, name: "Attack", key: "attack", hiscore: "Attack" },
  { id: 1, name: "Defence", key: "defence", hiscore: "Defence" },
  { id: 2, name: "Strength", key: "strength", hiscore: "Strength" },
  { id: 3, name: "Constitution", key: "hitpoints", hiscore: "Hitpoints" },
  { id: 4, name: "Ranged", key: "ranged", hiscore: "Ranged" },
  { id: 5, name: "Prayer", key: "prayer", hiscore: "Prayer" },
  { id: 6, name: "Magic", key: "magic", hiscore: "Magic" },
  { id: 7, name: "Cooking", key: "cooking", hiscore: "Cooking" },
  { id: 8, name: "Woodcutting", key: "woodcutting", hiscore: "Woodcutting" },
  { id: 9, name: "Fletching", key: "fletching", hiscore: "Fletching" },
  { id: 10, name: "Fishing", key: "fishing", hiscore: "Fishing" },
  { id: 11, name: "Firemaking", key: "firemaking", hiscore: "Firemaking" },
  { id: 12, name: "Crafting", key: "crafting", hiscore: "Crafting" },
  { id: 13, name: "Smithing", key: "smithing", hiscore: "Smithing" },
  { id: 14, name: "Mining", key: "mining", hiscore: "Mining" },
  { id: 15, name: "Herblore", key: "herblore", hiscore: "Herblore" },
  { id: 16, name: "Agility", key: "agility", hiscore: "Agility" },
  { id: 17, name: "Thieving", key: "thieving", hiscore: "Thieving" },
  { id: 18, name: "Slayer", key: "slayer", hiscore: "Slayer" },
  { id: 19, name: "Farming", key: "farming", hiscore: "Farming" },
  { id: 20, name: "Runecrafting", key: "runecraft", hiscore: "Runecraft" },
  { id: 21, name: "Hunter", key: "hunter", hiscore: "Hunter" },
  { id: 22, name: "Construction", key: "construction", hiscore: "Construction" },
  { id: 23, name: "Summoning", key: "summoning", hiscore: "Summoning" },
  { id: 24, name: "Dungeoneering", key: "dungeoneering", hiscore: "Dungeoneering" },
  { id: 25, name: "Divination", key: "divination", hiscore: "Divination" },
  { id: 26, name: "Invention", key: "invention", hiscore: "Invention" },
  { id: 27, name: "Archaeology", key: "archaeology", hiscore: "Archaeology" },
  { id: 28, name: "Necromancy", key: "necromancy", hiscore: "Necromancy" },
];

export const SKILL_NAMES: Record<number, string> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.name])
);
