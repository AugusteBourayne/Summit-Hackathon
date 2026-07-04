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

// Paramètres de flottement pseudo-aléatoires mais stables par personne : chacun dérive
// (durée, délai, amplitude, sens) de son id, pour un mouvement indépendant et non synchronisé.
export function floatParams(id: string) {
  const h = hashOf(id);
  const duration = 4.2 + ((h >> 2) % 5) * 0.5; // 4.2s → 6.7s
  const delay = -((h >> 5) % 40) / 10; // décalage négatif : démarre "en cours de route"
  const x = (((h >> 8) % 5) - 2) * 3; // -6px → 6px
  const y = 6 + ((h >> 11) % 4) * 2; // 6px → 12px
  const rot = (((h >> 13) % 3) - 1) * 1.5; // -1.5deg → 1.5deg
  return { duration, delay, x, y, rot };
}
