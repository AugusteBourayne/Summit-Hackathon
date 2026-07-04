import { AskResponse } from "@/lib/api";

export function GroundedPanel({ data }: { data: AskResponse }) {
  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Sources
        </h3>
        <ul className="space-y-2">
          {data.citations.map((citation, i) => (
            <li key={i} className="rounded-lg border border-black/5 bg-black/[0.03] p-3">
              <p className="text-foreground/90">&ldquo;{citation.text}&rdquo;</p>
              <p className="mt-1 font-mono text-[11px] text-muted">{citation.source}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Likely objections
        </h3>
        <ul className="space-y-1.5">
          {data.objections.map((objection, i) => (
            <li key={i} className="flex gap-2 text-foreground/80">
              <span className="text-amber-400">•</span>
              {objection}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Suggested framing
        </h3>
        <p className="rounded-lg bg-accent-soft p-3 text-foreground/90">{data.suggestion}</p>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Agent trace
        </h3>
        <ol className="space-y-1 font-mono text-[11px] text-muted">
          {data.steps.map((step, i) => (
            <li key={i}>
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
