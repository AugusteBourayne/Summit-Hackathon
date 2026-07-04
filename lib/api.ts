// Wrapper unique pour tous les appels API du frontend (Raphaël).
// Aujourd'hui ça pointe vers nos propres routes /app/api/*, qui renvoient des mocks tant que
// Géraud et Auguste n'ont pas branché la vraie logique. Rien à changer côté frontend le jour où
// les mocks deviennent réels : c'est le même chemin (/api/...).

export type AskResponse = {
  response: string;
  citations: { text: string; source: string }[];
  objections: string[];
  suggestion: string;
  steps: string[];
};

export type Behavior = { id: string; text: string };
export type CloneProfile = { summary: string; behaviors: Behavior[] };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  ingest: (params: { scope: string; content: string; source: "upload" | "interview" }) =>
    post<{ chunksAdded: number }>("/api/ingest", params),

  ask: (params: { cloneId: string; mode: "clone" | "interviewer"; text: string; history?: unknown[] }) =>
    post<AskResponse>("/api/ask", params),

  stt: (params: { audio: string }) => post<{ text: string }>("/api/stt", params),

  tts: (params: { text: string; voiceId: string | null }) =>
    post<{ audioUrl: string }>("/api/tts", params),

  cloneVoice: (params: { audioSample: string }) =>
    post<{ voiceId: string }>("/api/voice/clone", params),

  // Profil comportemental éditable d'un clone (résumé + liste de comportements).
  getBehaviors: (cloneId: string) =>
    get<CloneProfile>(`/api/clones/${cloneId}/behaviors`),

  saveBehaviors: (cloneId: string, profile: CloneProfile) =>
    post<CloneProfile>(`/api/clones/${cloneId}/behaviors`, profile),

  // Identité éditable d'un clone : nom d'affichage + avatar (data URL uploadé).
  saveProfile: (cloneId: string, patch: { name?: string; avatar?: string }) =>
    post<{ name?: string; avatar?: string }>(`/api/clones/${cloneId}/profile`, patch),
};
