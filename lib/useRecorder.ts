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

// Enregistrement micro "push-to-talk" : start() au press, stop() au release.
// stop() retourne l'audio en base64 WAV, prêt pour POST /api/stt.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      return true;
    } catch {
      setUnsupported(true);
      return false;
    }
  }

  function stop(): Promise<string | null> {
    return new Promise((resolve) => {
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
