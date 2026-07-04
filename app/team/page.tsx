"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { team } from "@/lib/team";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";

export default function TeamSettings() {
  const [name, setName] = useState(team.company.name);
  const [description, setDescription] = useState(team.company.description);
  const [product, setProduct] = useState(team.company.product);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const { chunksAdded } = await api.ingest({
        scope: "team",
        content: `Company: ${name}\n\n${description}\n\nProduct: ${product}`,
        source: "upload",
      });
      setSaved(`Saved — ${chunksAdded} chunk(s) added to the shared knowledge base.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Company knowledge</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Shared by every clone. This is what makes their answers relevant to your business —
        not just to each person&apos;s style.
      </p>

      <div className="card mt-8 space-y-5 p-6">
        <div>
          <label className="text-sm font-medium">Company name</label>
          <input
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">What the company does</label>
          <textarea
            className="mt-1.5 h-28 w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">How the product works</label>
          <textarea
            className="mt-1.5 h-28 w-full rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-white/5 pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save to knowledge base"}
          </button>
          {saved && <p className="text-sm text-emerald-400">{saved}</p>}
        </div>
      </div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted">
        Members
      </h2>
      <div className="card mt-3 divide-y divide-white/5">
        {team.members.map((member) => (
          <div key={member.id} className="flex items-center gap-4 p-4">
            <Avatar id={member.id} name={member.name} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium">{member.name}</p>
              <p className="text-xs text-muted">{member.role}</p>
            </div>
            <Badge variant="consent">✓ consent given</Badge>
          </div>
        ))}
      </div>
    </main>
  );
}
