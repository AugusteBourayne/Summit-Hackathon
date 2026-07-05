"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { floatParams, Member } from "@/lib/team";
import { useWorkspace } from "@/lib/workspace";
import { useCurrentUser } from "@/lib/currentUser";
import { useDisplayName } from "@/lib/profileOverrides";
import { Avatar } from "@/components/Avatar";
import { CloneModal } from "@/components/CloneModal";

function Bubble({
  member,
  currentUserId,
  onOpen,
}: {
  member: Member;
  currentUserId: string;
  onOpen: (id: string) => void;
}) {
  const { clones } = useWorkspace();
  const clone = clones[member.id];
  const name = useDisplayName(member.id, member.name);
  if (!clone) return null;
  const fp = floatParams(member.id);

  return (
    <div className="group flex w-24 flex-col items-center">
      <button
        onClick={() => onOpen(member.id)}
        className="float-bubble relative flex flex-col items-center"
        style={
          {
            "--float-duration": `${fp.duration}s`,
            "--float-delay": `${fp.delay}s`,
            "--float-y": `${-fp.y}px`,
          } as React.CSSProperties
        }
      >
        <div
          className={`bubble-nudge rounded-full ring-2 ring-offset-4 ring-offset-background ${
            clone.trained ? "ring-accent/40" : "ring-transparent"
          }`}
        >
          <Avatar id={member.id} name={name} size="xl" />
        </div>
        <p className="mt-3 text-sm font-medium">{name}</p>
        <p className="text-xs text-muted">{member.role.split(" ")[0]}</p>
      </button>

      <div className="mt-2 flex h-7 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {clone.trained ? (
          <Link
            href={`/room/${member.id}`}
            className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-medium text-accent hover:bg-accent/20"
          >
            Ask {name.split(" ")[0]} →
          </Link>
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
}

export default function Home() {
  const { members, clones } = useWorkspace();
  const { currentUserId } = useCurrentUser();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // On ne montre jamais son propre profil dans l'équipe : uniquement les coéquipiers.
  const others = members.filter((m) => m.id !== currentUserId);
  const trainedCount = others.filter((m) => clones[m.id]?.trained).length;
  const primary = others.slice(0, 3);
  const rest = others.slice(3);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Talk to your{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-10">teammates&apos;</span>
            <span className="absolute inset-x-0 bottom-1 -z-0 h-[0.32em] -rotate-1 rounded-sm bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300" />
          </span>{" "}
          clones
        </h1>
        <p className="mt-4 text-muted">
          Get their honest reaction before you have the real conversation.
        </p>
      </div>

      {others.length === 0 ? (
        <div className="mx-auto mt-16 max-w-md text-center">
          <div className="card p-8">
            <p className="text-sm text-muted">
              No teammates yet in this company. Add profiles to start rehearsing conversations.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Go to settings →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-10">
          {primary.map((member) => (
            <Bubble key={member.id} member={member} currentUserId={currentUserId} onOpen={setOpenId} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex flex-col items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            More teammates
            <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {showMore && (
        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-10">
          {rest.map((member) => (
            <Bubble key={member.id} member={member} currentUserId={currentUserId} onOpen={setOpenId} />
          ))}
        </div>
      )}

      {openId && clones[openId] && (
        <CloneModal
          cloneId={openId}
          clone={clones[openId]}
          isSelf={openId === currentUserId}
          onClose={() => setOpenId(null)}
        />
      )}

      <p className="mt-16 text-center text-xs text-muted/70">
        {trainedCount} of {others.length} teammate clones trained
      </p>
    </main>
  );
}
