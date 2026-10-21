/**
 * Capas remotas para a imagem OG: baixadas no servidor com prazo e tamanho máximos e
 * entregues ao Satori como data URL. Qualquer falha devolve `null` (o card usa a
 * lombada colorida), para que uma capa lenta não derrube o preview.
 */
import { isIP } from "node:net";

const TIMEOUT_MS = 2000;
const MAX_BYTES = 1_500_000;
const TYPES = /^image\/(jpeg|png|gif)$/;

/** Só https e nunca endereços locais ou de rede interna (a URL da capa vem do usuário). */
export function isFetchableCover(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  const v = isIP(host);
  if (v === 4) {
    const [a, b] = host.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (v === 6) {
    return !(
      host === "::1" ||
      host === "::" ||
      /^(fc|fd|fe8|fe9|fea|feb)/.test(host) ||
      host.startsWith("::ffff:")
    );
  }
  return true;
}

export async function fetchCoverDataUrl(
  raw: string | null,
  fetcher: typeof fetch = fetch
): Promise<string | null> {
  // Capas do Google Books costumam vir em http; o mesmo endereço responde em https.
  const src = raw?.replace(/^http:\/\//i, "https://") ?? null;
  if (!(src && isFetchableCover(src))) {
    return null;
  }
  try {
    const res = await fetcher(src, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!(res.ok && TYPES.test(type))) {
      return null;
    }
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) {
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return null;
    }
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
