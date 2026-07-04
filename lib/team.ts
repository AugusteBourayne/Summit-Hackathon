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
