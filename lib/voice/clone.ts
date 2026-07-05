import { GRADIUM_BASE, apiKey, isMockMode } from "./client";

/**
 * Voice cloning — crée une voix personnalisée à partir d'un échantillon audio (base64).
 * REST: POST /voices/ (multipart/form-data) -> { uid, error, was_updated }.
 * https://docs.gradium.ai/api-reference/endpoint/create-voice
 */
export async function cloneVoice(
  audioSampleBase64: string,
  name: string = `clone-${Date.now()}`,
  inputFormat: string = "wav"
): Promise<string> {
  if (isMockMode()) {
    return `mock-voice-${Math.random().toString(36).slice(2, 10)}`;
  }

  const audioBuffer = Buffer.from(audioSampleBase64, "base64");
  const form = new FormData();
  form.append(
    "audio_file",
    new Blob([audioBuffer], { type: `audio/${inputFormat}` }),
    `sample.${inputFormat}`
  );
  form.append("name", name);
  form.append("input_format", inputFormat);

  const resp = await fetch(`${GRADIUM_BASE}/voices/`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      // Ne pas fixer Content-Type à la main : fetch génère la boundary multipart lui-même.
    },
    body: form,
  });

  const json = await resp.json();
  // Gradium renvoie parfois un champ `error` purement informatif (ex: "Please wait
  // a bit till the voice is ready to be used") alors que la voix est bien créée
  // (HTTP 201 + `uid` présent) : on ne considère l'appel en échec que si l'API a
  // répondu en erreur ou n'a pas renvoyé d'identifiant.
  if (!resp.ok || !json.uid) {
    // Gradium renvoie le detail de l'erreur dans `detail` (ex: limite de voix atteinte),
    // pas dans `error` — sans ce fallback, l'interface n'affichait qu'un code HTTP muet.
    throw new Error(`Gradium voice clone error: ${json.detail ?? json.error ?? resp.status}`);
  }
  return json.uid as string;
}
