import fs from "fs";
import path from "path";

// Chemin du fichier de stockage local. Un seul fichier JSON contient tous les scopes.
const STORE_PATH = path.join(process.cwd(), "data", "vectorstore.json");

// Structure d'un chunk stocke : le texte original, son vecteur d'embedding,
// le scope (team ou personal:<cloneId>), et la source (upload ou interview).
export interface StoredChunk {
  id: string;
  scope: string;
  source: "upload" | "interview";
  text: string;
  embedding: number[];
}

// S'assure que le dossier data/ et le fichier existent avant toute lecture/ecriture.
// Evite un crash au tout premier appel, quand le fichier n'existe pas encore.
function ensureStoreExists(): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

// Charge tous les chunks stockes en memoire.
export function loadChunks(): StoredChunk[] {
  ensureStoreExists();
  const raw = fs.readFileSync(STORE_PATH, "utf-8");
  return JSON.parse(raw) as StoredChunk[];
}

// Ajoute de nouveaux chunks a la suite des chunks existants, puis persiste sur disque.
export function appendChunks(newChunks: StoredChunk[]): void {
  const existing = loadChunks();
  const updated = existing.concat(newChunks);
  fs.writeFileSync(STORE_PATH, JSON.stringify(updated, null, 2), "utf-8");
}