"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api, AskResponse } from "@/lib/api";
import { getClone } from "@/lib/team";
import { useRecorder } from "@/lib/useRecorder";
import { Orb, OrbState } from "@/components/Orb";
import { GroundedPanel } from "@/components/GroundedPanel";

type Turn = { role: "user" | "clone"; text: string };

export default function InteractionRoom({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const clone = getClone(cloneId);
  const recorder = useRecorder();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [last, setLast] = useState<AskResponse | null>(null);
  const [typedMode, setTypedMode] = useState(false);
  const [typed, setTyped] = useState("");

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;

  async function handleUserText(text: string) {
    if (!text.trim()) {
      setOrbState("idle");
      return;
    }
    setTranscript((prev) => [...prev, { role: "user", text }]);
    setOrbState("thinking");
    try {
      const result = await api.ask({ cloneId, mode: "clone", text });
      setLast(result);
      setTranscript((prev) => [...prev, { role: "clone", text: result.response }]);
      setOrbState("speaking");
      try {
        const { audioUrl } = await api.tts({ text: result.response, voiceId: clone!.voiceId });
        const audio = new Audio(audioUrl);
        audio.onended = () => setOrbState("idle");
        await audio.play();
      } catch {
        // TTS pas encore branché (mock) : on repasse en idle sans son.
        setOrbState("idle");
      }
    } catch {
      setOrbState("idle");
    }
  }

  async function pressMic() {
    const ok = await recorder.start();
    if (ok) setOrbState("listening");
  }

  async function releaseMic() {
    const audio = await recorder.stop();
    if (!audio) {
      setOrbState("idle");
      return;
    }
    setOrbState("thinking");
    try {
      const { text } = await api.stt({ audio });
      await handleUserText(text);
    } catch {
      setOrbState("idle");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-8">
      {/* Scène principale */}
      <div className="flex flex-1 flex-col items-center">
        <div className="flex w-full items-center justify-between">
          <div>
            <h1 className="font-medium">{clone.name}</h1>
            <p className="text-xs text-muted">{clone.role} · voice meeting</p>
          </div>
          <Link
            href={`/clone/${cloneId}`}
            className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-muted hover:text-foreground"
          >
            End meeting
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <Orb state={orbState} />

          {recorder.unsupported && (
            <p className="text-xs text-amber-400">
              Microphone unavailable — use the keyboard instead.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onPointerDown={pressMic}
              onPointerUp={releaseMic}
              onPointerLeave={() => recorder.recording && releaseMic()}
              className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
                recorder.recording
                  ? "scale-110 bg-red-500 text-white"
                  : "bg-accent text-white hover:scale-105"
              }`}
              title="Hold to talk"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3 0h6M12 15a4 4 0 004-4V7a4 4 0 10-8 0v4a4 4 0 004 4z" />
              </svg>
            </button>
            <button
              onClick={() => setTypedMode(!typedMode)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-muted hover:text-foreground"
              title="Type instead"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted">Hold the mic to talk — release to send</p>

          {typedMode && (
            <div className="flex w-full max-w-md gap-2">
              <input
                autoFocus
                className="flex-1 rounded-full border border-white/10 bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent/50"
                placeholder="Type what you'd say..."
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUserText(typed);
                    setTyped("");
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="mt-6 max-h-40 w-full space-y-1.5 overflow-y-auto border-t border-white/5 pt-4 text-sm">
            {transcript.map((turn, i) => (
              <p key={i} className={turn.role === "user" ? "text-muted" : ""}>
                <span className="mr-2 font-mono text-[10px] uppercase text-muted">
                  {turn.role === "user" ? "you" : clone.name.split(" ")[0]}
                </span>
                {turn.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Panneau grounded */}
      <aside className="hidden w-80 shrink-0 lg:block">
        <div className="card sticky top-20 max-h-[80vh] overflow-y-auto p-5">
          <h2 className="mb-4 text-sm font-semibold">Grounded response</h2>
          {last ? (
            <GroundedPanel data={last} />
          ) : (
            <p className="text-sm text-muted">
              Ask something and the clone&apos;s sources, likely objections and suggested framing
              will appear here.
            </p>
          )}
        </div>
      </aside>
    </main>
  );
}
