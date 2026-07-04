"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, Paperclip, PhoneCall, PhoneOff, Send, X } from "lucide-react";
import { api, AskResponse } from "@/lib/api";
import { getClone } from "@/lib/team";
import { useRecorder } from "@/lib/useRecorder";
import { Avatar } from "@/components/Avatar";
import { GroundedPanel } from "@/components/GroundedPanel";
import { SlackHint } from "@/components/Slack";
import { Orb } from "@/components/Orb";

type Attachment = { name: string; content: string };
type Turn = {
  role: "user" | "clone";
  text: string;
  attachments?: string[];
  grounded?: AskResponse;
};

const READABLE = /\.(txt|md|csv|json)$/i;

export default function AskClone({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const clone = getClone(cloneId);
  const recorder = useRecorder();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [last, setLast] = useState<AskResponse | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "speaking">("idle");
  const [dragOver, setDragOver] = useState(false);
  const [openPanel, setOpenPanel] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ref à jour en continu (contrairement à l'état capturé dans les closures de send/onended),
  // pour savoir si on doit relancer l'écoute automatiquement une fois le clone fini de parler.
  const voiceModeRef = useRef(false);

  function setVoiceModeState(value: boolean) {
    voiceModeRef.current = value;
    setVoiceMode(value);
  }

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;
  const firstName = clone.name.split(" ")[0];

  function scrollDown() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function addFiles(files: FileList | File[]) {
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!READABLE.test(file.name)) continue;
      next.push({ name: file.name, content: await file.text() });
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  }

  async function send(rawText: string) {
    const text = rawText.trim();
    if ((!text && attachments.length === 0) || status === "thinking") return;

    const attached = attachments;
    setInput("");
    setAttachments([]);

    // Le contenu des documents joints est passé en contexte du message : le clone réagit
    // au livrable qu'on lui montre (cas d'usage : montrer son travail à son N+1).
    const docBlocks = attached
      .map((a) => `--- Shared document: ${a.name} ---\n${a.content}`)
      .join("\n\n");
    const displayText = text || (attached.length ? "Here's what I'm working on — what do you think?" : "");
    const payload = docBlocks ? `${docBlocks}\n\n${displayText}` : displayText;

    setTurns((prev) => [
      ...prev,
      { role: "user", text: displayText, attachments: attached.map((a) => a.name) },
    ]);
    setStatus("thinking");
    scrollDown();

    try {
      const result = await api.ask({ cloneId, mode: "clone", text: payload });
      setLast(result);
      setTurns((prev) => [...prev, { role: "clone", text: result.response, grounded: result }]);
      scrollDown();
      setStatus("speaking");
      try {
        const { audioUrl } = await api.tts({ text: result.response, voiceId: clone!.voiceId });
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setStatus("idle");
          if (voiceModeRef.current) pressMic();
        };
        audio.onerror = () => setStatus("idle");
        await audio.play();
      } catch {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  }

  async function pressMic() {
    if (status === "thinking") return;
    await recorder.start();
  }

  // Chat normal : la voix ne fait que remplir la barre de texte — l'utilisateur relit,
  // corrige si besoin, et envoie lui-même en cliquant sur Send.
  async function releaseMicToInput() {
    const audio = await recorder.stop();
    if (!audio) return;
    try {
      const { text } = await api.stt({ audio });
      setInput(text);
    } catch {
      // rien à faire, le champ reste tel quel
    }
  }

  // Conversation vocale continue : pas d'étape de relecture, ça part directement.
  async function releaseMicAndSend() {
    const audio = await recorder.stop();
    if (!audio) return;
    try {
      const { text } = await api.stt({ audio });
      await send(text);
    } catch {
      setStatus("idle");
    }
  }

  // Bascule clic pour démarrer / clic pour arrêter — plus fiable qu'un "maintenir enfoncé"
  // sur trackpad, où un clic précis de plusieurs secondes est difficile à tenir.
  async function toggleMic() {
    if (recorder.recording) {
      await releaseMicToInput();
    } else {
      await pressMic();
    }
  }

  async function toggleVoiceMic() {
    if (recorder.recording) {
      await releaseMicAndSend();
    } else {
      await pressMic();
    }
  }

  // Mode "conversation vocale" : écran dédié avec l'orbe, écoute relancée automatiquement
  // après chaque réponse — distinct du chat normal, où la voix reste un message ponctuel.
  function toggleVoiceMode() {
    if (voiceMode) {
      setVoiceModeState(false);
      if (recorder.recording) recorder.stop();
    } else {
      setVoiceModeState(true);
      pressMic();
    }
  }

  // L'orbe donne un retour visuel continu pendant les temps morts (enregistrement, latence
  // du LLM) — sans lui, rien ne montre que quelque chose se passe pendant ces quelques secondes.
  const orbState = recorder.recording ? "listening" : status === "idle" ? "idle" : status;

  if (voiceMode) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
        <Avatar id={cloneId} name={clone.name} size="xl" />
        <h1 className="text-lg font-medium">{firstName}</h1>
        <button onClick={toggleVoiceMic} title={recorder.recording ? "Click to stop and send" : "Click to talk"}>
          <Orb state={orbState} />
        </button>
        <p className="text-xs text-muted">
          {recorder.recording
            ? "Listening — click the orb when you're done talking"
            : status === "idle"
              ? "Click the orb to talk"
              : null}
        </p>

        {turns.length > 0 && (
          <div className="max-h-40 w-full space-y-2 overflow-y-auto px-4 text-center">
            {turns.slice(-2).map((turn, i) => (
              <p
                key={i}
                className={turn.role === "user" ? "text-sm text-muted" : "text-base font-medium"}
              >
                {turn.text}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={toggleVoiceMode}
          className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          <PhoneOff className="h-4 w-4" /> End conversation
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-6">
      {/* Colonne conversation */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-black/5 pb-4">
          <Link href={`/clone/${cloneId}`} className="text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Avatar id={cloneId} name={clone.name} size="md" />
          <div className="flex-1">
            <h1 className="font-medium">Ask {firstName}</h1>
            <p className="text-xs text-muted">
              {clone.role} · talk or type — {firstName}&apos;s answers are grounded in real documents
            </p>
          </div>
        </div>

        {/* Transcript (zone de drop) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`relative flex-1 space-y-4 overflow-y-auto py-6 ${
            dragOver ? "rounded-2xl outline-2 outline-dashed outline-accent" : ""
          }`}
        >
          {turns.length === 0 && (
            <div className="mt-16 text-center text-muted">
              <p className="text-sm">
                Try: &ldquo;Can I push the Salesforce integration by two days?&rdquo;
              </p>
              <p className="mt-2 text-xs">
                Or drop a deliverable here to get {firstName}&apos;s reaction on it.
              </p>
            </div>
          )}

          {turns.map((turn, i) => (
            <div key={i}>
              <div className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    turn.role === "user" ? "bg-accent text-white" : "card rounded-tl-sm"
                  }`}
                >
                  {turn.attachments && turn.attachments.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {turn.attachments.map((name, j) => (
                        <span
                          key={j}
                          className="flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[11px]"
                        >
                          <Paperclip className="h-3 w-3" /> {name}
                        </span>
                      ))}
                    </div>
                  )}
                  {turn.text}
                </div>
              </div>
              {turn.role === "clone" && turn.grounded && (
                <div className="mt-1.5 pl-1">
                  <button
                    onClick={() => setOpenPanel(openPanel === i ? null : i)}
                    className="text-xs text-muted hover:text-accent lg:hidden"
                  >
                    {openPanel === i ? "Hide sources ▲" : "Why this answer? ▼"}
                  </button>
                  {openPanel === i && (
                    <div className="card mt-2 p-4 lg:hidden">
                      <GroundedPanel data={turn.grounded} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Barre de saisie : documents + texte + voix, tout disponible en même temps */}
        <div className="sticky bottom-0 bg-background pb-4 pt-2">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs text-accent"
                >
                  <Paperclip className="h-3 w-3" />
                  {a.name}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json"
              hidden
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach a document"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-muted hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              className="min-w-0 flex-1 rounded-full border border-black/10 bg-surface px-5 py-3 text-sm outline-none placeholder:text-muted focus:border-accent/50"
              placeholder={`Message ${firstName}, or click the mic to talk...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
            />

            <button
              onClick={toggleMic}
              title={recorder.recording ? "Click to stop" : "Click to talk"}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all ${
                recorder.recording ? "scale-110 bg-red-500 text-white" : "border border-black/10 text-muted hover:text-foreground"
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>

            <button
              onClick={toggleVoiceMode}
              title="Start a voice conversation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-muted hover:text-foreground"
            >
              <PhoneCall className="h-5 w-5" />
            </button>

            <button
              onClick={() => send(input)}
              disabled={status === "thinking" || (!input.trim() && attachments.length === 0)}
              title="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {recorder.unsupported && (
            <p className="mt-2 text-center text-xs text-amber-500">
              Microphone unavailable — use the keyboard instead.
            </p>
          )}

          <div className="mt-3">
            <SlackHint name={clone.name} />
          </div>
        </div>
      </div>

      {/* Panneau grounded (desktop) */}
      <aside className="hidden w-80 shrink-0 lg:block">
        <div className="card sticky top-20 max-h-[80vh] overflow-y-auto p-5">
          <h2 className="mb-4 text-sm font-semibold">Grounded response</h2>
          {last ? (
            <GroundedPanel data={last} />
          ) : (
            <p className="text-sm text-muted">
              Ask something and {firstName}&apos;s sources, likely objections and suggested framing
              will appear here.
            </p>
          )}
        </div>
      </aside>
    </main>
  );
}
