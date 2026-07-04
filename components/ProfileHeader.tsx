"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Check, Pencil, Sparkles, X } from "lucide-react";
import { Clone } from "@/lib/team";
import { api } from "@/lib/api";
import { useDisplayName, useProfileOverrides } from "@/lib/profileOverrides";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";

export function ProfileHeader({
  cloneId,
  clone,
  isSelf,
  companyName,
}: {
  cloneId: string;
  clone: Clone;
  isSelf: boolean;
  companyName: string;
}) {
  const { setOverride } = useProfileOverrides();
  const displayName = useDisplayName(cloneId, clone.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  function persist(patch: { name?: string; avatar?: string }) {
    setOverride(cloneId, patch);
    // Best-effort : la persistance serveur sera branchée côté backend (voir CONTRACTS.md).
    api.saveProfile(cloneId, patch).catch(() => {});
  }

  function commitName() {
    const name = draftName.trim();
    if (!name) return;
    persist({ name });
    setEditingName(false);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") persist({ avatar: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <Avatar id={cloneId} name={displayName} size="xl" />
        {isSelf && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onPickFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-muted shadow-sm hover:text-foreground"
            >
              <Camera className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex-1">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="w-full max-w-xs rounded-lg border border-black/10 bg-surface-2 px-3 py-1.5 text-2xl font-semibold outline-none focus:border-accent/50"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setDraftName(displayName);
                  setEditingName(false);
                }
              }}
            />
            <button
              onClick={commitName}
              title="Save"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setDraftName(displayName);
                setEditingName(false);
              }}
              title="Cancel"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            {isSelf && (
              <button
                onClick={() => {
                  setDraftName(displayName);
                  setEditingName(true);
                }}
                title="Edit name"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[0.05] hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <p className="text-muted">
          {clone.role} · {companyName}
        </p>
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
  );
}
