"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Sparkles, Building2, Settings } from "lucide-react";
import { useCurrentUser } from "@/lib/currentUser";
import { useWorkspace } from "@/lib/workspace";
import { UserSwitcher } from "@/components/UserSwitcher";
import { GlassMenuBar } from "@/components/GlassMenuBar";

export function TopNav() {
  const pathname = usePathname();
  const { currentUserId, setCurrentUserId } = useCurrentUser();
  const { members } = useWorkspace();

  // Réconciliation : si l'utilisateur courant n'appartient pas à la société active
  // (ex. après un changement de workspace), on bascule sur le premier membre valide.
  useEffect(() => {
    if (members.length === 0) return;
    if (!members.some((m) => m.id === currentUserId)) {
      setCurrentUserId(members[0].id);
    }
  }, [members, currentUserId, setCurrentUserId]);

  const links = [
    {
      href: "/",
      label: "Team",
      icon: Users,
      iconColor: "text-violet-600",
      glow: "radial-gradient(circle, rgba(124,92,255,0.22) 0%, rgba(124,92,255,0.08) 50%, transparent 100%)",
    },
    {
      href: `/clone/${currentUserId}`,
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
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      iconColor: "text-amber-600",
      glow: "radial-gradient(circle, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.08) 50%, transparent 100%)",
    },
  ];

  return (
    <header className="sticky top-0 z-40 px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center" aria-label="Face to Face — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Face to Face" className="h-9 w-auto" />
        </Link>

        <div className="hidden sm:block">
          <GlassMenuBar items={links} activeHref={pathname} />
        </div>

        <UserSwitcher />
      </div>

      {/* Nav mobile */}
      <div className="mx-auto mt-3 max-w-5xl sm:hidden">
        <GlassMenuBar items={links} activeHref={pathname} />
      </div>
    </header>
  );
}
