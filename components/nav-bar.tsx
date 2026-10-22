"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  NavConfigIcon,
  NavHomeIcon,
  NavIaIcon,
  NavMateriasIcon,
} from "@/components/hand-drawn-icons";
import { cn } from "cn";

const items = [
  { href: "/inicio", label: "Inicio", icon: NavHomeIcon, motion: "home" },
  { href: "/materias", label: "Materias", icon: NavMateriasIcon, motion: "subjects" },
  { href: "/chat", label: "IA", icon: NavIaIcon, motion: "ia" },
  { href: "/configuracion", label: "Configuración", icon: NavConfigIcon, motion: "settings" },
];

export function NavBar() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="nav-scroll mx-auto flex max-w-2xl overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                prefetch
                ref={active ? activeRef : undefined}
                data-motion={item.motion}
                className={cn(
                  "nav-link flex w-[4.7rem] flex-col items-center gap-1 px-1 py-2 text-center text-[11px] leading-tight font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="nav-icon size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
