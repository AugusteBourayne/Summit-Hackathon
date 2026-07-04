"use client";

import { use, useState } from "react";
import { api } from "@/lib/api";
import questions from "@/seed/interview_questions.json";

export default function TrainingStudio({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const [document, setDocument] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");

  async function uploadDocument() {
    const { chunksAdded } = await api.ingest({
      scope: `personal:${cloneId}`,
      content: document,
      source: "upload",
    });
    setStatus(`Added ${chunksAdded} chunk(s) to ${cloneId}'s corpus.`);
    setDocument("");
  }

  async function submitAnswer() {
    // TODO(Auguste/Géraud): remplacer par le vrai flux vocal (STT -> ingest -> TTS de la question suivante)
    await api.ingest({
      scope: `personal:${cloneId}`,
      content: `Q: ${questions[step]}\nA: ${answer}`,
      source: "interview",
    });
    setAnswer("");
    setStep((s) => Math.min(s + 1, questions.length - 1));
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Training studio — {cloneId}</h1>

      <section className="mt-10">
        <h2 className="text-lg font-medium">1. Upload a document</h2>
        <textarea
          className="mt-3 h-32 w-full rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          placeholder="Paste a meeting transcript or notes..."
          value={document}
          onChange={(e) => setDocument(e.target.value)}
        />
        <button
          onClick={uploadDocument}
          className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Upload
        </button>
        {status && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{status}</p>}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium">2. Voice interview (5 min)</h2>
        <p className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          {questions[step]}
        </p>
        <textarea
          className="mt-3 h-20 w-full rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          placeholder="Type your answer for now (mic capture comes later)..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button
          onClick={submitAnswer}
          className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Next question ({step + 1}/{questions.length})
        </button>
      </section>
    </main>
  );
}
