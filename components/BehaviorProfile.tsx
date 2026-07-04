"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, Behavior, CloneProfile } from "@/lib/api";

function storageKey(cloneId: string) {
  return `f2f-behaviors-${cloneId}`;
}

export function BehaviorProfile({
  cloneId,
  isSelf,
  initialSummary,
  initialBehaviors,
}: {
  cloneId: string;
  isSelf: boolean;
  initialSummary: string;
  initialBehaviors: Behavior[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [behaviors, setBehaviors] = useState<Behavior[]>(initialBehaviors);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newText, setNewText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Overlay des éventuelles modifications déjà enregistrées localement (démo : persiste au
  // rechargement sans attendre la persistance serveur de Géraud).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(cloneId));
      if (raw) {
        const parsed = JSON.parse(raw) as CloneProfile;
        setSummary(parsed.summary);
        setBehaviors(parsed.behaviors);
      }
    } catch {
      /* ignore */
    }
  }, [cloneId]);

  function markDirty() {
    setDirty(true);
    setSaved(false);
  }

  function startEdit(b: Behavior) {
    setEditingId(b.id);
    setDraft(b.text);
  }

  function commitEdit() {
    if (!editingId) return;
    const text = draft.trim();
    if (!text) return;
    setBehaviors((prev) => prev.map((b) => (b.id === editingId ? { ...b, text } : b)));
    setEditingId(null);
    setDraft("");
    markDirty();
  }

  function remove(id: string) {
    setBehaviors((prev) => prev.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
    markDirty();
  }

  function add() {
    const text = newText.trim();
    if (!text) return;
    const id = `b-${Date.now()}`;
    setBehaviors((prev) => [...prev, { id, text }]);
    setNewText("");
    markDirty();
  }

  async function save() {
    setSaving(true);
    const profile: CloneProfile = { summary, behaviors };
    try {
      await api.saveBehaviors(cloneId, profile);
      window.localStorage.setItem(storageKey(cloneId), JSON.stringify(profile));
      setDirty(false);
      setSaved(true);
    } catch {
      // La persistance serveur (Géraud) n'est pas encore branchée : on garde au moins la
      // version locale pour la démo.
      window.localStorage.setItem(storageKey(cloneId), JSON.stringify(profile));
      setDirty(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const hasContent = summary.trim().length > 0 || behaviors.length > 0;

  return (
    <div className="space-y-4 text-sm">
      {/* Résumé lisible */}
      <div>
        <h3 className="font-medium">Behavioral profile</h3>
        {isSelf ? (
          <textarea
            className="mt-2 w-full rounded-xl border border-black/10 bg-surface-2 p-3 text-sm outline-none focus:border-accent/50"
            rows={3}
            placeholder="A short, readable summary of how this person decides and communicates."
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              markDirty();
            }}
          />
        ) : (
          <p className="mt-1 text-muted">
            {summary || "Empty — will be built from documents and interviews."}
          </p>
        )}
      </div>

      {/* Liste de comportements */}
      <div className="border-t border-black/5 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">
            Predefined behaviors{" "}
            <span className="text-xs font-normal text-muted">({behaviors.length})</span>
          </h3>
          {isSelf && (
            <span className="text-xs text-muted">Yours to review — edit or remove anything that isn&apos;t you.</span>
          )}
        </div>

        {behaviors.length === 0 && !isSelf && (
          <p className="mt-2 text-muted">No behaviors recorded yet.</p>
        )}

        <ul className="mt-3 space-y-2">
          {behaviors.map((b) => (
            <li key={b.id} className="group rounded-xl border border-black/5 bg-black/[0.02] p-3">
              {editingId === b.id ? (
                <div className="flex items-start gap-2">
                  <textarea
                    autoFocus
                    className="min-h-16 flex-1 rounded-lg border border-black/10 bg-surface-2 p-2 text-sm outline-none focus:border-accent/50"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={commitEdit}
                      title="Save"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setDraft("");
                      }}
                      title="Cancel"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-foreground/85">{b.text}</span>
                  {isSelf && (
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => startEdit(b)}
                        title="Edit"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[0.05] hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(b.id)}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Ajout d'un comportement */}
        {isSelf && (
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-full border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent/50"
              placeholder="Add a behavior that describes you..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button
              onClick={add}
              disabled={!newText.trim()}
              className="flex items-center gap-1.5 rounded-full border border-black/10 px-4 text-sm hover:bg-black/[0.03] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        )}
      </div>

      {/* Barre d'enregistrement */}
      {isSelf && hasContent && (
        <div className="flex items-center gap-3 border-t border-black/5 pt-4">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {saved && !dirty && <span className="text-sm text-emerald-600">✓ Saved</span>}
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
        </div>
      )}
    </div>
  );
}
