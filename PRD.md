# PRD — Face to Face

*RAISE Summit Hackathon 2026 · Track Vultr · Équipe remote de 3 · Deadline : dimanche 12h00*

## 1. Résumé exécutif

**Face to Face** permet à chaque membre d'une équipe de créer son **clone IA conversationnel vocal**, entraîné sur ses documents de travail et une interview vocale, et contextualisé par la connaissance de l'entreprise. Un collègue peut alors **répéter une interaction importante avec le clone avant de la vivre en vrai** : il obtient la réaction probable, les objections anticipées et une recommandation de formulation — le tout sourcé par des citations d'échanges réels.

En une phrase pour le pitch : *"Rehearse the conversation before it happens."*

## 2. Problème, cible, proposition de valeur

**Le problème.** Avant de soumettre une demande sensible (délai, budget, arbitrage, ressource), un employé n'a aucun moyen de tester sa formulation ni d'anticiper la réaction de son interlocuteur. Résultat : demandes mal préparées, allers-retours inutiles, frictions évitables. Les managers, eux, sont interrompus pour des questions dont la réponse est prévisible à partir de leurs décisions passées.

**La cible.** Les équipes en entreprise — d'abord le duo employé/manager, extensible à toute interaction interne (ventes internes, onboarding, préparation de réunions).

**La proposition de valeur.**
- Pour l'employé : anticiper la réaction, arriver préparé, gagner en confiance et en vitesse.
- Pour le manager : moins d'interruptions à faible valeur, les vraies conversations arrivent mieux préparées.
- Pour l'entreprise : la connaissance des décisions passées devient un actif interrogeable, avec consentement explicite.

**Différenciation** (vs Viven, Colleague Skill, clones d'exécutifs) : eux font du "chat avec un clone" en broadcast. Nous faisons de la **pré-vérification d'interaction** — un livrable actionnable (réaction + objections + reformulation + citations), ancré dans un **double contexte personne + entreprise**, en **voix**, avec **consentement affiché**. C'est le rôle "informational conveyor" identifié comme le moins risqué par la recherche CMU (CHI 2026), pas la délégation complète.

## 3. Les 3 piliers du produit

1. **Team Space** — le contexte partagé : qui est l'équipe, que fait l'entreprise, comment fonctionne son produit. Alimente *tous* les clones.
2. **Training Studio** — la création du clone : dépôt de documents + interview vocale menée par l'IA + clonage de la voix.
3. **Interaction Room** — l'usage : je choisis un clone, je lui parle de vive voix, il me répond avec sa voix, ses réactions probables, ses objections, ses sources.

Un seul **cœur agent** texte-in/texte-out sert les trois piliers — l'interview et l'interaction ne sont que deux "modes" du même moteur, la voix n'est qu'une couche autour.

## 4. Spécifications fonctionnelles détaillées

Chaque fonctionnalité est notée : **Importance** (Critique / Haute / Moyenne) · **Difficulté** (Faible / Moyenne / Haute) · **Priorité** (P0 = sans ça pas de démo, P1 = forte valeur démo, P2 = si avance, HS = hors scope).

### Pilier A — Team Space

**A1. Espace d'équipe pré-configuré** — Critique · Faible · **P0**
Pas de login : au démarrage, l'app charge une équipe fixe (fichier de seed) avec 2-3 profils dont le persona fictif de démo. Page d'accueil = grille des clones avec statut ("trained" / "not trained"), badge de consentement, bouton "Talk to clone".

**A2. Company knowledge (contexte entreprise)** — Haute · Faible · **P0**
Dans les paramètres d'équipe : une zone de texte + upload où l'on renseigne l'entreprise (ce qu'elle fait, comment marche le produit, les priorités du trimestre, le vocabulaire interne). Techniquement : ce contenu passe dans le **même pipeline d'ingestion** que les documents personnels, mais avec un scope `team` au lieu de `personal:<cloneId>`. Pour la démo : seedé avec une entreprise fictive cohérente (ex. une SaaS B2B fictive avec un produit, des clients, une deadline de release). Coût de dev quasi nul (réutilisation du pipeline), valeur énorme : c'est ce qui rend les réponses du clone **pertinentes métier** et pas juste "dans le style de la personne".

### Pilier B — Training Studio

**B1. Upload de documents texte** — Critique · Faible-Moyenne · **P0**
Zone de drag & drop acceptant `.txt`/`.md`/collage direct (transcripts de réunions, notes). Pipeline : découpage en morceaux d'environ 500 tokens avec chevauchement (*chunking*) → calcul d'un vecteur numérique par morceau via l'endpoint d'embeddings de Vultr Serverless Inference (*embedding* : représentation du sens du texte qui permet de retrouver les passages similaires à une question) → stockage `{texte, vecteur, scope, source}` dans un fichier JSON/SQLite local. Pas de base vectorielle externe : à l'échelle d'une démo (< 1 000 morceaux), une similarité cosinus calculée en mémoire est instantanée et supprime une dépendance.

