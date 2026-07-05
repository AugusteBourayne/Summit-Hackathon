"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircleQuestion, Mic, Play, Trash2 } from "lucide-react";
import { api, DocumentSummary } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { useCurrentUser } from "@/lib/currentUser";
import { useDisplayName } from "@/lib/profileOverrides";
import { useRecorder, concatWavClipsBase64 } from "@/lib/useRecorder";
import { addPendingBehaviors, getConfirmedBehaviorTexts, getPendingBehaviorTexts } from "@/lib/behaviorStorage";
import { Avatar } from "@/components/Avatar";
import questions from "@/seed/interview_questions.json";

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
  const { getClone } = useWorkspace();
  const clone = getClone(cloneId);
  const name = useDisplayName(cloneId, clone?.name ?? "");
  const { currentUserId } = useCurrentUser();
  const recorder = useRecorder();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [pastedLabel, setPastedLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Ce qui a déjà été ingéré lors d'une session précédente (le vrai stockage vit côté Vultr,
  // pas dans cet état local qui repart à zéro à chaque montage du composant).
  const [savedStats, setSavedStats] = useState<{ docChunks: number; interviewChunks: number } | null>(null);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [interviewDone, setInterviewDone] = useState(false);

  const [voiceId, setVoiceId] = useState<string | null>(clone?.voiceId ?? null);
  const [cloningVoice, setCloningVoice] = useState(false);
  const [voiceCloneError, setVoiceCloneError] = useState<string | null>(null);
  // Chaque réponse enregistrée au micro pendant l'interview, gardée pour servir d'échantillon
  // réel au clonage de voix (au lieu du texte factice qui était envoyé jusqu'ici).
  const [answerAudios, setAnswerAudios] = useState<string[]>([]);

  // Recharge la progression déjà enregistrée à l'ouverture de la page — sans ça, "Documents"
  // et "AI interview" affichent "Not started" après un simple rechargement, même si du contenu
  // a bien été ingéré par le passé (le vrai stockage est côté Vultr, pas dans l'état React).
  useEffect(() => {
    let cancelled = false;
    api
      .cloneStats(cloneId)
      .then((stats) => {
        if (!cancelled) setSavedStats(stats);
      })
      .catch(() => {
        /* pas grave si indisponible — l'UI retombe sur "Not started" */
      });
    return () => {
      cancelled = true;
    };
  }, [cloneId]);

  async function refreshDocuments() {
    try {
      const { documents } = await api.listDocuments(cloneId);
      setDocuments(documents);
    } catch {
      /* pas grave si indisponible — la liste reste vide */
    }
  }

  useEffect(() => {
    refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloneId]);

  async function removeDocument(batchId: string) {
    setDeletingBatch(batchId);
    try {
      await api.deleteDocument(cloneId, batchId);
      await refreshDocuments();
      const stats = await api.cloneStats(cloneId);
      setSavedStats(stats);
    } catch (err) {
      setDocError(`Couldn't delete document (${err instanceof Error ? err.message : "unknown error"}).`);
    } finally {
      setDeletingBatch(null);
    }
  }

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;

  if (cloneId !== currentUserId) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 text-lg font-semibold">You can only train your own clone</h1>
        <p className="mt-2 text-sm text-muted">
          {`${name} needs to sign in themselves to train their clone — that's what keeps every profile consensual and accurate.`}
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

  // Deduit les nouveaux traits de comportement apportes par ce contenu et les ajoute a la
  // liste en attente (voir lib/behaviorStorage.ts) — la page profil les affichera comme
  // suggestions a valider, sans jamais ecraser ce que l'utilisateur a deja confirme.
  async function suggestBehaviors(content: string) {
    try {
      const existingBehaviors = [
        ...getConfirmedBehaviorTexts(cloneId),
        ...getPendingBehaviorTexts(cloneId),
      ];
      const { behaviors } = await api.deriveBehaviors(cloneId, {
        name,
        content,
        existingBehaviors,
      });
      addPendingBehaviors(cloneId, behaviors);
    } catch {
      // Pas grave si la deduction echoue : le document est deja sauvegarde, et
      // "Generate from documents" reste disponible en secours sur la page profil.
    }
  }

  async function ingestText(content: string, label: string) {
    setDocError(null);
    try {
      await api.ingest({
        scope: `personal:${cloneId}`,
        content,
        source: "upload",
        label,
      });
      await refreshDocuments();
      const stats = await api.cloneStats(cloneId);
      setSavedStats(stats);
      await suggestBehaviors(content);
    } catch (err) {
      setDocError(
        `Couldn't save "${label}" (${err instanceof Error ? err.message : "unknown error"}). Try again.`
      );
    }
  }

  async function ingestFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      // PDF/Word/Excel/PowerPoint/images sont parsés côté agent — ici on ingère le texte
      // directement quand on le peut, sinon on transmet une référence au fichier.
      const isPlainText = /\.(txt|md|csv)$/i.test(file.name);
      const content = isPlainText
        ? await file.text()
        : `[document: ${file.name}, ${(file.size / 1024).toFixed(0)} KB — to be parsed by the agent]`;
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
    const content = `Q: ${questions[step]}\nA: ${text}`;
    await api.ingest({
      scope: `personal:${cloneId}`,
      content,
      source: "interview",
      label: questions[step],
    });
    await refreshDocuments();
    const stats = await api.cloneStats(cloneId);
    setSavedStats(stats);
    await suggestBehaviors(content);
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
    setAnswerAudios((prev) => [...prev, audio]);
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

  // Enregistrement direct pour la voix, sans dépendre de l'interview.
  async function toggleVoiceSampleMic() {
    if (recorder.recording) {
      const audio = await recorder.stop();
      if (audio) setAnswerAudios((prev) => [...prev, audio]);
    } else {
      await recorder.start();
    }
  }

  function redoVoice() {
    setVoiceId(null);
    setAnswerAudios([]);
    setVoiceCloneError(null);
  }

  async function createVoice() {
    setCloningVoice(true);
    setVoiceCloneError(null);
    try {
      const sample = await concatWavClipsBase64(answerAudios);
      if (!sample) {
        setVoiceCloneError("No voice recorded yet — answer at least one interview question by voice first.");
        return;
      }
      const result = await api.cloneVoice({ audioSample: sample });
      setVoiceId(result.voiceId);
      // Persiste tout de suite dans seed/clones.json — sinon la Room et les autres pages
      // continuent d'utiliser l'ancien voiceId, puisqu'il n'était gardé qu'en mémoire ici.
      await api.updateClone(cloneId, { voiceId: result.voiceId });
    } catch (err) {
      setVoiceCloneError(err instanceof Error ? err.message : "Voice cloning failed.");
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
        <Avatar id={cloneId} name={name} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold">Training studio</h1>
          <p className="text-muted">Building {name}&apos;s clone</p>
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
          status={
            documents.length > 0
              ? `${documents.length} document${documents.length > 1 ? "s" : ""}`
              : savedStats && savedStats.docChunks > 0
                ? `${savedStats.docChunks} chunks saved`
                : "Not started"
          }
        />
        <p className="mt-3 text-sm text-muted">
          Meeting transcripts, decision logs, written feedback — anything that shows how{" "}
          {name.split(" ")[0]} reacts and decides. Drop as many as you want.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.heic"
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
          Drop PDF, Word, Excel, PowerPoint, images, or text files — or click to browse
        </button>

        <textarea
          className="mt-3 h-24 w-full rounded-xl border border-black/10 bg-surface-2 p-3 text-sm outline-none placeholder:text-muted focus:border-accent/50"
          placeholder="...or paste a transcript directly"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-full border border-black/10 bg-surface-2 px-4 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/50"
            placeholder="Label this document (optional, e.g. Q3 planning call)"
            value={pastedLabel}
            onChange={(e) => setPastedLabel(e.target.value)}
          />
          <button
            onClick={async () => {
              if (!pasted.trim()) return;
              await ingestText(pasted, pastedLabel.trim() || "Pasted text");
              setPasted("");
              setPastedLabel("");
            }}
            disabled={!pasted.trim()}
            className="shrink-0 rounded-full bg-black/10 px-4 py-2 text-sm hover:bg-black/15 disabled:opacity-40"
          >
            Add to knowledge
          </button>
        </div>

        {docError && (
          <p className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-600">{docError}</p>
        )}

        {documents.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4 text-sm">
            {documents.map((doc) => (
              <li key={doc.batchId} className="group flex items-center justify-between text-muted">
                <span>
                  {doc.source === "interview" ? "🎤" : "📄"} {doc.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{doc.chunkCount} chunk{doc.chunkCount > 1 ? "s" : ""}</span>
                  <button
                    onClick={() => removeDocument(doc.batchId)}
                    disabled={deletingBatch === doc.batchId}
                    title="Delete this document"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
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
          status={
            interviewDone
              ? "Done"
              : sessionStarted
                ? `${answeredCount}/${questions.length}`
                : savedStats && savedStats.interviewChunks > 0
                  ? `${savedStats.interviewChunks} answers saved`
                  : "Not started"
          }
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
          Record ~10-15s of speech (or use interview answers, if any), then clone the voice —
          no need to finish the interview first.
        </p>

        {voiceId ? (
          <>
            <p className="mt-4 rounded-xl bg-cyan-500/10 p-4 text-sm text-cyan-600">
              ✓ Voice ready — <span className="font-mono text-xs">{voiceId}</span>
            </p>
            <button
              onClick={redoVoice}
              className="mt-3 text-sm text-muted hover:text-foreground"
            >
              Re-record voice →
            </button>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={toggleVoiceSampleMic}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${
                  recorder.recording ? "scale-110 bg-red-500" : "bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/15"
                } text-white`}
                title={recorder.recording ? "Click to stop recording" : "Click to record a voice sample"}
              >
                <Mic className="h-5 w-5" />
              </button>
              <p className="text-sm text-muted">
                {recorder.recording
                  ? "Recording — click again to stop"
                  : answerAudios.length > 0
                    ? `${answerAudios.length} clip(s) ready`
                    : "Nothing recorded yet"}
              </p>
            </div>

            <button
              onClick={createVoice}
              disabled={cloningVoice || answerAudios.length === 0}
              className="mt-4 flex items-center gap-2 rounded-full bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-600 hover:bg-cyan-500/15 disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              {cloningVoice ? "Creating voice..." : "Start voice creation"}
            </button>
            {voiceCloneError && (
              <p className="mt-2 text-xs text-red-500">{voiceCloneError}</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
