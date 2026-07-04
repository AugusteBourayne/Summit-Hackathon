"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "f2f-current-user";
const DEFAULT_USER = "raphael";

const CurrentUserContext = createContext<{
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
}>({
  currentUserId: DEFAULT_USER,
  setCurrentUserId: () => {},
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserIdState] = useState(DEFAULT_USER);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setCurrentUserIdState(saved);
  }, []);

  function setCurrentUserId(id: string) {
    setCurrentUserIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <CurrentUserContext.Provider value={{ currentUserId, setCurrentUserId }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
