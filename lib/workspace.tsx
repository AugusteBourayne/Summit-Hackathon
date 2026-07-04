"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import teamData from "@/seed/team.json";
import clonesData from "@/seed/clones.json";
import type { Clone, Member } from "@/lib/team";

// Un "workspace" = une société avec son contexte (nom, description, produit), ses membres et
// leurs clones. L'app affiche toujours le workspace *actif*. Le workspace de démo (Flowbridge)
// vient du seed ; l'utilisateur peut créer ses propres sociétés vierges depuis /settings, et
// ajouter/modifier des membres sur n'importe quel workspace (y compris la démo) — toutes ces
// modifications sont persistées en localStorage, indexées par workspace id.
//
// TODO(backend): la création/persistance des sociétés est mockée côté client (localStorage).
// Voir CONTRACTS.md — POST /api/companies devra persister { company, members, clones }.

export type Company = { name: string; description: string; product: string };

export type Workspace = {
  id: string;
  company: Company;
  members: Member[];
  clones: Record<string, Clone>;
  custom: boolean;
};

export const DEMO_WORKSPACE_ID = "demo";

const WORKSPACES_KEY = "f2f-workspaces"; // Record<id, Workspace> — démo incluse dès qu'elle est modifiée
const ACTIVE_KEY = "f2f-active-workspace";

// Workspace de démo tel que fourni par le seed (Flowbridge / Claire Dumont & co) — sert de base
// tant qu'aucune modification n'a été persistée pour cet id.
const demoWorkspace: Workspace = {
  id: DEMO_WORKSPACE_ID,
  company: (teamData as { company: Company }).company,
  members: (teamData as { members: Member[] }).members,
  clones: clonesData as Record<string, Clone>,
  custom: false,
};

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "profile";
}

// Construit un clone vierge pour un nouveau membre (non entraîné, sans comportements).
export function blankClone(name: string, role: string): Clone {
  return {
    name,
    role,
    voiceId: null,
    personaProfile: "",
    trained: false,
    summary: "",
    behaviors: [],
  };
}

export type NewCompanyInput = {
  company: Company;
  members: { name: string; role: string }[];
};

type WorkspaceContextValue = {
  workspaces: Workspace[];
  active: Workspace;
  company: Company;
  members: Member[];
  clones: Record<string, Clone>;
  getClone: (cloneId: string) => Clone | undefined;
  createWorkspace: (input: NewCompanyInput) => Workspace;
  switchWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  addMember: (input: { name: string; role: string }) => Member;
  removeMember: (memberId: string) => void;
};

