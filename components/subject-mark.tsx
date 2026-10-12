import { subjectColor } from "@/lib/subject-color";

function kind(subject: string): string {
  const name = subject.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/lengua|literatura/.test(name)) return "lengua";
  if (/matem/.test(name)) return "mate";
  if (/biolog/.test(name)) return "bio";
  if (/natural|fisica|quimica/.test(name)) return "ciencia";
  if (/histor/.test(name)) return "historia";
  if (/geograf/.test(name)) return "geo";
  if (/ingl/.test(name)) return "ingles";
  if (/ciudadan/.test(name)) return "ciudad";
  if (/program|taller|comput/.test(name)) return "codigo";
  return "clase";
}

export function SubjectMark({ subject, size = 36 }: { subject: string; size?: number }) {
  const color = subjectColor(subject);
  const box = { width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": true as const };
  switch (kind(subject)) {
    case "lengua":
      return (
        <svg {...box}>
          <path d="M10 16h18c6 0 8 4 8 8v28c-6-4-10-4-16-2H10V16z" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M54 16H36c-6 0-8 4-8 8v28c6-4 10-4 16-2h10V16z" fill={color} />
        </svg>
      );
    case "mate":
      return (
        <svg {...box}>
          <circle cx="32" cy="32" r="22" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M32 16v32M16 32h32" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "bio":
      return (
        <svg {...box}>
          <path d="M32 54c-14-8-18-20-10-32 10 2 16 10 10 32z" fill={color} />
          <path d="M32 54c14-8 18-20 10-32-10 2-16 10-10 32z" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M32 22v28" stroke="#fff" strokeWidth="2" />
        </svg>
      );
    case "ciencia":
      return (
        <svg {...box}>
          <path d="M26 10h12M32 10v16l12 20a10 10 0 0 1-24 0l12-20z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M24 40h16" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "historia":
      return (
        <svg {...box}>
          <path d="M16 14h26c6 4 6 10 0 14H16z" fill={color} />
          <path d="M18 28v24M18 28c8-6 16-6 24 0v20c-8-6-16-6-24 0" fill="none" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "geo":
      return (
        <svg {...box}>
          <circle cx="32" cy="32" r="20" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M32 12v40M14 32h36M18 22c8 4 12 8 14 18M46 22c-8 4-12 8-14 18" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      );
    case "ingles":
      return (
        <svg {...box}>
          <rect x="12" y="14" width="40" height="36" rx="8" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M22 40 28 24h4l6 16M24 34h10" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "ciudad":
      return (
        <svg {...box}>
          <path d="M32 10v8M20 22h24v8H20zM16 34h32l-4 16H20z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 22v28" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "codigo":
      return (
        <svg {...box}>
          <rect x="10" y="14" width="44" height="36" rx="8" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M26 26 18 32l8 6M38 26l8 6-8 6M34 24l-4 16" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...box}>
          <rect x="16" y="12" width="32" height="40" rx="6" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M24 24h16M24 32h16M24 40h10" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
}
