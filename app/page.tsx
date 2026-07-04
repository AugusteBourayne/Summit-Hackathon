"use client";

import Link from "next/link";
import { MessageSquare, Mic, Hash } from "lucide-react";
import { team, clones } from "@/lib/team";
import { useCurrentUser } from "@/lib/currentUser";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";

function RowAction({
  href,
  label,
  icon: Icon,
  enabled,
  tone,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  tone?: "accent";
}) {
  const base = "flex h-9 w-9 items-center justify-center rounded-full transition-colors";
  if (!enabled) {
    return (
      <span className={`${base} cursor-not-allowed text-muted/50`} title={`${label} — coming soon`}>
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <Link
      href={href}
      title={label}
      className={`${base} ${
        tone === "accent"
          ? "bg-accent-soft text-accent hover:bg-accent/20"
          : "text-muted hover:bg-black/[0.04] hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}

export default function Home() {
  const { currentUserId } = useCurrentUser();
  const trainedCount = team.members.filter((m) => clones[m.id]?.trained).length;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted">
          {trainedCount} of {team.members.length} clones trained
        </p>
      </div>

      <div className="card divide-y divide-black/[0.05]">
        {team.members.map((member) => {
          const clone = clones[member.id];
          if (!clone) return null;
          const isSelf = member.id === currentUserId;
          return (
            <div key={member.id} className="flex items-center gap-3 p-3.5">
              <Link href={`/clone/${member.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar id={member.id} name={member.name} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">{member.name}</p>
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        clone.trained ? "bg-accent" : "bg-black/15"
                      }`}
                      title={clone.trained ? "trained" : "not trained"}
                    />
                    {isSelf && <Badge variant="soon">you</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted">{member.role}</p>
                </div>
              </Link>

              {!clone.trained && isSelf && (
                <Link
                  href={`/training/${member.id}`}
                  className="hidden shrink-0 text-xs text-accent hover:underline sm:inline"
                >
                  Train →
                </Link>
              )}
              {!clone.trained && !isSelf && (
                <span className="hidden shrink-0 text-xs text-muted/70 sm:inline">Not trained</span>
              )}

              <div className="flex shrink-0 items-center gap-0.5">
                <RowAction href={`/chat/${member.id}`} label="Chat" icon={MessageSquare} enabled={clone.trained} />
                <RowAction
                  href={`/room/${member.id}`}
                  label="Meeting"
                  icon={Mic}
                  enabled={clone.trained}
                  tone="accent"
                />
                <RowAction href="#" label="Slack" icon={Hash} enabled={false} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Badge variant="consent">✓</Badge> Every clone here was created with its owner&apos;s consent.
        Only its owner can train it.
      </p>
    </main>
  );
}
