// Script de seed : ingere le contenu de demo dans le RAG via /api/ingest.
// Usage : node scripts/seed.mjs  (le serveur npm run dev doit tourner en parallele)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Reconstruit le chemin racine du projet (les modules ES n'ont pas __dirname nativement).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const API_URL = "http://localhost:3000/api/ingest";

// Envoie un document a /api/ingest et affiche le resultat.
async function ingestDocument(scope, content, source, label) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, content, source }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`  OK   ${label} -> ${data.chunksAdded} chunk(s) [scope: ${scope}]`);
    } else {
      console.log(`  ERR  ${label} -> ${data.error ?? res.status}`);
    }
  } catch (err) {
    console.log(`  FAIL ${label} -> ${err.message}`);
  }
  // Petite pause entre chaque ingestion pour laisser Vultr indexer une nouvelle collection.
  await new Promise((r) => setTimeout(r, 800));
}

async function main() {
  console.log("Demarrage du seed...\n");

  // --- 1. Corpus personnel de Claire : les documents de uploads-demo ---
  console.log("Corpus personnel (claire-dumont) :");
  const uploadsDir = path.join(ROOT, "seed", "uploads-demo");
  const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(uploadsDir, file), "utf-8");
    await ingestDocument("personal:claire-dumont", content, "upload", file);
  }

  // --- 2. Corpus entreprise : le contexte depuis team.json (point souleve par Auguste, PRD A2) ---
  console.log("\nCorpus entreprise (team) :");
  const teamPath = path.join(ROOT, "seed", "team.json");
  const team = JSON.parse(fs.readFileSync(teamPath, "utf-8"));
  // On concatene les champs descriptifs de l'entreprise en un seul texte a ingerer.
  const companyText = [
    `Entreprise : ${team.company.name}`,
    `Description : ${team.company.description}`,
    `Produit : ${team.company.product}`,
  ].join("\n");
  await ingestDocument("team", companyText, "upload", "team.json (contexte entreprise)");

  console.log("\nSeed termine.");
}

main();