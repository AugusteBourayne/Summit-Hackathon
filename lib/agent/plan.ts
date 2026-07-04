const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";
const CHAT_MODEL = "MiniMaxAI/MiniMax-M2.7";

function getApiKey(): string {
  const key = process.env.VULTR_API_KEY;
  if (!key) {
    throw new Error("VULTR_API_KEY manquante dans .env.local");
  }
  return key;
}

// Le plan produit par le LLM : quelles sources consulter pour repondre a cette requete.
export interface Plan {
  requestType: string;        // ex: "demande de deadline", "annonce difficile", "question produit"
  usePersonalCorpus: boolean; // consulter les reactions passees du clone ?
  useTeamCorpus: boolean;     // consulter le contexte entreprise ?
  useTools: boolean;          // consulter agenda et projets ?
}

// Plan par defaut si le LLM repond mal : on consulte tout, c'est le comportement le plus sur.
const FALLBACK_PLAN: Plan = {
  requestType: "requete generale",
  usePersonalCorpus: true,
  useTeamCorpus: true,
  useTools: true,
};

// Etape 1 de la boucle agent : le LLM classifie la requete et decide quelles sources consulter.
export async function plan(text: string, mode: "clone" | "interviewer"): Promise<Plan> {
  const systemPrompt = `Tu es un classificateur de requetes pour un agent conversationnel.
On te donne le message d'un utilisateur adresse au clone IA d'un collegue (mode: ${mode}).
Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni apres, sans backticks, au format exact :
{"requestType": "<type de demande en quelques mots>", "usePersonalCorpus": <true|false>, "useTeamCorpus": <true|false>, "useTools": <true|false>}

Criteres :
- usePersonalCorpus: true si la reponse depend du style, des opinions ou reactions passees de la personne clonee.
- useTeamCorpus: true si la reponse depend du contexte entreprise (produit, priorites, vocabulaire).
- useTools: true si la reponse depend de l'agenda ou des projets en cours (disponibilite, charge, deadlines).`;

  const res = await fetch(`${VULTR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      // Temperature basse : on veut une classification stable, pas de la creativite.
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    // Si Vultr echoue, on ne bloque pas la boucle : on part sur le plan par defaut.
    return FALLBACK_PLAN;
  }

  const body = await res.json();
  const raw: string = body.choices?.[0]?.message?.content ?? "";

  // Filet de securite : on extrait le premier objet JSON trouve dans la reponse,
  // au cas ou le modele ajoute du texte autour malgre la consigne.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return FALLBACK_PLAN;
  }

  try {
    const parsed = JSON.parse(match[0]);
    return {
      requestType: typeof parsed.requestType === "string" ? parsed.requestType : FALLBACK_PLAN.requestType,
      usePersonalCorpus: Boolean(parsed.usePersonalCorpus),
      useTeamCorpus: Boolean(parsed.useTeamCorpus),
      useTools: Boolean(parsed.useTools),
    };
  } catch {
    return FALLBACK_PLAN;
  }
}