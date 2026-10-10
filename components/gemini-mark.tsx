import Image from "next/image";

export function GeminiMark({ size = 28 }: { size?: number }) {
  return <Image className="gemini-mark" src="/kitty-head.png" alt="Kitty" width={size} height={size} />;
}
