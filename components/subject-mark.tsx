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
          <path d="M12 50 32 12l20 38H12z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 50V38h10" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M28 28h8M32 24v8" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "bio":
      return (
        <svg {...box}>
          <path d="M32 54V32" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M32 38C20 36 14 24 18 16c10 2 14 12 14 22z" fill={color} />
          <path d="M32 34C46 30 50 18 46 14c-10 2-14 8-14 20z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="32" cy="54" rx="11" ry="4" fill={color} />
        </svg>
      );
    case "ciencia":
      return (
        <svg {...box}>
          <circle cx="32" cy="34" r="6" fill={color} />
          <ellipse cx="32" cy="34" rx="22" ry="9" fill="none" stroke={color} strokeWidth="3" />
          <ellipse cx="32" cy="34" rx="22" ry="9" fill="none" stroke={color} strokeWidth="3" transform="rotate(60 32 34)" />
          <ellipse cx="32" cy="34" rx="22" ry="9" fill="none" stroke={color} strokeWidth="3" transform="rotate(120 32 34)" />
        </svg>
      );
    case "historia":
      return (
        <svg {...box}>
          <circle cx="32" cy="34" r="20" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M32 20v15l9 6" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="34" r="2.5" fill={color} />
          <path d="M32 12v4M32 52v4M12 34h4M48 34h4" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "geo":
      return (
        <svg {...box}>
          <circle cx="32" cy="32" r="20" fill="#fff" stroke={color} strokeWidth="3" />
          <path d="M32 14l5 16-5 4-5-4z" fill={color} />
          <path d="M32 50l5-16-5-4-5 4z" fill="#fff" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M14 32h7M43 32h7" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "ingles":
      return (
        <svg {...box}>
          <path d="M6 12h24a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H16l-6 6v-6H6a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M30 30h24a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-8l6 6v-6H30a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill={color} />
        </svg>
      );
    case "ciudad":
      return (
        <svg {...box}>
          <path d="M32 12v40M16 52h32" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M14 22h36" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M14 22 8 36h12z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M50 22 44 36h12z" fill={color} />
        </svg>
      );
    case "codigo":
      return (
        <svg {...box}>
          <path d="M26 16 12 32l14 16" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 16l14 16-14 16" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M36 14 28 50" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...box}>
          <path d="M16 46 40 14l10 8-24 32-12 2z" fill="#fff" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          <path d="M40 14l10 8-6 4-8-8z" fill={color} />
          <path d="M16 46l-2 10 10-2" fill={color} />
        </svg>
      );
  }
}
