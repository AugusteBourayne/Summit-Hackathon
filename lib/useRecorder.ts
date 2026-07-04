"use client";

import { useRef, useState } from "react";

// Le navigateur n'enregistre jamais nativement en WAV (webm/opus sur Chrome, ogg/opus sur
// Firefox) — or Gradium STT refuse explicitement ces formats compressés ("unsupported content
// type"). On décode donc le blob enregistré via Web Audio API et on le ré-encode nous-mêmes en
// WAV PCM 16 bits avant de l'envoyer, pour rester compatible quel que soit le navigateur.
async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextCtor();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return new Blob([encodeWavPcm16(audioBuffer)], { type: "audio/wav" });
  } finally {
    audioCtx.close();
  }
}

function encodeWavPcm16(audioBuffer: AudioBuffer): ArrayBuffer {
  const samples = audioBuffer.getChannelData(0); // mono : suffisant pour de la transcription vocale
  const sampleRate = audioBuffer.sampleRate;
  const dataSize = samples.length * 2; // 16 bits = 2 octets par échantillon
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // taille du sous-chunk fmt (PCM)
  view.setUint16(20, 1, true); // format PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

// Seuil de niveau sonore (RMS, échelle 0-1) en dessous duquel on considère que c'est du silence.
const SILENCE_RMS_THRESHOLD = 0.02;
// Durée de silence continu après avoir parlé avant de considérer que la personne a fini.
const SILENCE_DURATION_MS = 1500;

// Surveille le niveau du micro en direct et déclenche onSilence() dès qu'un silence assez long
// suit un moment de parole détecté — évite d'avoir à cliquer pour signaler "j'ai fini de parler"
// en conversation vocale continue. Purement local (analyse du flux audio), aucun serveur impliqué.
function watchForSilence(stream: MediaStream, onSilence: () => void): () => void {
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextCtor();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let speechDetected = false;
  let silenceStartedAt: number | null = null;
  let cancelled = false;
  let frameId: number;

  function tick() {
    if (cancelled) return;
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    const now = performance.now();

    if (rms > SILENCE_RMS_THRESHOLD) {
      speechDetected = true;
      silenceStartedAt = null;
    } else if (speechDetected) {
      if (silenceStartedAt === null) silenceStartedAt = now;
      else if (now - silenceStartedAt > SILENCE_DURATION_MS) {
        cancelled = true;
        onSilence();
        return;
      }
    }
    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
    audioCtx.close();
  };
}

// Enregistrement micro. start(onSilence) : si un callback est fourni, l'enregistrement s'arrête
// tout seul après un silence détecté (conversation vocale continue) ; sinon c'est un push-to-talk
// classique, arrêté manuellement via stop() (chat normal).
// stop() retourne l'audio en base64 WAV, prêt pour POST /api/stt.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopSilenceWatchRef = useRef<(() => void) | null>(null);

  async function start(onSilence?: () => void): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);

      if (onSilence) {
        stopSilenceWatchRef.current = watchForSilence(stream, onSilence);
      }
      return true;
    } catch {
      setUnsupported(true);
      return false;
    }
  }

  function stop(): Promise<string | null> {
    return new Promise((resolve) => {
      stopSilenceWatchRef.current?.();
      stopSilenceWatchRef.current = null;

      const recorder = recorderRef.current;
      if (!recorder) return resolve(null);
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
        try {
          const wavBlob = await blobToWav(rawBlob);
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1] ?? null;
            resolve(base64);
          };
          reader.readAsDataURL(wavBlob);
        } catch {
          resolve(null);
        }
      };
      recorder.stop();
      recorderRef.current = null;
      setRecording(false);
    });
  }

  return { recording, unsupported, start, stop };
}
