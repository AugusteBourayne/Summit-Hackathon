// Client Gradium fait main (pas de SDK officiel en TypeScript, seulement en Python) :
// https://docs.gradium.ai/api-reference/introduction
//
// Bascule en mode "mock" si GRADIUM_MOCK=true ou si aucune clé n'est configurée : chacun
// teste isolément, et l'intégration ne consiste qu'à remplacer le mock par le vrai appel.

export const GRADIUM_BASE = "https://api.gradium.ai/api";

export function isMockMode(): boolean {
  return process.env.GRADIUM_MOCK === "true" || !process.env.GRADIUM_API_KEY;
}

export function apiKey(): string {
  const key = process.env.GRADIUM_API_KEY;
  if (!key) throw new Error("GRADIUM_API_KEY manquant (ou passe GRADIUM_MOCK=true)");
  return key;
}
