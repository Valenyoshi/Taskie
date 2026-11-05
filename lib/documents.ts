import mammoth from "mammoth";

const MAX_UNZIPPED = 25_000_000;

export function isZip(bytes: Buffer): boolean {
  return bytes.length > 4 && bytes.readUInt32LE(0) === 0x04034b50;
}

/** Suma los tamaños descomprimidos del directorio central, para no abrir un zip que explota en memoria. */
function unzippedSize(bytes: Buffer): number | null {
  const min = Math.max(0, bytes.length - 65_557);
  let end = -1;
  for (let at = bytes.length - 22; at >= min; at--) {
    if (bytes.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) return null;
  const entries = bytes.readUInt16LE(end + 10);
  let at = bytes.readUInt32LE(end + 16);
  let total = 0;
  for (let index = 0; index < entries; index++) {
    if (at + 46 > bytes.length || bytes.readUInt32LE(at) !== 0x02014b50) return null;
    const size = bytes.readUInt32LE(at + 24);
    if (size === 0xffffffff) return null;
    total += size;
    at += 46 + bytes.readUInt16LE(at + 28) + bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
  }
  return total;
}

function isDocx(bytes: Buffer): boolean {
  return isZip(bytes) && bytes.includes("word/document.xml");
}

/** Texto plano de un archivo de Word (.docx). Devuelve "" si no es un .docx válido. */
export async function docxToText(bytes: Buffer): Promise<string> {
  if (!isDocx(bytes)) return "";
  const size = unzippedSize(bytes);
  if (size === null || size > MAX_UNZIPPED) return "";
  try {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return value
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    return "";
  }
}
