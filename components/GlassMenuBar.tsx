"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  glow: string; // couleur du halo radial propre à l'item
  iconColor: string; // classe tailwind de couleur d'icône
}

const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
      scale: { duration: 0.5, type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },
};

const sharedTransition = { type: "spring" as const, stiffness: 100, damping: 20, duration: 0.5 };

export function GlassMenuBar({
  items,
  activeHref,
}: {
  items: MenuItem[];
  activeHref: string;
}) {
  return (
    <nav className="glass relative overflow-hidden rounded-2xl p-2 shadow-[0_1px_2px_rgba(15,15,20,0.04),0_8px_24px_-8px_rgba(15,15,20,0.12)]">
      <ul className="relative z-10 flex items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;

          return (
            <li key={item.label} className="relative">
              <Link href={item.href} className="block">
                <motion.div
                  className="group relative overflow-visible rounded-xl"
                  style={{ perspective: "600px" }}
                  initial="initial"
                  whileHover="hover"
                >
                  <motion.div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{ background: item.glow, borderRadius: 16 }}
                    variants={glowVariants}
                    animate={isActive ? "hover" : "initial"}
                  />

                  <motion.div
                    className={`relative z-10 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${
                      isActive ? "text-foreground" : "text-muted group-hover:text-foreground"
                    }`}
                    variants={itemVariants}
                    transition={sharedTransition}
                    style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? item.iconColor : ""}`} strokeWidth={2} />
                    {item.label}
                  </motion.div>

                  <motion.div
                    className={`absolute inset-0 z-10 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${
                      isActive ? "text-foreground" : "text-muted group-hover:text-foreground"
                    }`}
                    variants={backVariants}
                    transition={sharedTransition}
                    style={{
                      transformStyle: "preserve-3d",
                      transformOrigin: "center top",
                      rotateX: 90,
                    }}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? item.iconColor : ""}`} strokeWidth={2} />
                    {item.label}
                  </motion.div>
                </motion.div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
