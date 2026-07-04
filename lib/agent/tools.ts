import fs from "fs";
import path from "path";

// Dossier ou vivent les fichiers de donnees simulees, prepares par Auguste (Personne C).
const SEED_DIR = path.join(process.cwd(), "seed");

// Structures attendues, calquees sur les fichiers reels de /seed.
interface CalendarEvent {
  date: string;
  title: string;
  busy: boolean;
}
interface Project {
  name: string;
  deadline: string;
  status: string;
}

// Lit un fichier JSON du dossier seed. Renvoie null si le fichier est absent ou illisible,
// pour que la boucle agent continue sans planter meme si un fichier manque.
function readSeedFile<T>(filename: string): Record<string, T[]> | null {
  try {
    const raw = fs.readFileSync(path.join(SEED_DIR, filename), "utf-8");
    return JSON.parse(raw) as Record<string, T[]>;
  } catch {
    return null;
  }
}

// Recupere l'agenda d'un clone et le resume en une ligne de texte lisible par le LLM.
// Chaque fichier est un dictionnaire indexe par cloneId, d'ou l'acces data[cloneId].
export function getCalendarSummary(cloneId: string): string {
  const data = readSeedFile<CalendarEvent>("calendar.json");
  const events = data?.[cloneId] ?? [];
  if (events.length === 0) {
    return "Aucun evenement connu dans l'agenda.";
  }
  const busyCount = events.filter((e) => e.busy).length;
  const lines = events.map((e) => `- ${e.date} : ${e.title}${e.busy ? " (occupe)" : ""}`);
  return `Agenda (${busyCount} creneau(x) occupe(s)) :\n${lines.join("\n")}`;
}

// Recupere les projets d'un clone et les resume, en signalant ceux a risque.
export function getProjectsSummary(cloneId: string): string {
  const data = readSeedFile<Project>("projects.json");
  const projects = data?.[cloneId] ?? [];
  if (projects.length === 0) {
    return "Aucun projet en cours connu.";
  }
  const lines = projects.map(
    (p) => `- ${p.name} : echeance ${p.deadline}, statut "${p.status}"`
  );
  return `Projets en cours :\n${lines.join("\n")}`;
}

// Fonction pratique appelee par la boucle agent : renvoie le contexte outils complet d'un clone.
export function getToolsContext(cloneId: string): string {
  return `${getCalendarSummary(cloneId)}\n\n${getProjectsSummary(cloneId)}`;
}