# Face to Face

RAISE Summit Hackathon 2026 — track Vultr. Une plateforme où chaque collaborateur crée son clone
IA vocal, pour que ses collègues puissent répéter une conversation sensible avant de la vivre en vrai.

Voir [`PRD.md`](./PRD.md) pour le produit complet et [`CONTRACTS.md`](./CONTRACTS.md) pour le contrat
d'interface entre les 3 rôles.

## Équipe & répartition

- **Géraud (A)** — cœur agent & backend → `/lib/agent`, `/app/api/ask`, `/app/api/ingest`
- **Raphaël (B)** — frontend → `/app` (pages), `/lib/api.ts`
- **Auguste (C)** — données, voix, vidéo → `/lib/voice`, `/app/api/stt`, `/app/api/tts`, `/app/api/voice/clone`, `/seed`

Chacun travaille sur sa branche (`geraud-agent`, `raphael-frontend`, `auguste-data-voice`), fusionnée
vers `main` aux points de synchronisation définis dans `CONTRACTS.md`.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir vos clés Vultr / Gradium
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Toutes les routes `/app/api/*` renvoient des
réponses mockées pour l'instant — le frontend fonctionne dès maintenant, sans attendre le vrai backend.

## Structure

```
app/
  page.tsx              accueil (grille des clones)
  team/                 team settings (contexte entreprise)
  training/[cloneId]/   training studio (upload + interview)
  room/[cloneId]/       interaction room (chat / salle vocale)
  api/                  routes contractuelles (voir CONTRACTS.md)
lib/
  agent/                cœur agent (Géraud)
  voice/                wrappers Gradium (Auguste)
  api.ts                wrapper d'appel API frontend (Raphaël)
seed/                   données de démo (persona fictif, entreprise fictive, outils simulés)
```

## Règle du hackathon à ne jamais oublier

Tout le code de ce repo doit avoir été écrit **pendant l'événement** (règle "new work only" —
confirmée par les organisateurs). Ne pas importer de code préexistant.
