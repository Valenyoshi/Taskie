import Image from "next/image";

export function KittyMark({ size = 28 }: { size?: number }) {
  return <Image className="kitty-mark" src="/kitty-head.png" alt="Kitty" width={size} height={size} />;
}
