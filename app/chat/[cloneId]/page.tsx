"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { api, AskResponse } from "@/lib/api";
import { getClone } from "@/lib/team";
import { Avatar } from "@/components/Avatar";
import { GroundedPanel } from "@/components/GroundedPanel";

type Message =
  | { role: "user"; text: string }
  | { role: "clone"; text: string; grounded: AskResponse };

export default function Chat({ params }: { params: Promise<{ cloneId: string }> }) {
  const { cloneId } = use(params);
  const clone = getClone(cloneId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [openPanel, setOpenPanel] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;

  async function send() {
    if (!input.trim() || thinking) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setThinking(true);
    try {
      const result = await api.ask({ cloneId, mode: "clone", text });
      setMessages((prev) => [...prev, { role: "clone", text: result.response, grounded: result }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
      <div className="mb-6 flex items-center gap-3 border-b border-black/5 pb-4">
        <Link href={`/clone/${cloneId}`}>
          <Avatar id={cloneId} name={clone.name} size="md" />
        </Link>
        <div>
          <h1 className="font-medium">{clone.name}</h1>
          <p className="text-xs text-muted">
            {clone.role} · clone answers are grounded in real documents
          </p>
        </div>
        <Link
          href={`/room/${cloneId}`}
          className="ml-auto rounded-full bg-accent-soft px-4 py-1.5 text-sm text-accent hover:bg-accent/25"
        >
          Switch to voice →
        </Link>
      </div>

      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="mt-16 text-center text-muted">
            <p className="text-sm">
              Try: &ldquo;Can I push the Atlas deadline by two days?&rdquo;
            </p>
          </div>
        )}
        {messages.map((message, i) => (
          <div key={i}>
            <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-accent text-white"
                    : "card rounded-tl-sm"
                }`}
              >
                {message.text}
              </div>
            </div>
            {message.role === "clone" && (
              <div className="mt-1.5 pl-1">
                <button
                  onClick={() => setOpenPanel(openPanel === i ? null : i)}
                  className="text-xs text-muted hover:text-accent"
                >
                  {openPanel === i ? "Hide sources ▲" : "Why this answer? ▼"}
                </button>
                {openPanel === i && (
                  <div className="card mt-2 p-4">
                    <GroundedPanel data={message.grounded} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div className="card inline-flex gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3">
            <span className="dot h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="dot h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="dot h-1.5 w-1.5 rounded-full bg-muted" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 mt-6 flex gap-2 bg-background pb-6 pt-2">
        <input
          className="flex-1 rounded-full border border-black/10 bg-surface px-5 py-3 text-sm outline-none placeholder:text-muted focus:border-accent/50"
          placeholder={`Ask ${clone.name.split(" ")[0]}'s clone anything...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={thinking || !input.trim()}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </main>
  );
}
