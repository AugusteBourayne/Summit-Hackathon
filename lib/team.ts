import teamData from "@/seed/team.json";
import clonesData from "@/seed/clones.json";

export type Member = { id: string; name: string; role: string; consent: boolean };
export type Clone = {
  name: string;
  role: string;
  voiceId: string | null;
  personaProfile: string;
  trained: boolean;
};

export const team = teamData as {
  company: { name: string; description: string; product: string };
  members: Member[];
};

export const clones = clonesData as Record<string, Clone>;

export function getClone(cloneId: string): Clone | undefined {
  return clones[cloneId];
}

// Dégradés d'avatar stables par personne (dérivés de l'id, pas stockés dans les seeds)
const gradients = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
];

export function avatarGradient(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return gradients[hash % gradients.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hashOf(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

// Paramètres de flottement pseudo-aléatoires mais stables par personne. La position (x/y) et
// la rotation ont chacune leur propre durée/délai, volontairement pas multiples l'une de
// l'autre : les deux dérivent, se déphasent en continu, et ne retombent jamais en boucle
// synchronisée avec les autres bulles — plus "anarchique" qu'une simple vague.
export function floatParams(id: string) {
  const h = hashOf(id);
  const duration = 4.3 + ((h >> 2) % 7) * 0.45; // 4.3s → 7.3s
  const delay = -((h >> 5) % 50) / 10; // démarre "en cours de route", jamais synchronisé
  const durationRot = 3.6 + ((h >> 9) % 6) * 0.55; // 3.6s → 6.7s, indépendant de duration
  const delayRot = -((h >> 14) % 45) / 10;
  const x = (((h >> 8) % 7) - 3) * 4; // -12px → 12px
  const y = 8 + ((h >> 11) % 5) * 2.5; // 8px → 18px
  const rot = 1.5 + ((h >> 13) % 3) * 0.8; // 1.5deg → 3.1deg
  return { duration, delay, durationRot, delayRot, x, y, rot };
}
