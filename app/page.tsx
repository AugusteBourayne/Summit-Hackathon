"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, Hash } from "lucide-react";
import { team, clones } from "@/lib/team";
import { useCurrentUser } from "@/lib/currentUser";
import { Avatar } from "@/components/Avatar";
import { CloneModal } from "@/components/CloneModal";

export default function Home() {
  const { currentUserId } = useCurrentUser();
  const [openId, setOpenId] = useState<string | null>(null);
  const trainedCount = team.members.filter((m) => clones[m.id]?.trained).length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-10 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted">
          {trainedCount} of {team.members.length} clones trained
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-x-10 gap-y-8">
        {team.members.map((member, i) => {
          const clone = clones[member.id];
          if (!clone) return null;

          return (
            <div key={member.id} className="group flex w-24 flex-col items-center">
              <button
                onClick={() => setOpenId(member.id)}
                className="float-bubble relative flex flex-col items-center"
                style={{ "--float-delay": `${i * 0.6}s` } as React.CSSProperties}
              >
                <div
                  className={`rounded-full ring-2 ring-offset-4 ring-offset-background transition-shadow ${
                    clone.trained ? "ring-accent/40" : "ring-transparent"
                  }`}
                >
                  <Avatar id={member.id} name={member.name} size="xl" />
                </div>
                <p className="mt-3 text-sm font-medium">{member.name}</p>
                <p className="text-xs text-muted">{member.role.split(" ")[0]}</p>
              </button>

              <div className="mt-2 flex h-8 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {clone.trained ? (
                  <>
                    <Link
                      href={`/room/${member.id}`}
                      title="Meeting"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent"
                    >
                      <Mic className="h-3.5 w-3.5" />
                    </Link>
                    <span
                      title="Slack — coming soon"
                      className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-full bg-black/[0.04] text-muted/50"
                    >
                      <Hash className="h-3.5 w-3.5" />
                    </span>
                  </>
                ) : member.id === currentUserId ? (
                  <Link href={`/training/${member.id}`} className="text-[11px] text-accent">
                    Train me →
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted">Not trained</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openId && clones[openId] && (
        <CloneModal
          cloneId={openId}
          clone={clones[openId]}
          isSelf={openId === currentUserId}
          onClose={() => setOpenId(null)}
        />
      )}
    </main>
  );
}
