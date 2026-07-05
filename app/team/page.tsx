"use client";

import { useEffect, useRef, useState } from "react";
import { FileStack, UserPlus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useWorkspace } from "@/lib/workspace";
import { useCurrentUser } from "@/lib/currentUser";
import { useDisplayName } from "@/lib/profileOverrides";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { SlackLogo } from "@/components/Slack";

function MemberRow({
  member,
  isSelf,
  onRemove,
}: {
  member: { id: string; name: string; role: string };
  isSelf: boolean;
  onRemove: (id: string) => void;
}) {
  const name = useDisplayName(member.id, member.name);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-4 p-4">
      <Avatar id={member.id} name={name} size="sm" />
      <div className="flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted">{member.role}</p>
      </div>
      <Badge variant="consent">✓ consent given</Badge>
      {!isSelf &&
        (confirming ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onRemove(member.id)}
              className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20"
            >
              Confirm remove
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-1.5 text-xs text-muted hover:bg-black/[0.04]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            title="Remove teammate"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ))}
    </div>
  );
}

type UploadedDoc = { name: string; chunks: number };

const ACCEPTED = ".pdf,.xlsx,.xls,.pptx,.ppt,.doc,.docx,.txt,.md,.csv";

export default function TeamSettings() {
  const { company, members, addMember, removeMember } = useWorkspace();
  const { currentUserId } = useCurrentUser();
  const [name, setName] = useState(company.name);
  const [description, setDescription] = useState(company.description);
  const [product, setProduct] = useState(company.product);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addingMember, setAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  function submitNewMember() {
    if (!newMemberName.trim()) return;
    addMember({ name: newMemberName, role: newMemberRole });
    setNewMemberName("");
    setNewMemberRole("");
    setAddingMember(false);
  }

  // Resync des champs quand la société active change (ex. après switch de workspace,
  // chargé depuis le localStorage après le premier rendu).
  useEffect(() => {
    setName(company.name);
    setDescription(company.description);
    setProduct(company.product);
  }, [company.name, company.description, company.product]);

  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
      setSaved(null);
      setDocError(`Couldn't save (${err instanceof Error ? err.message : "unknown error"}). Try again.`);
    } finally {
      setSaving(false);
    }
  }
// Convertit un fichier en data URL base64 (format "data:<mime>;base64,...") cote navigateur.
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Lecture du fichier echouee"));
      reader.readAsDataURL(file);
    });
  }
  async function ingestFiles(files: FileList | File[]) {
    setDocError(null);
    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();
      let params;

      if (/\.(txt|md|csv)$/i.test(lower)) {
        params = { scope: "team" as const, content: await file.text(), source: "upload" as const };
      } else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(lower)) {
        const imageDataUrl = await fileToDataUrl(file);
        params = { scope: "team" as const, content: "", source: "upload" as const, imageDataUrl };
      } else if (/\.pdf$/i.test(lower)) {
        const fileDataUrl = await fileToDataUrl(file);
        params = { scope: "team" as const, content: "", source: "upload" as const, fileDataUrl, fileType: "pdf" as const };
      } else if (/\.docx$/i.test(lower)) {
        const fileDataUrl = await fileToDataUrl(file);
        params = { scope: "team" as const, content: "", source: "upload" as const, fileDataUrl, fileType: "docx" as const };
      } else {
        params = {
          scope: "team" as const,
          content: `[document non supporte pour extraction : ${file.name}]`,
          source: "upload" as const,
        };
      }

      try {
        const { chunksAdded } = await api.ingest(params);
        setDocs((prev) => [...prev, { name: file.name, chunks: chunksAdded }]);
      } catch (err) {
        setDocError(
          `Couldn't save "${file.name}" (${err instanceof Error ? err.message : "unknown error"}). Try again.`
        );
      }
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    await ingestFiles(e.dataTransfer.files);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Company knowledge</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Shared by every clone. This is what makes their answers relevant to your business —
        not just to each person&apos;s style.
      </p>

      <div className="card mt-6 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600">
            <FileStack className="h-4 w-4" />
          </span>
          <h2 className="font-medium">Feed it company documents</h2>
        </div>
        <p className="mt-3 text-sm text-muted">
          PDFs, spreadsheets, slide decks, docs — let the agent learn the business directly from
          what already exists, instead of typing it all by hand.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          hidden
          onChange={(e) => e.target.files && ingestFiles(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-4 w-full rounded-xl border-2 border-dashed p-8 text-center text-sm transition-colors ${
            dragOver ? "border-accent bg-accent-soft" : "border-black/10 text-muted hover:border-black/20"
          }`}
        >
          Drop PDF, Excel, PowerPoint, Word, or text files — or click to browse
        </button>

        {docError && (
          <p className="mt-2 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-600">{docError}</p>
        )}

        {docs.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4 text-sm">
            {docs.map((doc, i) => (
              <li key={i} className="flex justify-between text-muted">
                <span>📄 {doc.name}</span>
                <span className="font-mono text-xs">{doc.chunks} chunks indexed</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card mt-4 space-y-5 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Or describe it by hand
        </p>
        <div>
          <label className="text-sm font-medium">Company name</label>
          <input
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">What the company does</label>
          <textarea
            className="mt-1.5 h-28 w-full rounded-xl border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">How the product works</label>
          <textarea
            className="mt-1.5 h-28 w-full rounded-xl border border-black/10 bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 border-t border-black/5 pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save to knowledge base"}
          </button>
          {saved && <p className="text-sm text-emerald-600">{saved}</p>}
          {docError && <p className="text-sm text-red-600">{docError}</p>}
        </div>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted">
        Integrations
      </h2>
      <div className="card mt-3 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.03]">
            <SlackLogo className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-medium">Slack</h3>
            <p className="text-xs text-muted">
              Let teammates mention a clone in Slack to get its take without leaving the channel.
            </p>
          </div>
          {slackConnected ? (
            <button
              onClick={() => setSlackConnected(false)}
              className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600"
            >
              ✓ Connected
            </button>
          ) : (
            <button
              onClick={() => setSlackConnected(true)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.03]"
            >
              Connect Slack
            </button>
          )}
        </div>
        {slackConnected && (
          <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-600">
            Workspace linked. Teammates can now mention a clone from Slack — e.g. <span className="font-medium">@Claire Dumont</span> — to get a grounded reply. (Roadmap — demo connection.)
          </p>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Members</h2>
        <button
          onClick={() => setAddingMember((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add teammate
        </button>
      </div>

      {addingMember && (
        <div className="card mt-3 space-y-3 p-4">
          <div className="flex gap-3">
            <input
              autoFocus
              placeholder="Full name"
              className="flex-1 rounded-xl border border-black/10 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/50"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewMember()}
            />
            <input
              placeholder="Role (e.g. Sales Lead)"
              className="flex-1 rounded-xl border border-black/10 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/50"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewMember()}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={submitNewMember}
              disabled={!newMemberName.trim()}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Add to team
            </button>
            <button
              onClick={() => setAddingMember(false)}
              className="rounded-full px-4 py-2 text-sm text-muted hover:bg-black/[0.04]"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted">
            Creates an untrained, blank clone — they&apos;ll need to sign in themselves to train it.
          </p>
        </div>
      )}

      <div className="card mt-3 divide-y divide-black/5">
        {members.length === 0 && (
          <div className="p-4 text-sm text-muted">No members yet.</div>
        )}
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSelf={member.id === currentUserId}
            onRemove={removeMember}
          />
        ))}
      </div>
    </main>
  );
}
