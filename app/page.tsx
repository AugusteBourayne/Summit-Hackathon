import Link from "next/link";
import { team, clones } from "@/lib/team";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";

function ActionIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const icons = {
  chat: "M8 10h8m-8 4h5m-9 6l2.5-3H18a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11z",
  meeting: "M12 18v3m-3 0h6M12 15a4 4 0 004-4V7a4 4 0 10-8 0v4a4 4 0 004 4z",
  slack: "M12 8v8m-4-4h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="mb-10">
        <p className="text-sm font-medium text-accent">{team.company.name} · team space</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Rehearse the conversation before it happens.
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Every teammate has an AI clone trained on their real decisions. Test your request on
          the clone first — get the likely reaction, objections and the best way to frame it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {team.members.map((member) => {
          const clone = clones[member.id];
          if (!clone) return null;
          return (
            <div key={member.id} className="card card-hover p-5">
              <Link href={`/clone/${member.id}`} className="flex items-start gap-4">
                <Avatar id={member.id} name={member.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate text-lg font-medium">{member.name}</h2>
                    <Badge variant={clone.trained ? "trained" : "untrained"}>
                      {clone.trained ? "● trained" : "○ not trained"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">{member.role}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {member.consent && <Badge variant="consent">✓ consent given</Badge>}
                    {clone.voiceId && <Badge variant="voice">voice ready</Badge>}
                  </div>
                </div>
              </Link>

              <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                <Link
                  href={`/chat/${member.id}`}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm transition-colors ${
                    clone.trained
                      ? "bg-white/5 hover:bg-white/10"
                      : "pointer-events-none text-muted opacity-40"
                  }`}
                >
                  <ActionIcon d={icons.chat} /> Chat
                </Link>
                <Link
                  href={`/room/${member.id}`}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm transition-colors ${
                    clone.trained
                      ? "bg-accent-soft text-accent hover:bg-accent/25"
                      : "pointer-events-none text-muted opacity-40"
                  }`}
                >
                  <ActionIcon d={icons.meeting} /> Meeting
                </Link>
                <span
                  className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full py-2 text-sm text-muted opacity-40"
                  title="Slack integration — coming soon"
                >
                  <ActionIcon d={icons.slack} /> Slack
                </span>
              </div>

              {!clone.trained && (
                <Link
                  href={`/training/${member.id}`}
                  className="mt-3 block text-center text-xs text-accent hover:underline"
                >
                  Train this clone →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
