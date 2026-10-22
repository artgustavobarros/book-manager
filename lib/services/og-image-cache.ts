/**
 * PNGs da imagem OG já gerados, pela chave do estado renderizado (dono, recorte e versão
 * do acervo). Ficam no Runtime Cache da Vercel, compartilhado entre as instâncias da
 * região (fora da Vercel, em memória); pedidos simultâneos na mesma instância
 * compartilham uma renderização. A checagem de estante publicada fica fora daqui.
 */
import { getCache } from "@vercel/functions";

/** Versões antigas nunca voltam a ser pedidas pela URL canônica; o prazo as descarta. */
const TTL_SECONDS = 86_400;

const inFlight = new Map<string, Promise<ArrayBuffer>>();

async function cachedOrRender(
  key: string,
  render: () => Promise<ArrayBuffer>
): Promise<ArrayBuffer> {
  const cache = getCache({ namespace: "og-estante" });
  // Falha do cache não derruba a imagem: renderiza e segue.
  const hit = await cache.get(key).catch(() => null);
  if (typeof hit === "string") {
    return Uint8Array.from(Buffer.from(hit, "base64")).buffer;
  }
  const png = await render();
  await cache
    .set(key, Buffer.from(png).toString("base64"), {
      name: "og-estante",
      ttl: TTL_SECONDS,
    })
    .catch(() => undefined);
  return png;
}

export function memoOgImage(
  key: string,
  render: () => Promise<ArrayBuffer>
): Promise<ArrayBuffer> {
  const pending = inFlight.get(key);
  if (pending) {
    return pending;
  }
  const png = cachedOrRender(key, render).finally(() => inFlight.delete(key));
  inFlight.set(key, png);
  return png;
}
