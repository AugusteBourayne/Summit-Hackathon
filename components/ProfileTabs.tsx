"use client";

import { usePathname } from "next/navigation";
import { GraduationCap, User } from "lucide-react";
import { GlassMenuBar } from "@/components/GlassMenuBar";

// Sous-barre Profile / Training Studio — vrai clone du nav principal (même GlassMenuBar,
// même style verre dépoli), juste avec 2 items propres à un clone au lieu des 3 sections
// globales.
export function ProfileTabs({ cloneId }: { cloneId: string }) {
  const pathname = usePathname();

  const items = [
    {
      href: `/clone/${cloneId}`,
      label: "Profile",
      icon: User,
      iconColor: "text-violet-600",
      glow: "radial-gradient(circle, rgba(124,92,255,0.22) 0%, rgba(124,92,255,0.08) 50%, transparent 100%)",
    },
    {
      href: `/training/${cloneId}`,
      label: "Training Studio",
      icon: GraduationCap,
      iconColor: "text-pink-600",
      glow: "radial-gradient(circle, rgba(236,72,153,0.22) 0%, rgba(236,72,153,0.08) 50%, transparent 100%)",
    },
  ];

  return (
    <div className="flex justify-center">
      <GlassMenuBar items={items} activeHref={pathname} />
    </div>
  );
}
