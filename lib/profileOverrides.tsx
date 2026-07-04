"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Personnalisations locales d'un profil (nom + avatar) éditées par la personne depuis son
// propre profil. Persistées en localStorage pour la démo ; la persistance serveur est branchée
// via api.saveProfile (voir CONTRACTS.md — TODO backend).
export type ProfileOverride = { name?: string; avatar?: string };
type Overrides = Record<string, ProfileOverride>;

const STORAGE_KEY = "f2f-profile-overrides";

const Ctx = createContext<{
  overrides: Overrides;
  setOverride: (id: string, patch: ProfileOverride) => void;
}>({ overrides: {}, setOverride: () => {} });

export function ProfileOverridesProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setOverrides(JSON.parse(raw) as Overrides);
    } catch {
      /* ignore */
    }
  }, []);

  const setOverride = useCallback((id: string, patch: ProfileOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ overrides, setOverride }}>{children}</Ctx.Provider>;
}

export function useProfileOverrides() {
  return useContext(Ctx);
}

// Nom d'affichage : override local si présent, sinon la valeur du seed.
export function useDisplayName(id: string, fallback: string) {
  const { overrides } = useProfileOverrides();
  return overrides[id]?.name || fallback;
}
