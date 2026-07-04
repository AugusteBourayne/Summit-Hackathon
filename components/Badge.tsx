const variants = {
  trained: "bg-accent-soft text-accent",
  untrained: "bg-black/5 text-muted",
  consent: "bg-emerald-500/10 text-emerald-400",
  voice: "bg-cyan-500/10 text-cyan-400",
  soon: "bg-black/5 text-muted",
};

export function Badge({
  variant,
  children,
}: {
  variant: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
