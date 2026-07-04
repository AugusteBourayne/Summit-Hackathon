"use client";

import { use, useState } from "react";
import { api, AskResponse } from "@/lib/api";

export default function InteractionRoom({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [last, setLast] = useState<AskResponse | null>(null);

  async function send() {
    setThinking(true);
    try {
      // TODO(Auguste): remplacer par le flux vocal complet — mic -> api.stt -> api.ask -> api.tts -> lecture audio.
      const result = await api.ask({ cloneId, mode: "clone", text });
      setLast(result);
      setText("");
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Talking to {cloneId}</h1>

      <div className="mt-8 flex items-center justify-center">
        <div
          className={`h-24 w-24 rounded-full bg-zinc-900 dark:bg-zinc-50 ${
            thinking ? "animate-pulse" : ""
          }`}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <input
          className="flex-1 rounded-full border border-zinc-200 px-4 py-2 dark:border-zinc-800"
          placeholder="Type what you'd say (push-to-talk mic comes later)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={thinking || !text}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Send
        </button>
      </div>

      {last && (
        <div className="mt-10 space-y-4">
          <p className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            {last.response}
          </p>

          <div>
            <h3 className="text-sm font-medium">Citations</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {last.citations.map((c, i) => (
                <li key={i}>
                  &ldquo;{c.text}&rdquo; — <span className="italic">{c.source}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium">Likely objections</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              {last.objections.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium">Suggested framing</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{last.suggestion}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium">Agent trace</h3>
            <ol className="mt-2 list-decimal pl-5 text-xs text-zinc-500">
              {last.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
