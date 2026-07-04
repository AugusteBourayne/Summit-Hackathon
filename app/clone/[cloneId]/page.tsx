"use client";

import { use } from "react";
import Link from "next/link";
import { MessageSquare, Sparkles } from "lucide-react";
import { getClone, team } from "@/lib/team";
import { useCurrentUser } from "@/lib/currentUser";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { SlackHint } from "@/components/Slack";
import { BehaviorProfile } from "@/components/BehaviorProfile";

export default function CloneProfile({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const clone = getClone(cloneId);
  const { currentUserId } = useCurrentUser();
  const isSelf = cloneId === currentUserId;

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;
  const firstName = clone.name.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center gap-6">
        <Avatar id={cloneId} name={clone.name} size="xl" />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{clone.name}</h1>
          <p className="text-muted">{clone.role} · {team.company.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={clone.trained ? "trained" : "untrained"}>
              {clone.trained ? "● trained" : "○ not trained"}
            </Badge>
            <Badge variant="consent">✓ consent given</Badge>
            {clone.voiceId && <Badge variant="voice">voice ready</Badge>}
          </div>
        </div>
        {isSelf && (
          <Link
            href={`/training/${cloneId}`}
            className="flex shrink-0 items-center gap-2 self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.03]"
          >
            <Sparkles className="h-4 w-4 text-pink-600" />
            {clone.trained ? "Enrich clone" : "Train clone"}
          </Link>
        )}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Talk to the clone
        </h2>
        {clone.trained ? (
          <>
            <Link
              href={`/room/${cloneId}`}
              className="flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              <MessageSquare className="h-4 w-4" /> Ask {firstName}
            </Link>
            <p className="mt-2 text-center text-xs text-muted">
              One conversation — talk by voice or type, and drop a document to get their reaction on it.
            </p>
            <div className="mt-4">
              <SlackHint name={clone.name} />
            </div>
          </>
        ) : (
          <div className="card p-4 text-sm text-muted">Not trained yet.</div>
        )}
        {!clone.trained && isSelf && (
          <p className="mt-3 text-sm text-muted">
            This clone hasn&apos;t been trained yet.{" "}
            <Link href={`/training/${cloneId}`} className="text-accent hover:underline">
              Start training →
            </Link>
          </p>
        )}
        {!clone.trained && !isSelf && (
          <p className="mt-3 text-sm text-muted">
            This clone hasn&apos;t been trained yet. Only {clone.name.split(" ")[0]} can train it.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          What this clone knows
        </h2>
        <div className="card space-y-4 p-5 text-sm">
          <div>
            <h3 className="font-medium">Company context (shared)</h3>
            <p className="mt-1 text-muted">
              {team.company.name} — {team.company.description}
            </p>
          </div>
          <div className="border-t border-black/5 pt-4">
            <BehaviorProfile
              cloneId={cloneId}
              isSelf={isSelf}
              initialSummary={clone.summary ?? ""}
              initialBehaviors={clone.behaviors ?? []}
            />
          </div>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">
        This clone was created with {clone.name}&apos;s explicit consent. It rehearses
        conversations — it never replaces the real person&apos;s decisions.
      </p>
    </main>
  );
}
