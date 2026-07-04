"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircleQuestion, Mic, Play } from "lucide-react";
import { api } from "@/lib/api";
import { getClone } from "@/lib/team";
import { useCurrentUser } from "@/lib/currentUser";
import { useRecorder } from "@/lib/useRecorder";
import { Avatar } from "@/components/Avatar";
import questions from "@/seed/interview_questions.json";

type UploadedDoc = { name: string; chunks: number };

function ModuleHeader({
  icon: Icon,
  tint,
  title,
  status,
}: {
  icon: React.ElementType;
  tint: "violet" | "pink" | "cyan";
  title: string;
  status: string;
}) {
  const tints = {
    violet: "bg-violet-500/10 text-violet-600",
    pink: "bg-pink-500/10 text-pink-600",
    cyan: "bg-cyan-500/10 text-cyan-600",
  };
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <h2 className="font-medium">{title}</h2>
      </div>
      <span className="text-xs text-muted">{status}</span>
    </div>
  );
}

export default function TrainingStudio({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const clone = getClone(cloneId);
  const { currentUserId } = useCurrentUser();
  const recorder = useRecorder();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [pasted, setPasted] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [sessionStarted, setSessionStarted] = useState(false);
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

  async function ingestText(content: string, name: string) {
    const { chunksAdded } = await api.ingest({
      scope: `personal:${cloneId}`,
      content,
      source: "upload",
    });
    setDocs((prev) => [...prev, { name, chunks: chunksAdded }]);
  }

  async function ingestFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!/\.(txt|md)$/i.test(file.name)) continue;
      const content = await file.text();
      await ingestText(content, file.name);
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    await ingestFiles(e.dataTransfer.files);
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

  // Bascule clic pour démarrer / clic pour arrêter — plus fiable qu'un "maintenir enfoncé"
  // sur trackpad.
  async function toggleMic() {
    if (recorder.recording) {
      await releaseMic();
    } else {
      await recorder.start();
    }
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
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

      <p className="mt-6 text-sm text-muted">
        Three independent modules — do them in any order, whenever you have material.
      </p>

      {/* Documents */}
      <section className="card mt-6 p-6">
        <ModuleHeader
          icon={FileText}
          tint="violet"
          title="Documents"
          status={docs.length > 0 ? `${docs.length} added` : "Not started"}
        />
        <p className="mt-3 text-sm text-muted">
          Meeting transcripts, decision logs, written feedback — anything that shows how{" "}
          {clone.name.split(" ")[0]} reacts and decides. Drop as many as you want.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md"
          hidden
          onChange={(e) => e.target.files && ingestFiles(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-4 w-full rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors ${
            dragOver ? "border-accent bg-accent-soft" : "border-black/10 text-muted hover:border-black/20"
          }`}
        >
          Drop .txt / .md files, or click to browse
        </button>

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

      {/* Interview */}
      <section className="card mt-4 p-6">
        <ModuleHeader
          icon={MessageCircleQuestion}
          tint="pink"
          title="AI interview"
          status={interviewDone ? "Done" : sessionStarted ? `${answeredCount}/${questions.length}` : "Not started"}
        />
        <p className="mt-3 text-sm text-muted">
          The AI asks targeted questions to learn how you react. Answer by voice or keyboard —
          your voice sample also powers the clone&apos;s voice.
        </p>

        {!sessionStarted && !interviewDone && (
          <button
            onClick={() => setSessionStarted(true)}
            className="mt-4 flex items-center gap-2 rounded-full bg-pink-500/10 px-5 py-2.5 text-sm font-medium text-pink-600 hover:bg-pink-500/15"
          >
            <Play className="h-3.5 w-3.5" /> Start interview session
          </button>
        )}

        {sessionStarted && !interviewDone && (
          <>
            <div className="mt-4 rounded-xl bg-pink-500/[0.06] p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-pink-600">
                Question {step + 1} of {questions.length}
              </p>
              <p className="mt-1 text-lg">{questions[step]}</p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={toggleMic}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${
                  recorder.recording ? "scale-110 bg-red-500" : "bg-accent hover:scale-105"
                } text-white`}
                title={recorder.recording ? "Click to stop" : "Click to answer by voice"}
              >
                <Mic className="h-5 w-5" />
              </button>
              <input
                className="flex-1 rounded-full border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent/50"
                placeholder="Click the mic, or type your answer..."
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
        )}

        {interviewDone && (
          <p className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-600">
            ✓ Interview complete — the clone learned from your {questions.length} answers.
          </p>
        )}
      </section>

      {/* Voice */}
      <section className="card mt-4 p-6">
        <ModuleHeader
          icon={Mic}
          tint="cyan"
          title="Voice"
          status={voiceId ? "Ready" : "Not started"}
        />
        <p className="mt-3 text-sm text-muted">
          Turns your interview recording into a cloned voice, so the clone actually sounds like
          you in meetings.
        </p>

        {voiceId ? (
          <p className="mt-4 rounded-xl bg-cyan-500/10 p-4 text-sm text-cyan-600">
            ✓ Voice ready — <span className="font-mono text-xs">{voiceId}</span>
          </p>
        ) : (
          <>
            <button
              onClick={createVoice}
              disabled={cloningVoice || !interviewDone}
              className="mt-4 flex items-center gap-2 rounded-full bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-600 hover:bg-cyan-500/15 disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              {cloningVoice ? "Creating voice..." : "Start voice creation"}
            </button>
            {!interviewDone && (
              <p className="mt-2 text-xs text-muted">Finish the AI interview first.</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
