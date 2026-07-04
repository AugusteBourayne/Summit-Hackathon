import fs from "fs";
import path from "path";
import { RetrievedChunk } from "@/lib/agent/retrieve";

const VULTR_BASE = "https://api.vultrinference.com/v1";
const CHAT_MODEL = "MiniMaxAI/MiniMax-M2.7";

function getApiKey(): string {
  const key = process.env.VULTR_API_KEY;
  if (!key) {
    throw new Error("VULTR_API_KEY manquante dans .env.local");
  }
  return key;
}

// Profil d'un clone tel que defini dans seed/clones.json (structure du CONTRACTS.md).
interface CloneProfile {
  name: string;
  role: string;
  voiceId: string | null;
  personaProfile: string;
  trained: boolean;
}

// Charge le profil du clone depuis le seed. Fallback generique si absent,
// pour que la boucle reste testable meme sans seed complet.
function loadCloneProfile(cloneId: string): CloneProfile {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "seed", "clones.json"), "utf-8");
    const clones = JSON.parse(raw) as Record<string, CloneProfile>;
    if (clones[cloneId]) {
      return clones[cloneId];
    }
  } catch {
    // On tombe dans le fallback ci-dessous.
  }
  return {
    name: "Collegue",
    role: "collegue",
    voiceId: null,
    personaProfile: "Professionnel, direct mais bienveillant.",
    trained: false,
  };
}

// Format de sortie de la synthese, conforme au contrat (steps est gere par la route).
export interface SynthesisResult {
  response: string;
  citations: { text: string; source: string }[];
  objections: string[];
  suggestion: string;
}

export interface SynthesizeParams {
  cloneId: string;
  mode: "clone" | "interviewer";
  text: string;
  history: { role: "user" | "clone"; text: string }[];
  personalChunks: RetrievedChunk[];
  teamChunks: RetrievedChunk[];
  toolsContext: string;
}

// Etape 5 : assemble tout le contexte et demande au LLM la reponse structuree finale.
export async function synthesize(params: SynthesizeParams): Promise<SynthesisResult> {
  const profile = loadCloneProfile(params.cloneId);

  // Les extraits sont numerotes pour que le LLM puisse les citer precisement.
  const personalBlock = params.personalChunks.length
    ? params.personalChunks.map((c, i) => `[P${i + 1}] ${c.content}`).join("\n")
    : "(aucun extrait personnel disponible)";
  const teamBlock = params.teamChunks.length
    ? params.teamChunks.map((c, i) => `[T${i + 1}] ${c.content}`).join("\n")
    : "(aucun extrait entreprise disponible)";

  // L'historique de conversation est rejoue pour la coherence du dialogue.
  const historyMessages = params.history.map((h) => ({
    role: h.role === "clone" ? "assistant" : "user",
    content: h.text,
  }));

  const modeInstruction =
    params.mode === "clone"
      ? `Tu incarnes ${profile.name} (${profile.role}). Reponds comme cette personne le ferait, en premiere personne, fidele a son style.`
      : `Tu es un intervieweur bienveillant qui aide a entrainer le clone de ${profile.name}. Pose des questions de suivi pertinentes.`;

  const systemPrompt = `${modeInstruction}

PROFIL DE LA PERSONNE :
${profile.personaProfile}

EXTRAITS DE SES REACTIONS PASSEES (corpus personnel) :
${personalBlock}

CONTEXTE ENTREPRISE (corpus equipe) :
${teamBlock}

CONTEXTE AGENDA ET PROJETS (outils) :
${params.toolsContext}

CONSIGNES DE SORTIE :
Reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans backticks, au format exact :
{
  "response": "<ta reponse en tant que ${profile.name}, ancree dans les extraits ci-dessus>",
  "citations": [{"text": "<extrait exact utilise>", "source": "<P1, T2, agenda, projets...>"}],
  "objections": ["<objection probable que ${profile.name} souleverait>"],
  "suggestion": "<reformulation suggeree pour mieux presenter la demande a ${profile.name}>"
}
Regles : cite uniquement des extraits reellement fournis. Si aucun extrait n'est pertinent, citations = [].
2 a 3 objections maximum. La suggestion est une phrase concrete.`;

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
        ...historyMessages,
        { role: "user", content: params.text },
      ],
      // Un peu de naturel dans la voix du clone, mais pas trop pour garder le JSON stable.
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Echec synthese Vultr: ${res.status} - ${detail}`);
  }

  const body = await res.json();
  const raw: string = body.choices?.[0]?.message?.content ?? "";

  // Meme filet de securite que dans plan.ts : on extrait l'objet JSON de la reponse.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    // Si le modele n'a pas rendu de JSON, on recupere au moins sa reponse en texte brut.
    return { response: raw.trim(), citations: [], objections: [], suggestion: "" };
  }

  try {
    const parsed = JSON.parse(match[0]);
    return {
      response: typeof parsed.response === "string" ? parsed.response : raw.trim(),
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      objections: Array.isArray(parsed.objections) ? parsed.objections : [],
      suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : "",
    };
  } catch {
    return { response: raw.trim(), citations: [], objections: [], suggestion: "" };
  }
}