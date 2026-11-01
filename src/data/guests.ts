import type { TicketType } from "@/types";

// Generates ~200 fictional guests. All names and organizations are made up.
// A seeded random number generator means every run produces the same guests,
// so check-in codes stay the same between database resets (handy for demos).

export interface SeedGuest {
  fullName: string;
  email: string;
  organization: string;
  ticketType: TicketType;
  checkinCode: string;
}

const firstNames = [
  "Amina", "Brian", "Chloe", "David", "Esther", "Felix", "Grace", "Hassan",
  "Irene", "James", "Kendi", "Liam", "Mercy", "Nathan", "Olivia", "Peter",
  "Quincy", "Ruth", "Samuel", "Tanya", "Umar", "Violet", "Wesley", "Ximena",
  "Yusuf", "Zawadi", "Aisha", "Ben", "Carmen", "Dennis", "Fatuma", "George",
  "Hannah", "Ivan", "Joy", "Kevin", "Lucy", "Moses", "Naomi", "Oscar",
];

const lastNames = [
  "Achieng", "Baker", "Chen", "Diallo", "Evans", "Fernandes", "Gitau", "Hughes",
  "Ibrahim", "Johnson", "Kamau", "Lopez", "Mutua", "Nguyen", "Otieno", "Patel",
  "Rossi", "Silva", "Tanaka", "Wekesa", "Kipchoge", "Mensah", "Novak", "Oduya",
];

const organizations = [
  "Brightpath Labs", "Kijani Ventures", "Northwind Analytics", "Savanna Health",
  "Bluewave Studio", "Mosaic Fintech", "Orbit Logistics", "Greenleaf Energy",
  "Pixel & Pine", "Summit Capital", "Harbourline Media", "Tandem Robotics",
  "Uplift Education", "Riverstone Partners", "Cobalt Security", "Independent",
];

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I to avoid confusion

/** Small deterministic pseudo-random generator (mulberry32). */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTicketType(roll: number): TicketType {
  if (roll < 0.75) return "General";
  if (roll < 0.87) return "VIP";
  if (roll < 0.92) return "Speaker";
  if (roll < 0.96) return "Press";
  return "Sponsor";
}

export function generateGuests(count = 200): SeedGuest[] {
  const random = createRandom(2026);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const usedNames = new Set<string>();
  const usedCodes = new Set<string>();
  const guests: SeedGuest[] = [];

  while (guests.length < count) {
    const fullName = `${pick(firstNames)} ${pick(lastNames)}`;
    if (usedNames.has(fullName)) continue;
    usedNames.add(fullName);

    let checkinCode: string;
    do {
      checkinCode = "LP-" + Array.from({ length: 4 }, () => pick(CODE_CHARS.split(""))).join("");
    } while (usedCodes.has(checkinCode));
    usedCodes.add(checkinCode);

    guests.push({
      fullName,
      email: `${fullName.toLowerCase().replace(" ", ".")}@example.com`,
      organization: pick(organizations),
      ticketType: pickTicketType(random()),
      checkinCode,
    });
  }

  return guests;
}
