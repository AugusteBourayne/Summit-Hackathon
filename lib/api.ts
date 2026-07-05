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
export type DocumentSummary = {
  batchId: string;
  label: string;
  source: "upload" | "interview";
  chunkCount: number;
  createdAt: string;
};

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

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  ingest: (params: {
    scope: string;
    content: string;
    source: "upload" | "interview";
    label?: string;
    imageDataUrl?: string;
    fileDataUrl?: string;
    fileType?: "pdf" | "docx";
  }) => post<{ chunksAdded: number }>("/api/ingest", params),

  listDocuments: (cloneId: string) =>
    get<{ documents: DocumentSummary[] }>(`/api/clones/${cloneId}/documents`),

  deleteDocument: (cloneId: string, batchId: string) =>
    del<{ deleted: number }>(`/api/clones/${cloneId}/documents/${encodeURIComponent(batchId)}`),

  // Genere automatiquement resume + traits de comportement a partir des documents deja ingeres.
  generateProfile: (cloneId: string, name: string) =>
    post<{ summary: string; behaviors: string[] }>(`/api/clones/${cloneId}/summarize`, { name }),

  // Deduit les NOUVEAUX traits apportes par un contenu precis (appele apres chaque ingestion).
  deriveBehaviors: (cloneId: string, params: { name: string; content: string; existingBehaviors: string[] }) =>
    post<{ behaviors: string[] }>(`/api/clones/${cloneId}/behaviors/derive`, params),

  ask: (params: { cloneId: string; mode: "clone" | "interviewer"; text: string; history?: unknown[] }) =>
    post<AskResponse>("/api/ask", params),

  stt: (params: { audio: string }) => post<{ text: string }>("/api/stt", params),

  tts: (params: { text: string; voiceId: string | null }) =>
    post<{ audioUrl: string }>("/api/tts", params),

  cloneVoice: (params: { audioSample: string }) =>
    post<{ voiceId: string }>("/api/voice/clone", params),

  cloneStats: (cloneId: string) =>
    get<{ docChunks: number; interviewChunks: number }>(`/api/clones/${cloneId}/stats`),

  updateClone: (cloneId: string, updates: Partial<{ voiceId: string | null; trained: boolean }>) =>
    patch(`/api/clones/${cloneId}`, updates),

  // Profil comportemental éditable d'un clone (résumé + liste de comportements).
  getBehaviors: (cloneId: string) =>
    get<CloneProfile>(`/api/clones/${cloneId}/behaviors`),

  saveBehaviors: (cloneId: string, profile: CloneProfile) =>
    post<CloneProfile>(`/api/clones/${cloneId}/behaviors`, profile),

  // Identité éditable d'un clone : nom d'affichage + avatar (data URL uploadé).
  saveProfile: (cloneId: string, patch: { name?: string; avatar?: string }) =>
    post<{ name?: string; avatar?: string }>(`/api/clones/${cloneId}/profile`, patch),
};
