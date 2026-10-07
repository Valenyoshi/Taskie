"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Flame, Headphones, House, Settings, Sparkles, Store, Trophy } from "lucide-react";
import { cn } from "cn";

const items = [
  { href: "/inicio", label: "Inicio", icon: House },
  { href: "/materias", label: "Materias", icon: Flame },
  { href: "/premios", label: "Tienda", icon: Store },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/chat", label: "IA", icon: Sparkles },
  { href: "/concentracion", label: "Concentración", icon: Headphones },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function NavBar() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="nav-scroll mx-auto flex max-w-lg overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                prefetch
                ref={active ? activeRef : undefined}
                className={cn(
                  "nav-link flex w-[4.7rem] flex-col items-center gap-1 px-1 py-2 text-center text-[11px] leading-tight font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
