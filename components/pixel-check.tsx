export function PixelCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={`pixel-check ${className}`} viewBox="0 0 64 48" aria-hidden shapeRendering="crispEdges">
      <path fill="currentColor" d="M4 20h8v8h8v8h8v-8h8v-8h8v-8h8V4h8v8h-8v8h-8v8h-8v8h-8v8h-8v-8h-8v-8H4z" />
    </svg>
  );
}
