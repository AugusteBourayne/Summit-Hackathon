"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Sparkles, Building2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { GlassMenuBar } from "@/components/GlassMenuBar";

const links = [
  {
    href: "/",
    label: "Team",
    icon: Users,
    iconColor: "text-violet-600",
    glow: "radial-gradient(circle, rgba(124,92,255,0.22) 0%, rgba(124,92,255,0.08) 50%, transparent 100%)",
  },
  {
    href: "/training/raphael",
    label: "My clone",
    icon: Sparkles,
    iconColor: "text-pink-600",
    glow: "radial-gradient(circle, rgba(236,72,153,0.22) 0%, rgba(236,72,153,0.08) 50%, transparent 100%)",
  },
  {
    href: "/team",
    label: "Company",
    icon: Building2,
    iconColor: "text-cyan-600",
    glow: "radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.08) 50%, transparent 100%)",
  },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-white shadow-sm">
            F2
          </span>
          <span className="hidden sm:inline">Face to Face</span>
        </Link>

        <div className="hidden sm:block">
          <GlassMenuBar items={links} activeHref={pathname} />
        </div>

        <div className="glass flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-sm text-muted shadow-sm">
          <span className="hidden sm:inline">You are</span>
          <Avatar id="raphael" name="Raphaël" size="sm" />
        </div>
      </div>

      {/* Nav mobile */}
      <div className="mx-auto mt-3 max-w-5xl sm:hidden">
        <GlassMenuBar items={links} activeHref={pathname} />
      </div>
    </header>
  );
}
