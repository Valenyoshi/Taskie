/** Saca el markdown del chat para que no se vean asteriscos ni marcas. */
export function plainChatText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1$2")
    .replace(/^[\t ]*[-*•]\s+/gm, "• ")
    .replace(/^[\t ]*\d+\.\s+/gm, "• ")
    .replace(/\*{1,3}/g, "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
