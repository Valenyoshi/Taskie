import { KittyFace } from "@/components/kitty-face";

export function GeminiMark({ size = 28 }: { size?: number }) {
  return <KittyFace size={size} className="gemini-mark" />;
}
