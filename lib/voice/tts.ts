import { GRADIUM_BASE, apiKey, isMockMode } from "./client";

/**
 * Text-to-Speech — synthétise du texte en audio avec la voix donnée.
 * REST one-shot: POST /post/speech/tts avec only_audio=true -> bytes audio bruts.
 * https://docs.gradium.ai/guides/text-to-speech-rest
 *
 * On renvoie une data URL (base64) plutôt qu'un fichier hébergé : le front peut la
 * mettre directement dans un <audio src="...">, ce qui respecte le contrat {audioUrl}
 * sans avoir besoin de stockage de fichiers pour la démo.
 */
export async function synthesizeSpeech(
  text: string,
  voiceId: string | null,
  outputFormat: string = "wav"
): Promise<string> {
  if (isMockMode()) {
    // 1 seconde de silence WAV encodée en base64, juste pour avoir un flux audio valide.
    const silentWavBase64 =
      "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    return `data:audio/wav;base64,${silentWavBase64}`;
  }

  const resolvedVoiceId = voiceId ?? process.env.GRADIUM_DEFAULT_VOICE_ID;
  if (!resolvedVoiceId) {
    throw new Error("Aucun voiceId fourni et GRADIUM_DEFAULT_VOICE_ID absent");
  }

  const resp = await fetch(`${GRADIUM_BASE}/post/speech/tts`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: resolvedVoiceId,
      output_format: outputFormat,
      only_audio: true,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Gradium TTS error ${resp.status}: ${await resp.text()}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = outputFormat === "wav" ? "audio/wav" : `audio/${outputFormat}`;
  return `data:${mime};base64,${base64}`;
}
