"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getClone } from "@/lib/team";
import { useCurrentUser } from "@/lib/currentUser";
import { useRecorder } from "@/lib/useRecorder";
import { Avatar } from "@/components/Avatar";
import questions from "@/seed/interview_questions.json";

type UploadedDoc = { name: string; chunks: number };

export default function TrainingStudio({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const clone = getClone(cloneId);
  const { currentUserId } = useCurrentUser();
  const recorder = useRecorder();

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [pasted, setPasted] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [interviewDone, setInterviewDone] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(clone?.voiceId ?? null);
  const [cloningVoice, setCloningVoice] = useState(false);

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;

  if (cloneId !== currentUserId) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-lg font-semibold">You can only train your own clone</h1>
        <p className="mt-2 text-sm text-muted">
          {`${clone.name} needs to sign in themselves to train their clone — that's what keeps every profile consensual and accurate.`}
        </p>
        <Link
          href={`/training/${currentUserId}`}
          className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          Train my own clone →
        </Link>
      </main>
    );
  }

  const progress = [
    { label: "Documents", done: docs.length > 0 },
    { label: "Interview", done: interviewDone },
    { label: "Voice", done: voiceId !== null },
  ];

  async function ingestText(content: string, name: string) {
    const { chunksAdded } = await api.ingest({
      scope: `personal:${cloneId}`,
      content,
      source: "upload",
    });
    setDocs((prev) => [...prev, { name, chunks: chunksAdded }]);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      if (!/\.(txt|md)$/i.test(file.name)) continue;
      const content = await file.text();
      await ingestText(content, file.name);
    }
  }

  async function submitAnswer(text: string) {
    if (!text.trim()) return;
    await api.ingest({
      scope: `personal:${cloneId}`,
      content: `Q: ${questions[step]}\nA: ${text}`,
      source: "interview",
    });
    setAnswer("");
    setAnsweredCount((count) => count + 1);
    if (step + 1 >= questions.length) {
      setInterviewDone(true);
    } else {
      setStep((s) => s + 1);
    }
  }

  async function releaseMic() {
    const audio = await recorder.stop();
    if (!audio) return;
    const { text } = await api.stt({ audio });
    setAnswer(text);
  }

  async function createVoice() {
    setCloningVoice(true);
    try {
      // L'échantillon réel sera l'audio concaténé de l'interview (branché avec la partie d'Auguste).
      const result = await api.cloneVoice({ audioSample: "interview-sample" });
      setVoiceId(result.voiceId);
    } finally {
      setCloningVoice(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href={`/clone/${cloneId}`} className="text-sm text-muted hover:text-foreground">
        ← Back to profile
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <Avatar id={cloneId} name={clone.name} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold">Training studio</h1>
          <p className="text-muted">Building {clone.name}&apos;s clone</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mt-8 flex gap-2">
        {progress.map((stage) => (
          <div key={stage.label} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${stage.done ? "bg-accent" : "bg-black/10"}`}
            />
            <p className={`mt-1.5 text-xs ${stage.done ? "text-accent" : "text-muted"}`}>
              {stage.done ? "✓ " : ""}{stage.label}
            </p>
          </div>
        ))}
      </div>

      {/* 1. Documents */}
      <section className="card mt-8 p-6">
        <h2 className="font-medium">1 · Feed it documents</h2>
        <p className="mt-1 text-sm text-muted">
          Meeting transcripts, decision logs, written feedback — anything that shows how{" "}
          {clone.name.split(" ")[0]} reacts and decides.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-4 rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors ${
            dragOver ? "border-accent bg-accent-soft" : "border-black/10 text-muted"
          }`}
        >
          Drop .txt / .md files here
        </div>

        <textarea
          className="mt-3 h-24 w-full rounded-xl border border-black/10 bg-surface-2 p-3 text-sm outline-none placeholder:text-muted focus:border-accent/50"
          placeholder="...or paste a transcript directly"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <button
          onClick={async () => {
            if (!pasted.trim()) return;
            await ingestText(pasted, "pasted text");
            setPasted("");
          }}
          disabled={!pasted.trim()}
          className="mt-2 rounded-full bg-black/10 px-4 py-2 text-sm hover:bg-black/15 disabled:opacity-40"
        >
          Add to knowledge
        </button>

        {docs.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4 text-sm">
            {docs.map((doc, i) => (
              <li key={i} className="flex justify-between text-muted">
                <span>📄 {doc.name}</span>
                <span className="font-mono text-xs">{doc.chunks} chunks indexed</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Interview */}
      <section className="card mt-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">2 · AI interview</h2>
          <span className="font-mono text-xs text-muted">
            {answeredCount}/{questions.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          The AI asks targeted questions to learn how you react. Answer by voice or keyboard —
          your voice sample also powers the clone&apos;s voice.
        </p>

        {!interviewDone ? (
          <>
            <div className="mt-4 rounded-xl bg-accent-soft p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">
                Question {step + 1}
              </p>
              <p className="mt-1 text-lg">{questions[step]}</p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onPointerDown={() => recorder.start()}
                onPointerUp={releaseMic}
                onPointerLeave={() => recorder.recording && releaseMic()}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${
                  recorder.recording ? "scale-110 bg-red-500" : "bg-accent hover:scale-105"
                } text-white`}
                title="Hold to answer by voice"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-3 0h6M12 15a4 4 0 004-4V7a4 4 0 10-8 0v4a4 4 0 004 4z" />
                </svg>
              </button>
              <input
                className="flex-1 rounded-full border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent/50"
                placeholder="Hold the mic, or type your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAnswer(answer)}
              />
              <button
                onClick={() => submitAnswer(answer)}
                disabled={!answer.trim()}
                className="rounded-full bg-black/10 px-4 text-sm hover:bg-black/15 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
            ✓ Interview complete — the clone learned from your {questions.length} answers.
          </p>
        )}
      </section>

      {/* 3. Voice */}
      <section className="card mt-4 p-6">
        <h2 className="font-medium">3 · Clone the voice</h2>
        <p className="mt-1 text-sm text-muted">
          Uses your interview recordings as the voice sample.
        </p>
        {voiceId ? (
          <p className="mt-4 rounded-xl bg-cyan-500/10 p-4 text-sm text-cyan-400">
            ✓ Voice ready — <span className="font-mono text-xs">{voiceId}</span>
          </p>
        ) : (
          <button
            onClick={createVoice}
            disabled={cloningVoice || !interviewDone}
            className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            title={!interviewDone ? "Finish the interview first" : ""}
          >
            {cloningVoice ? "Creating voice..." : "Create voice clone"}
          </button>
        )}
      </section>
    </main>
  );
}