**B2. Interview vocale — script fixe** — Haute · Moyenne · **P1** *(mais le flux vocal qu'elle réutilise est P0 via C2)*
Page dédiée : l'IA pose 8-10 questions préparées (stockées en JSON) à voix haute, l'utilisateur répond au micro. Boucle : question TTS → enregistrement micro → STT Gradium → la paire question/réponse est ingérée dans le corpus personnel avec un tag `interview`. Les questions ciblent le comportement décisionnel : "How do you react when someone asks to move a deadline?", "What makes you say no immediately?", etc.

**B3. Clonage de voix** — Haute · Faible · **P1**
À la fin de l'interview, l'audio des réponses (concaténé) sert d'échantillon envoyé à l'API voice cloning de Gradium → on stocke le `voiceId` sur le profil du clone. Toutes les réponses TTS du clone utilisent ensuite cette voix. Effet démo majeur pour un coût d'intégration faible (un appel API). **Plan B** si la qualité déçoit : une voix TTS standard distincte par clone.

**B4. Persona profile (profil comportemental structuré)** — Haute · Moyenne · **P1** (seedé à la main en P0)
Un document structuré par clone : style de communication, priorités, critères de décision récurrents, manières de refuser. Injecté dans le prompt système du clone à chaque réponse (le retrieval fournit les exemples ; le profil fournit la constance). Pour la démo P0 : celui du persona fictif est **pré-écrit à la main** dans la seed. En P1 : un appel LLM le met à jour automatiquement après chaque interview/ingestion. C'est ce qui distingue "réagir comme la personne" (profil + exemples) d'un simple "citer la personne" (RAG seul).

**B5. Interview adaptative** — Moyenne · Moyenne · **P2**
À partir de la 2e interview : avant chaque question, le LLM reçoit le persona profile actuel + l'historique des questions déjà posées, et génère la question qui comble la plus grosse lacune. Beau différenciateur, mais difficile à montrer en 1 minute de vidéo — d'où P2.

**B6. Upload audio** (transcription batch Gradium) — Moyenne · Faible-Moyenne · **P2**

**B7. Upload vidéo, connexion email (OAuth)** — · · **HS** (roadmap pitch uniquement, jamais montrés comme fonctionnels — règle "new work only").

### Pilier C — Interaction Room

**C1. Cœur agent (le moteur de tout)** — Critique · Moyenne-Haute · **P0**
API unique `POST /ask` → sortie JSON structurée. Boucle en 5 étapes (c'est elle qui vous protège du "basic RAG" banni et qui coche l'énoncé Vultr) :

1. **Plan** : le LLM classifie la requête (type de demande, entités, quels corpus consulter, quels outils appeler)
2. **Retrieve corpus personnel** : top-k des réactions passées similaires du clone
3. **Retrieve corpus entreprise** : contraintes métier et contexte produit pertinents
4. **Outils** : lecture de `calendar.json` et `projects.json` (agenda et tracker simulés — ex. "le manager a déjà 2 deadlines cette semaine")
5. **Synthèse** : prompt système = persona profile + résultats → sortie `{response, objections[], citations[], suggestion, steps[]}`

Le champ `steps[]` trace ce que l'agent a fait à chaque étape. LLM : un modèle chat de Vultr Serverless Inference (API compatible OpenAI) ; retrieval : VultronRetriever via le même service (fallback : embeddings standard Vultr si VultronRetriever se révèle mal documenté le jour J).

**C2. Boucle vocale tour par tour** — Critique · Moyenne · **P0**
Micro navigateur (API MediaRecorder) → `POST /stt` (Gradium) → `POST /ask` → `POST /tts` avec le `voiceId` du clone → lecture audio. Latence attendue 3-6 s/tour : affichée comme un état "thinking" avec animation d'onde (assumé, comme un vrai interlocuteur qui réfléchit). Contrainte : le micro exige HTTPS ou localhost — la démo tourne en local, c'est suffisant et autorisé.

**C3. Salle vocale (UI meeting-like)** — Critique · Moyenne · **P0**
Page par clone : avatar/onde qui pulse quand le clone "parle", bouton push-to-talk, transcript du dialogue qui défile. **Pas un dashboard** (catégorie bannie) : une conversation.

**C4. Panneau "grounded response"** — Haute · Faible · **P1**
À côté de la conversation : les **citations** (extraits sources cliquables), les **objections probables**, la **reformulation suggérée**, et la **trace des étapes de l'agent** (`steps[]` affiché : "Planned → Retrieved 3 personal + 2 company docs → Checked calendar → Answered"). Coût : purement de l'affichage (les données existent déjà dans la réponse C1). Valeur : c'est la **preuve visuelle** pour les juges Vultr que c'est un agent ancré dans des documents, pas un chatbot.

**C5. Intégration Slack** — Faible · Moyenne-Haute · **HS sauf miracle** (pas dans la vidéo de toute façon).

**C6. Bot dans un vrai Google Meet** — · · **HS** (décision déjà actée : salle maison).

## 5. Architecture technique globale

```
Frontend (Next.js, anglais)
  ├─ Home équipe / Team settings / Training Studio / Interaction Room
  └─ appelle l'API interne :
       POST /api/ingest   {scope, cloneId?, content}        → chunk + embed + store
       POST /api/stt      {audio}                           → Gradium STT → texte
       POST /api/ask      {cloneId, mode: clone|interviewer, text}
       │                                                    → boucle agent (Vultr) → JSON structuré
       POST /api/tts      {text, voiceId}                   → Gradium TTS → audio
       POST /api/voice/clone {audioSample}                  → Gradium → voiceId

Données locales (JSON/SQLite) : team.json, clones.json (profils + voiceId),
chunks.json (vecteurs), calendar.json, projects.json (outils simulés), interview_questions.json
```

- **Un seul dépôt** (monorepo Next.js full-stack) : moins de pièces à intégrer, vibe-coding friendly, et le dev confirmé garde le contrôle des routes API sensibles.
- **Tout tourne en local pour la vidéo** (autorisé). Option P2 : héberger sur un petit serveur Vultr avec les crédits — bonus de cohérence track, jamais bloquant.
- `CONTRACTS.md` figé au kickoff : les 5 endpoints ci-dessus + formats JSON. Chacun développe contre des mocks ; l'intégration = remplacer les mocks.

## 6. Priorisation finale (ordre de build)

| # | Tâche | Importance | Difficulté | Priorité |
|---|---|---|---|---|
| 1 | Seed data (équipe, persona fictif, entreprise fictive, calendar/projects) | Critique | Faible | P0 |
| 2 | Ingestion texte + retrieval (A2 + B1) | Critique | Faible-Moyenne | P0 |
| 3 | Cœur agent 5 étapes (C1) | Critique | Moyenne-Haute | P0 |
| 4 | UI : home + salle vocale (A1 + C3) | Critique | Moyenne | P0 |
| 5 | Boucle vocale STT/TTS (C2) | Critique | Moyenne | P0 |
| 6 | Panneau citations/objections/steps (C4) | Haute | Faible | P1 |
| 7 | Interview vocale script fixe (B2) | Haute | Moyenne | P1 |
| 8 | Voice cloning (B3) | Haute | Faible | P1 |
| 9 | Persona profile auto-mis à jour (B4) | Haute | Moyenne | P1 |
| 10 | Interview adaptative (B5) | Moyenne | Moyenne | P2 |
| 11 | Upload audio (B6) | Moyenne | Faible-Moyenne | P2 |
| 12 | Déploiement serveur Vultr | Faible | Moyenne | P2 |
| — | Slack, vidéo, email, vrai Meet | — | — | HS / roadmap |

**Règle de pilotage** : le "golden path" de la vidéo (upload → extrait d'interview → interaction avec citations) doit fonctionner de bout en bout **samedi 22h**. Tout ce qui est P2 ne se lance que si ce chemin est solide.

## 7. Plan d'action par rôle

| Créneau | Dev confirmé | Vibe coder 1 (UI) | Vibe coder 2 (données/voix/pitch) |
|---|---|---|---|
| Sam. 11h30-13h | `CONTRACTS.md`, repo public, clés API testées (Vultr + Gradium) | Maquette home + salle vocale | Rédaction seed : persona, entreprise fictive, questions d'interview |
| Sam. 13h-18h | Ingestion + cœur agent (#2, #3) | UI branchée sur mocks (#4) | Wrapper Gradium STT/TTS testé isolément, début script vidéo |
| **Jalon 18h** | **L'agent répond en texte de bout en bout** | | |
| Sam. 18h-22h | Intégration agent ↔ voix (#5) | Panneau grounded (#6) | Voice cloning (#8), enrichissement seed |
| **Jalon 22h** | **Golden path vocal complet** | | |
| Dim. 7h-9h30 | Stabilisation, gestion d'erreurs, P1 restants (#7, #9) | Polish UI, badge consentement | Répétition du scénario vidéo |
| **9h30** | **CODE FREEZE** | | |
| Dim. 9h30-11h30 | README (archi, "built during the event") | Aide tournage | Tournage + montage vidéo 1 min |
| **11h30** | Vidéo uploadée, formulaire prêt → **soumission avant 12h00** | | |

## 8. Risques & plans B

| Risque | Plan B |
|---|---|
| Voice cloning décevant | Voix TTS standard distincte par clone (l'histoire tient toujours) |
| VultronRetriever inutilisable | Embeddings standard Vultr Inference (on reste sur leur infra) |
| Latence vocale trop longue | Réduire à 2 tours dans la vidéo ; coupes au montage (le produit reste réel) |
| Interview vocale instable | La démo d'interview se fait au clavier, la voix reste sur l'interaction |
| Retard général samedi soir | Couper P1 ≠ cœur : garder #6 (citations), sacrifier #7/#8 en dernier recours |

## 9. Critères de succès (calés sur le jugement)

- **Demo 50%** → le golden path tourne sans accroc, en vrai, 3 fois de suite avant tournage.
- **Impact 25%** → pitch : problème universel en entreprise, double corpus personne+entreprise, roadmap (Slack, email, Meet) *présentée comme roadmap*.
- **Créativité 15%** → la voix clonée qui répond + l'interview menée par l'IA : c'est le moment "waouh".
- **Pitch 10%** → vidéo scriptée, répétée, en anglais, uploadée avec 30 min de marge.

## 10. Garde-fous réglementaires (rappel)

- Ne jamais présenter le projet comme un "personality analyzer" — toujours "agent de décision sourcé".
- Architecture multi-étapes obligatoire pour éviter le "basic RAG".
- Données de démo 100% fictives (persona fictif, entreprise fictive).
- Ne montrer dans la vidéo que ce qui est réellement fonctionnel — upload email/vidéo/vrai Meet restent hors périmètre et ne doivent jamais apparaître comme construits.
- Repo GitHub public, code entièrement écrit pendant l'événement.

## 11. Découpage des tâches par personne (contrat d'interface)

Principe : chacun développe contre un contrat figé dès le kickoff, avec des mocks — personne n'attend personne. L'intégration ne consiste qu'à remplacer un mock par le vrai endpoint, à des points de synchronisation précis.

### Contrat (`CONTRACTS.md`, à écrire ensemble en premier, 30 min max)

```
POST /api/ingest   { scope: "team" | "personal:<cloneId>", content: string, source: "upload"|"interview" }
                    → { chunksAdded: number }

POST /api/ask       { cloneId: string, mode: "clone"|"interviewer", text: string, history: [...] }
                    → { response: string, citations: [{text, source}], objections: [string], suggestion: string, steps: [string] }

POST /api/stt       { audio: base64 } → { text: string }
POST /api/tts       { text: string, voiceId: string|null } → { audioUrl: string }
POST /api/voice/clone { audioSample: base64 } → { voiceId: string }

team.json     { company: {name, description, product}, members: [{id, name, role, consent}] }
clones.json   { <cloneId>: {name, role, voiceId, personaProfile, trained} }
```

### Personne A (dev confirmé) — Cœur agent & backend
Ne dépend de personne : teste tout au curl/Postman, sans UI ni voix.
1. Scaffold repo Next.js, clés Vultr/Gradium testées isolément
2. `/api/ingest` : chunking + embeddings + stockage
3. `/api/ask` : boucle 5 étapes (plan → retrieve personnel → retrieve entreprise → outils simulés → synthèse avec citations/objections)
4. Loader de seed data (données bidon en attendant celles de la Personne C)
5. Gestion d'erreurs/retries sur les appels Vultr
6. Tests de bout en bout au curl, sans UI

### Personne B (vibe coder) — Frontend
Ne dépend de personne : code contre des réponses JSON mockées conformes au contrat.
1. Page d'accueil (grille des clones, badge consentement, statut "trained")
2. Team Settings (affichage contexte entreprise)
3. Training Studio (upload + écran d'interview)
4. Interaction Room (salle vocale, avatar/onde, push-to-talk, panneau citations/objections)
5. Toutes les pages passent par un wrapper d'appel API unique — le jour J, on change juste l'URL de base pour passer du mock au vrai backend

### Personne C (vibe coder) — Données, voix, vidéo
Ne dépend de personne : teste Gradium en isolation, écrit le contenu indépendamment du reste.
1. Persona fictif (bio, profil comportemental, transcripts inventés)
2. Contexte entreprise fictif (`team.json` conforme au contrat)
3. Script des 8-10 questions d'interview fixes
4. Wrappers Gradium testés isolément (`/api/stt`, `/api/tts`, `/api/voice/clone`)
5. Storyboard de la vidéo de démo
6. Tournage et montage (plus tard)

### Points de synchronisation

| Quand | Quoi |
|---|---|
| Sam. ~18h | UI de la Personne B branchée sur le vrai `/api/ask` (remplace le mock) |
| Sam. ~22h | Wrappers Gradium de la Personne C branchés dans la boucle vocale |
| Dim. matin | Vrai contenu (persona + entreprise) de la Personne C remplace les données bidon |

Chaque brique est testable et démontrable seule avant intégration — un retard sur un point de sync ne bloque pas les deux autres.
