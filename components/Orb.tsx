export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export function Orb({ state }: { state: OrbState }) {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <div className="orb-halo absolute inset-0 rounded-full bg-violet-500/40 blur-2xl" />
      <div
        className={`orb absolute inset-4 rounded-full blur-[2px] ${
          state === "idle" ? "orb-idle" : state === "thinking" ? "orb-thinking" : "orb-listening"
        }`}
      />
      <div className="absolute inset-7 rounded-full bg-background/90" />
      <span className="relative z-10 text-xs font-medium uppercase tracking-widest text-muted">
        {state === "idle" && "ready"}
        {state === "listening" && "listening…"}
        {state === "thinking" && "thinking…"}
        {state === "speaking" && "speaking"}
      </span>
    </div>
  );
}
