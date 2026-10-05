"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, House, MessagesSquare, Store, Trophy } from "lucide-react";
import { cn } from "cn";

const items = [
  { href: "/inicio", label: "Inicio", icon: House },
  { href: "/materias", label: "Materias", icon: Flame },
  { href: "/premios", label: "Tienda", icon: Store },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                className={cn(
                  "nav-link flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium",
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
