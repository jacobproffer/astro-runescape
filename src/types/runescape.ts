export interface RuneMetricsProfile {
  magic: number;
  questsstarted: number;
  totalskill: number;
  questscomplete: number;
  questsnotstarted: number;
  totalxp: number;
  ranged: number;
  activities: Activity[];
  skillvalues: SkillValue[];
  name: string;
  rank: string;
  melee: number;
  combatlevel: number;
  loggedIn: string;
}

export interface Activity {
  date: string;
  details: string;
  text: string;
}

export interface SkillValue {
  level: number;
  xp: number;
  rank: number;
  id: number;
}

export const SKILL_NAMES: Record<number, string> = {
  0: "Attack",
  1: "Defence",
  2: "Strength",
  3: "Constitution",
  4: "Ranged",
  5: "Prayer",
  6: "Magic",
  7: "Cooking",
  8: "Woodcutting",
  9: "Fletching",
  10: "Fishing",
  11: "Firemaking",
  12: "Crafting",
  13: "Smithing",
  14: "Mining",
  15: "Herblore",
  16: "Agility",
  17: "Thieving",
  18: "Slayer",
  19: "Farming",
  20: "Runecrafting",
  21: "Hunter",
  22: "Construction",
  23: "Summoning",
  24: "Dungeoneering",
  25: "Divination",
  26: "Invention",
  27: "Archaeology",
  28: "Necromancy",
};
