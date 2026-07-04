// Script de tests end-to-end pour le backend Face to Face (sans UI).
// Usage : node scripts/test-e2e.mjs  (le serveur npm run dev doit tourner en parallele)

const BASE_URL = "http://localhost:3000";
let passed = 0;
let failed = 0;

// Execute un test : envoie une requete, verifie des criteres simples, affiche PASS/FAIL.
// Execute un test : envoie une requete, verifie le statut attendu et des criteres simples.
// expectedStatus vaut 200 par defaut, mais peut etre 400 pour les tests de rejet.
async function runTest(name, path, body, checks, expectedStatus = 200) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    const errors = [];
    if (res.status !== expectedStatus) {
      errors.push(`statut HTTP ${res.status} au lieu de ${expectedStatus}`);
    }
    for (const check of checks) {
      if (!check.test(data)) errors.push(check.label);
    }

    if (errors.length === 0) {
      console.log(`PASS  ${name}`);
      passed++;
    } else {
      console.log(`FAIL  ${name}`);
      errors.forEach((e) => console.log(`        - ${e}`));
      failed++;
    }
    return data;
  } catch (err) {
    console.log(`FAIL  ${name}`);
    console.log(`        - erreur reseau : ${err.message}`);
    failed++;
    return null;
  }
}

async function main() {
  console.log("Tests end-to-end du backend Face to Face\n");

  // --- Test 1 : ingestion basique ---
  await runTest(
    "POST /api/ingest - contenu valide",
    "/api/ingest",
    { scope: "team", content: "Contenu de test pour verification e2e.", source: "upload" },
    [{ label: "chunksAdded absent ou invalide", test: (d) => typeof d.chunksAdded === "number" && d.chunksAdded > 0 }]
  );

  // --- Test 2 : ingestion avec contenu vide (doit echouer proprement, pas planter) ---
  await runTest(
    "POST /api/ingest - contenu vide (doit etre rejete)",
    "/api/ingest",
    { scope: "team", content: "", source: "upload" },
    [{ label: "devrait renvoyer une erreur mais renvoie chunksAdded", test: (d) => d.error !== undefined }],
    400
  );

  // --- Test 3 : question sur le corpus personnel de Claire ---
  await runTest(
    "POST /api/ask - question personnelle (claire-dumont)",
    "/api/ask",
    { cloneId: "claire-dumont", mode: "clone", text: "Quel est le statut du projet Salesforce ?", history: [] },
    [
      { label: "response manquante ou vide", test: (d) => typeof d.response === "string" && d.response.length > 0 },
      { label: "citations n'est pas un tableau", test: (d) => Array.isArray(d.citations) },
      { label: "steps ne contient pas les 5 etapes attendues", test: (d) => Array.isArray(d.steps) && d.steps.length >= 4 },
    ]
  );

  // --- Test 4 : mode interviewer ---
  await runTest(
    "POST /api/ask - mode interviewer",
    "/api/ask",
    { cloneId: "claire-dumont", mode: "interviewer", text: "Comment gères-tu les priorites de ton equipe ?", history: [] },
    [{ label: "response manquante ou vide", test: (d) => typeof d.response === "string" && d.response.length > 0 }]
  );

  // --- Test 5 : cloneId inexistant (doit repondre avec un fallback, pas planter) ---
  await runTest(
    "POST /api/ask - cloneId inexistant (fallback attendu)",
    "/api/ask",
    { cloneId: "clone-qui-n-existe-pas", mode: "clone", text: "Test", history: [] },
    [{ label: "response manquante ou vide", test: (d) => typeof d.response === "string" && d.response.length > 0 }]
  );

  // --- Test 6 : champ text vide (doit etre rejete proprement) ---
  await runTest(
    "POST /api/ask - text vide (doit etre rejete)",
    "/api/ask",
    { cloneId: "claire-dumont", mode: "clone", text: "", history: [] },
    [{ label: "devrait renvoyer une erreur", test: (d) => d.error !== undefined }],
    400
  );

  console.log(`\nResultat : ${passed} reussi(s), ${failed} echoue(s)`);
  process.exit(failed > 0 ? 1 : 0);
}

main();