"use client";

import { use } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { useCurrentUser } from "@/lib/currentUser";
import { useDisplayName } from "@/lib/profileOverrides";
import { SlackHint } from "@/components/Slack";
import { BehaviorProfile } from "@/components/BehaviorProfile";
import { ProfileHeader } from "@/components/ProfileHeader";

export default function CloneProfile({
  params,
}: {
  params: Promise<{ cloneId: string }>;
}) {
  const { cloneId } = use(params);
  const { getClone, company } = useWorkspace();
  const clone = getClone(cloneId);
  const name = useDisplayName(cloneId, clone?.name ?? "");
  const { currentUserId } = useCurrentUser();
  const isSelf = cloneId === currentUserId;

  if (!clone) return <main className="p-12 text-muted">Clone not found.</main>;
  const firstName = name.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <ProfileHeader
        cloneId={cloneId}
        clone={clone}
        isSelf={isSelf}
        companyName={company.name}
      />

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
              <SlackHint name={name} />
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
            This clone hasn&apos;t been trained yet. Only {firstName} can train it.
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
              {company.name} — {company.description}
            </p>
          </div>
          <div className="border-t border-black/5 pt-4">
            <BehaviorProfile
              cloneId={cloneId}
              name={name}
              isSelf={isSelf}
              initialSummary={clone.summary ?? ""}
              initialBehaviors={clone.behaviors ?? []}
            />
          </div>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">
        This clone was created with {name}&apos;s explicit consent. It rehearses
        conversations — it never replaces the real person&apos;s decisions.
      </p>
    </main>
  );
}
