"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TaskieLoader } from "@/components/taskie-loader";

const MINIMUM_TIME = 550;

export function NavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const startedAt = useRef(Date.now());
  const firstPath = useRef(pathname);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
      const next = new URL(link.href).pathname;
      if (next === window.location.pathname) return;
      startedAt.current = Date.now();
      setVisible(true);
      window.setTimeout(() => setVisible(false), 4000);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (firstPath.current === pathname) {
      const timer = window.setTimeout(() => setVisible(false), MINIMUM_TIME);
      return () => window.clearTimeout(timer);
    }

    firstPath.current = pathname;
    const remaining = Math.max(0, MINIMUM_TIME - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;
  return (
    <div className="taskie-transition" aria-live="polite">
      <TaskieLoader />
    </div>
  );
}
