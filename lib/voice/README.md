# /lib/voice — territoire d'Auguste (Personne C)

C'est ici que vivent les wrappers Gradium (le contenu de `/app/api/stt`, `/app/api/tts` et `/app/api/voice/clone`
doit rester fin : juste parser la requête, appeler les fonctions d'ici, renvoyer la réponse).

À construire (voir PRD.md section 4, Pilier B/C pour le détail) :

- `stt.ts` — envoie l'audio à Gradium STT, retourne le texte
- `tts.ts` — envoie le texte (+ voiceId) à Gradium TTS, retourne une URL audio
- `clone.ts` — envoie un échantillon audio à Gradium Voice Cloning, retourne un voiceId

Teste ces fonctions en isolation (script Node ou curl direct vers l'API Gradium) avant de les brancher
dans les routes `/app/api/*` — pas besoin d'attendre que Géraud ou Raphaël aient avancé.

Contrat exact des entrées/sorties : voir `/CONTRACTS.md` à la racine. Ne pas le changer sans prévenir Géraud et Raphaël.
