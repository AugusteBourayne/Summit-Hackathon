import { NextRequest, NextResponse } from "next/server";
import { plan } from "@/lib/agent/plan";
import { retrieve, RetrievedChunk } from "@/lib/agent/retrieve";
import { getToolsContext } from "@/lib/agent/tools";
import { synthesize } from "@/lib/agent/synthesize";

// Corps de requete conforme a CONTRACTS.md.
interface AskBody {
  cloneId: string;
  mode: "clone" | "interviewer";
  text: string;
  history?: { role: "user" | "clone"; text: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AskBody;

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json({ error: "Le champ 'text' est vide." }, { status: 400 });
    }

    const history = body.history ?? [];
    // steps[] trace chaque etape de l'agent, pour le panneau "grounded response" du frontend.
    const steps: string[] = [];

    // --- Etape 1 : Plan (le LLM decide quelles sources consulter) ---
    const agentPlan = await plan(body.text, body.mode);
    steps.push(`planned: ${agentPlan.requestType}`);

    // --- Etape 2 : Retrieve corpus personnel du clone ---
    let personalChunks: RetrievedChunk[] = [];
    if (agentPlan.usePersonalCorpus) {
      personalChunks = await retrieve(`personal:${body.cloneId}`, body.text, 3);
      steps.push(`retrieved ${personalChunks.length} personal docs`);
    }

    // --- Etape 3 : Retrieve corpus entreprise ---
    let teamChunks: RetrievedChunk[] = [];
    if (agentPlan.useTeamCorpus) {
      teamChunks = await retrieve("team", body.text, 3);
      steps.push(`retrieved ${teamChunks.length} company docs`);
    }

    // --- Etape 4 : Outils simules (agenda + projets) ---
    let toolsContext = "(outils non consultes)";
    if (agentPlan.useTools) {
      toolsContext = getToolsContext(body.cloneId);
      steps.push("checked calendar and projects");
    }

    // --- Etape 5 : Synthese finale par le LLM ---
    const result = await synthesize({
      cloneId: body.cloneId,
      mode: body.mode,
      text: body.text,
      history,
      personalChunks,
      teamChunks,
      toolsContext,
    });
    steps.push("answered");

    // Reponse complete au format du contrat.
    return NextResponse.json({
      response: result.response,
      citations: result.citations,
      objections: result.objections,
      suggestion: result.suggestion,
      steps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}