"use client";

import { useRef, useState } from "react";
import { Building2, Check, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2, Upload, Users } from "lucide-react";
import type { NewCompanyInput } from "@/lib/workspace";
import { initials } from "@/lib/team";

// Assistant guidé de création d'une société vierge : intro (tuto) → contexte entreprise →
// profils de l'équipe (nom, rôle, avatar) → récap → création. L'avatar uploadé est renvoyé
// en data URL, aligné (par ordre) avec les membres non vides soumis.

type Row = { name: string; role: string; avatar?: string };

const STEPS = ["Intro", "Company", "Team", "Review"] as const;

export function CompanyWizard({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: NewCompanyInput, avatars: (string | undefined)[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({ name: "", description: "", product: "" });
  const [rows, setRows] = useState<Row[]>([
    { name: "", role: "" },
    { name: "", role: "" },
  ]);
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);

  const filledRows = rows.filter((r) => r.name.trim());
  const canNextCompany = company.name.trim().length > 0;
  const canCreate = canNextCompany && filledRows.length > 0;

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", role: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onPickAvatar(i: number, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateRow(i, { avatar: reader.result as string });
    reader.readAsDataURL(file);
  }

  function submit() {
    const input: NewCompanyInput = {
      company: {
        name: company.name.trim(),
        description: company.description.trim(),
        product: company.product.trim(),
      },
      members: filledRows.map((r) => ({ name: r.name.trim(), role: r.role.trim() })),
    };
    const avatars = filledRows.map((r) => r.avatar);
    onCreate(input, avatars);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4 py-10 backdrop-blur-sm">
      <div className="card w-full max-w-2xl p-0">
        {/* Étapes */}
        <div className="flex items-center gap-2 border-b border-black/5 px-6 py-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  i < step
                    ? "bg-accent text-white"
                    : i === step
                      ? "bg-accent-soft text-accent"
                      : "bg-black/[0.05] text-muted"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={`text-xs ${i === step ? "font-medium text-foreground" : "text-muted"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-black/10" />}
            </div>
          ))}
        </div>

        <div className="px-6 py-6">
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-semibold">Create a new company</h2>
              </div>
              <p className="mt-4 text-sm text-muted">
                You&apos;re about to set up a fresh workspace with blank data. In a few steps you&apos;ll:
              </p>
              <ol className="mt-4 space-y-3 text-sm">
                <li className="flex gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                  <span>
                    <span className="font-medium">Describe the company</span> — its name, what it does, and
                    how the product works. This shared context grounds every clone&apos;s answers.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <span>
                    <span className="font-medium">Add team profiles</span> — one per person, with a name, a
                    role and an optional photo. Each profile gets its own (untrained) clone.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                  <span>
                    <span className="font-medium">Train later</span> — once created, each person can enrich
                    their clone with documents and interviews from their profile.
                  </span>
                </li>
              </ol>
              <p className="mt-4 rounded-xl bg-black/[0.03] p-3 text-xs text-muted">
                Nothing is shared until people train their own clone. You can switch back to any other
                company at any time from Settings.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold">About the company</h2>
              <div>
                <label className="text-sm font-medium">Company name</label>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
                  placeholder="e.g. Acme Inc."
                  value={company.name}
                  onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">What the company does</label>
                <textarea
                  className="mt-1.5 h-24 w-full rounded-xl border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
                  placeholder="Industry, mission, who it serves…"
                  value={company.description}
                  onChange={(e) => setCompany((c) => ({ ...c, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">How the product works</label>
                <textarea
                  className="mt-1.5 h-24 w-full rounded-xl border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
                  placeholder="What you sell and how it delivers value…"
                  value={company.product}
                  onChange={(e) => setCompany((c) => ({ ...c, product: e.target.value }))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold">Team profiles</h2>
              <p className="mt-2 text-sm text-muted">
                Add the people in this company. Each one gets a clone they can train later.
              </p>
              <div className="mt-5 space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-black/10 p-3">
                    <button
                      type="button"
                      onClick={() => fileInputs.current[i]?.click()}
                      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.04] text-xs font-medium text-muted"
                      title="Upload a photo"
                    >
                      {row.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.avatar} alt="" className="h-full w-full object-cover" />
                      ) : row.name.trim() ? (
                        initials(row.name)
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        fileInputs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => onPickAvatar(i, e.target.files?.[0])}
                    />
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <input
                        className="rounded-lg border border-black/10 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/50"
                        placeholder="Full name"
                        value={row.name}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                      />
                      <input
                        className="rounded-lg border border-black/10 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/50"
                        placeholder="Role"
                        value={row.role}
                        onChange={(e) => updateRow(i, { role: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="shrink-0 rounded-lg p-2 text-muted hover:bg-black/[0.04] hover:text-foreground"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRow}
                className="mt-3 flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.03]"
              >
                <Plus className="h-4 w-4" /> Add a profile
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold">Review</h2>
              <div className="mt-4 rounded-xl border border-black/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Company</p>
                <p className="mt-1 font-medium">{company.name || "—"}</p>
                {company.description && <p className="mt-1 text-sm text-muted">{company.description}</p>}
                {company.product && <p className="mt-1 text-sm text-muted">{company.product}</p>}
              </div>
              <div className="mt-3 rounded-xl border border-black/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Team ({filledRows.length})
                </p>
                <ul className="mt-3 space-y-2">
                  {filledRows.map((r, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/[0.04] text-xs font-medium text-muted">
                        {r.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(r.name)
                        )}
                      </span>
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.role && <span className="text-xs text-muted">· {r.role}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-black/5 px-6 py-4">
          <button
            type="button"
            onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}
            className="flex items-center gap-1 rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            {step === 0 ? "Cancel" : (<><ChevronLeft className="h-4 w-4" /> Back</>)}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !canNextCompany}
              className="flex items-center gap-1 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canCreate}
              className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> Create &amp; activate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
