import { GRADIUM_BASE, apiKey, isMockMode } from "./client";

/**
 * Speech-to-Text — transcrit un échantillon audio (base64) en texte.
 * REST one-shot: POST /post/speech/asr (body binaire, réponse NDJSON).
 * https://docs.gradium.ai/guides/speech-to-text-rest
 */
export async function transcribeAudio(
  audioBase64: string,
  inputFormat: string = "wav"
): Promise<string> {
  if (isMockMode()) {
    return "[mock STT] Ceci est une transcription simulée en attendant la vraie clé Gradium.";
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const contentType = inputFormat === "wav" ? "audio/wav" : `audio/${inputFormat}`;

  const resp = await fetch(`${GRADIUM_BASE}/post/speech/asr`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": contentType,
    },
    body: audioBuffer,
  });

  if (!resp.ok) {
    throw new Error(`Gradium STT error ${resp.status}: ${await resp.text()}`);
  }

  // Réponse en NDJSON (une ligne JSON par message), on garde les segments "text".
  const raw = await resp.text();
  const segments: string[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.type === "text" && typeof msg.text === "string") {
      segments.push(msg.text);
    }
    if (msg.type === "error") {
      throw new Error(`Gradium STT stream error: ${msg.message ?? "unknown"}`);
    }
  }
  return segments.join(" ").trim();
}