const Ctx = createContext<WorkspaceContextValue>({
  workspaces: [demoWorkspace],
  active: demoWorkspace,
  company: demoWorkspace.company,
  members: demoWorkspace.members,
  clones: demoWorkspace.clones,
  getClone: (id) => demoWorkspace.clones[id],
  createWorkspace: () => demoWorkspace,
  switchWorkspace: () => {},
  deleteWorkspace: () => {},
  addMember: () => ({ id: "", name: "", role: "", consent: true }),
  removeMember: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  // Overrides indexées par id : ne contient que les workspaces créés ou modifiés depuis le
  // seed d'origine (la démo n'y figure que si elle a été personnalisée, ex. membre ajouté).
  const [overrides, setOverrides] = useState<Record<string, Workspace>>({});
  const [activeId, setActiveId] = useState<string>(DEMO_WORKSPACE_ID);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACES_KEY);
      if (raw) setOverrides(JSON.parse(raw) as Record<string, Workspace>);
      const rawActive = window.localStorage.getItem(ACTIVE_KEY);
      if (rawActive) setActiveId(rawActive);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Record<string, Workspace>) => {
    try {
      window.localStorage.setItem(WORKSPACES_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const persistActive = useCallback((id: string) => {
    try {
      window.localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  // Liste affichée : la démo (éventuellement remplacée par sa version modifiée) + toutes les
  // sociétés personnalisées, dans l'ordre de création.
  const workspaces = useMemo(() => {
    const custom = Object.values(overrides)
      .filter((w) => w.custom)
      .sort((a, b) => a.id.localeCompare(b.id));
    return [overrides[DEMO_WORKSPACE_ID] ?? demoWorkspace, ...custom];
  }, [overrides]);

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? demoWorkspace,
    [workspaces, activeId],
  );

  const createWorkspace = useCallback(
    (input: NewCompanyInput): Workspace => {
      const id = `co-${slugify(input.company.name)}-${Date.now().toString(36)}`;
      const usedIds = new Set<string>();
      const members: Member[] = input.members
        .filter((m) => m.name.trim())
        .map((m) => {
          let memberId = slugify(m.name);
          while (usedIds.has(memberId)) memberId = `${memberId}-2`;
          usedIds.add(memberId);
          return { id: memberId, name: m.name.trim(), role: m.role.trim(), consent: true };
        });
      const clones: Record<string, Clone> = {};
      for (const m of members) clones[m.id] = blankClone(m.name, m.role);

      const ws: Workspace = { id, company: input.company, members, clones, custom: true };
      setOverrides((prev) => {
        const next = { ...prev, [id]: ws };
        persist(next);
        return next;
      });
      return ws;
    },
    [persist],
  );

  // Ajoute un membre (et son clone vierge) au workspace actuellement actif — fonctionne aussi
  // bien sur la démo que sur une société personnalisée : la démo bascule simplement en override
  // dès son premier membre ajouté.
  const addMember = useCallback(
    (input: { name: string; role: string }): Member => {
      const name = input.name.trim();
      const role = input.role.trim();
      const base = overrides[activeId] ?? (activeId === DEMO_WORKSPACE_ID ? demoWorkspace : undefined);
      if (!base || !name) return { id: "", name: "", role: "", consent: true };

      const usedIds = new Set(base.members.map((m) => m.id));
      let memberId = slugify(name);
      while (usedIds.has(memberId)) memberId = `${memberId}-2`;

      const member: Member = { id: memberId, name, role, consent: true };
      const updated: Workspace = {
        ...base,
        members: [...base.members, member],
        clones: { ...base.clones, [memberId]: blankClone(name, role) },
      };

      setOverrides((prev) => {
        const next = { ...prev, [activeId]: updated };
        persist(next);
        return next;
      });
      return member;
    },
    [overrides, activeId, persist],
  );

  // Retire un membre (et son clone) du workspace actif.
  const removeMember = useCallback(
    (memberId: string) => {
      const base = overrides[activeId] ?? (activeId === DEMO_WORKSPACE_ID ? demoWorkspace : undefined);
      if (!base) return;

      const remainingClones = { ...base.clones };
      delete remainingClones[memberId];

      const updated: Workspace = {
        ...base,
        members: base.members.filter((m) => m.id !== memberId),
        clones: remainingClones,
      };

      setOverrides((prev) => {
        const next = { ...prev, [activeId]: updated };
        persist(next);
        return next;
      });
    },
    [overrides, activeId, persist],
  );

  const switchWorkspace = useCallback(
    (id: string) => {
      setActiveId(id);
      persistActive(id);
    },
    [persistActive],
  );

  const deleteWorkspace = useCallback(
    (id: string) => {
      if (id === DEMO_WORKSPACE_ID) return;
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        persist(next);
        return next;
      });
      setActiveId((current) => {
        if (current !== id) return current;
        persistActive(DEMO_WORKSPACE_ID);
        return DEMO_WORKSPACE_ID;
      });
    },
    [persist, persistActive],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      active,
      company: active.company,
      members: active.members,
      clones: active.clones,
      getClone: (cloneId: string) => active.clones[cloneId],
      createWorkspace,
      switchWorkspace,
      deleteWorkspace,
      addMember,
      removeMember,
    }),
    [workspaces, active, createWorkspace, switchWorkspace, deleteWorkspace, addMember, removeMember],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  return useContext(Ctx);
}
