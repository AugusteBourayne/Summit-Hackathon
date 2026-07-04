"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  glow: string; // couleur de la lueur quand l'item est actif/survolé
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: { opacity: 1, transition: { duration: 0.4 } },
};

export function GlassMenuBar({
  items,
  activeHref,
}: {
  items: MenuItem[];
  activeHref: string;
}) {
  return (
    <motion.nav
      className="glass relative overflow-hidden rounded-2xl p-1 shadow-[0_1px_2px_rgba(15,15,20,0.04),0_8px_24px_-8px_rgba(15,15,20,0.1)]"
      initial="initial"
      whileHover="hover"
    >
      <motion.div
        className="pointer-events-none absolute -inset-4 z-0 rounded-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(124,92,255,0.25), rgba(6,182,212,0.18) 55%, transparent 80%)",
        }}
        variants={navGlowVariants}
      />
      <ul className="relative z-10 flex items-center gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;
          return (
            <li key={item.label} className="relative">
              <Link
                href={item.href}
                className="relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_2px_rgba(15,15,20,0.06),0_4px_12px_-4px_rgba(15,15,20,0.15)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span
                  className="relative z-10 flex items-center gap-1.5"
                  style={{ color: isActive ? item.glow : "var(--muted)" }}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  <span className={isActive ? "text-foreground" : ""}>{item.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
