// Stockage local partagé entre le Training Studio (qui propose des traits deduits
// automatiquement de chaque nouveau document) et la page profil / BehaviorProfile.tsx
// (qui affiche ces suggestions en attente de validation par l'utilisateur).

type StoredBehavior = { id: string; text: string };
type StoredProfile = { summary: string; behaviors: StoredBehavior[] };

function confirmedKey(cloneId: string) {
  return `f2f-behaviors-${cloneId}`;
}

function pendingKey(cloneId: string) {
  return `f2f-behaviors-pending-${cloneId}`;
}

export function getConfirmedBehaviorTexts(cloneId: string): string[] {
  try {
    const raw = window.localStorage.getItem(confirmedKey(cloneId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredProfile;
    return (parsed.behaviors ?? []).map((b) => b.text);
  } catch {
    return [];
  }
}

export function getPendingBehaviorTexts(cloneId: string): string[] {
  try {
    const raw = window.localStorage.getItem(pendingKey(cloneId));
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// Ajoute des traits deduits automatiquement a la liste en attente, sans doublon.
export function addPendingBehaviors(cloneId: string, newTexts: string[]) {
  if (newTexts.length === 0) return;
  const existing = getPendingBehaviorTexts(cloneId);
  const merged = Array.from(new Set([...existing, ...newTexts]));
  window.localStorage.setItem(pendingKey(cloneId), JSON.stringify(merged));
}

// A appeler une fois que l'utilisateur a confirme (Save changes) : les suggestions
// sont maintenant dans le profil confirme, plus besoin de les retenir en attente.
export function clearPendingBehaviors(cloneId: string) {
  window.localStorage.removeItem(pendingKey(cloneId));
}
