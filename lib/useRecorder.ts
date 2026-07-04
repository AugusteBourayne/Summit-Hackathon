"use client";

import { useRef, useState } from "react";

// Enregistrement micro "push-to-talk" : start() au press, stop() au release.
// stop() retourne l'audio en base64, prêt pour POST /api/stt.
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
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1] ?? null;
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      };
      recorder.stop();
      recorderRef.current = null;
      setRecording(false);
    });
  }

  return { recording, unsupported, start, stop };
}
