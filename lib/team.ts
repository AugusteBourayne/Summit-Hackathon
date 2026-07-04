import teamData from "@/seed/team.json";
import clonesData from "@/seed/clones.json";

export type Member = { id: string; name: string; role: string; consent: boolean };
export type Behavior = { id: string; text: string };
export type Clone = {
  name: string;
  role: string;
  voiceId: string | null;
  personaProfile: string;
  trained: boolean;
  summary?: string;
  behaviors?: Behavior[];
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

// Paramètres de flottement pseudo-aléatoires mais stables par personne : juste la durée et le
// délai varient (dérivés de l'id), pour que chaque bulle flotte verticalement à son propre
// rythme sans jamais former une vague synchronisée avec les autres. Amplitude volontairement
// petite — c'est un frémissement discret, pas une animation qu'on remarque.
export function floatParams(id: string) {
  const h = hashOf(id);
  const duration = 4.5 + ((h >> 2) % 5) * 0.4; // 4.5s → 6.1s
  const delay = -((h >> 5) % 50) / 10; // démarre "en cours de route", jamais synchronisé
  const y = 4 + ((h >> 11) % 3); // 4px → 6px
  return { duration, delay, y };
}
