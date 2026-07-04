"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageSquare, X } from "lucide-react";
import { Clone } from "@/lib/team";
import { useDisplayName } from "@/lib/profileOverrides";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { SlackHint } from "@/components/Slack";

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
  const name = useDisplayName(cloneId, clone.name);

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
            <Avatar id={cloneId} name={name} size="lg" />
            <div>
              <h2 className="text-lg font-semibold">{name}</h2>
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

        <div className="mt-5">
          {clone.trained ? (
            <Link
              href={`/room/${cloneId}`}
              className="flex items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              <MessageSquare className="h-4 w-4" /> Ask {name.split(" ")[0]}
            </Link>
          ) : (
            <span className="flex items-center justify-center gap-2 rounded-full bg-black/[0.04] py-2.5 text-sm text-muted/60">
              Not trained yet
            </span>
          )}
          {clone.trained && (
            <div className="mt-3">
              <SlackHint name={name} />
            </div>
          )}
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
            className="mt-5 block rounded-full border border-black/10 py-2.5 text-center text-sm font-medium text-foreground hover:bg-black/[0.03]"
          >
            {clone.trained ? "Improve my clone →" : "Train my clone →"}
          </Link>
        )}
      </div>
    </div>
  );
}
