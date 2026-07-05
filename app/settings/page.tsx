"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Plus, Trash2, Users } from "lucide-react";
import { DEMO_WORKSPACE_ID, useWorkspace, type NewCompanyInput } from "@/lib/workspace";
import { useCurrentUser } from "@/lib/currentUser";
import { useProfileOverrides } from "@/lib/profileOverrides";
import { CompanyWizard } from "@/components/CompanyWizard";

export default function SettingsPage() {
  const { workspaces, active, createWorkspace, switchWorkspace, deleteWorkspace } = useWorkspace();
  const { setCurrentUserId } = useCurrentUser();
  const { setOverride } = useProfileOverrides();
  const router = useRouter();

  const [wizardOpen, setWizardOpen] = useState(false);

  function handleCreate(input: NewCompanyInput, avatars: (string | undefined)[]) {
    const ws = createWorkspace(input);
    // Les avatars uploadés sont alignés (par ordre) avec les membres créés.
    ws.members.forEach((m, i) => {
      const avatar = avatars[i];
      if (avatar) setOverride(m.id, { avatar });
    });
    switchWorkspace(ws.id);
    if (ws.members[0]) setCurrentUserId(ws.members[0].id);
    setWizardOpen(false);
    router.push("/");
  }

  function handleActivate(id: string) {
    switchWorkspace(id);
    const ws = workspaces.find((w) => w.id === id);
    if (ws?.members[0]) setCurrentUserId(ws.members[0].id);
    router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Manage the companies you rehearse with. Create a brand-new company with blank data, or switch
        between the ones you&apos;ve set up.
      </p>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Companies</h2>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New company
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {workspaces.map((ws) => {
          const isActive = ws.id === active.id;
          return (
            <div
              key={ws.id}
              className={`card p-5 ${isActive ? "ring-2 ring-accent/40" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{ws.company.name}</p>
                    {ws.id === DEMO_WORKSPACE_ID && (
                      <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                        Demo
                      </span>
                    )}
                    {isActive && (
                      <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                  {ws.company.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{ws.company.description}</p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <Users className="h-3.5 w-3.5" />
                    {ws.members.length} {ws.members.length === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-black/5 pt-4">
                {!isActive && (
                  <button
                    onClick={() => handleActivate(ws.id)}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Activate
                  </button>
                )}
                {ws.custom && (
                  <button
                    onClick={() => deleteWorkspace(ws.id)}
                    className="flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-muted hover:bg-black/[0.03] hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {wizardOpen && (
        <CompanyWizard onCancel={() => setWizardOpen(false)} onCreate={handleCreate} />
      )}
    </main>
  );
}
