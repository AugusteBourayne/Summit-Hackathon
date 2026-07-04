# /lib/agent — territoire de Géraud (Personne A)

C'est ici que vit la logique du cœur agent (le contenu de `/app/api/ask` et `/app/api/ingest` doit rester fin :
juste parser la requête, appeler les fonctions d'ici, renvoyer la réponse).

À construire (voir PRD.md section 4, Pilier C, C1 pour le détail des 5 étapes) :

- `ingest.ts` — chunking + embeddings (Vultr Serverless Inference) + stockage local
- `retrieve.ts` — recherche par similarité dans le corpus personnel et le corpus entreprise
- `tools.ts` — lecture de `/seed/calendar.json` et `/seed/projects.json`
- `plan.ts` — classification de la requête (quel type de demande, quels corpus/outils consulter)
- `synthesize.ts` — appel final au LLM (persona profile + résultats) → `{ response, citations, objections, suggestion, steps }`
- `store.ts` — lecture/écriture du stockage local des chunks (JSON ou SQLite)

Contrat exact des entrées/sorties : voir `/CONTRACTS.md` à la racine. Ne pas le changer sans prévenir Raphaël et Auguste.
