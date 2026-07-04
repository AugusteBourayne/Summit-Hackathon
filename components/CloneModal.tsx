"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Mic, Hash, X } from "lucide-react";
import { Clone } from "@/lib/team";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";

export function CloneModal({
  cloneId,
  clone,
  isSelf,
  onClose,
}: {
  cloneId: string;
  clone: Clone;
  isSelf: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accuracy = clone.trained ? 92 : 8;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar id={cloneId} name={clone.name} size="lg" />
            <div>
              <h2 className="text-lg font-semibold">{clone.name}</h2>
              <p className="text-sm text-muted">{clone.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/[0.04] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="consent">✓ consent given</Badge>
          {clone.voiceId && <Badge variant="voice">voice ready</Badge>}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted">Clone accuracy</span>
            <span className="font-mono text-muted">{accuracy}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${accuracy}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {clone.trained
              ? "Trained on documents and a full interview."
              : "Not trained yet — answers won't be reliable."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link
            href={clone.trained ? `/chat/${cloneId}` : "#"}
            className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs ${
              clone.trained ? "bg-black/[0.03] hover:bg-black/[0.06]" : "pointer-events-none opacity-40"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </Link>
          <Link
            href={clone.trained ? `/room/${cloneId}` : "#"}
            className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs ${
              clone.trained ? "bg-accent-soft text-accent hover:bg-accent/20" : "pointer-events-none opacity-40"
            }`}
          >
            <Mic className="h-4 w-4" /> Meeting
          </Link>
          <span
            className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-xl py-3 text-xs text-muted/50"
            title="Slack — coming soon"
          >
            <Hash className="h-4 w-4" /> Slack
          </span>
        </div>

        <div className="mt-5 border-t border-black/5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Conversation history
          </p>
          <p className="mt-2 text-sm text-muted">No conversations yet.</p>
        </div>

        {isSelf && (
          <Link
            href={`/training/${cloneId}`}
            className="mt-5 block rounded-full bg-accent py-2.5 text-center text-sm font-medium text-white"
          >
            {clone.trained ? "Improve my clone →" : "Train my clone →"}
          </Link>
        )}
      </div>
    </div>
  );
}
