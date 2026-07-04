# Contrats d'interface — Face to Face

Ce fichier est la source de vérité. Personne ne doit changer une forme de requête/réponse sans le dire aux deux autres.
Tant que le vrai backend n'est pas prêt, chaque route renvoie une réponse **mockée** conforme à ce contrat — le frontend peut donc être développé immédiatement sans attendre personne.

## Rôles
- **Géraud (A)** — cœur agent & backend : remplit `/app/api/ask`, `/app/api/ingest`, la logique dans `/lib/agent`.
- **Raphaël (B)** — frontend : construit les pages dans `/app`, consomme les routes via `/lib/api.ts`.
- **Auguste (C)** — données, voix, vidéo : remplit `/app/api/stt`, `/app/api/tts`, `/app/api/voice/clone`, la logique dans `/lib/voice`, et les fichiers dans `/seed`.

## Endpoints

### `POST /api/ingest`
Ajoute du contenu (texte) à la base de connaissance d'un scope donné (entreprise ou personne).
```ts
// Request
{ scope: "team" | `personal:${string}`, content: string, source: "upload" | "interview" }
// Response
{ chunksAdded: number }
```

### `POST /api/ask`
Le cœur de l'agent. Reçoit un texte (question ou réponse d'interview), retourne une réponse structurée et sourcée.
```ts
// Request
{
  cloneId: string,
  mode: "clone" | "interviewer",
  text: string,
  history?: { role: "user" | "clone"; text: string }[]
}
// Response
{
  response: string,
  citations: { text: string; source: string }[],
  objections: string[],
  suggestion: string,
  steps: string[] // trace des étapes de l'agent, ex: ["planned", "retrieved 3 personal docs", "retrieved 2 company docs", "checked calendar", "answered"]
}
```

### `POST /api/stt`
Transcrit un enregistrement audio en texte (Gradium).
```ts
// Request
{ audio: string /* base64 */ }
// Response
{ text: string }
```

### `POST /api/tts`
Transforme un texte en audio, avec la voix clonée si disponible (Gradium).
```ts
// Request
{ text: string, voiceId: string | null }
// Response
{ audioUrl: string }
```

### `POST /api/voice/clone`
Crée une voix clonée à partir d'un échantillon audio (Gradium).
```ts
// Request
{ audioSample: string /* base64 */ }
// Response
{ voiceId: string }
```

### `GET` / `POST /api/clones/:cloneId/behaviors`
Profil comportemental éditable d'un clone : un résumé lisible + une liste de comportements
distincts. La personne peut, depuis son propre profil, éditer / supprimer / ajouter ses
comportements (consentement actif sur ce que fait son clone).
```ts
type Behavior = { id: string; text: string };
// GET  Response
{ summary: string, behaviors: Behavior[] }
// POST Request (= Response)
{ summary: string, behaviors: Behavior[] }
```
**TODO(Géraud)** — la route est mockée côté frontend (renvoie le seed / echo). Deux choses à
brancher côté backend :
1. **Persister** le `{ summary, behaviors }` reçu (fichier/SQLite comme le reste du store).
2. **La synthèse `/api/ask` doit s'appuyer sur `summary` + `behaviors`** (au lieu de
   `personaProfile`) : si la personne supprime un comportement, le clone doit cesser de s'en
   servir. `personaProfile` reste dans le seed pour compat, mais `summary`+`behaviors` sont la
   nouvelle source de vérité du comportement.

### `POST /api/clones/:cloneId/profile`
Identité éditable d'un clone : nom d'affichage + avatar. La personne peut, depuis son propre
profil, changer son **nom** et **uploader une photo**.
```ts
// Request (= Response) — champs optionnels, patch partiel
{ name?: string, avatar?: string /* data URL base64 pour un upload */ }
```
**TODO(backend)** — route mockée (echo) ; côté frontend l'édition est déjà persistée en
localStorage pour la démo. À faire : persister `name`/`avatar` (l'avatar arrive en data URL,
à stocker ou pousser vers un bucket puis ne garder que l'URL).

## Fichiers de seed (`/seed`)

- `team.json` — `{ company: { name, description, product }, members: [{ id, name, role, consent }] }`
- `clones.json` — `{ [cloneId]: { name, role, voiceId, personaProfile, trained, summary, behaviors } }`
  - `summary: string` — résumé lisible du comportement (affiché sur le profil).
  - `behaviors: { id: string; text: string }[]` — comportements distincts, éditables par la personne.
  - `personaProfile: string` — ancien bloc markdown, conservé pour compat (déprécié : préférer `summary`+`behaviors`).
- `calendar.json` — outil simulé (agenda du clone)
- `projects.json` — outil simulé (tracker de projet du clone)
- `interview_questions.json` — les 8-10 questions fixes de la première interview

## Points de synchronisation
1. **Sam ~18h** — le frontend (B) branche `/lib/api.ts` sur le vrai `/api/ask` de Géraud (A) au lieu du mock.
2. **Sam ~22h** — les routes voix (C) sont branchées dans la boucle vocale du frontend.
3. **Dim matin** — le vrai contenu de `/seed` (C) remplace les données bidon utilisées par Géraud (A) pendant le dev.

Voir `PRD.md` pour le produit complet, les priorités (P0/P1/P2) et les garde-fous réglementaires du hackathon.
