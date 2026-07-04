"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { team } from "@/lib/team";
import { useCurrentUser } from "@/lib/currentUser";
import { useDisplayName } from "@/lib/profileOverrides";
import { Avatar } from "@/components/Avatar";

function SwitcherRow({
  id,
  name,
  active,
  onSelect,
}: {
  id: string;
  name: string;
  active: boolean;
  onSelect: () => void;
}) {
  const displayName = useDisplayName(id, name);
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
        active ? "bg-accent-soft text-accent" : "hover:bg-black/[0.04]"
      }`}
    >
      <Avatar id={id} name={displayName} size="sm" />
      <span className="min-w-0 flex-1 truncate">{displayName}</span>
      {active && <span className="text-xs">●</span>}
    </button>
  );
}

export function UserSwitcher() {
  const { currentUserId, setCurrentUserId } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = team.members.find((m) => m.id === currentUserId) ?? team.members[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass flex items-center gap-2 rounded-full py-1 pl-3 pr-1.5 text-sm text-muted shadow-sm hover:text-foreground"
      >
        <span className="hidden sm:inline">You are</span>
        <Avatar id={current.id} name={current.name} size="sm" />
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="glass absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl bg-white/95 p-1.5 shadow-[0_4px_12px_rgba(15,15,20,0.06),0_16px_40px_-12px_rgba(15,15,20,0.18)]">
          <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            Dev — switch profile
          </p>
          {team.members.map((member) => (
            <SwitcherRow
              key={member.id}
              id={member.id}
              name={member.name}
              active={member.id === currentUserId}
              onSelect={() => {
                setCurrentUserId(member.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
