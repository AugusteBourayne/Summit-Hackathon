import { getAllChunkContents } from "@/lib/agent/documents";

const VULTR_BASE = process.env.VULTR_INFERENCE_BASE_URL ?? "https://api.vultrinference.com/v1";
const CHAT_MODEL = "MiniMaxAI/MiniMax-M2.7";

function getApiKey(): string {
  const key = process.env.VULTR_API_KEY;
  if (!key) {
    throw new Error("VULTR_API_KEY manquante dans .env.local");
  }
  return key;
}

export interface GeneratedProfile {
  summary: string;
  behaviors: string[];
}

// Construit le profil comportemental (resume + traits) a partir de tous les documents/
// reponses d'interview deja ingeres pour ce clone, via un appel LLM unique.
export async function generateProfile(name: string, cloneId: string): Promise<GeneratedProfile> {
  const chunks = await getAllChunkContents(cloneId);
  if (chunks.length === 0) {
    throw new Error("Aucun document n'a encore ete ajoute pour ce clone — ajoutez du contenu avant de generer le profil.");
  }

  // On limite le nombre de caracteres envoyes au LLM pour rester sous la fenetre de contexte,
  // meme avec beaucoup de documents ingeres.
  const corpus = chunks.join("\n---\n").slice(0, 24000);

  const systemPrompt = `Tu analyses des documents (transcriptions de reunions, notes, reponses d'interview) qui montrent comment ${name} reagit et prend des decisions au travail.

DOCUMENTS :
${corpus}

CONSIGNES DE SORTIE :
Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans backticks, au format exact :
{
  "summary": "<resume court et lisible (2-4 phrases) de la maniere dont ${name} decide et communique>",
  "behaviors": ["<trait de comportement concret et specifique, ancre dans les documents>", "..."]
}
Regle : 4 a 8 traits de comportement maximum, chacun en une phrase courte et concrete (pas de generalites vagues type "communique bien").`;

  const res = await fetch(`${VULTR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Genere le profil." }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Echec generation profil Vultr: ${res.status} - ${detail}`);
  }

  const body = await res.json();
  const raw: string = body.choices?.[0]?.message?.content ?? "";

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Le modele n'a pas renvoye de JSON exploitable.");
  }

  const parsed = JSON.parse(match[0]);
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    behaviors: Array.isArray(parsed.behaviors) ? parsed.behaviors.filter((b: unknown) => typeof b === "string") : [],
  };
}

// Deduit UNIQUEMENT les nouveaux traits de comportement apportes par un document precis,
// en evitant de repeter ceux deja connus — appele automatiquement a chaque ajout de contenu
// dans le Training Studio, pour que la liste s'enrichisse au fil des documents (comme pour
// Claire Dumont, dont les 12 comportements se sont accumules progressivement).
export async function deriveNewBehaviors(
  name: string,
  content: string,
  existingBehaviors: string[]
): Promise<string[]> {
  const systemPrompt = `Tu analyses un nouveau document qui montre comment ${name} reagit et decide au travail.

NOUVEAU DOCUMENT :
${content.slice(0, 8000)}

TRAITS DE COMPORTEMENT DEJA CONNUS (ne pas les repeter, ne pas en proposer de tres proches) :
${existingBehaviors.length ? existingBehaviors.map((b) => `- ${b}`).join("\n") : "(aucun pour l'instant)"}

CONSIGNES DE SORTIE :
Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans backticks, au format exact :
{ "behaviors": ["<nouveau trait concret deduit de ce document, absent de la liste ci-dessus>"] }
Regles : 0 a 4 nouveaux traits maximum. Si ce document n'apporte rien de nouveau par rapport a la liste connue, renvoie un tableau vide. Chaque trait est une phrase courte et concrete.`;

  const res = await fetch(`${VULTR_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Deduis les nouveaux traits." }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Echec deduction comportements Vultr: ${res.status} - ${detail}`);
  }

  const body = await res.json();
  const raw: string = body.choices?.[0]?.message?.content ?? "";

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed.behaviors)
      ? parsed.behaviors.filter((b: unknown) => typeof b === "string")
      : [];
  } catch {
    return [];
  }
}
